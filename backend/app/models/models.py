"""All SQLAlchemy models — 12 tables including agentic tables."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ──────────────────────────────────────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    profile: Mapped[Optional["Profile"]] = relationship("Profile", back_populates="user", uselist=False)
    workout_plans: Mapped[list["WorkoutPlan"]] = relationship("WorkoutPlan", back_populates="user")
    nutrition_plans: Mapped[list["NutritionPlan"]] = relationship("NutritionPlan", back_populates="user")
    progress_logs: Mapped[list["ProgressLog"]] = relationship("ProgressLog", back_populates="user")
    agent_events: Mapped[list["AgentEvent"]] = relationship("AgentEvent", back_populates="user")
    user_memories: Mapped[list["UserMemory"]] = relationship("UserMemory", back_populates="user")
    conversation_states: Mapped[list["ConversationState"]] = relationship("ConversationState", back_populates="user")
    pledges: Mapped[list["Pledge"]] = relationship("Pledge", back_populates="user")
    user_challenges: Mapped[list["UserChallenge"]] = relationship("UserChallenge", back_populates="user")


# ──────────────────────────────────────────────────────────────────────────────
# Profile
# ──────────────────────────────────────────────────────────────────────────────

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    age: Mapped[Optional[int]] = mapped_column(Integer)
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    height_cm: Mapped[Optional[float]] = mapped_column(Float)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float)
    fitness_level: Mapped[str] = mapped_column(String(30), default="beginner")
    goal: Mapped[str] = mapped_column(String(50), default="general_wellness")
    injuries: Mapped[Optional[str]] = mapped_column(Text)
    medical_conditions: Mapped[Optional[str]] = mapped_column(Text)
    minutes_per_day: Mapped[int] = mapped_column(Integer, default=30)
    days_per_week: Mapped[int] = mapped_column(Integer, default=5)
    preferred_time: Mapped[str] = mapped_column(String(20), default="morning")
    location: Mapped[str] = mapped_column(String(20), default="home")
    equipment: Mapped[Optional[str]] = mapped_column(Text)
    diet_type: Mapped[str] = mapped_column(String(30), default="veg")
    allergies: Mapped[Optional[str]] = mapped_column(Text)
    cuisine_preference: Mapped[str] = mapped_column(String(100), default="Indian")
    calorie_target: Mapped[int] = mapped_column(Integer, default=2000)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="profile")


# ──────────────────────────────────────────────────────────────────────────────
# Plans
# ──────────────────────────────────────────────────────────────────────────────

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    plan_data: Mapped[Optional[dict]] = mapped_column(JSON)
    request_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100))
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="workout_plans")
    adjustments: Mapped[list["PlanAdjustment"]] = relationship("PlanAdjustment", back_populates="workout_plan")


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    plan_data: Mapped[Optional[dict]] = mapped_column(JSON)
    request_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100))
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="nutrition_plans")


class PlanAdjustment(Base):
    __tablename__ = "plan_adjustments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    workout_plan_id: Mapped[str] = mapped_column(String, ForeignKey("workout_plans.id"), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    original_snippet: Mapped[Optional[dict]] = mapped_column(JSON)
    adjusted_snippet: Mapped[Optional[dict]] = mapped_column(JSON)
    rationale: Mapped[Optional[str]] = mapped_column(Text)
    days_affected: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    workout_plan: Mapped["WorkoutPlan"] = relationship("WorkoutPlan", back_populates="adjustments")


# ──────────────────────────────────────────────────────────────────────────────
# Progress
# ──────────────────────────────────────────────────────────────────────────────

class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    weight_kg: Mapped[Optional[float]] = mapped_column(Float)
    steps: Mapped[Optional[int]] = mapped_column(Integer)
    workout_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    mood: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    sleep_hours: Mapped[Optional[float]] = mapped_column(Float)
    water_litres: Mapped[Optional[float]] = mapped_column(Float)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="progress_logs")


# ──────────────────────────────────────────────────────────────────────────────
# Gamification
# ──────────────────────────────────────────────────────────────────────────────

class Pledge(Base):
    __tablename__ = "pledges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    goal_description: Mapped[str] = mapped_column(Text, nullable=False)
    charity_name: Mapped[str] = mapped_column(String(200))
    amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    is_fulfilled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="pledges")


# ──────────────────────────────────────────────────────────────────────────────
# Agentic Tables
# ──────────────────────────────────────────────────────────────────────────────

class AgentEvent(Base):
    """Full audit trail of every agent step: planner decision, tool call, result, error."""
    __tablename__ = "agent_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    step: Mapped[int] = mapped_column(Integer, default=0)
    event_type: Mapped[str] = mapped_column(String(50))
    # event_types: planner_decision | tool_call | tool_result | tool_error | agent_response | verify_retry | max_steps_reached
    tool_name: Mapped[Optional[str]] = mapped_column(String(100))
    tool_args: Mapped[Optional[dict]] = mapped_column(JSON)
    result: Mapped[Optional[dict]] = mapped_column(JSON)
    rationale: Mapped[Optional[str]] = mapped_column(Text)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="agent_events")


class UserMemory(Base):
    """Stable user preferences/constraints remembered across sessions."""
    __tablename__ = "user_memory"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="user_memories")


class ConversationState(Base):
    """Per-session conversation state for the agent."""
    __tablename__ = "conversation_states"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    current_goal: Mapped[Optional[str]] = mapped_column(Text)
    active_constraints: Mapped[Optional[dict]] = mapped_column(JSON)
    history: Mapped[Optional[list]] = mapped_column(JSON)  # [{role, content}, ...]
    step_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="conversation_states")


class UserChallenge(Base):
    __tablename__ = "user_challenges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    challenge_title: Mapped[str] = mapped_column(String(200), nullable=False)
    desc: Mapped[Optional[str]] = mapped_column(Text)
    xp: Mapped[int] = mapped_column(Integer, default=50)
    icon: Mapped[str] = mapped_column(String(20), default="🎯")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="user_challenges")
