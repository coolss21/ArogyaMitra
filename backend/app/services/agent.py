"""AROMI Agent — planner loop with tool dispatch, memory, and full audit logging.

Protocol: LLM outputs strict JSON action, agent dispatches, logs event, repeats.
Max 3 iterations per message to prevent infinite loops.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.models import (
    Profile, WorkoutPlan, NutritionPlan, ConversationState, AgentEvent
)
from app.services.memory import get_memory
from app.services.openrouter import openrouter_client
from app.services.tools import TOOL_REGISTRY, TOOL_DESCRIPTIONS

log = logging.getLogger(__name__)
settings = get_settings()

MAX_STEPS = 3

# ── System Prompt ─────────────────────────────────────────────────────────────

PLANNER_SYSTEM = f"""You are AROMI, an agentic AI fitness & wellness coach.

SAFETY RULES (non-negotiable):
- You are NOT a doctor. Never diagnose or prescribe medication.
- Always add brief safety disclaimers for health advice.
- For injuries: reduce intensity, recommend doctor.
- CULTURAL SENSITIVITY: Respect all religious and cultural dietary constraints. 
  - For Hindu users: assume NO BEEF and NO BEEF PRODUCTS. 
  - For Muslim users: assume HALAL and NO PORK.
  - If a user mentions a religious diet, store it in memory and strictly adhere to it in all plan generation.

{TOOL_DESCRIPTIONS}

PROTOCOL — You MUST output ONLY ONE valid JSON object per turn (no extra text, no markdown):
{{
  "action": "call_tool" | "respond",
  "tool": "<tool_name>",
  "args": {{ ... }},
  "rationale": "<one sentence>"
}}

Rules:
- If action is "respond": set tool = "respond", args = {{"message": "<your reply>"}}
- If action is "call_tool": set tool to one of the available tools
- Always end with action="respond" to deliver final reply
- Max {MAX_STEPS} steps total — be efficient
- Use store_memory if user reveals a preference/constraint worth remembering
"""


# ── Event Logger ──────────────────────────────────────────────────────────────

def _log_event(
    db: Session,
    user_id: str,
    session_id: str,
    step: int,
    event_type: str,
    *,
    tool_name: Optional[str] = None,
    tool_args: Optional[dict] = None,
    result: Optional[dict] = None,
    rationale: Optional[str] = None,
    latency_ms: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    event = AgentEvent(
        user_id=user_id,
        session_id=session_id,
        step=step,
        event_type=event_type,
        tool_name=tool_name,
        tool_args=tool_args,
        result=result if isinstance(result, dict) else ({"value": str(result)} if result else None),
        rationale=rationale,
        latency_ms=latency_ms,
        error=error,
    )
    db.add(event)
    db.commit()


# ── Planner ───────────────────────────────────────────────────────────────────

async def run_agent_loop(
    user_id: str,
    message: str,
    session_id: Optional[str],
    db: Session,
) -> dict:
    """
    Run the AROMI agent loop.

    Returns:
        {
            "session_id": str,
            "reply": str,
            "steps_taken": int,
            "tools_called": [str],
            "adjustment_triggered": bool,
        }
    """
    # Session setup
    if not session_id:
        session_id = str(uuid.uuid4())

    # Load or create conversation state
    state = db.query(ConversationState).filter(
        ConversationState.session_id == session_id,
        ConversationState.user_id == user_id,
    ).first()

    if not state:
        state = ConversationState(
            user_id=user_id,
            session_id=session_id,
            history=[],
            step_count=0,
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    # Get user profile + memory for context
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    memory = get_memory(user_id, db)

    profile_ctx = ""
    if profile:
        profile_ctx = (
            f"\nUser profile: goal={profile.goal}, level={profile.fitness_level}, "
            f"diet={profile.diet_type}, location={profile.location}, "
            f"injuries={profile.injuries or 'none'}, calorie_target={profile.calorie_target}"
        )
    if memory:
        profile_ctx += f"\nUser memory: {json.dumps(memory)}"

    # Build message history (last 10 turns)
    history: list[dict] = state.history or []
    history.append({"role": "user", "content": message})
    if len(history) > 20:
        history = history[-20:]

    # Build planner messages
    system_prompt = PLANNER_SYSTEM + profile_ctx
    planner_messages = [{"role": "system", "content": system_prompt}] + history

    step = 0
    tools_called: list[str] = []
    final_reply = ""
    adjustment_triggered = False

    while step < MAX_STEPS:
        step += 1
        log.info("agent_step user=%s session=%s step=%d", user_id, session_id, step)

        # ── Planner call ───────────────────────────────────────────────────────
        t0 = time.time()
        try:
            action_raw = await openrouter_client.get_json_strict(planner_messages, temperature=0.2)
            planner_latency = int((time.time() - t0) * 1000)
        except Exception as e:
            _log_event(db, user_id, session_id, step, "planner_error", error=str(e))
            log.error("agent_planner_error step=%d err=%s", step, e)
            final_reply = "I'm having trouble thinking right now. Please try again in a moment."
            break

        action = action_raw.get("action", "respond")
        tool_name = action_raw.get("tool", "respond")
        args = action_raw.get("args", {})
        rationale = action_raw.get("rationale", "")

        _log_event(
            db, user_id, session_id, step, "planner_decision",
            tool_name=tool_name,
            tool_args=args,
            rationale=rationale,
            latency_ms=planner_latency,
        )
        log.info("agent_decision tool=%s rationale=%s", tool_name, rationale)

        # ── Tool dispatch ──────────────────────────────────────────────────────
        if tool_name == "respond" or action == "respond":
            final_reply = args.get("message", "") or action_raw.get("message", "")
            _log_event(db, user_id, session_id, step, "agent_response",
                       result={"message": final_reply}, rationale=rationale)
            break

        if tool_name not in TOOL_REGISTRY:
            _log_event(db, user_id, session_id, step, "tool_error",
                       tool_name=tool_name, error=f"Unknown tool: {tool_name}")
            final_reply = f"I tried to use a tool ({tool_name}) that doesn't exist. Let me answer directly."
            break

        # Execute tool
        tools_called.append(tool_name)
        if tool_name in ("adjust_plans",):
            adjustment_triggered = True

        _log_event(db, user_id, session_id, step, "tool_call",
                   tool_name=tool_name, tool_args=args, rationale=rationale)

        t1 = time.time()
        try:
            tool_fn = TOOL_REGISTRY[tool_name]
            tool_result = await tool_fn(user_id=user_id, db=db, args=args)
            tool_latency = int((time.time() - t1) * 1000)

            _log_event(db, user_id, session_id, step, "tool_result",
                       tool_name=tool_name, result=tool_result, latency_ms=tool_latency)
            log.info("tool_result tool=%s result=%s latency_ms=%d", tool_name, tool_result, tool_latency)

        except Exception as e:
            tool_latency = int((time.time() - t1) * 1000)
            _log_event(db, user_id, session_id, step, "tool_error",
                       tool_name=tool_name, error=str(e), latency_ms=tool_latency)
            log.error("tool_error tool=%s err=%s", tool_name, e)
            tool_result = {"status": "error", "message": str(e)}

        # Inject tool result into planner context
        planner_messages.append({
            "role": "assistant",
            "content": json.dumps(action_raw),
        })
        planner_messages.append({
            "role": "user",
            "content": f"Tool result for {tool_name}:\n{json.dumps(tool_result)}\n\nNow continue. Output your next JSON action.",
        })

    else:
        # Max steps reached
        _log_event(db, user_id, session_id, step, "max_steps_reached",
                   rationale=f"Reached max {MAX_STEPS} steps")
        log.warning("agent_max_steps user=%s session=%s", user_id, session_id)
        if not final_reply:
            final_reply = (
                "I've done my best to help! Please check your workout/nutrition pages "
                "if you requested a plan, or ask me to clarify."
            )

    # Persist conversation history
    history.append({"role": "assistant", "content": final_reply})
    state.history = history[-20:]
    state.step_count = (state.step_count or 0) + step
    db.commit()

    return {
        "session_id": session_id,
        "reply": final_reply,
        "steps_taken": step,
        "tools_called": tools_called,
        "adjustment_triggered": adjustment_triggered,
    }
