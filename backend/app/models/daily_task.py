from app.extensions import mongo
from datetime import datetime
from bson.objectid import ObjectId

class DailyTask:
    @staticmethod
    def create(student_id, title, date_str):
        task = {
            "studentId": student_id,
            "title": title,
            "date": date_str, # YYYY-MM-DD
            "isCompleted": False,
            "createdAt": datetime.utcnow()
        }
        result = mongo.db.daily_tasks.insert_one(task)
        return str(result.inserted_id)

    @staticmethod
    def get_by_date(student_id, date_str):
        tasks = list(mongo.db.daily_tasks.find({
            "studentId": student_id,
            "date": date_str
        }))
        for task in tasks:
            task['_id'] = str(task['_id'])
        return tasks

    @staticmethod
    def toggle_completion(task_id, student_id):
        task = mongo.db.daily_tasks.find_one({"_id": ObjectId(task_id), "studentId": student_id})
        if not task:
            return None
        
        new_status = not task.get('isCompleted', False)
        mongo.db.daily_tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"isCompleted": new_status}}
        )
        return new_status

    @staticmethod
    def delete(task_id, student_id):
        result = mongo.db.daily_tasks.delete_one({"_id": ObjectId(task_id), "studentId": student_id})
        return result.deleted_count > 0
