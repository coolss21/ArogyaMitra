"""Profile router — GET, PUT, export, delete."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, Profile
from app.schemas.schemas import ProfileUpdate, ProfileOut

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_or_create_profile(user: User, db: Session) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ProfileOut)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_or_create_profile(current_user, db)


@router.put("", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create_profile(current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/export")
async def export_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.models import WorkoutPlan, NutritionPlan, ProgressLog, AgentEvent, UserMemory
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    workouts = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == current_user.id).all()
    nutrition = db.query(NutritionPlan).filter(NutritionPlan.user_id == current_user.id).all()
    logs = db.query(ProgressLog).filter(ProgressLog.user_id == current_user.id).all()
    memories = db.query(UserMemory).filter(UserMemory.user_id == current_user.id).all()

    data = {
        "user": {"email": current_user.email, "role": current_user.role},
        "profile": ProfileOut.model_validate(profile).model_dump() if profile else None,
        "workout_plans": [{"version": w.version, "created_at": str(w.created_at), "is_active": w.is_active} for w in workouts],
        "nutrition_plans": [{"version": n.version, "created_at": str(n.created_at), "is_active": n.is_active} for n in nutrition],
        "progress_logs": [{"date": l.date, "weight_kg": l.weight_kg, "workout_completed": l.workout_completed} for l in logs],
        "memories": {m.key: m.value for m in memories},
    }
    return JSONResponse(content=data, headers={
        "Content-Disposition": "attachment; filename=arogyamitra_export.json"
    })


@router.delete("")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted permanently"}
