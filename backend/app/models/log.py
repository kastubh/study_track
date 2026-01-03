from app.extensions import mongo
from datetime import datetime
from bson.objectid import ObjectId

class DailyLog:
    @staticmethod
    def create(student_id, subject_id, date_str, hours_spent, notes):
        log = {
            "studentId": student_id,
            "subjectId": subject_id,
            "date": date_str, # ISO string YYYY-MM-DD
            "hoursSpent": hours_spent,
            "notes": notes,
            "createdAt": datetime.utcnow()
        }
        result = mongo.db.daily_logs.insert_one(log)
        
        # Update actual hours in timetable for that day
        # First, find the day of week from the date
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_of_week = date_obj.weekday() # 0=Monday, 6=Sunday
        
        # Increment actual hours
        mongo.db.timetables.update_one(
            {
                "studentId": student_id,
                "subjectId": subject_id,
                "dayOfWeek": day_of_week
            },
            {
                "$inc": {"actualHours": hours_spent}
            }
        )
        return str(result.inserted_id)
        
    @staticmethod
    def delete_all(student_id):
        print(f"DEBUG: DailyLog.delete_all called for student_id: {student_id}")
        # 1. Delete all logs
        result = mongo.db.daily_logs.delete_many({"studentId": student_id})
        print(f"DEBUG: Deleted {result.deleted_count} logs")
        
        # 2. Reset actualHours in timetables to 0
        mongo.db.timetables.update_many(
            {"studentId": student_id},
            {"$set": {"actualHours": 0}}
        )
        print("DEBUG: Reset actualHours in timetables")
        
        return result.deleted_count
