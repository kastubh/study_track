from app.extensions import mongo
from bson.objectid import ObjectId

class Timetable:
    @staticmethod
    def create_or_update(student_id, subject_id, day_of_week, planned_hours, start_date=None, end_date=None):
        # Check if entry exists for this specific combination
        # Note: If we want to support multiple date ranges for same subject/day, 
        # we might need to change the unique identifier logic. 
        # For now, we update the existing one or create new.
        query = {
            "studentId": student_id,
            "subjectId": subject_id,
            "dayOfWeek": day_of_week
        }
        
        set_fields = {
            "plannedHours": planned_hours
        }
        if start_date:
            set_fields["startDate"] = start_date
        if end_date:
            set_fields["endDate"] = end_date

        update = {
            "$set": set_fields,
            "$setOnInsert": {
                "actualHours": 0
            }
        }
        mongo.db.timetables.update_one(query, update, upsert=True)

    @staticmethod
    def get_student_timetable(student_id):
        return list(mongo.db.timetables.find({"studentId": student_id}))

    @staticmethod
    def delete_all(student_id):
        print(f"DEBUG: delete_all called for student_id: {student_id} (type: {type(student_id)})")
        result = mongo.db.timetables.delete_many({"studentId": student_id})
        print(f"DEBUG: Deleted count: {result.deleted_count}")
