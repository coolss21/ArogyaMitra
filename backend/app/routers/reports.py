from datetime import datetime, timedelta, timezone
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database import get_db
from app.auth import get_current_user
from app.models.models import User, ProgressLog, UserChallenge
from app.services.openrouter import openrouter_client
from app.schemas.schemas import ReportWeeklyOut

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/weekly", response_model=ReportWeeklyOut)
async def get_weekly_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch last 7 days of logs
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    date_str = seven_days_ago.strftime("%Y-%m-%d")
    
    logs = db.execute(
        select(ProgressLog)
        .where(ProgressLog.user_id == current_user.id)
        .where(ProgressLog.date >= date_str)
        .order_by(desc(ProgressLog.date))
    ).scalars().all()
    
    if not logs:
        return ReportWeeklyOut(summary="Not enough data from the past week to generate a report. Keep logging your progress!")
        
    log_data = []
    for l in logs:
        log_data.append({
            "date": l.date,
            "workout_completed": l.workout_completed,
            "mood": l.mood,
            "sleep_hours": l.sleep_hours,
            "weight_kg": l.weight_kg,
            "notes": l.notes
        })

    # Fetch challenges for the last 7 days
    challenges = db.execute(
        select(UserChallenge)
        .where(UserChallenge.user_id == current_user.id)
        .where(UserChallenge.date >= date_str)
        .order_by(desc(UserChallenge.date))
    ).scalars().all()
    
    challenge_data = []
    for c in challenges:
        challenge_data.append({
            "date": c.date,
            "title": c.challenge_title,
            "completed": c.completed,
            "xp": c.xp
        })
        
    # Generate LLM summary
    prompt = f"""You are ArogyaMitra, an empathetic, analytical, and highly motivating AI fitness coach.
Review the following user activity for the past 7 days:

PROGRESS LOGS:
{json.dumps(log_data, indent=2)}

DAILY CHALLENGES:
{json.dumps(challenge_data, indent=2)}

Please write a "Weekly Progress Report". 
1. Start with a warm, personal greeting.
2. Analyze their consistency (workouts + challenges).
3. Mention specific achievements (e.g., "You hit your step goal 4 times" or "Great job completing the 'No Sugar' challenge").
4. Provide 1 actionable tip for next week based on the data (e.g., sleep, hydration, or mood trends).
5. End with an inspiring closing sentence.

Keep it concise (approx 4-6 short sentences). Use plain text with basic bolding for emphasis. Do not use markdown headers.
"""
    messages = [{"role": "user", "content": prompt}]
    summary = await openrouter_client.get_text(messages, temperature=0.6)
    
    return ReportWeeklyOut(summary=summary.strip())
