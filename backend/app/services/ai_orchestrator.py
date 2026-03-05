"""AI Orchestrator – classifies intent, builds prompts, validates JSON output."""

from __future__ import annotations

import json
import time
import structlog
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.models import (
    WorkoutPlan, NutritionPlan, PlanAdjustment, Profile,
    Conversation, Message
)
from app.services.openrouter import openrouter_client, request_hash
from app.services.youtube import get_exercise_videos
from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

# ─── Safety Preamble ────────────────────────────────────────────────────

SAFETY_PREAMBLE = """
IMPORTANT SAFETY RULES — YOU MUST FOLLOW THESE:
1. You are AROMI, an AI fitness & wellness coach. You are NOT a doctor.
2. NEVER diagnose medical conditions.
3. NEVER prescribe medication.
4. NEVER make unverified medical claims.
5. Always recommend consulting a healthcare professional for injuries, pain, or medical conditions.
6. For injury-related adjustments, ALWAYS reduce intensity and suggest rest.
7. Include a brief safety disclaimer in workout and nutrition plans.
8. Never include user PII in your responses.
"""

# ─── Workout Prompt ─────────────────────────────────────────────────────

WORKOUT_SYSTEM_PROMPT = SAFETY_PREAMBLE + """
You are a certified fitness coach AI named AROMI.
Generate a 7-day workout plan as VALID JSON ONLY (no markdown fences).

The JSON schema MUST be:
{
  "plan_name": "string",
  "summary": "string",
  "disclaimer": "string",
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "type": "training | rest | active_recovery",
      "warmup": [{"exercise": "str", "duration_mins": int}],
      "main_workout": [
        {
          "exercise": "str",
          "sets": int,
          "reps": "str",
          "rest_seconds": int,
          "notes": "str",
          "youtube_search": "str"
        }
      ],
      "cooldown": [{"exercise": "str", "duration_mins": int}],
      "progressive_overload": "str",
      "daily_tip": "str"
    }
  ]
}

RULES:
- Include warmup and cooldown every training day.
- Rest days should have type "rest" with light stretching suggestions.
- Progressive overload guidance must be specific (increase weight/reps/sets).
- youtube_search should be a concise search term for the exercise.
"""


def _build_workout_user_prompt(profile: Profile, overrides: dict) -> str:
    goal = overrides.get("goal") or profile.goal
    location = overrides.get("location") or profile.location
    equipment = overrides.get("equipment") or profile.equipment
    minutes = overrides.get("minutes_per_day") or profile.minutes_per_day
    days = overrides.get("days_per_week") or profile.days_per_week
    level = overrides.get("fitness_level") or profile.fitness_level
    constraints = overrides.get("constraints") or profile.injuries or ""

    return f"""
Create a 7-day workout plan with these parameters:
- Goal: {goal}
- Location: {location}
- Available equipment: {equipment or 'bodyweight only'}
- Time per day: {minutes} minutes
- Days per week: {days}
- Fitness level: {level}
- Injuries/constraints: {constraints or 'None'}
- Include rest days as appropriate for the schedule.
Output ONLY the JSON, nothing else.
"""


# ─── Nutrition Prompt ───────────────────────────────────────────────────

NUTRITION_SYSTEM_PROMPT = SAFETY_PREAMBLE + """
You are AROMI, an AI nutrition coach.
Generate a 7-day meal plan as VALID JSON ONLY.

The JSON schema MUST be:
{
  "plan_name": "string",
  "summary": "string",
  "disclaimer": "string",
  "daily_calorie_target": int,
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "meals": {
        "breakfast": {"name": "str", "ingredients": ["str"], "instructions": "str", "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float},
        "lunch": {"name": "str", "ingredients": ["str"], "instructions": "str", "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float},
        "dinner": {"name": "str", "ingredients": ["str"], "instructions": "str", "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float},
        "snacks": [{"name": "str", "ingredients": ["str"], "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float}]
      },
      "daily_totals": {"calories": int, "protein_g": float, "carbs_g": float, "fat_g": float},
      "allergy_substitutions": "str"
    }
  ]
}

RULES:
- STRICTLY avoid all listed allergens in every ingredient.
- All recipes must match the specified cuisine preference.
- Daily totals must approximately match the calorie target (+/- 100).
- Macros must be realistic.
"""


def _build_nutrition_user_prompt(profile: Profile, overrides: dict) -> str:
    calories = overrides.get("calorie_target") or profile.calorie_target
    diet = overrides.get("diet_type") or profile.diet_type
    allergies = overrides.get("allergies") or profile.allergies
    cuisine = overrides.get("cuisine_preference") or profile.cuisine_preference
    macros = overrides.get("macros_preference") or ""

    return f"""
Create a 7-day meal plan with these parameters:
- Daily calorie target: {calories} kcal
- Diet type: {diet}
- Allergies (MUST AVOID these ingredients): {allergies or 'None'}
- Cuisine preference: {cuisine}
- Macros preference: {macros or 'balanced'}
- Include breakfast, lunch, dinner, and snacks.
Output ONLY the JSON, nothing else.
"""


# ─── Chat Prompt ────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = SAFETY_PREAMBLE + """
You are AROMI, a friendly and encouraging AI fitness & wellness coach.

BEHAVIOR:
1. Be warm, supportive, and motivating.
2. Give concise but helpful advice.
3. If the user mentions travel, injury, mood changes, or schedule changes,
   respond helpfully AND include this exact marker in your response:
   [ADJUSTMENT_NEEDED: <change_type>]
   where change_type is one of: travel, injury, mood, time_change
4. Never diagnose conditions. Recommend consulting a doctor when appropriate.
5. Include brief disclaimers when giving health advice.
6. Keep responses under 300 words unless the user asks for detail.
"""

ADJUSTMENT_MARKER = "[ADJUSTMENT_NEEDED:"


# ─── Adjustment Prompt ──────────────────────────────────────────────────

ADJUST_SYSTEM_PROMPT = SAFETY_PREAMBLE + """
You are AROMI adjusting a user's workout plan due to a life change.
Output VALID JSON ONLY with this schema:
{
  "change_type": "str",
  "rationale": "str",
  "adjusted_days": [
    {
      "day": int,
      "day_name": "str",
      "type": "training | rest | active_recovery",
      "warmup": [...],
      "main_workout": [...],
      "cooldown": [...],
      "progressive_overload": "str",
      "daily_tip": "str"
    }
  ],
  "safety_note": "str"
}

RULES:
- For injury: ALWAYS reduce intensity, suggest rest, recommend doctor.
- For travel: use bodyweight/hotel-friendly exercises.
- For mood (low energy): shorter, lighter sessions with focus on enjoyment.
- For time_change: condense workouts to fit available time.
- Preserve the user's original goal.
"""


# ─── Orchestrator ───────────────────────────────────────────────────────

class AIOrchestrator:
    """Coordinates all AI interactions: classify, prompt-build, call LLM, validate."""

    @staticmethod
    def classify_intent(message: str) -> str:
        """Simple keyword-based intent classification for chat messages."""
        lower = message.lower()
        if any(w in lower for w in ["workout", "exercise", "training plan", "gym plan"]):
            return "workout_gen"
        if any(w in lower for w in ["meal", "diet", "nutrition", "food", "recipe", "eat"]):
            return "meal_gen"
        if any(w in lower for w in ["travel", "injury", "injured", "hurt", "sick", "mood", "busy", "less time", "no time"]):
            return "adjust"
        return "chat"

    @staticmethod
    async def generate_workout(profile: Profile, overrides: dict, db: Session) -> WorkoutPlan:
        user_id = profile.user_id
        payload = {
            "goal": overrides.get("goal") or profile.goal,
            "location": overrides.get("location") or profile.location,
            "equipment": overrides.get("equipment") or profile.equipment,
            "minutes_per_day": overrides.get("minutes_per_day") or profile.minutes_per_day,
            "days_per_week": overrides.get("days_per_week") or profile.days_per_week,
            "fitness_level": overrides.get("fitness_level") or profile.fitness_level,
        }

        # Check cache
        r_hash = request_hash(user_id, {**payload, "type": "workout"})
        cached = db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == user_id,
            WorkoutPlan.request_hash == r_hash,
        ).first()
        if cached:
            log.info("workout_cache_hit", user_id=user_id)
            return cached

        # Deactivate old plans
        db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True
        ).update({"is_active": False})

        # Count versions
        version = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user_id).count() + 1

        messages = [
            {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
            {"role": "user", "content": _build_workout_user_prompt(profile, overrides)},
        ]

        start = time.time()
        plan_data = await openrouter_client.get_json(messages, temperature=0.3)
        latency = int((time.time() - start) * 1000)

        # Enrich with YouTube links
        if isinstance(plan_data, dict) and "days" in plan_data:
            for day in plan_data["days"]:
                for ex in day.get("main_workout", []):
                    search_term = ex.get("youtube_search", ex.get("exercise", ""))
                    ex["youtube_url"] = get_exercise_videos(search_term)

        wp = WorkoutPlan(
            user_id=user_id,
            version=version,
            plan_data=plan_data,
            request_hash=r_hash,
            model_used=settings.OPENROUTER_MODEL,
            latency_ms=latency,
            is_active=True,
        )
        db.add(wp)
        db.commit()
        db.refresh(wp)
        log.info("workout_generated", user_id=user_id, version=version, latency_ms=latency)
        return wp

    @staticmethod
    async def generate_nutrition(profile: Profile, overrides: dict, db: Session) -> NutritionPlan:
        user_id = profile.user_id
        payload = {
            "calories": overrides.get("calorie_target") or profile.calorie_target,
            "diet_type": overrides.get("diet_type") or profile.diet_type,
            "allergies": overrides.get("allergies") or profile.allergies,
            "cuisine": overrides.get("cuisine_preference") or profile.cuisine_preference,
        }

        r_hash = request_hash(user_id, {**payload, "type": "nutrition"})
        cached = db.query(NutritionPlan).filter(
            NutritionPlan.user_id == user_id,
            NutritionPlan.request_hash == r_hash,
        ).first()
        if cached:
            log.info("nutrition_cache_hit", user_id=user_id)
            return cached

        db.query(NutritionPlan).filter(
            NutritionPlan.user_id == user_id, NutritionPlan.is_active == True
        ).update({"is_active": False})

        version = db.query(NutritionPlan).filter(NutritionPlan.user_id == user_id).count() + 1

        messages = [
            {"role": "system", "content": NUTRITION_SYSTEM_PROMPT},
            {"role": "user", "content": _build_nutrition_user_prompt(profile, overrides)},
        ]

        start = time.time()
        plan_data = await openrouter_client.get_json(messages, temperature=0.3)
        latency = int((time.time() - start) * 1000)

        np_obj = NutritionPlan(
            user_id=user_id,
            version=version,
            plan_data=plan_data,
            request_hash=r_hash,
            model_used=settings.OPENROUTER_MODEL,
            latency_ms=latency,
            is_active=True,
        )
        db.add(np_obj)
        db.commit()
        db.refresh(np_obj)
        log.info("nutrition_generated", user_id=user_id, version=version, latency_ms=latency)
        return np_obj

    @staticmethod
    async def chat_with_aromi(
        user_id: str, message: str, conversation_id: Optional[str], db: Session
    ) -> tuple[str, str, bool, Optional[str]]:
        """Returns (conv_id, reply, adjustment_triggered, adjustment_summary)."""

        # Get or create conversation
        if conversation_id:
            conv = db.query(Conversation).filter(
                Conversation.id == conversation_id, Conversation.user_id == user_id
            ).first()
            if not conv:
                conv = Conversation(user_id=user_id)
                db.add(conv)
                db.commit()
                db.refresh(conv)
        else:
            conv = Conversation(user_id=user_id)
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # Save user message
        user_msg = Message(conversation_id=conv.id, role="user", content=message)
        db.add(user_msg)

        # Build context from last 20 messages
        history = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(20)
            .all()
        )
        history.reverse()

        # Get profile for context
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        profile_context = ""
        if profile:
            profile_context = f"\nUser profile: goal={profile.goal}, level={profile.fitness_level}, injuries={profile.injuries or 'none'}, diet={profile.diet_type}"

        messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT + profile_context},
        ]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})

        reply = await openrouter_client.get_text(messages, temperature=0.5)

        # Check for adjustment trigger
        adjustment_triggered = ADJUSTMENT_MARKER in reply
        adjustment_summary = None
        if adjustment_triggered:
            # Extract change type
            try:
                marker_start = reply.index(ADJUSTMENT_MARKER) + len(ADJUSTMENT_MARKER)
                marker_end = reply.index("]", marker_start)
                change_type = reply[marker_start:marker_end].strip()
            except (ValueError, IndexError):
                change_type = "general"

            # Clean marker from reply
            reply = reply.replace(f"[ADJUSTMENT_NEEDED: {change_type}]", "").strip()
            adjustment_summary = f"Detected {change_type} — plan adjustment recommended."

        # Save assistant message
        asst_msg = Message(
            conversation_id=conv.id, role="assistant", content=reply,
            metadata_={"adjustment_triggered": adjustment_triggered}
        )
        db.add(asst_msg)
        db.commit()

        return conv.id, reply, adjustment_triggered, adjustment_summary

    @staticmethod
    async def adjust_plan(
        user_id: str, change_type: str, details: str, days_to_adjust: int, db: Session
    ) -> Optional[PlanAdjustment]:
        """Adjust the current active workout plan."""
        active_plan = db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True
        ).first()
        if not active_plan:
            return None

        profile = db.query(Profile).filter(Profile.user_id == user_id).first()

        original_days = []
        if active_plan.plan_data and "days" in active_plan.plan_data:
            original_days = active_plan.plan_data["days"][:days_to_adjust]

        messages = [
            {"role": "system", "content": ADJUST_SYSTEM_PROMPT},
            {"role": "user", "content": f"""
Adjust the next {days_to_adjust} days of the workout plan.
Change type: {change_type}
Details: {details}
User goal: {profile.goal if profile else 'general_wellness'}
User level: {profile.fitness_level if profile else 'beginner'}
Current plan days to adjust:
{json.dumps(original_days, indent=2)}
Output ONLY the JSON.
"""},
        ]

        adjusted_data = await openrouter_client.get_json(messages, temperature=0.3)

        adjustment = PlanAdjustment(
            workout_plan_id=active_plan.id,
            change_type=change_type,
            reason=details,
            original_snippet=original_days,
            adjusted_snippet=adjusted_data,
            rationale=adjusted_data.get("rationale", "") if isinstance(adjusted_data, dict) else "",
            days_affected=days_to_adjust,
        )
        db.add(adjustment)

        # Update the plan data with adjusted days
        if isinstance(adjusted_data, dict) and "adjusted_days" in adjusted_data:
            plan_data = active_plan.plan_data.copy() if active_plan.plan_data else {}
            existing_days = plan_data.get("days", [])
            adjusted_days = adjusted_data["adjusted_days"]
            for adj_day in adjusted_days:
                idx = adj_day.get("day", 1) - 1
                if 0 <= idx < len(existing_days):
                    existing_days[idx] = adj_day
            plan_data["days"] = existing_days
            active_plan.plan_data = plan_data

        db.commit()
        db.refresh(adjustment)
        log.info("plan_adjusted", user_id=user_id, change_type=change_type, days=days_to_adjust)
        return adjustment


orchestrator = AIOrchestrator()
