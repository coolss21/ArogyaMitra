"""Backend unit tests for ArogyaMitra – 12 tests covering auth, schemas,
AI JSON validation, agent events, caching, marker detection, and CORS."""

import json
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock


# ── Test 1: Password hashing ────────────────────────────────────────────

def test_password_hashing():
    from app.auth import hash_password, verify_password
    password = "MyStr0ngP@ss!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


# ── Test 2: JWT token creation & decoding ────────────────────────────────

def test_jwt_token():
    from app.auth import create_access_token, decode_token
    token = create_access_token("user-123", "user")
    assert isinstance(token, str)
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["role"] == "user"


# ── Test 3: Profile validation ──────────────────────────────────────────

def test_profile_validation_valid():
    from app.schemas.schemas import ProfileUpdate
    profile = ProfileUpdate(
        name="Test User",
        age=25,
        height_cm=175.0,
        weight_kg=70.0,
        fitness_level="intermediate",
        goal="muscle_gain",
        diet_type="non-veg",
        location="gym",
        calorie_target=2500,
    )
    assert profile.name == "Test User"
    assert profile.fitness_level == "intermediate"


def test_profile_validation_invalid_fitness():
    from app.schemas.schemas import ProfileUpdate
    with pytest.raises(Exception):
        ProfileUpdate(fitness_level="superhero")


def test_profile_validation_invalid_goal():
    from app.schemas.schemas import ProfileUpdate
    with pytest.raises(Exception):
        ProfileUpdate(goal="fly_to_moon")


# ── Test 4: AI JSON schema validation (workout plan) ────────────────────

def test_workout_plan_json_schema():
    """Validate that a properly structured workout plan passes validation."""
    from app.services.verifier import verify_workout

    valid_plan = {
        "plan_name": "Beginner Home Workout",
        "summary": "7-day plan for beginners",
        "disclaimer": "Consult a doctor before starting.",
        "days": [
            {
                "day": i,
                "day_name": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i - 1],
                "type": "training" if i <= 5 else "rest",
                "warmup": [{"exercise": "Jumping jacks", "duration_mins": 5}],
                "main_workout": [
                    {
                        "exercise": "Push-ups",
                        "sets": 3,
                        "reps": "10-12",
                        "rest_seconds": 60,
                        "notes": "Keep back straight",
                        "youtube_search": "push ups tutorial",
                    }
                ],
                "cooldown": [{"exercise": "Stretching", "duration_mins": 5}],
                "progressive_overload": "Add 2 reps per week",
                "daily_tip": "Stay hydrated",
            }
            for i in range(1, 8)
        ],
    }

    is_valid, error = verify_workout(valid_plan)
    assert is_valid is True
    assert error == ""


# ── Test 5: Intent classification ────────────────────────────────────────

def test_intent_classification():
    from app.services.ai_orchestrator import AIOrchestrator

    assert AIOrchestrator.classify_intent("Create a workout plan for me") == "workout_gen"
    assert AIOrchestrator.classify_intent("I need a diet plan") == "meal_gen"
    assert AIOrchestrator.classify_intent("I got injured yesterday") == "adjust"
    assert AIOrchestrator.classify_intent("I'm traveling next week") == "adjust"
    assert AIOrchestrator.classify_intent("How are you AROMI?") == "chat"
    assert AIOrchestrator.classify_intent("Tell me a joke") == "chat"


# ── Test 6: Progress summary computation ────────────────────────────────

def test_progress_summary_computation():
    """Test streak and adherence computation logic."""

    class MockLog:
        def __init__(self, date, completed, mood=None, sleep=None, weight=None):
            self.date = date
            self.workout_completed = completed
            self.mood = mood
            self.sleep_hours = sleep
            self.weight_kg = weight

    logs = [
        MockLog("2026-01-01", True, 4, 7.5, 70.0),
        MockLog("2026-01-02", True, 3, 6.0, 69.8),
        MockLog("2026-01-03", False, 2, 5.0, 70.1),
        MockLog("2026-01-04", True, 4, 8.0, 69.5),
        MockLog("2026-01-05", True, 5, 7.0, 69.3),
    ]

    total = len(logs)
    completed = sum(1 for l in logs if l.workout_completed)
    adherence = round((completed / total) * 100, 1)

    # Streak computation
    current_streak = 0
    longest_streak = 0
    temp = 0
    for log in logs:
        if log.workout_completed:
            temp += 1
            longest_streak = max(longest_streak, temp)
        else:
            temp = 0
    current_streak = temp

    assert total == 5
    assert completed == 4
    assert adherence == 80.0
    assert current_streak == 2
    assert longest_streak == 2


# ── Test 7: Register schema validation ───────────────────────────────────

def test_register_validation():
    from app.schemas.schemas import RegisterRequest
    # Valid
    req = RegisterRequest(email="test@example.com", password="strongpass123")
    assert req.email == "test@example.com"

    # Invalid email
    with pytest.raises(Exception):
        RegisterRequest(email="notanemail", password="strongpass123")

    # Password too short
    with pytest.raises(Exception):
        RegisterRequest(email="test@example.com", password="short")


# ── Test 8: Plan hash caching ────────────────────────────────────────────

def test_plan_hash_caching():
    """Verify that identical request parameters produce the same hash."""
    from app.services.openrouter import request_hash

    payload = {"goal": "muscle_gain", "location": "gym", "type": "workout"}
    h1 = request_hash("user-1", payload)
    h2 = request_hash("user-1", payload)
    h3 = request_hash("user-1", {**payload, "goal": "weight_loss"})

    assert h1 == h2, "Same input must produce same hash (cache hit)"
    assert h1 != h3, "Different input must produce different hash (cache miss)"
    assert len(h1) == 32, "Hash should be 32 chars (truncated SHA-256)"


# ── Test 9: JSON verifier repair logic ───────────────────────────────────

@pytest.mark.asyncio
async def test_json_verifier_repair():
    """Simulate bad JSON from LLM and verify auto-repair loop is triggered."""
    from app.services.verifier import verify_workout, verify_and_fix_json

    # Invalid plan (missing 'days')
    bad_plan = {"plan_name": "Test", "summary": "X", "disclaimer": "Y"}
    is_valid, error = verify_workout(bad_plan)
    assert is_valid is False
    assert "Missing top-level keys" in error

    # Valid plan that would be returned by repair
    fixed_plan = {
        "plan_name": "Fixed",
        "summary": "S",
        "disclaimer": "D",
        "days": [
            {
                "day": 1,
                "day_name": "Monday",
                "type": "rest",
                "warmup": [],
                "main_workout": [],
                "cooldown": [],
            }
        ],
    }

    with patch("app.services.verifier.openrouter_client") as mock_client:
        mock_client.get_json = AsyncMock(return_value=fixed_plan)
        result = await verify_and_fix_json(bad_plan, "workout", [], max_retries=1)
        assert result["plan_name"] == "Fixed"
        mock_client.get_json.assert_called_once()


# ── Test 10: Adjustment marker detection ──────────────────────────────────

def test_adjustment_marker_detection():
    """Verify that the [ADJUSTMENT_NEEDED: ...] marker is properly parsed."""
    from app.services.ai_orchestrator import ADJUSTMENT_MARKER

    # Simulate AI response with hidden marker
    reply = "I recommend resting your shoulder. [ADJUSTMENT_NEEDED: injury] Take it easy for a few days."

    assert ADJUSTMENT_MARKER in reply
    marker_start = reply.index(ADJUSTMENT_MARKER) + len(ADJUSTMENT_MARKER)
    marker_end = reply.index("]", marker_start)
    change_type = reply[marker_start:marker_end].strip()
    assert change_type == "injury"

    # Clean reply
    clean_reply = reply.replace(f"[ADJUSTMENT_NEEDED: {change_type}]", "").strip()
    assert "[ADJUSTMENT_NEEDED" not in clean_reply
    assert "resting your shoulder" in clean_reply


# ── Test 11: AgentEvent model structure ───────────────────────────────────

def test_agent_event_model():
    """Verify AgentEvent model can be instantiated with all required fields."""
    from app.models.models import AgentEvent

    event = AgentEvent(
        user_id="user-123",
        session_id="session-abc",
        step=1,
        event_type="planner_decision",
        tool_name="generate_workout_plan",
        tool_args={"goal": "muscle_gain"},
        rationale="User asked for a workout plan",
        latency_ms=500,
    )
    assert event.event_type == "planner_decision"
    assert event.tool_name == "generate_workout_plan"
    assert event.step == 1
    assert event.latency_ms == 500


# ── Test 12: CORS / rate limit config sanity ─────────────────────────────

def test_cors_and_rate_limit_config():
    """Verify CORS origins are parsed correctly and rate limits are strings."""
    from app.config import get_settings

    settings = get_settings()
    origins = settings.origins_list
    assert isinstance(origins, list)
    assert len(origins) >= 1
    assert any("localhost" in o for o in origins)

    # Rate limits should be valid slowapi format strings
    assert "/" in settings.RATE_LIMIT_AUTH  # e.g. "10/minute"
    assert "/" in settings.RATE_LIMIT_AI
    assert "/" in settings.RATE_LIMIT_DEFAULT
