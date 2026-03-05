"""Daily Challenges logic. Returns consistent pseudo-random challenges per day."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import hashlib
import random

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, UserChallenge
from app.schemas.schemas import ChallengeListOut, ChallengeAcceptRequest, ChallengeOut

router = APIRouter(prefix="/challenges", tags=["challenges"])

# Pool of fun daily challenges
CHALLENGE_POOL = [
    {"title": "Drink 3L of Water", "desc": "Stay hydrated! Drink at least 3 liters of water today.", "xp": 50, "icon": "💧"},
    {"title": "10k Steps", "desc": "Hit 10,000 steps by the end of the day.", "xp": 100, "icon": "🚶‍♂️"},
    {"title": "No Sugar Today", "desc": "Avoid refined sugar for 24 hours.", "xp": 150, "icon": "🚫🍬"},
    {"title": "Stretch for 10 Mins", "desc": "Do a full body stretching routine.", "xp": 50, "icon": "🧘"},
    {"title": "Eat 3 Servings of Veg", "desc": "Incorporate vegetables into 3 different meals.", "xp": 75, "icon": "🥗"},
    {"title": "Sleep 8 Hours", "desc": "Get a full 8 hours of restful sleep.", "xp": 100, "icon": "😴"},
    {"title": "50 Pushups", "desc": "Complete 50 pushups (can be broken into sets).", "xp": 150, "icon": "💪"},
    {"title": "Meditation", "desc": "Meditate or sit in silence for 5 minutes.", "xp": 50, "icon": "🧘‍♂️"},
    {"title": "Take the Stairs", "desc": "Avoid elevators today. Take the stairs everywhere.", "xp": 75, "icon": "🧗‍♂️"},
    {"title": "Core Crusher", "desc": "Do 3 sets of 1-minute planks.", "xp": 100, "icon": "🔥"},
]

def _get_available_pool_for_day(date_str: str) -> list[dict]:
    """Deterministically pick 5 challenges from the pool for the day."""
    seed_str = f"arogi_pool_{date_str}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    rng = random.Random(seed)
    return rng.sample(CHALLENGE_POOL, 5)

@router.get("/today", response_model=ChallengeListOut)
async def get_todays_challenges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Get challenges user already accepted today
    accepted = db.query(UserChallenge).filter(
        UserChallenge.user_id == current_user.id,
        UserChallenge.date == today_str
    ).all()
    
    accepted_titles = {c.challenge_title for c in accepted}
    
    # Get the 5 suggested for today
    daily_pool = _get_available_pool_for_day(today_str)
    
    results = []
    # Add already accepted ones first
    for ac in accepted:
        results.append(ChallengeOut(
            id=ac.id,
            title=ac.challenge_title,
            desc=ac.desc or "",
            xp=ac.xp,
            icon=ac.icon,
            completed=ac.completed
        ))
    
    # Add daily pool suggestions if not already accepted
    for p in daily_pool:
        if p["title"] not in accepted_titles:
            results.append(ChallengeOut(
                id=f"suggested_{p['title']}",
                title=p["title"],
                desc=p["desc"],
                xp=p["xp"],
                icon=p["icon"],
                completed=False
            ))

    # Add remaining challenges from the pool as 'discovery'
    suggested_titles = {p["title"] for p in daily_pool}
    for p in CHALLENGE_POOL:
        if p["title"] not in accepted_titles and p["title"] not in suggested_titles:
            results.append(ChallengeOut(
                id=f"discovery_{p['title']}",
                title=p["title"],
                desc=p["desc"],
                xp=p["xp"],
                icon=p["icon"],
                completed=False
            ))

    total_xp = sum(c.xp for c in accepted if c.completed)

    return {"challenges": results, "total_xp_today": total_xp}


@router.post("/accept", response_model=ChallengeOut)
async def accept_challenge(
    body: ChallengeAcceptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Check if already accepted
    existing = db.query(UserChallenge).filter(
        UserChallenge.user_id == current_user.id,
        UserChallenge.challenge_title == body.title,
        UserChallenge.date == today_str
    ).first()
    
    if existing:
        return ChallengeOut(
            id=existing.id,
            title=existing.challenge_title,
            desc=existing.desc or "",
            xp=existing.xp,
            icon=existing.icon,
            completed=existing.completed
        )
    
    # Find in pool
    challenge_data = next((c for c in CHALLENGE_POOL if c["title"] == body.title), None)
    if not challenge_data:
        raise HTTPException(status_code=404, detail="Challenge not found in pool")
        
    new_c = UserChallenge(
        user_id=current_user.id,
        challenge_title=challenge_data["title"],
        desc=challenge_data["desc"],
        xp=challenge_data["xp"],
        icon=challenge_data["icon"],
        date=today_str,
        completed=False
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    
    return ChallengeOut(
        id=new_c.id,
        title=new_c.challenge_title,
        desc=new_c.desc or "",
        xp=new_c.xp,
        icon=new_c.icon,
        completed=new_c.completed
    )


@router.post("/complete/{challenge_id}", response_model=dict)
async def complete_challenge_v2(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Challenge ID might be "suggested_..." if they haven't "accepted" it yet
    if challenge_id.startswith("suggested_"):
        title = challenge_id.replace("suggested_", "")
        # Auto-accept then complete
        today_str = datetime.now().strftime("%Y-%m-%d")
        challenge_data = next((c for c in CHALLENGE_POOL if c["title"] == title), None)
        if not challenge_data:
             raise HTTPException(status_code=404, detail="Challenge not found")
             
        challenge = UserChallenge(
            user_id=current_user.id,
            challenge_title=challenge_data["title"],
            desc=challenge_data["desc"],
            xp=challenge_data["xp"],
            icon=challenge_data["icon"],
            date=today_str,
            completed=True
        )
        db.add(challenge)
    else:
        challenge = db.query(UserChallenge).filter(
            UserChallenge.id == challenge_id,
            UserChallenge.user_id == current_user.id
        ).first()
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        challenge.completed = True
        
    db.commit()
    return {"status": "success", "challenge_id": challenge_id}
