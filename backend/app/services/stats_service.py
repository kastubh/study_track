from app.extensions import mongo
from datetime import datetime, timedelta

class StatsService:
    @staticmethod
    def calculate_stats(student_id, period='weekly', target_date_str=None):
        # Simplified stats calculation
        # In a real app, this would aggregate logs and compare with timetable
        
        # Calculate date range based on period
        if target_date_str:
            try:
                today = datetime.strptime(target_date_str, '%Y-%m-%d')
            except:
                today = datetime.now() # Fallback
        else:
            today = datetime.now()
            
        target_dates = []
        
        if period == 'daily':
            # Just specific day
            target_dates = [today.strftime('%Y-%m-%d')]
            # For timetable, we only care about that day's day of week
            target_days_of_week = [today.weekday()]
        else:
            # Default to Weekly (Monday to Sunday)
            start_of_week = today - timedelta(days=today.weekday())
            target_dates = [(start_of_week + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
            target_days_of_week = list(range(7)) # All days

        # Fetch Logs for the period
        logs_cursor = mongo.db.daily_logs.find({
            "studentId": student_id,
            "date": {"$in": target_dates}
        })
        
        # Fetch Timetable (Plan)
        # Filter by relevant days of week if daily (optimization, though fetching all is fine too)
        timetable_query = {"studentId": student_id}
        if period == 'daily':
            timetable_query["dayOfWeek"] = target_days_of_week[0]

        timetable_cursor = mongo.db.timetables.find(timetable_query)

        # Aggregate Data
        subject_stats = {} # {subjectId: {actual: 0, planned: 0}}
        
        # 1. Process Planned Hours from Timetable
        for slot in timetable_cursor:
            subj = slot.get('subjectId')
            planned = float(slot.get('plannedHours', 0))
            if subj not in subject_stats:
                subject_stats[subj] = {'actual': 0, 'planned': 0}
            subject_stats[subj]['planned'] += planned

        # 2. Process Actual Hours from Logs
        for log in logs_cursor:
            subj = log.get('subjectId')
            actual = float(log.get('hoursSpent', 0))
            if subj not in subject_stats:
                subject_stats[subj] = {'actual': 0, 'planned': 0}
            subject_stats[subj]['actual'] += actual

        # Format Response
        total_hours = 0
        total_planned = 0
        breakdown = []

        for subj, data in subject_stats.items():
            total_hours += data['actual']
            total_planned += data['planned']
            breakdown.append({
                "subjectId": subj,
                "hours": data['actual'],
                "planned": data['planned']
            })

        return {
            "studentId": student_id,
            "period": period,
            "totalHours": total_hours,
            "plannedHours": total_planned,
            "subjectBreakdown": breakdown
        }
