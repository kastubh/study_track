from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.daily_task import DailyTask

daily_tasks_bp = Blueprint('daily_tasks', __name__)

@daily_tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    student_id = request.args.get('studentId')
    date = request.args.get('date')
    
    current_user_id = get_jwt_identity()
    # Basic Authorization: Ensure trying to access own tasks or assuming role checks happen elsewhere
    # For now, simply trust the studentId if matches token or just use token
    
    if not student_id:
        student_id = current_user_id
        
    if not date:
        return jsonify({"message": "Date is required"}), 400

    tasks = DailyTask.get_by_date(student_id, date)
    return jsonify(tasks), 200

@daily_tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    data = request.get_json()
    student_id = data.get('studentId')
    title = data.get('title')
    date = data.get('date')
    
    if not all([student_id, title, date]):
        return jsonify({"message": "Missing fields"}), 400
        
    task_id = DailyTask.create(student_id, title, date)
    return jsonify({"message": "Task created", "id": task_id}), 201

@daily_tasks_bp.route('/<task_id>', methods=['PATCH'])
@jwt_required()
def toggle_task(task_id):
    student_id = get_jwt_identity() # Use token ID for security
    
    new_status = DailyTask.toggle_completion(task_id, student_id)
    if new_status is None:
        return jsonify({"message": "Task not found"}), 404
        
    return jsonify({"message": "Task updated", "isCompleted": new_status}), 200

@daily_tasks_bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    student_id = get_jwt_identity()
    
    success = DailyTask.delete(task_id, student_id)
    if not success:
        return jsonify({"message": "Task not found"}), 404
        
    return jsonify({"message": "Task deleted"}), 200
