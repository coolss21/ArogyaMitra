"""OpenRouter LLM client — httpx.AsyncClient singleton with retries, timeouts, JSON parsing."""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
from typing import Any

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)
settings = get_settings()


def request_hash(user_id: str, payload: dict) -> str:
    raw = json.dumps({"user": user_id, **payload}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


class OpenRouterClient:
    """Async OpenRouter client with connection pooling, retries, and JSON extraction."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": settings.OPENROUTER_SITE_URL,
            "X-Title": settings.OPENROUTER_APP_NAME,
            "Content-Type": "application/json",
        }

    async def startup(self) -> None:
        """Create the shared httpx.AsyncClient — call once on app startup."""
        self._client = httpx.AsyncClient(
            base_url=settings.OPENROUTER_BASE_URL,
            headers=self._headers,
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=30.0, pool=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
        log.info("openrouter_client_started", model=settings.OPENROUTER_MODEL)

    async def shutdown(self) -> None:
        """Close the shared client — call once on app shutdown."""
        if self._client:
            await self._client.aclose()
            log.info("openrouter_client_closed")

    @property
    def client(self) -> httpx.AsyncClient:
        if not self._client:
            raise RuntimeError("OpenRouterClient not started. Call startup() first.")
        return self._client

    async def _call(
        self,
        messages: list[dict],
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> str:
        """Raw LLM call with retry logic (exponential backoff for 429/5xx)."""
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or settings.OPENROUTER_MAX_TOKENS,
        }
        last_err: Exception | None = None

        for attempt in range(settings.OPENROUTER_MAX_RETRIES):
            t0 = time.time()
            try:
                resp = await self.client.post("/chat/completions", json=payload)

                # Retry on 429 or 5xx
                if resp.status_code in (429, 500, 502, 503, 504):
                    body = resp.text[:200]
                    log.warning(
                        "openrouter_retryable",
                        attempt=attempt + 1,
                        status=resp.status_code,
                        body=body,
                    )
                    last_err = httpx.HTTPStatusError(
                        f"HTTP {resp.status_code}", request=resp.request, response=resp
                    )
                    await asyncio.sleep(2**attempt)
                    continue

                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                latency_ms = int((time.time() - t0) * 1000)
                log.info(
                    "openrouter_ok",
                    attempt=attempt + 1,
                    model=settings.OPENROUTER_MODEL,
                    latency_ms=latency_ms,
                )
                return content

            except httpx.TimeoutException as e:
                log.warning("openrouter_timeout", attempt=attempt + 1, err=str(e))
                last_err = e
                await asyncio.sleep(2**attempt)
            except httpx.HTTPStatusError as e:
                log.warning("openrouter_http_error", attempt=attempt + 1, status=e.response.status_code)
                last_err = e
                await asyncio.sleep(2**attempt)
            except Exception as e:
                log.error("openrouter_error", attempt=attempt + 1, err=str(e))
                last_err = e
                await asyncio.sleep(1)

        raise RuntimeError(
            f"OpenRouter failed after {settings.OPENROUTER_MAX_RETRIES} attempts: {last_err}"
        )

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
                    candidate = text[start_idx:i + 1]
                    try:
                        return json.loads(candidate)
                    except Exception as e:
                        raise ValueError(
                            f"Extracted block was not valid JSON: {e}\nBlock: {candidate[:100]}"
                        )

    raise ValueError(f"Could not parse JSON. Unbalanced braces. Raw: {text[:300]}")


# Module-level singleton — initialized by app lifespan
openrouter_client = OpenRouterClient()
