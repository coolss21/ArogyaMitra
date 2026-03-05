"""Spoonacular integration – optional recipe lookup."""

from __future__ import annotations

import httpx
from typing import Optional
from app.config import get_settings

settings = get_settings()


async def search_recipes(
    query: str,
    diet: str = "",
    intolerances: str = "",
    cuisine: str = "",
    max_results: int = 3,
) -> Optional[list[dict]]:
    """Search Spoonacular for recipes. Returns None if API key not set."""
    if not settings.SPOONACULAR_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.spoonacular.com/recipes/complexSearch",
                params={
                    "apiKey": settings.SPOONACULAR_API_KEY,
                    "query": query,
                    "diet": diet,
                    "intolerances": intolerances,
                    "cuisine": cuisine,
                    "number": max_results,
                    "addRecipeInformation": True,
                    "fillIngredients": True,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for r in data.get("results", []):
                    results.append({
                        "title": r.get("title"),
                        "image": r.get("image"),
                        "source_url": r.get("sourceUrl"),
                        "ready_in_minutes": r.get("readyInMinutes"),
                        "servings": r.get("servings"),
                        "summary": r.get("summary", "")[:200],
                    })
                return results
    except Exception:
        pass
    return None
