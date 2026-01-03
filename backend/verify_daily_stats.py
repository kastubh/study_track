from app import create_app
from app.extensions import mongo
from app.services.stats_service import StatsService
import uuid
from datetime import datetime

app = create_app()

with app.app_context():
    # 1. Setup
    student_id = "test_daily_" + str(uuid.uuid4())
    print(f"Testing with Student ID: {student_id}")
    today_str = datetime.now().strftime('%Y-%m-%d')
    today_weekday = datetime.now().weekday()
    
    # 2. Insert Timetable (Plan for Today)
    mongo.db.timetables.insert_one({
        "studentId": student_id,
        "subjectId": "TodaySubject",
        "dayOfWeek": today_weekday, 
        "plannedHours": 3
    })
    
    # 3. Insert Logs (Actual for Today)
    mongo.db.daily_logs.insert_one({
        "studentId": student_id,
        "subjectId": "TodaySubject",
        "date": today_str,
        "hoursSpent": 2
    })
    
    # 4. Execute
    print("Calculating daily stats...")
    stats = StatsService.calculate_stats(student_id, period='daily')
    print("Stats Response:", stats)
    
    # 5. Verify
    try:
        assert stats['totalHours'] == 2.0, f"Expected 2.0 total hours, got {stats['totalHours']}"
        assert stats['plannedHours'] == 3.0, f"Expected 3.0 planned hours, got {stats['plannedHours']}"
        
        subj = stats['subjectBreakdown'][0]
        assert subj['subjectId'] == "TodaySubject"
        assert subj['hours'] == 2.0
        assert subj['planned'] == 3.0
        
        print("\n✅ Daily Stats Verification Successful!")
    except AssertionError as e:
        print(f"\n❌ Verification Failed: {e}")
    finally:
        # 6. Cleanup
        mongo.db.timetables.delete_many({"studentId": student_id})
        mongo.db.daily_logs.delete_many({"studentId": student_id})
