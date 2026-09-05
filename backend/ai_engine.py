"""
ResQMap AI — Server-side Gemini Multimodal Classification Engine

Handles:
  - Image classification via Gemini API
  - SHA-256 hash cache (avoids re-classifying identical images)
  - Graceful fallback if GEMINI_API_KEY is absent or call fails
  - Result normalisation to match backend/models.py AIAnalysisResult schema
"""
import hashlib
import json
import logging
import base64
from typing import Optional

from backend.config import GEMINI_API_KEY

logger = logging.getLogger("resqmap.ai")

# ─── In-memory result cache (process lifetime) ───────────────────────────────
_cache: dict[str, dict] = {}

# ─── Classification prompt ────────────────────────────────────────────────────
_SYSTEM_PROMPT = """
You are an expert AI Disaster Damage & Hazard Classifier and First Responder
Incident Assessment System. You analyze ground-level disaster photographs
submitted by citizens (often taken in high stress, low light, tilted angles,
or blurry conditions).

Your mission:
1. Classify the image into exactly ONE of the following Hazard Categories:
   - 'Flood / Waterlogging'
   - 'Structural Damage / Building Collapse'
   - 'Fire / Wildfire / Smoke'
   - 'Landslide / Mudslide'
   - 'Downed Powerlines / Electrical Hazard'
   - 'Road Obstruction / Debris'
   - 'Other Hazard'

2. Estimate the Severity:
   - 'LOW': Minor damage, localized nuisance, no threat to life.
   - 'MEDIUM': Noticeable damage, partial road blockage, minor structural cracks.
   - 'HIGH': Major flooding, severe structural damage, active fire, impassable roads.
   - 'CRITICAL': Complete building collapse, raging wildfire, flash flood, life trapped.

3. Verify Real Disaster vs False Alarm / Hoax / Non-Disaster:
   - is_real_disaster (true/false)
   - authenticity_score (0–100, 100 = indisputably real crisis)
   - If false alarm, explain in false_alarm_reason.

4. Visual Explainability (3-5 specific bullet points for live judging).

5. First Responder Recommendations & Damage Assessment.

Return ONLY valid JSON:
{
  "hazard_category": "<one of the 7 categories>",
  "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "confidence": <0.0–1.0>,
  "is_real_disaster": <bool>,
  "authenticity_score": <0.0–100.0>,
  "false_alarm_reason": <string or null>,
  "visual_features": [<string>, ...],
  "recommended_units": [<string>, ...],
  "damage_assessment": "<string>",
  "safety_instructions": [<string>, ...]
}
"""

# Current valid Gemini model names (update if API deprecates)
_MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def _image_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _fallback_result() -> dict:
    """Minimal safe fallback when Gemini is unavailable."""
    return {
        "hazard_category": "Other Hazard",
        "severity": "MEDIUM",
        "confidence": 0.70,
        "is_real_disaster": True,
        "authenticity_score": 75.0,
        "false_alarm_reason": None,
        "visual_features": ["Visual anomaly reported — awaiting responder confirmation"],
        "recommended_units": ["General Rapid Response Unit"],
        "damage_assessment": "Server-side AI classification unavailable. "
                              "Fallback triage assigned. Please verify on scene.",
        "safety_instructions": ["Maintain safe distance from the hazard area."],
    }


async def classify_image_base64(
    image_base64: str,
    mime_type: str = "image/jpeg",
    custom_api_key: Optional[str] = None,
) -> dict:
    """
    Classify a disaster image using the Gemini multimodal API.

    Args:
        image_base64:  Base64-encoded image data (without data: prefix).
        mime_type:     MIME type of the image.
        custom_api_key: Override the server GEMINI_API_KEY (for per-request keys).

    Returns:
        dict matching AIAnalysisResult schema.
    """
    api_key = (custom_api_key or GEMINI_API_KEY or "").strip()

    # Hash the raw image bytes for caching
    try:
        raw_bytes = base64.b64decode(image_base64)
        img_hash = _image_hash(raw_bytes)
    except Exception:
        img_hash = None

    if img_hash and img_hash in _cache:
        logger.info(f"[AI] Cache hit for image hash {img_hash[:12]}…")
        return _cache[img_hash]

    if not api_key:
        logger.warning("[AI] No GEMINI_API_KEY — returning fallback result.")
        return _fallback_result()

    # Try available models in order
    last_err: Exception = Exception("No models tried")
    for model_name in _MODELS_TO_TRY:
        try:
            from google import genai  # type: ignore
            client = genai.Client(api_key=api_key)

            response = client.models.generate_content(
                model=model_name,
                contents=[
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": image_base64,
                                }
                            },
                            {
                                "text": (
                                    "Analyze this citizen-submitted photograph for "
                                    "disaster damage triage, hazard classification, "
                                    "severity estimation, explainability, and "
                                    "authenticity verification."
                                )
                            },
                        ]
                    }
                ],
                config={
                    "system_instruction": _SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                    "temperature": 0.2,
                },
            )

            raw = response.text or ""
            if not raw.strip():
                raise ValueError("Empty response from Gemini")

            parsed = json.loads(raw.strip())
            result = {
                "hazard_category": parsed.get("hazard_category", "Other Hazard"),
                "severity": (parsed.get("severity") or "MEDIUM").upper(),
                "confidence": float(parsed.get("confidence", 0.92)),
                "is_real_disaster": bool(parsed.get("is_real_disaster", True)),
                "authenticity_score": float(parsed.get("authenticity_score", 90.0)),
                "false_alarm_reason": parsed.get("false_alarm_reason") or None,
                "visual_features": parsed.get("visual_features") or ["Visual anomaly detected"],
                "recommended_units": parsed.get("recommended_units") or ["General Disaster Response Team"],
                "damage_assessment": parsed.get("damage_assessment") or "",
                "safety_instructions": parsed.get("safety_instructions") or ["Stay clear of hazard area."],
            }

            # Cache successful result
            if img_hash:
                _cache[img_hash] = result

            logger.info(f"[AI] Classified with {model_name}: {result['hazard_category']} ({result['severity']})")
            return result

        except Exception as err:
            logger.warning(f"[AI] {model_name} failed: {err}")
            last_err = err
            continue

    logger.error(f"[AI] All Gemini models failed. Last error: {last_err}")
    return _fallback_result()


async def classify_image_url(
    image_url: str,
    custom_api_key: Optional[str] = None,
) -> dict:
    """Fetch an image from a URL and classify it."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            img_bytes = resp.content
            mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
            b64 = base64.b64encode(img_bytes).decode()
            return await classify_image_base64(b64, mime, custom_api_key)
    except Exception as err:
        logger.warning(f"[AI] Failed to fetch image from URL ({image_url}): {err}")
        return _fallback_result()
