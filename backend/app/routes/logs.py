from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.log import DailyLog

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/', methods=['POST'])
@jwt_required()
def create_log():
    data = request.get_json()
    student_id = data.get('studentId')
    subject_id = data.get('subjectId')
    date = data.get('date')
    hours_spent = data.get('hoursSpent')
    notes = data.get('notes', '')
    
    if student_id is None or not subject_id or not date or hours_spent is None:
        return jsonify({"message": "Missing required fields: studentId, subjectId, date, or hoursSpent"}), 400
        
    try:
        log_id = DailyLog.create(student_id, subject_id, date, hours_spent, notes)
        return jsonify({"message": "Log created", "id": log_id}), 201
    except Exception as e:
        print(f"Error creating log: {str(e)}")
        return jsonify({"message": f"Backend error: {str(e)}"}), 500

@logs_bp.route('/', methods=['DELETE'])
@jwt_required()
def reset_logs():
    student_id = request.args.get('studentId')
    user_id = get_jwt_identity()
    
    target_id = student_id if student_id else user_id
    
    count = DailyLog.delete_all(target_id)
    return jsonify({"message": f"Deleted {count} logs and reset usage."}), 200
