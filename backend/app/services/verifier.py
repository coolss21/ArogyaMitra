"""Strict JSON schema verification for LLM-generated plans with auto-retry."""
from __future__ import annotations

from typing import Any

import structlog

from app.services.openrouter import openrouter_client

log = structlog.get_logger(__name__)

# ── Schema Definitions ────────────────────────────────────────────────────────

REQUIRED_WORKOUT_KEYS = {"plan_name", "summary", "disclaimer", "days"}
REQUIRED_DAY_KEYS = {"day", "day_name", "type"}
REQUIRED_EXERCISE_KEYS = {"exercise", "sets", "reps", "rest_seconds"}

REQUIRED_NUTRITION_KEYS = {"plan_name", "summary", "disclaimer", "daily_calorie_target", "days"}
REQUIRED_MEAL_DAY_KEYS = {"day", "day_name", "meals", "daily_totals"}


def verify_workout(data: Any) -> tuple[bool, str]:
    """Returns (is_valid, error_message)."""
    if not isinstance(data, dict):
        return False, "Root must be a JSON object"
    missing = REQUIRED_WORKOUT_KEYS - data.keys()
    if missing:
        return False, f"Missing top-level keys: {missing}"
    days = data.get("days", [])
    if not isinstance(days, list) or len(days) < 1:
        return False, "days must be a non-empty list"
    for i, day in enumerate(days):
        if not isinstance(day, dict):
            return False, f"Day {i} is not an object"
        missing_d = REQUIRED_DAY_KEYS - day.keys()
        if missing_d:
            return False, f"Day {i} missing keys: {missing_d}"
        if day.get("type") == "training":
            for j, ex in enumerate(day.get("main_workout", [])):
                missing_e = REQUIRED_EXERCISE_KEYS - ex.keys()
                if missing_e:
                    return False, f"Day {i} exercise {j} missing keys: {missing_e}"
    return True, ""


def verify_nutrition(data: Any) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, "Root must be a JSON object"
    missing = REQUIRED_NUTRITION_KEYS - data.keys()
    if missing:
        return False, f"Missing top-level keys: {missing}"
    days = data.get("days", [])
    if not isinstance(days, list) or len(days) < 1:
        return False, "days must be a non-empty list"
    for i, day in enumerate(days):
        if not isinstance(day, dict):
            return False, f"Day {i} is not an object"
        missing_d = REQUIRED_MEAL_DAY_KEYS - day.keys()
        if missing_d:
            return False, f"Day {i} missing keys: {missing_d}"
        meals = day.get("meals", {})
        if not isinstance(meals, dict):
            return False, f"Day {i} meals must be an object"
        for meal_type in ("breakfast", "lunch", "dinner"):
            if meal_type not in meals:
                return False, f"Day {i} missing meal: {meal_type}"
    return True, ""


async def verify_and_fix_json(
    data: Any,
    schema_type: str,  # "workout" | "nutrition"
    original_messages: list[dict],
    max_retries: int = 2,
) -> Any:
    """Verify JSON against schema; if invalid, ask LLM to fix it (up to max_retries)."""
    verify_fn = verify_workout if schema_type == "workout" else verify_nutrition

    for attempt in range(max_retries + 1):
        is_valid, error = verify_fn(data)
        if is_valid:
            log.info("verifier_ok schema=%s attempts=%d", schema_type, attempt)
            return data

        log.warning("verifier_fail schema=%s attempt=%d error=%s", schema_type, attempt, error)
        if attempt == max_retries:
            raise ValueError(f"LLM output failed schema validation after {max_retries} retries: {error}")

        # Ask LLM to fix
        import json as _json
        fix_messages = original_messages + [
            {
                "role": "assistant",
                "content": _json.dumps(data),
            },
            {
                "role": "user",
                "content": (
                    f"The JSON you produced is INVALID. Error: {error}\n"
                    f"Return ONLY corrected valid JSON matching the required schema. No explanations."
                ),
            },
        ]
        data = await openrouter_client.get_json(fix_messages, temperature=0.1)
        log.info("verifier_retry schema=%s attempt=%d", schema_type, attempt + 1)

    return data
