"""
tts_service.py — Sarvam AI Bulbul v3 Text-to-Speech service
Replaces the old pyttsx3-based speak() with a cloud TTS that:
  • Supports English (Indian accent), Hindi, and Telugu natively
  • Has 30+ voices split into male and female
  • Returns base64-encoded WAV audio sent to the browser
"""

import os
import httpx
import base64
from app.core.config import SARVAM_API_KEY

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# ── Voice catalogue ─────────────────────────────────────────────────────────
# Organised as { language_code: { "male": [...], "female": [...] } }
# All names are from Sarvam Bulbul v3 speaker list (case-sensitive, lowercase)
VOICE_CATALOGUE = {
    "en": {
        "male":   ["shubh", "aditya", "rahul", "rohan", "amit", "dev", "varun", "kabir"],
        "female": ["ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya"],
    },
    "hi": {
        "male":   ["shubh", "aditya", "rahul", "rohan", "amit", "dev", "varun", "kabir"],
        "female": ["ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya"],
    },
    "te": {
        "male":   ["shubh", "aditya", "rahul", "rohan", "gokul", "vijay"],
        "female": ["ritu", "priya", "neha", "pooja", "kavitha", "shruti"],
    },
}

# Language code → Sarvam target_language_code
LANG_TO_SARVAM = {
    "en": "en-IN",
    "hi": "hi-IN",
    "te": "te-IN",
}


def get_default_voice(language: str, gender: str) -> str:
    """Return the first voice for the given language + gender, or a safe fallback."""
    voices = VOICE_CATALOGUE.get(language, VOICE_CATALOGUE["en"])
    gender_voices = voices.get(gender, voices.get("male", ["shubh"]))
    return gender_voices[0] if gender_voices else "shubh"


def speak(
    text: str,
    language: str = "en",
    speaker: str | None = None,
    gender: str = "female",
    pace: float = 1.0,
) -> str | None:
    """Backward-compatible speak() wrapper for legacy imports."""
    return synthesise(
        text,
        language=language,
        speaker=speaker,
        gender=gender,
        pace=pace,
    )


def synthesise(
    text: str,
    language: str = "en",
    speaker: str | None = None,
    gender: str = "female",
    pace: float = 1.0,
) -> str | None:
    """
    Call Sarvam TTS and return base64-encoded WAV audio string.
    Returns None if API key is missing or the call fails.
    """
    if not SARVAM_API_KEY:
        print("SARVAM_API_KEY not set — TTS skipped")
        return None

    # Pick voice: use explicit speaker if provided, else pick by gender
    voice = speaker or get_default_voice(language, gender)
    target_lang = LANG_TO_SARVAM.get(language, "en-IN")

    # Truncate to 2500 chars (Bulbul v3 limit)
    text = text[:2500]

    payload = {
        "text":                 text,
        "target_language_code": target_lang,
        "speaker":              voice,
        "model":                "bulbul:v3",
        "pace":                 max(0.5, min(2.0, pace)),   # clamp to valid range
        "speech_sample_rate":   22050,
        "output_audio_codec":   "wav",
    }

    try:
        resp = httpx.post(
            SARVAM_TTS_URL,
            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        audios = data.get("audios", [])
        return audios[0] if audios else None

    except Exception as e:
        print(f"Sarvam TTS error: {e}")
        return None


def get_voice_list(language: str = "en") -> dict:
    """Return the male/female voice lists for a given language (for frontend picker)."""
    return VOICE_CATALOGUE.get(language, VOICE_CATALOGUE["en"])