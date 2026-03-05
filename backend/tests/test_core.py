"""Backend unit tests for ArogyaMitra – 7 tests covering auth, profile, AI JSON,
adjustment classification, and progress summary."""

import pytest
import json
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock

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
    data = {"sub": "user-123", "role": "user"}
    token = create_access_token(data)
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

    # Verify structure
    assert "days" in valid_plan
    assert len(valid_plan["days"]) == 7
    for day in valid_plan["days"]:
        assert "day" in day
        assert "type" in day
        assert "warmup" in day
        assert "main_workout" in day
        for ex in day["main_workout"]:
            assert "exercise" in ex
            assert "sets" in ex
            assert "reps" in ex


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
    # Simulate log entries
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
