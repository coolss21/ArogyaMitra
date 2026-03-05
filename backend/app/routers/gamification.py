"""Gamification router — pledges and dashboard."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.models import User, Pledge
from app.schemas.schemas import PledgeCreate, PledgeOut

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.post("/pledges", response_model=PledgeOut)
async def create_pledge(
    body: PledgeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pledge = Pledge(user_id=current_user.id, **body.model_dump())
    db.add(pledge)
    db.commit()
    db.refresh(pledge)
    return pledge


@router.get("/pledges", response_model=list[PledgeOut])
async def list_pledges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Pledge).filter(Pledge.user_id == current_user.id).all()


@router.put("/pledges/{pledge_id}/fulfill", response_model=PledgeOut)
async def fulfill_pledge(
    pledge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pledge = db.query(Pledge).filter(Pledge.id == pledge_id, Pledge.user_id == current_user.id).first()
    if not pledge:
        raise HTTPException(status_code=404, detail="Pledge not found")
    pledge.is_fulfilled = True
    db.commit()
    db.refresh(pledge)
    return pledge


@router.get("/dashboard")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pledges = db.query(Pledge).filter(Pledge.user_id == current_user.id).all()
    total_pledged = sum(p.amount_inr for p in pledges if not p.is_fulfilled)
    fulfilled = [p for p in pledges if p.is_fulfilled]
    return {
        "total_pledges": len(pledges),
        "fulfilled_pledges": len(fulfilled),
        "total_pledged_inr": total_pledged,
        "total_achievements": len(fulfilled),
    }
