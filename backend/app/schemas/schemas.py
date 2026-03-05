"""Pydantic v2 schemas for request/response validation."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    fitness_level: Optional[str] = None
    goal: Optional[str] = None
    injuries: Optional[str] = None
    medical_conditions: Optional[str] = None
    minutes_per_day: Optional[int] = None
    days_per_week: Optional[int] = None
    preferred_time: Optional[str] = None
    location: Optional[str] = None
    equipment: Optional[str] = None
    diet_type: Optional[str] = None
    allergies: Optional[str] = None
    cuisine_preference: Optional[str] = None
    calorie_target: Optional[int] = None
    onboarding_complete: Optional[bool] = None

    @field_validator("fitness_level")
    @classmethod
    def valid_fitness_level(cls, v):
        if v and v not in ("beginner", "intermediate", "advanced"):
            raise ValueError("fitness_level must be beginner/intermediate/advanced")
        return v

    @field_validator("goal")
    @classmethod
    def valid_goal(cls, v):
        valid = {"weight_loss", "muscle_gain", "endurance", "flexibility", "general_wellness"}
        if v and v not in valid:
            raise ValueError(f"goal must be one of {valid}")
        return v


class ProfileOut(BaseModel):
    id: str
    user_id: str
    name: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    fitness_level: str
    goal: str
    injuries: Optional[str]
    medical_conditions: Optional[str]
    minutes_per_day: int
    days_per_week: int
    preferred_time: str
    location: str
    equipment: Optional[str]
    diet_type: str
    allergies: Optional[str]
    cuisine_preference: str
    calorie_target: int
    onboarding_complete: bool
    model_config = {"from_attributes": True}


# ── Plans ─────────────────────────────────────────────────────────────────────

class WorkoutGenerateRequest(BaseModel):
    goal: Optional[str] = None
    location: Optional[str] = None
    equipment: Optional[str] = None
    minutes_per_day: Optional[int] = None
    days_per_week: Optional[int] = None
    fitness_level: Optional[str] = None
    constraints: Optional[str] = None


class NutritionGenerateRequest(BaseModel):
    calorie_target: Optional[int] = None
    diet_type: Optional[str] = None
    allergies: Optional[str] = None
    cuisine_preference: Optional[str] = None
    macros_preference: Optional[str] = None


class PlanOut(BaseModel):
    id: str
    user_id: str
    version: int
    plan_data: Optional[dict]
    model_used: Optional[str]
    latency_ms: Optional[int]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Agent / AROMI ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("message cannot be empty")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 chars)")
        return v.strip()


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    steps_taken: int
    tools_called: list[str]
    adjustment_triggered: bool = False


class HistoryMessage(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    session_id: str
    history: list[HistoryMessage]


class AdjustRequest(BaseModel):
    change_type: str  # travel | injury | mood | time_change
    details: str
    days_to_adjust: int = 4


class AdjustResponse(BaseModel):
    change_type: str
    days_affected: int
    rationale: Optional[str]


class AgentEventOut(BaseModel):
    id: str
    session_id: str
    step: int
    event_type: str
    tool_name: Optional[str]
    tool_args: Optional[dict]
    result: Optional[dict]
    rationale: Optional[str]
    latency_ms: Optional[int]
    error: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class MemorySetRequest(BaseModel):
    key: str
    value: str

    @field_validator("key")
    @classmethod
    def valid_key(cls, v):
        if not v.strip() or len(v) > 100:
            raise ValueError("key must be 1-100 chars")
        return v.strip()


class MemoryOut(BaseModel):
    key: str
    value: str
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Progress ──────────────────────────────────────────────────────────────────

class ProgressLogRequest(BaseModel):
    date: str  # YYYY-MM-DD
    weight_kg: Optional[float] = None
    steps: Optional[int] = None
    workout_completed: bool = False
    mood: Optional[int] = None
    sleep_hours: Optional[float] = None
    water_litres: Optional[float] = None
    notes: Optional[str] = None

    @field_validator("mood")
    @classmethod
    def valid_mood(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("mood must be 1-5")
        return v


class ProgressLogOut(BaseModel):
    id: str
    date: str
    weight_kg: Optional[float]
    steps: Optional[int]
    workout_completed: bool
    mood: Optional[int]
    sleep_hours: Optional[float]
    water_litres: Optional[float]
    notes: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class ProgressSummary(BaseModel):
    current_streak: int
    longest_streak: int
    total_workouts: int
    adherence_pct: float
    avg_mood: Optional[float]
    avg_sleep: Optional[float]
    weight_trend: list[dict]


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportWeeklyOut(BaseModel):
    summary: str


# ── Gamification & Challenges ──────────────────────────────────────────────────────────────

class ChallengeOut(BaseModel):
    id: str
    title: str
    desc: str
    xp: int
    icon: str
    completed: bool


class ChallengeListOut(BaseModel):
    challenges: list[ChallengeOut]
    total_xp_today: int


class ChallengeAcceptRequest(BaseModel):
    title: str


class PledgeCreate(BaseModel):
    goal_description: str
    charity_name: str
    amount_inr: float = 0.0


class PledgeOut(BaseModel):
    id: str
    goal_description: str
    charity_name: str
    amount_inr: float
    is_fulfilled: bool
    created_at: datetime
    model_config = {"from_attributes": True}
