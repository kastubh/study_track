from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from apscheduler.schedulers.background import BackgroundScheduler

mongo = PyMongo()
jwt = JWTManager()
scheduler = BackgroundScheduler()
