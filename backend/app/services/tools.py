"""Tool registry: 6 agent tools, all async, called by the agent loop."""
from __future__ import annotations

import json
import time
from typing import Any

import structlog
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.models import Profile, WorkoutPlan, NutritionPlan, PlanAdjustment
from app.services.openrouter import openrouter_client, request_hash
from app.services.verifier import verify_and_fix_json
from app.services.memory import set_memory, get_memory
from app.services.youtube import get_exercise_video_url

log = structlog.get_logger(__name__)
settings = get_settings()


# ── Safety Preamble ────────────────────────────────────────────────────────────

SAFETY_PREAMBLE = """IMPORTANT SAFETY RULES — MUST FOLLOW:
1. You are AROMI, an AI fitness coach. You are NOT a doctor.
2. NEVER diagnose or prescribe medication.
3. NEVER make unverified medical claims.
4. For injuries/pain/medical conditions: always recommend consulting a healthcare professional.
5. Include a brief safety disclaimer in all workout and nutrition plans.
6. For injury adjustments: ALWAYS reduce intensity, suggest rest days, recommend doctor visit.
"""

# ── Prompt Templates ───────────────────────────────────────────────────────────

WORKOUT_SYSTEM = SAFETY_PREAMBLE + """
You are a certified AI fitness coach named AROMI.
Generate a 7-day workout plan as VALID JSON ONLY (no markdown, no commentary).

Required JSON schema:
{
  "plan_name": "string",
  "summary": "string",
  "disclaimer": "string",
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "type": "training|rest|active_recovery",
      "warmup": [{"exercise": "str", "duration_mins": 5}],
      "main_workout": [
        {
          "exercise": "str",
          "sets": "3",
          "reps": "10-12",
          "rest_seconds": 60,
          "notes": "str",
          "target_muscles": ["Quads", "Glutes"],
          "alternatives": [
            {"exercise": "str", "notes": "str"}
          ],
          "youtube_search": "str"
        }
      ],
      "cooldown": [{"exercise": "str", "duration_mins": 5}],
      "progressive_overload": "str",
      "daily_tip": "str"
    }
  ]
}
"""

NUTRITION_SYSTEM = SAFETY_PREAMBLE + """
You are AROMI, an AI nutrition coach.
Generate a 7-day meal plan as VALID JSON ONLY (no markdown, no commentary).

Required JSON schema:
{
  "plan_name": "string",
  "summary": "string",
  "disclaimer": "string",
  "daily_calorie_target": 2000,
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "meals": {
        "breakfast": { "name": "str", "ingredients": ["str"], "calories": 400, "protein_g": 20.0, "carbs_g": 50.0, "fat_g": 10.0 },
        "lunch": { "name": "str", "ingredients": ["str"], "calories": 600, "protein_g": 30.0, "carbs_g": 60.0, "fat_g": 15.0 },
        "dinner": { "name": "str", "ingredients": ["str"], "calories": 700, "protein_g": 35.0, "carbs_g": 70.0, "fat_g": 18.0 },
        "snacks": [ { "name": "str", "calories": 200, "protein_g": 10.0, "carbs_g": 20.0, "fat_g": 5.0 } ]
      },
      "daily_totals": {"calories": 1900, "protein_g": 95.0, "carbs_g": 200.0, "fat_g": 48.0}
    }
  ]
}
Rules:
- Keep ingredients list concise.
- Ensure daily_totals match the sum of meals.
- Output MUST be valid JSON and fit within token limits.
"""

ADJUST_SYSTEM = SAFETY_PREAMBLE + """
You are AROMI adjusting a workout plan due to a life change.
Output VALID JSON ONLY with this schema:
{
  "change_type": "str",
  "rationale": "str",
  "adjusted_days": [
    {
      "day": 1,
      "day_name": "Monday",
      "type": "training|rest|active_recovery",
      "warmup": [...],
      "main_workout": [...],
      "cooldown": [...],
      "progressive_overload": "str",
      "daily_tip": "str"
    }
  ],
  "safety_note": "str"
}
Rules:
- injury: reduce intensity, recommend doctor, add rest days
- travel: bodyweight/hotel exercises only
- mood: shorter, lighter, enjoyable sessions
- time_change: condense to fit available time
"""


# ── Tool Implementations ───────────────────────────────────────────────────────

async def tool_get_latest_plans(user_id: str, db: Session, args: dict) -> dict:
    """Return summary of the user's latest active workout + nutrition plans."""
    wp = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True
    ).order_by(WorkoutPlan.created_at.desc()).first()

    np = db.query(NutritionPlan).filter(
        NutritionPlan.user_id == user_id, NutritionPlan.is_active == True
    ).order_by(NutritionPlan.created_at.desc()).first()

    return {
        "workout_plan": {
            "exists": wp is not None,
            "version": wp.version if wp else None,
            "plan_name": wp.plan_data.get("plan_name") if wp and wp.plan_data else None,
            "created_at": str(wp.created_at) if wp else None,
        },
        "nutrition_plan": {
            "exists": np is not None,
            "version": np.version if np else None,
            "plan_name": np.plan_data.get("plan_name") if np and np.plan_data else None,
            "created_at": str(np.created_at) if np else None,
        },
    }


async def tool_generate_workout_plan(user_id: str, db: Session, args: dict) -> dict:
    """Generate a new 7-day workout plan and save it."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    goal = args.get("goal") or (profile.goal if profile else "general_wellness")
    location = args.get("location") or (profile.location if profile else "home")
    equipment = args.get("equipment") or (profile.equipment if profile else "bodyweight")
    minutes = args.get("minutes_per_day") or (profile.minutes_per_day if profile else 30)
    days = args.get("days_per_week") or (profile.days_per_week if profile else 5)
    level = args.get("fitness_level") or (profile.fitness_level if profile else "beginner")
    constraints = args.get("constraints") or (profile.injuries if profile else "") or "None"

    user_prompt = f"""Create a 7-day workout plan:
- Goal: {goal}
- Location: {location}
- Equipment: {equipment or 'bodyweight only'}
- Minutes/day: {minutes}
- Days/week: {days}
- Fitness level: {level}
- Injuries/constraints: {constraints}
Output ONLY the JSON."""

    messages = [
        {"role": "system", "content": WORKOUT_SYSTEM},
        {"role": "user", "content": user_prompt},
    ]

    start = time.time()
    plan_data = await openrouter_client.get_json(messages, temperature=0.3)
    latency = int((time.time() - start) * 1000)

    # Verify + fix
    plan_data = await verify_and_fix_json(plan_data, "workout", messages)

    # Add YouTube links
    if isinstance(plan_data, dict) and "days" in plan_data:
        for day in plan_data["days"]:
            for ex in day.get("main_workout", []):
                search_term = ex.get("youtube_search") or ex.get("exercise", "")
                ex["youtube_url"] = get_exercise_video_url(search_term)

    # Deactivate old plans
    db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True
    ).update({"is_active": False})

    version = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user_id).count() + 1
    r_hash = request_hash(user_id, {"goal": goal, "location": location, "type": "workout"})

    wp = WorkoutPlan(
        user_id=user_id, version=version, plan_data=plan_data,
        request_hash=r_hash, model_used=settings.OPENROUTER_MODEL,
        latency_ms=latency, is_active=True,
    )
    db.add(wp)
    db.commit()
    log.info("workout_generated user=%s version=%d latency_ms=%d", user_id, version, latency)

    return {
        "status": "success",
        "version": version,
        "plan_name": plan_data.get("plan_name") if isinstance(plan_data, dict) else "Workout Plan",
        "days_generated": len(plan_data.get("days", [])) if isinstance(plan_data, dict) else 0,
    }


async def tool_generate_nutrition_plan(user_id: str, db: Session, args: dict) -> dict:
    """Generate a new 7-day nutrition plan and save it."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    calories = args.get("calorie_target") or (profile.calorie_target if profile else 2000)
    diet = args.get("diet_type") or (profile.diet_type if profile else "veg")
    allergies = args.get("allergies") or (profile.allergies if profile else "") or "None"
    cuisine = args.get("cuisine_preference") or (profile.cuisine_preference if profile else "Indian")

    user_prompt = f"""Create a 7-day meal plan:
- Daily calorie target: {calories} kcal
- Diet type: {diet}
- MUST AVOID (allergies): {allergies}
- Cuisine: {cuisine}
- Include breakfast, lunch, dinner, snacks.
Output ONLY the JSON."""

    messages = [
        {"role": "system", "content": NUTRITION_SYSTEM},
        {"role": "user", "content": user_prompt},
    ]

    start = time.time()
    plan_data = await openrouter_client.get_json(messages, temperature=0.3)
    latency = int((time.time() - start) * 1000)

    # Verify + fix
    plan_data = await verify_and_fix_json(plan_data, "nutrition", messages)

    # Deactivate old plans
    db.query(NutritionPlan).filter(
        NutritionPlan.user_id == user_id, NutritionPlan.is_active == True
    ).update({"is_active": False})

    version = db.query(NutritionPlan).filter(NutritionPlan.user_id == user_id).count() + 1
    r_hash = request_hash(user_id, {"calories": calories, "diet": diet, "type": "nutrition"})

    np_obj = NutritionPlan(
        user_id=user_id, version=version, plan_data=plan_data,
        request_hash=r_hash, model_used=settings.OPENROUTER_MODEL,
        latency_ms=latency, is_active=True,
    )
    db.add(np_obj)
    db.commit()
    log.info("nutrition_generated user=%s version=%d latency_ms=%d", user_id, version, latency)

    return {
        "status": "success",
        "version": version,
        "plan_name": plan_data.get("plan_name") if isinstance(plan_data, dict) else "Meal Plan",
        "daily_calorie_target": plan_data.get("daily_calorie_target") if isinstance(plan_data, dict) else calories,
    }


async def tool_adjust_plans(user_id: str, db: Session, args: dict) -> dict:
    """Adjust the current active workout plan for a life change."""
    change_type = args.get("change_type", "general")
    details = args.get("details", "")
    days_to_adjust = int(args.get("days_to_adjust", 4))

    active_plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True
    ).order_by(WorkoutPlan.created_at.desc()).first()

    if not active_plan:
        return {"status": "error", "message": "No active workout plan found. Generate one first."}

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    original_days = []
    if active_plan.plan_data and "days" in active_plan.plan_data:
        original_days = active_plan.plan_data["days"][:days_to_adjust]

    messages = [
        {"role": "system", "content": ADJUST_SYSTEM},
        {"role": "user", "content": f"""Adjust the next {days_to_adjust} days of the workout plan.
Change type: {change_type}
Details: {details}
User goal: {profile.goal if profile else 'general_wellness'}
User level: {profile.fitness_level if profile else 'beginner'}
Current plan days to adjust:
{json.dumps(original_days, indent=2)}
Output ONLY the JSON."""},
    ]

    adjusted_data = await openrouter_client.get_json(messages, temperature=0.2)

    # Save adjustment record
    adj = PlanAdjustment(
        workout_plan_id=active_plan.id,
        change_type=change_type,
        reason=details,
        original_snippet=original_days,
        adjusted_snippet=adjusted_data,
        rationale=adjusted_data.get("rationale", "") if isinstance(adjusted_data, dict) else "",
        days_affected=days_to_adjust,
    )
    db.add(adj)

    # Patch plan data
    if isinstance(adjusted_data, dict) and "adjusted_days" in adjusted_data:
        plan_data = dict(active_plan.plan_data or {})
        existing_days = list(plan_data.get("days", []))
        for adj_day in adjusted_data["adjusted_days"]:
            idx = adj_day.get("day", 1) - 1
            if 0 <= idx < len(existing_days):
                existing_days[idx] = adj_day
        plan_data["days"] = existing_days
        active_plan.plan_data = plan_data

    db.commit()
    log.info("plan_adjusted user=%s change=%s days=%d", user_id, change_type, days_to_adjust)

    return {
        "status": "success",
        "change_type": change_type,
        "days_adjusted": days_to_adjust,
        "rationale": adjusted_data.get("rationale", "") if isinstance(adjusted_data, dict) else "",
        "safety_note": adjusted_data.get("safety_note", "") if isinstance(adjusted_data, dict) else "",
    }


async def tool_store_memory(user_id: str, db: Session, args: dict) -> dict:
    """Store a key-value memory for the user."""
    key = str(args.get("key", "")).strip()
    value = str(args.get("value", "")).strip()
    if not key or not value:
        return {"status": "error", "message": "key and value are required"}
    set_memory(user_id, key, value, db)
    log.info("memory_stored user=%s key=%s", user_id, key)
    return {"status": "success", "key": key, "value": value}


async def tool_respond(user_id: str, db: Session, args: dict) -> dict:
    """Final tool — returns the agent's text reply to the user."""
    message = args.get("message", "")
    return {"status": "respond", "message": message}


# ── Tool Registry ─────────────────────────────────────────────────────────────

TOOL_REGISTRY: dict[str, Any] = {
    "get_latest_plans": tool_get_latest_plans,
    "generate_workout_plan": tool_generate_workout_plan,
    "generate_nutrition_plan": tool_generate_nutrition_plan,
    "adjust_plans": tool_adjust_plans,
    "store_memory": tool_store_memory,
    "respond": tool_respond,
}

TOOL_DESCRIPTIONS = """Available tools:
- get_latest_plans(): Returns summary of user's current workout and nutrition plans
- generate_workout_plan(goal?, location?, equipment?, minutes_per_day?, days_per_week?, fitness_level?, constraints?): Creates a new 7-day workout plan
- generate_nutrition_plan(calorie_target?, diet_type?, allergies?, cuisine_preference?): Creates a new 7-day meal plan
- adjust_plans(change_type, details, days_to_adjust?): Adjusts active workout plan — change_type: travel|injury|mood|time_change
- store_memory(key, value): Stores a preference or constraint in long-term memory
- respond(message): Send final reply to user (always last action)"""
