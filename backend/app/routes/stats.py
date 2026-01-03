from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.stats_service import StatsService

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/<student_id>', methods=['GET'])
@jwt_required()
def get_stats(student_id):
    period = request.args.get('period', 'weekly')
    date_param = request.args.get('date')
    stats = StatsService.calculate_stats(student_id, period, date_param)
    return jsonify(stats), 200
