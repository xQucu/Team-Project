import json
from datetime import date

import google.genai as genai
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from google.genai import types

from .models import UserProfile, WorkoutSession
from .parsers import parse_gemini_response
from .prompts import get_system_prompt
from .services import (
    apply_workout_modification,
    create_workout,
    delete_workout,
    format_workout_for_api,
    get_user_workouts,
    save_workout_sessions,
)

CHAT_MODEL = "gemini-3.1-flash-lite-preview"


@csrf_exempt
@require_POST
def register(request):
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        name = data.get("name", "").strip()

        if not email or not password or not name:
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if User.objects.filter(username=email).exists():
            return JsonResponse({"error": "Email already registered"}, status=400)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name,
            last_name="",
        )

        login(request, user)

        return JsonResponse(
            {
                "id": user.id,
                "email": user.email,
                "name": user.first_name,
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
                "name": user.first_name,
                "has_completed_onboarding": profile.has_completed_onboarding,
            }
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out successfully"})


def workouts(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    today = date.today()
    workouts_qs = get_user_workouts(request.user, today)

    workouts_list = [format_workout_for_api(w) for w in workouts_qs]

    return JsonResponse({"workouts": workouts_list})


@csrf_exempt
@require_POST
def modify_workout(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    workout_id = data.get("workout_id")
    new_date = data.get("new_date")
    new_type = data.get("new_type")
    new_duration = data.get("new_duration")
    new_description = data.get("new_description")

    if not workout_id:
        if not new_date:
            return JsonResponse({"error": "date required for new workout"}, status=400)
        result = create_workout(
            request.user,
            date_str=new_date,
            type=new_type or "easy_run",
            duration=new_duration or "30 min",
            description=new_description or "",
        )
    elif new_date == "delete":
        result = delete_workout(request.user, workout_id)
    else:
        result = apply_workout_modification(
            request.user,
            workout_id,
            new_date=new_date,
            new_type=new_type,
            new_duration=new_duration,
            new_description=new_description,
        )

    return JsonResponse(result)


@csrf_exempt
@require_POST
def update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body)
        profile = request.user.profile

        if "age" in data:
            profile.age = data["age"]
        if "weight" in data:
            profile.weight = data["weight"]
        if "height" in data:
            profile.height = data["height"]
        if "fitness_goal" in data:
            profile.fitness_goal = data["fitness_goal"]
        if "experience_level" in data:
            profile.experience_level = data["experience_level"]
        if "training_days_per_week" in data:
            profile.training_days_per_week = data["training_days_per_week"]
        if "injuries" in data:
            profile.injuries = data["injuries"]
        if "name" in data:
            request.user.first_name = data["name"].strip()
            request.user.last_name = ""
            request.user.save()

        profile.save()
        return JsonResponse({"message": "Profile updated successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    profile = request.user.profile

    return JsonResponse(
        {
            "id": request.user.id,
            "email": request.user.email,
            "name": request.user.first_name,
            "has_completed_onboarding": profile.has_completed_onboarding,
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


@csrf_exempt
@require_POST
def onboarding_chat(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body)
        user_message = data.get("message", "")
        history = data.get("history", [])

        current_date = date.today().strftime("%d.%m.%Y")

        system_prompt = get_system_prompt().replace(
            "CURRENT_DATE_PLACEHOLDER", current_date
        )

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
                model=CHAT_MODEL, contents=conversation
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
            if "Temporary failure in name resolution" in error_str:
                return JsonResponse(
                    {
                        "error": "Gemini API connection failed. Please check your internet connection."
                    },
                    status=503,
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
                save_workout_sessions(request.user, plan_data)

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


@csrf_exempt
@require_POST
def chat(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body)
        user_message = data.get("message", "")

        # Get user context for the prompt
        import re

        from .services import (
            apply_workout_modification,
            create_workout,
            delete_workout,
            get_user_chat_context,
        )

        user_context = get_user_chat_context(request.user)

        # Get system prompt with user context
        from .prompts import get_chat_system_prompt

        system_prompt = get_chat_system_prompt(user_context)

        history = data.get("history", [])

        print("=" * 50)
        print("CHAT REQUEST")
        print(f"User: {request.user.username}")
        print(f"Message: {user_message}")
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

        try:
            response = client.models.generate_content(
                model=CHAT_MODEL, contents=conversation
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
            if "Temporary failure in name resolution" in error_str:
                return JsonResponse(
                    {
                        "error": "Gemini API connection failed. Please check your internet connection."
                    },
                    status=503,
                )
            return JsonResponse({"error": f"Gemini API error: {error_str}"}, status=500)
        print("=" * 50)

        # Parse response
        result = parse_gemini_response(response.text)

        print(f"Parsed result: {result}")

        reply = result.get("reply") or "I've updated your training plan!"

        # Handle modifications - check if this is a clear or vague command
        modifications = result.get("modifications", [])
        proposals = result.get("proposal", {})

        applied_modifications = []
        confirmation_needed = None
        newly_created = 0

        if modifications:
            for mod in modifications:
                workout_id = mod.get("workout_id")
                action = mod.get("action", "modify")

                if action == "delete" and workout_id:
                    mod_result = delete_workout(request.user, workout_id)
                    if mod_result.get("success"):
                        applied_modifications.append(mod_result)
                    else:
                        print(f"DELETE FAILED: {mod_result}")
                elif workout_id:
                    mod_result = apply_workout_modification(
                        request.user,
                        workout_id,
                        new_date=mod.get("new_date"),
                        new_type=mod.get("new_type"),
                        new_duration=mod.get("new_duration"),
                        new_description=mod.get("new_description"),
                    )
                    if mod_result.get("success"):
                        applied_modifications.append(mod_result)
                    else:
                        print(f"MODIFICATION FAILED: {mod_result}")
            if applied_modifications:
                reply = reply or "I've updated your training plan!"

        elif proposals:
            workout_ids = proposals.get("workout_ids", [])
            change_text = proposals.get("change", "")

            print(
                f"PROPOSAL PROCESSING: workout_ids={workout_ids}, change={change_text}"
            )

            new_duration = None
            duration_match = re.search(
                r"(\d+)\s*(min|minute|minutes|hour|hr|hours)",
                change_text,
                re.IGNORECASE,
            )
            if duration_match:
                amount = int(duration_match.group(1))
                unit = duration_match.group(2).lower()
                if unit.startswith("hour") or unit.startswith("hr"):
                    amount = amount * 60
                new_duration = f"{amount} min"
                print(f"EXTRACTED DURATION: {new_duration}")

            new_type = None
            workout_types = [
                "easy_run",
                "tempo",
                "intervals",
                "long_run",
                "speed",
                "hill",
                "recovery",
                "walk_run",
                "rest",
            ]
            for wt in workout_types:
                if wt in change_text.lower():
                    new_type = wt
                    break

            if new_type:
                print(f"EXTRACTED TYPE: {new_type}")

            if workout_ids and (new_duration or new_type):
                for wid in workout_ids:
                    mod_result = apply_workout_modification(
                        request.user,
                        wid,
                        new_duration=new_duration,
                        new_type=new_type,
                    )
                    if mod_result.get("success"):
                        applied_modifications.append(mod_result)
                if applied_modifications:
                    reply = reply or f"Updated {len(applied_modifications)} workouts!"
                    print(f"APPLIED {len(applied_modifications)} MODIFICATIONS")

            if not applied_modifications:
                confirmation_needed = {
                    "workout_ids": workout_ids,
                    "proposed_change": change_text,
                    "user_message": user_message,
                }
                reply = None

        plan_data = result.get("plan")
        if plan_data:
            newly_created = save_workout_sessions(request.user, plan_data)
            reply = reply or "I've created your new workout plan!"

        return JsonResponse(
            {
                "reply": reply,
                "modifications_applied": applied_modifications,
                "confirmation_needed": confirmation_needed,
                "newly_created": newly_created,
            }
        )

    except Exception as e:
        print(f"Chat error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
