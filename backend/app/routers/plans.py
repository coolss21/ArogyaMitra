"""Plans router — workout + nutrition generation and retrieval."""
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.models import User, Profile, WorkoutPlan, NutritionPlan
from app.schemas.schemas import (
    WorkoutGenerateRequest, NutritionGenerateRequest, PlanOut
)
from app.services.tools import tool_generate_workout_plan, tool_generate_nutrition_plan

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/plans", tags=["plans"])


# ── Workout ───────────────────────────────────────────────────────────────────

@router.post("/workout", response_model=PlanOut)
@limiter.limit(settings.RATE_LIMIT_AI)
async def generate_workout(
    request: Request,
    body: WorkoutGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await tool_generate_workout_plan(
        user_id=current_user.id,
        db=db,
        args=body.model_dump(exclude_none=True),
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id, WorkoutPlan.is_active == True
    ).order_by(WorkoutPlan.created_at.desc()).first()
    return plan


@router.get("/workout/latest", response_model=PlanOut)
async def get_workout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id, WorkoutPlan.is_active == True
    ).order_by(WorkoutPlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active workout plan")
    return plan


@router.get("/workout/history", response_model=list[PlanOut])
async def workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(WorkoutPlan)
        .filter(WorkoutPlan.user_id == current_user.id)
        .order_by(WorkoutPlan.created_at.desc())
        .limit(20)
        .all()
    )


# ── Nutrition ──────────────────────────────────────────────────────────────────

@router.post("/nutrition", response_model=PlanOut)
@limiter.limit(settings.RATE_LIMIT_AI)
async def generate_nutrition(
    request: Request,
    body: NutritionGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await tool_generate_nutrition_plan(
        user_id=current_user.id,
        db=db,
        args=body.model_dump(exclude_none=True),
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    plan = db.query(NutritionPlan).filter(
        NutritionPlan.user_id == current_user.id, NutritionPlan.is_active == True
    ).order_by(NutritionPlan.created_at.desc()).first()
    return plan


@router.get("/nutrition/latest", response_model=PlanOut)
async def get_nutrition(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(NutritionPlan).filter(
        NutritionPlan.user_id == current_user.id, NutritionPlan.is_active == True
    ).order_by(NutritionPlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active nutrition plan")
    return plan


@router.get("/nutrition/history", response_model=list[PlanOut])
async def nutrition_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(NutritionPlan)
        .filter(NutritionPlan.user_id == current_user.id)
        .order_by(NutritionPlan.created_at.desc())
        .limit(20)
        .all()
    )
