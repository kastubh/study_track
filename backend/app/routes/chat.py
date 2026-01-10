from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import google.generativeai as genai
import os
from app.extensions import mongo
from bson import ObjectId
from datetime import datetime, timedelta
from app.services.groq_service import groq_service

chat_bp = Blueprint('chat', __name__)

# Configure Gemini (Fallback)
# Note: In production, ensure GEMINI_API_KEY is set in .env
GENAI_API_KEY = os.getenv('GEMINI_API_KEY')
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# Groq Config
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

@chat_bp.route('/ask', methods=['POST'])
@jwt_required()
def ask_bot():
    if not GROQ_API_KEY and not GENAI_API_KEY:
        return jsonify({"message": "Server configuration error: AI API Key missing"}), 503

    current_user_id = get_jwt_identity()
    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({"message": "Message is required"}), 400

    try:
        # 1. Fetch Context
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        # Recent logs (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_logs = list(mongo.db.logs.find({
            "student_id": current_user_id,
            "date": {"$gte": seven_days_ago.isoformat()}
        }))

        # Timetable
        # For brevity, let's just grab the timetable for this user if it exists
        timetable = mongo.db.timetables.find_one({"student_id": current_user_id})

        # 2. Construct Prompt
        context_str = f"User Name: {user.get('name', 'Student')}\n"
        
        if recent_logs:
            logs_summary = "\n".join([f"- {l.get('date')}: {l.get('subject_id')} ({l.get('hours_spent')} hrs) - {l.get('notes', '')}" for l in recent_logs])
            context_str += f"\nRecent Study Logs (Last 7 Days):\n{logs_summary}\n"
        else:
            context_str += "\nNo study logs found for the last 7 days.\n"

        if timetable:
            context_str += f"\nTimetable Data is available (configured).\n"
        else:
            context_str += f"\nTimetable is not configured.\n"

        system_prompt = f"""
        You are a helpful academic assistant chatbot for the StudyTrack app.
        Your goal is to help students stay organized and motivated.
        
        Context about the student:
        {context_str}

        Answer the student's question based on this context. 
        If they ask about their progress, summarize the logs.
        If they ask for advice, give general study tips suitable for a student.
        Keep answers concise and encouraging.
        """

        # 3. Call Groq (Primary) or Gemini (Fallback)
        ai_response = None
        
        if GROQ_API_KEY and GROQ_API_KEY != 'your_groq_api_key_here':
            ai_response = groq_service.get_response(system_prompt, user_message)
        elif GENAI_API_KEY:
            model = genai.GenerativeModel('gemini-pro')
            chat = model.start_chat(history=[])
            response = chat.send_message(f"{system_prompt}\n\nStudent: {user_message}")
            ai_response = response.text
        
        if not ai_response:
            return jsonify({"message": "Failed to generate AI response. Check API configuration."}), 503

        return jsonify({
            "response": ai_response
        }), 200

    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"message": "Failed to generate response"}), 500
