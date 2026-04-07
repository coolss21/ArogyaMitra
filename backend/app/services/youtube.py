"""YouTube video link service — Data API v3 when key available, fallback to search URL."""
from __future__ import annotations

import urllib.parse
from functools import lru_cache

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)
settings = get_settings()

# In-memory cache for video URLs (exercise_name -> url)
_video_cache: dict[str, str] = {}

YOUTUBE_SEARCH_API = "https://www.googleapis.com/youtube/v3/search"


def get_exercise_video_url(exercise: str) -> str:
    """Return a YouTube video URL for the given exercise.
    
    Uses YouTube Data API v3 if YOUTUBE_API_KEY is set,
    otherwise returns a YouTube search URL.
    """
    if not exercise or not exercise.strip():
        return ""

    exercise = exercise.strip()

    # Check cache first
    if exercise in _video_cache:
        return _video_cache[exercise]

    # If API key available, try Data API
    if settings.YOUTUBE_API_KEY:
        url = _search_youtube_api(exercise)
        if url:
            _video_cache[exercise] = url
            return url

    # Fallback: search URL
    url = _build_search_url(exercise)
    _video_cache[exercise] = url
    return url


def _search_youtube_api(exercise: str) -> str | None:
    """Search YouTube Data API v3 for an exercise tutorial video."""
    try:
        query = f"{exercise} proper form tutorial"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": 1,
            "key": settings.YOUTUBE_API_KEY,
            "videoDuration": "medium",
            "relevanceLanguage": "en",
        }
        # Use sync httpx for simplicity (called during plan enrichment)
        resp = httpx.get(YOUTUBE_SEARCH_API, params=params, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()

        items = data.get("items", [])
        if items:
            video_id = items[0]["id"]["videoId"]
            url = f"https://www.youtube.com/watch?v={video_id}"
            log.info("youtube_api_hit", exercise=exercise, video_id=video_id)
            return url

    except Exception as e:
        log.warning("youtube_api_error", exercise=exercise, err=str(e))

    return None


def _build_search_url(exercise: str) -> str:
    """Build a YouTube search URL as fallback."""
    query = urllib.parse.quote_plus(f"{exercise} proper form tutorial")
    return f"https://www.youtube.com/results?search_query={query}"
