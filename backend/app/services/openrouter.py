"""OpenRouter LLM client with retries, timeouts, and JSON parsing."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from typing import Any

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


def request_hash(user_id: str, payload: dict) -> str:
    raw = json.dumps({"user": user_id, **payload}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


import requests

class OpenRouterClient:
    def __init__(self):
        log.info("OpenRouterClient init with key prefix: %s", settings.OPENROUTER_API_KEY[:8])
        self._headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": settings.OPENROUTER_SITE_URL,
            "X-Title": settings.OPENROUTER_APP_NAME,
            "Content-Type": "application/json",
        }

    def _call_sync(self, payload: dict) -> str:
        """Synchronous call using requests for reliability against Windows proxy issues."""
        resp = requests.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=self._headers,
            json=payload,
            timeout=settings.OPENROUTER_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def _call(self, messages: list[dict], temperature: float = 0.4, max_tokens: int | None = None) -> str:
        """Raw call with retry logic."""
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or settings.OPENROUTER_MAX_TOKENS,
        }
        last_err = None
        for attempt in range(settings.OPENROUTER_MAX_RETRIES):
            try:
                # Run sync requests code in a thread to unblock async event loop
                content = await asyncio.to_thread(self._call_sync, payload)
                log.info("openrouter_ok attempt=%d model=%s", attempt + 1, settings.OPENROUTER_MODEL)
                return content
            except requests.exceptions.RequestException as e:
                log.warning("openrouter_http_error attempt=%d err=%s", attempt + 1, str(e))
                last_err = e
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                log.error("openrouter_error attempt=%d err=%s", attempt + 1, str(e))
                last_err = e
                await asyncio.sleep(1)
        raise RuntimeError(f"OpenRouter failed after {settings.OPENROUTER_MAX_RETRIES} attempts: {last_err}")

    async def get_text(self, messages: list[dict], temperature: float = 0.5) -> str:
        return await self._call(messages, temperature=temperature)

    async def get_json(self, messages: list[dict], temperature: float = 0.2) -> dict | list:
        """Get a JSON response, stripping markdown fences."""
        text = await self._call(messages, temperature=temperature)
        return _parse_json(text)

    async def get_json_strict(self, messages: list[dict], temperature: float = 0.1) -> dict:
        """Get a strict single-object JSON response."""
        text = await self._call(messages, temperature=temperature)
        result = _parse_json(text)
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict, got {type(result)}")
        return result


def _parse_json(text: str) -> Any:
    """Strip optional markdown fences and parse JSON. Robust against extra data."""
    text = text.strip()
    
    # Clean standard markdown fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    text = text.strip()
    
    try:
        # Fast path
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # Slow path: find the first complete valid JSON object using a stack parser
    start_idx = text.find("{")
    if start_idx == -1:
         raise ValueError(f"Could not parse JSON. No '{{' found. Raw: {text[:300]}")
         
    stack = 0
    in_string = False
    escape = False
    
    for i in range(start_idx, len(text)):
        char = text[i]
        
        if in_string:
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == '"':
                in_string = False
        else:
            if char == '"':
                in_string = True
            elif char == '{':
                stack += 1
            elif char == '}':
                stack -= 1
                if stack == 0:
                    candidate = text[start_idx:i+1]
                    try:
                        return json.loads(candidate)
                    except Exception as e:
                        raise ValueError(f"Extracted block was not valid JSON: {e}\nBlock: {candidate[:100]}")
                        
    raise ValueError(f"Could not parse JSON. Unbalanced braces. Raw: {text[:300]}")


openrouter_client = OpenRouterClient()
