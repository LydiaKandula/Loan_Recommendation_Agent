import httpx
from app.core.config import SARVAM_API_KEY

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

BEST_VOICE = {"female": "ritu", "male": "shubh"}

LANG_TO_SARVAM = {"en": "en-IN", "hi": "hi-IN", "te": "te-IN"}


def synthesise(text: str, language: str = "en", speaker: str | None = None, gender: str = "female") -> str | None:
    if not SARVAM_API_KEY:
        return None
    voice  = speaker or BEST_VOICE.get(gender, "ritu")
    target = LANG_TO_SARVAM.get(language, "en-IN")
    try:
        resp = httpx.post(
            SARVAM_TTS_URL,
            headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"},
            json={"text": text[:2500], "target_language_code": target,
                  "speaker": voice, "model": "bulbul:v3",
                  "pace": 1.0, "speech_sample_rate": 22050, "output_audio_codec": "wav"},
            timeout=10.0,
        )
        resp.raise_for_status()
        audios = resp.json().get("audios", [])
        return audios[0] if audios else None
    except Exception as e:
        print(f"Sarvam TTS error: {e}")
        return None