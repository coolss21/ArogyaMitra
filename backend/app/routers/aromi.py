"""AROMI router — chat (agent loop), adjust, agent events, memory CRUD."""
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from typing import Optional

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.models import User, AgentEvent, UserMemory
from app.schemas.schemas import (
    ChatRequest, ChatResponse, HistoryResponse, AdjustRequest, AdjustResponse,
    AgentEventOut, MemorySetRequest, MemoryOut,
)
from app.services.agent import run_agent_loop
from app.services.tools import tool_adjust_plans
from app.services.memory import get_memory, set_memory, delete_memory_key

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/aromi", tags=["aromi"])


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
async def aromi_chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the AROMI agent planner loop and return the reply."""
    result = await run_agent_loop(
        user_id=current_user.id,
        message=body.message,
        session_id=body.session_id,
        db=db,
    )
    return ChatResponse(**result)


@router.get("/history", response_model=HistoryResponse)
async def get_aromi_history(
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the conversation history for a session."""
    from app.models.models import ConversationState
    
    q = db.query(ConversationState).filter(ConversationState.user_id == current_user.id)
    if session_id:
        state = q.filter(ConversationState.session_id == session_id).first()
    else:
        state = q.order_by(ConversationState.updated_at.desc()).first()
    
    if not state:
        return {"session_id": session_id or "new", "history": []}
    
    return {
        "session_id": state.session_id,
        "history": state.history or []
    }


@router.post("/adjust", response_model=AdjustResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
async def aromi_adjust(
    request: Request,
    body: AdjustRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Direct plan adjustment (bypasses agent loop for explicit adjustments)."""
    result = await tool_adjust_plans(
        user_id=current_user.id,
        db=db,
        args={
            "change_type": body.change_type,
            "details": body.details,
            "days_to_adjust": body.days_to_adjust,
        },
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result["message"])
    return AdjustResponse(
        change_type=result["change_type"],
        days_affected=result["days_adjusted"],
        rationale=result.get("rationale"),
    )


@router.get("/events", response_model=list[AgentEventOut])
async def get_agent_events(
    limit: int = 200,
    session_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the last N agent events — proof of agentic behavior."""
    q = db.query(AgentEvent).filter(AgentEvent.user_id == current_user.id)
    if session_id:
        q = q.filter(AgentEvent.session_id == session_id)
    return q.order_by(AgentEvent.created_at.desc()).limit(limit).all()


@router.get("/memory", response_model=list[MemoryOut])
async def list_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(UserMemory).filter(UserMemory.user_id == current_user.id).all()
    return rows


@router.put("/memory")
async def upsert_memory(
    body: MemorySetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    set_memory(current_user.id, body.key, body.value, db)
    return {"message": "Memory saved", "key": body.key}


@router.delete("/memory/{key}")
async def delete_memory(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_memory_key(current_user.id, key, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory key not found")
    return {"message": f"Deleted memory key: {key}"}
