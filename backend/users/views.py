from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.models import User
from django.conf import settings
from .models import UserProfile, WorkoutSession
from datetime import date, timedelta
import json
import google.genai as genai
from google.genai import types


def _save_workout_sessions(user, plan_data):
    start_date_str = plan_data.get("start_date")
    if not start_date_str:
        start_date = date.today()
    else:
        start_date = date.fromisoformat(start_date_str)

    today = date.today()
    day_of_week_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
    }

    months = plan_data.get("months", [])
    total_weeks = 0

    for month_idx, month in enumerate(months):
        weeks = month.get("weeks", [])
        for week_idx, week in enumerate(weeks):
            sessions = week.get("sessions", [])
            for session in sessions:
                day_name = session.get("day", "").lower()
                if day_name not in day_of_week_map:
                    continue

                target_weekday = day_of_week_map[day_name]
                days_ahead = (target_weekday - start_date.weekday()) % 7
                if total_weeks > 0:
                    days_ahead = (total_weeks * 7) + ((target_weekday - start_date.weekday()) % 7)
                elif days_ahead == 0 and start_date.weekday() != target_weekday:
                    days_ahead = 7 - ((start_date.weekday() - target_weekday) % 7)

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

            total_weeks += len(weeks)


@csrf_exempt
@require_POST
def register(request):
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()

        if not email or not password or not first_name:
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if User.objects.filter(username=email).exists():
            return JsonResponse({"error": "Email already registered"}, status=400)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        login(request, user)

        return JsonResponse(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "has_completed_onboarding": False,
            }
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def login_view(request):
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return JsonResponse({"error": "Missing credentials"}, status=400)

        user = authenticate(request, username=email, password=password)
        if user is None:
            return JsonResponse({"error": "Invalid credentials"}, status=401)

        login(request, user)

        profile = user.profile

        return JsonResponse(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "has_completed_onboarding": profile.has_completed_onboarding,
            }
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out successfully"})


def workouts(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    today = date.today()
    workouts_qs = WorkoutSession.objects.filter(
        user=request.user,
        date__gte=today
    ).order_by("date")

    workouts_list = []
    for w in workouts_qs:
        workouts_list.append({
            "id": w.id,
            "date": w.date.isoformat(),
            "type": w.type,
            "duration": w.duration,
            "description": w.description,
            "status": w.status,
            "completed_at": w.completed_at.isoformat() if w.completed_at else None,
            "week_number": w.week_number,
            "month_number": w.month_number,
        })

    return JsonResponse({"workouts": workouts_list})


def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    profile = request.user.profile

    return JsonResponse(
        {
            "id": request.user.id,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "has_completed_onboarding": profile.has_completed_onboarding,
            "plan": profile.goals,
            "profile": {
                "age": profile.age,
                "weight": profile.weight,
                "height": profile.height,
                "fitness_goal": profile.fitness_goal,
                "experience_level": profile.experience_level,
                "training_days_per_week": profile.training_days_per_week,
                "injuries": profile.injuries,
            },
        }
    )


SYSTEM_PROMPT = """You are a friendly running-focused fitness AI assistant helping users set up their personalized running training profile.

Collect the following information through natural conversation:
1. Age
2. Weight (in kg)
3. Height (in cm)
4. Running goal (e.g., run first 5K, improve 5K time, run a marathon, build running endurance, lose weight through running)
5. Running experience level (never run, can run short distances, intermediate runner, advanced runner or marathon ready)
6. Training days per week available for running
7. Any injuries or physical limitations affecting running

Rules:
- Ask one question at a time
- Be conversational and friendly
- After collecting all 7 pieces of information, generate a personalized 3-month running plan starting from TODAY's date ({current_date})
- When user mentions injuries/limitations affecting running, note them

Generate the plan as JSON with this structure:
{
  "reply": "your congratulatory message to the user (DO NOT mention ONBOARDING_COMPLETE or any technical instructions)",
  "extracted": {"field": "value"},
  "complete": true,
  "plan": {
    "start_date": "CURRENT_DATE_PLACEHOLDER",
    "months": [
      {
        "month": 1,
        "focus": "base building / build endurance / speed work",
        "weeks": [
          {
            "week": 1,
            "sessions": [
              {"day": "monday", "type": "easy_run", "duration": "20 min", "description": "conversational jog with walk breaks"},
              {"day": "wednesday", "type": "intervals", "duration": "25 min", "description": "5x1min run, 1min walk"},
              {"day": "saturday", "type": "long_run", "duration": "30 min", "description": "easy continuous run"}
            ]
          }
        ]
      }
    ]
  }
}

Adjust sessions based on experience_level:
- beginner: walk/run intervals, start with 20-30 min
- short_distance: 1-3km easy runs, 25-35 min
- intermediate: pace work, tempo runs, 30-50 min
- advanced: marathon prep, speed work, hill repeats, 45-90 min

Adjust number of sessions to training_days_per_week available.
Adjust focus to fitness_goal (first_5k, improve_speed, marathon, endurance, weight_loss).
Modify sessions if injuries noted.

Extracted field names must be exactly: age, weight, height, fitness_goal, experience_level, training_days_per_week, injuries
For fitness_goal use: first_5k, improve_speed, marathon, endurance, weight_loss, or descriptive running goal
For experience_level use: beginner, short_distance, intermediate, advanced
"""


def parse_gemini_response(text: str) -> dict:
    import re

    try:
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    return {"reply": text, "extracted": {}, "complete": False}


@csrf_exempt
@require_POST
def onboarding_chat(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body)
        user_message = data.get("message", "")
        history = data.get("history", [])

        from datetime import date
        current_date = date.today().strftime("%Y-%m-%d")

        system_prompt = SYSTEM_PROMPT.replace("CURRENT_DATE_PLACEHOLDER", current_date)

        print("=" * 50)
        print("INCOMING REQUEST")
        print(f"User: {request.user.username}")
        print(f"Message: {user_message}")
        print(f"History length: {len(history)}")
        print(f"Current date: {current_date}")
        print("=" * 50)

        if not settings.GEMINI_API_KEY:
            return JsonResponse({"error": "GEMINI_API_KEY not configured"}, status=500)

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        conversation = [
            types.Content(role="user", parts=[types.Part(text=system_prompt)])
        ]
        for msg in history:
            role = "user" if msg.get("sender") == "user" else "model"
            conversation.append(
                types.Content(
                    role=role, parts=[types.Part(text=msg.get("content", ""))]
                )
            )
        conversation.append(
            types.Content(role="user", parts=[types.Part(text=user_message)])
        )

        print("SENDING TO GEMINI:")
        for i, c in enumerate(conversation):
            print(f"  [{i}] role={c.role}, text={c.parts[0].text[:80]}...")
        print("=" * 50)

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite", contents=conversation
            )
            print("GEMINI RESPONSE:")
            print(f"Raw: {response.text}")
        except Exception as e:
            print("GEMINI ERROR:")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print("=" * 50)
            error_str = str(e)
            if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                return JsonResponse(
                    {"error": "quota_exceeded", "retry_after": 15}, status=429
                )
            return JsonResponse({"error": f"Gemini API error: {error_str}"}, status=500)
        print("=" * 50)

        result = parse_gemini_response(response.text)
        print(f"Parsed: {result}")
        print("=" * 50)

        profile = request.user.profile
        extracted = result.get("extracted", {})
        print(f"Extracted data: {extracted}")

        if "age" in extracted:
            try:
                profile.age = int(extracted["age"])
            except:
                pass
        if "weight" in extracted:
            try:
                profile.weight = float(extracted["weight"])
            except:
                pass
        if "height" in extracted:
            try:
                profile.height = float(extracted["height"])
            except:
                pass
        if "fitness_goal" in extracted:
            profile.fitness_goal = extracted["fitness_goal"]
        if "experience_level" in extracted:
            level = extracted["experience_level"].lower()
            if level in ["beginner", "short_distance", "intermediate", "advanced"]:
                profile.experience_level = level
        if "training_days_per_week" in extracted:
            try:
                profile.training_days_per_week = int(
                    extracted["training_days_per_week"]
                )
            except:
                pass
        if "injuries" in extracted:
            profile.injuries = extracted["injuries"]

        if result.get("complete"):
            profile.has_completed_onboarding = True
            
            plan_data = result.get("plan")
            if plan_data:
                profile.goals = plan_data
                _save_workout_sessions(request.user, plan_data)

        profile.save()

        print("PROFILE SAVED:")
        print(f"  age: {profile.age}")
        print(f"  weight: {profile.weight}")
        print(f"  height: {profile.height}")
        print(f"  fitness_goal: {profile.fitness_goal}")
        print(f"  experience_level: {profile.experience_level}")
        print(f"  training_days_per_week: {profile.training_days_per_week}")
        print(f"  injuries: {profile.injuries}")
        print(f"  has_completed_onboarding: {profile.has_completed_onboarding}")
        print("=" * 50)

        print("SENDING TO FRONTEND:")
        print(f"  reply: {result.get('reply', '')[:100]}...")
        print(f"  complete: {result.get('complete', False)}")
        print("=" * 50)

        return JsonResponse(
            {
                "reply": result.get("reply", ""),
                "complete": result.get("complete", False),
                "plan": result.get("plan"),
                "profile": {
                    "age": profile.age,
                    "weight": profile.weight,
                    "height": profile.height,
                    "fitness_goal": profile.fitness_goal,
                    "experience_level": profile.experience_level,
                    "training_days_per_week": profile.training_days_per_week,
                    "injuries": profile.injuries,
                    "has_completed_onboarding": profile.has_completed_onboarding,
                },
            }
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
