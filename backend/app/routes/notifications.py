from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/test', methods=['POST'])
@jwt_required()
def test_notification():
    # In a real app, get phone number from user profile
    # For test, allow passing it or use a default
    data = request.get_json() or {}
    to_number = data.get('phoneNumber', '+1234567890') 
    
    result = NotificationService.send_whatsapp(to_number, "This is a test message from StudyTrack.")
    return jsonify(result), 200
