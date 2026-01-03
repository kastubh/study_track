from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import mongo, jwt, scheduler

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # Initialize scheduler
    if not scheduler.running:
        scheduler.start()

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.timetable import timetable_bp
    from app.routes.logs import logs_bp
    from app.routes.stats import stats_bp
    from app.routes.notifications import notifications_bp
    from app.routes.daily_tasks import daily_tasks_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
    app.register_blueprint(logs_bp, url_prefix='/api/logs')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(daily_tasks_bp, url_prefix='/api/daily-tasks')

    @app.route('/')
    def index():
        return {"message": "StudyTrack API is running"}

    return app
