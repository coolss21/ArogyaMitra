import pytest
from httpx import AsyncClient
from app.main import app
from app.auth import create_access_token
from app.models.models import User, UserChallenge
from sqlalchemy.orm import Session
from datetime import datetime

@pytest.mark.asyncio
async def test_challenge_flow(client: AsyncClient, db: Session, test_user: User):
    token = create_access_token(test_user.id, test_user.role)
    headers = {"Authorization": f"Bearer {token}"}
    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Get today's challenges (should see suggestions)
    response = await client.get("/challenges/today", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "challenges" in data
    suggested = [c for c in data["challenges"] if c["id"].startswith("suggested_")]
    assert len(suggested) > 0

    # 2. Accept a challenge
    challenge_to_accept = suggested[0]["title"]
    response = await client.post("/challenges/accept", json={"title": challenge_to_accept}, headers=headers)
    assert response.status_code == 200
    accepted_data = response.json()
    assert accepted_data["title"] == challenge_to_accept
    assert accepted_data["completed"] is False
    challenge_id = accepted_data["id"]

    # 3. Complete the challenge
    response = await client.post(f"/challenges/complete/{challenge_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 4. Verify in today's list
    response = await client.get("/challenges/today", headers=headers)
    data = response.json()
    completed = [c for c in data["challenges"] if c["title"] == challenge_to_accept]
    assert len(completed) == 1
    assert completed[0]["completed"] is True
    assert data["total_xp_today"] > 0

@pytest.mark.asyncio
async def test_streak_with_challenges(client: AsyncClient, db: Session, test_user: User):
    token = create_access_token(test_user.id, test_user.role)
    headers = {"Authorization": f"Bearer {token}"}
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Complete a challenge but NO workout
    response = await client.post("/challenges/accept", json={"title": "Drink 3L of Water"}, headers=headers)
    c_id = response.json()["id"]
    await client.post(f"/challenges/complete/{c_id}", headers=headers)

    # Check summary - streak should be 1
    response = await client.get("/progress/summary", headers=headers)
    assert response.status_code == 200
    assert response.json()["current_streak"] == 1
