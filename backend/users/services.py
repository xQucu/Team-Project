from django.contrib.auth.models import User
from .models import WorkoutSession
from datetime import date, timedelta


def save_workout_sessions(user: User, plan_data: dict) -> int:
    """
    Save workout sessions from plan data to the database.
    Returns the number of sessions created.
    """
    start_date_str = plan_data.get("start_date")
    if not start_date_str:
        start_date = date.today()
    else:
        start_date = date.fromisoformat(start_date_str)

    today = date.today()
    day_of_week_map = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }

    months = plan_data.get("months", [])
    total_weeks = 0
    sessions_created = 0

    for month_idx, month in enumerate(months):
        weeks = month.get("weeks", [])
        for week_idx, week in enumerate(weeks):
            sessions = week.get("sessions", [])
            for session in sessions:
                day_name = session.get("day", "").lower()
                if day_name not in day_of_week_map:
                    continue

                target_weekday = day_of_week_map[day_name]
                
                if total_weeks > 0:
                    days_ahead = (total_weeks * 7) + ((target_weekday - start_date.weekday()) % 7)
                else:
                    days_ahead = (target_weekday - start_date.weekday()) % 7
                    if start_date.weekday() > target_weekday:
                        days_ahead += 7

                if days_ahead == 0 and start_date.weekday() != target_weekday:
                    days_ahead = 7

                session_date = start_date + timedelta(days=days_ahead)
                
                if session_date < today:
                    continue

                week_num = total_weeks + week_idx + 1
                month_num = month_idx + 1

                WorkoutSession.objects.update_or_create(
                    user=user,
                    date=session_date,
                    defaults={
                        "type": session.get("type", "easy_run"),
                        "duration": session.get("duration", "30 min"),
                        "description": session.get("description", ""),
                        "status": "planned",
                        "week_number": week_num,
                        "month_number": month_num,
                    }
                )
                sessions_created += 1

            total_weeks += len(weeks)

    return sessions_created


def get_user_workouts(user: User, from_date: date = None):
    """Get workouts for a user starting from a given date."""
    if from_date is None:
        from_date = date.today()
    
    return WorkoutSession.objects.filter(
        user=user,
        date__gte=from_date
    ).order_by("date")


def format_workout_for_api(workout: WorkoutSession) -> dict:
    """Format a WorkoutSession for API response."""
    return {
        "id": workout.id,
        "date": workout.date.isoformat(),
        "type": workout.type,
        "duration": workout.duration,
        "description": workout.description,
        "status": workout.status,
        "completed_at": workout.completed_at.isoformat() if workout.completed_at else None,
        "week_number": workout.week_number,
        "month_number": workout.month_number,
    }