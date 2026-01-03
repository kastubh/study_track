from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.timetable import Timetable
from app.extensions import mongo
from bson.objectid import ObjectId

timetable_bp = Blueprint('timetable', __name__)

@timetable_bp.route('/<student_id>', methods=['GET'])
@jwt_required()
def get_timetable(student_id):
    # Authorization check: User must be the student or a linked parent/admin
    current_user_id = get_jwt_identity()
    # In a real app, check if current_user is parent of student_id
    
    # Calculate start and end of current week
    # Calculate start and end of week based on reference date
    from datetime import datetime, timedelta
    
    date_str = request.args.get('date')
    if date_str:
        try:
            today = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        today = datetime.now()

    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    week_start_str = start_of_week.strftime('%Y-%m-%d')
    week_end_str = end_of_week.strftime('%Y-%m-%d')
    
    week_dates = [(start_of_week + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]

    # Fetch Timetable (Plan)
    all_entries = Timetable.get_student_timetable(student_id)
    
    # Filter entries based on date range
    timetable_entries = []
    for entry in all_entries:
        # If no dates set, assume valid forever
        valid_start = entry.get('startDate')
        valid_end = entry.get('endDate')
        
        # Check if the plan's validity overlaps with the current week
        # Plan is valid if: (Start <= WeekEnd) AND (End >= WeekStart)
        # Handle cases where start/end might be missing (valid forever)
        
        is_valid = True
        if valid_start and valid_start > week_end_str:
            is_valid = False
        if valid_end and valid_end < week_start_str:
            is_valid = False
            
        if is_valid:
            timetable_entries.append(entry)

    
    # Fetch Logs (Actuals) for the week
    logs_cursor = mongo.db.daily_logs.find({
        "studentId": student_id,
        "date": {"$in": week_dates}
    })

    # Merge Data
    # Key: (day_of_week, subject_id)
    merged_data = {}

    # 1. Process Plan
    for entry in timetable_entries:
        key = (entry['dayOfWeek'], entry['subjectId'])
        merged_data[key] = {
            "dayOfWeek": entry['dayOfWeek'],
            "subjectId": entry['subjectId'],
            "plannedHours": float(entry.get('plannedHours', 0)),
            "actualHours": 0,
            "startDate": entry.get('startDate'),
            "endDate": entry.get('endDate'),
            "_id": str(entry['_id']) # Preserve ID if available from plan
        }

    # 2. Process Actuals
    for log in logs_cursor:
        # Determine day of week from date string
        log_date = datetime.strptime(log['date'], "%Y-%m-%d")
        day_of_week = log_date.weekday()
        subject_id = log['subjectId']
        hours = float(log.get('hoursSpent', 0))

        key = (day_of_week, subject_id)
        if key not in merged_data:
            merged_data[key] = {
                "dayOfWeek": day_of_week,
                "subjectId": subject_id,
                "plannedHours": 0,
                "actualHours": 0,
                "_id": str(log['_id']) # Use log ID if no plan exists
            }
        
        merged_data[key]['actualHours'] += hours

    # Convert to list
    result = list(merged_data.values())
    
    return jsonify(result), 200

@timetable_bp.route('/', methods=['POST'])
@jwt_required()
def update_timetable():
    data = request.get_json()
    student_id = data.get('studentId')
    subject_id = data.get('subjectId')
    day_of_week = data.get('dayOfWeek')
    planned_hours = data.get('plannedHours')
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    
    if student_id is None or subject_id is None or day_of_week is None:
        return jsonify({"message": "Missing fields"}), 400
        
    Timetable.create_or_update(student_id, subject_id, day_of_week, planned_hours, start_date, end_date)
    return jsonify({"message": "Timetable updated"}), 200

@timetable_bp.route('/', methods=['DELETE'])
@jwt_required()
def reset_timetable():
    student_id = request.args.get('studentId')
    user_id = get_jwt_identity() # valid user
    
    # Ideally check if user_id matches student_id or has permission
    # For now, we trust the studentId passed or default to user_id if not passed
    target_id = student_id if student_id else user_id
    
    Timetable.delete_all(target_id)
    return jsonify({"message": "Timetable reset successfully"}), 200
