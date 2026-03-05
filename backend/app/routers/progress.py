"""Progress router — daily logging, retrieval, and summary."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, ProgressLog
from app.schemas.schemas import ProgressLogRequest, ProgressLogOut, ProgressSummary

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("/log", response_model=ProgressLogOut)
async def log_progress(
    body: ProgressLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Upsert by date
    existing = db.query(ProgressLog).filter(
        ProgressLog.user_id == current_user.id,
        ProgressLog.date == body.date,
    ).first()

    if existing:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    log_entry = ProgressLog(user_id=current_user.id, **body.model_dump())
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


@router.get("/logs", response_model=list[ProgressLogOut])
async def get_logs(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ProgressLog)
        .filter(ProgressLog.user_id == current_user.id)
        .order_by(ProgressLog.date.desc())
        .limit(days)
        .all()
    )


@router.get("/summary", response_model=ProgressSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(ProgressLog)
        .filter(ProgressLog.user_id == current_user.id)
        .order_by(ProgressLog.date.asc())
        .all()
    )

    if not logs:
        return ProgressSummary(
            current_streak=0, longest_streak=0, total_workouts=0,
            adherence_pct=0.0, avg_mood=None, avg_sleep=None, weight_trend=[],
        )

    # Streak computation
    from datetime import date, timedelta
    dates_with_workout = {l.date for l in logs if l.workout_completed}
    today = date.today()
    current_streak, longest_streak = 0, 0
    temp = 0
    all_dates = sorted(dates_with_workout)
    for i, d in enumerate(all_dates):
        d_date = date.fromisoformat(d)
        if i == 0 or date.fromisoformat(all_dates[i - 1]) + timedelta(days=1) == d_date:
            temp += 1
        else:
            temp = 1
        longest_streak = max(longest_streak, temp)
    # current streak
    temp = 0
    check = today
    while True:
        if str(check) in dates_with_workout:
            temp += 1
            check -= timedelta(days=1)
        else:
            break
    current_streak = temp

    total_workouts = len(dates_with_workout)
    adherence = (total_workouts / len(logs) * 100) if logs else 0

    moods = [l.mood for l in logs if l.mood is not None]
    sleeps = [l.sleep_hours for l in logs if l.sleep_hours is not None]
    weight_trend = [
        {"date": l.date, "weight_kg": l.weight_kg}
        for l in logs if l.weight_kg is not None
    ]

    return ProgressSummary(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_workouts=total_workouts,
        adherence_pct=round(adherence, 1),
        avg_mood=round(sum(moods) / len(moods), 1) if moods else None,
        avg_sleep=round(sum(sleeps) / len(sleeps), 1) if sleeps else None,
        weight_trend=weight_trend,
    )
