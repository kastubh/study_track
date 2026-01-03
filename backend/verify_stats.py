from app import create_app
from app.extensions import mongo
from app.services.stats_service import StatsService
from datetime import datetime, timedelta
import uuid

app = create_app()

with app.app_context():
    # 1. Setup
    student_id = "test_student_" + str(uuid.uuid4())
    print(f"Testing with Student ID: {student_id}")
    
    # Calculate start of week to ensure we insert logs in the current week
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    monday_str = start_of_week.strftime('%Y-%m-%d')
    
    # 2. Insert Timetable (Planned)
    # Math: 2 hours on Monday
    mongo.db.timetables.insert_one({
        "studentId": student_id,
        "subjectId": "Math",
        "dayOfWeek": 0, 
        "plannedHours": 2
    })
    # Science: 3 hours on Tuesday
    mongo.db.timetables.insert_one({
        "studentId": student_id,
        "subjectId": "Science",
        "dayOfWeek": 1, 
        "plannedHours": 3
    })
    
    # 3. Insert Logs (Actual)
    # 1.5 hours Math on Monday (which is in current week)
    mongo.db.daily_logs.insert_one({
        "studentId": student_id,
        "subjectId": "Math",
        "date": monday_str,
        "hoursSpent": 1.5
    })
    
    # 4. Execute
    print("Calculating stats...")
    stats = StatsService.calculate_stats(student_id)
    print("Stats Response:", stats)
    
    # 5. Verify
    # Expected: 
    # Math: Actual 1.5, Planned 2
    # Science: Actual 0, Planned 3
    # Total Hours: 1.5
    # Total Planned: 5
    
    try:
        assert stats['totalHours'] == 1.5, f"Expected 1.5 total hours, got {stats['totalHours']}"
        assert stats['plannedHours'] == 5.0, f"Expected 5.0 planned hours, got {stats['plannedHours']}"
        
        math_stat = next(s for s in stats['subjectBreakdown'] if s['subjectId'] == 'Math')
        assert math_stat['hours'] == 1.5, f"Expected 1.5 actual math hours, got {math_stat['hours']}"
        assert math_stat['planned'] == 2.0, f"Expected 2.0 planned math hours, got {math_stat['planned']}"
        
        print("\n✅ Verification Successful!")
    except AssertionError as e:
        print(f"\n❌ Verification Failed: {e}")
    finally:
        # 6. Cleanup
        print("Cleaning up test data...")
        mongo.db.timetables.delete_many({"studentId": student_id})
        mongo.db.daily_logs.delete_many({"studentId": student_id})
