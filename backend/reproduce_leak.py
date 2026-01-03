import sys
import os
from datetime import datetime, timedelta

# Add request to path to allow importing app
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import mongo
from app.services.stats_service import StatsService
from app.models.log import DailyLog

app = create_app()

def reproduce():
    with app.app_context():
        # Setup
        student_id = "test_student_leak"
        
        # Dates
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        today_str = today.strftime('%Y-%m-%d')
        yesterday_str = yesterday.strftime('%Y-%m-%d')
        
        print(f"Today: {today_str}")
        print(f"Yesterday: {yesterday_str}")

        # Clean up
        mongo.db.daily_logs.delete_many({"studentId": student_id})
        mongo.db.timetables.delete_many({"studentId": student_id})
        
        # 1. Create Log for Today (5 hours)
        DailyLog.create(student_id, "Math", today_str, 5.0, "Today study")
        
        # 2. Create Log for Yesterday (2 hours)
        DailyLog.create(student_id, "Physics", yesterday_str, 2.0, "Yesterday study")
        
        # 3. Fetch Stats for Yesterday
        print("\n--- Fetching Stats for Yesterday ---")
        stats_yesterday = StatsService.calculate_stats(student_id, period='daily', target_date_str=yesterday_str)
        
        total_hours = stats_yesterday['totalHours']
        print(f"Total Hours for Yesterday: {total_hours}")
        
        breakdown = stats_yesterday['subjectBreakdown']
        print("Breakdown:", breakdown)
        
        # Check
        found_math = any(d['subjectId'] == "Math" for d in breakdown)
        found_physics = any(d['subjectId'] == "Physics" for d in breakdown)
        
        if found_math:
            print("FAIL: Found Math (Today's log) in Yesterday's stats!")
        else:
            print("PASS: Math (Today's log) correctly excluded.")
            
        if not found_physics:
             print("FAIL: Physics (Yesterday's log) NOT found!")
        else:
             print("PASS: Physics found.")

        if total_hours == 2.0:
            print("SUCCESS: Total hours match expected (2.0)")
        else:
            print(f"FAIL: Total hours {total_hours} != 2.0")

if __name__ == "__main__":
    reproduce()
