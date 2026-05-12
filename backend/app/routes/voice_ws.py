from fastapi import APIRouter, WebSocket
import base64
import tempfile

from app.services.speech_service import speech_to_text
from app.services.groq_service import generate_ai_response
from app.services.tts_service import speak

router = APIRouter()

@router.websocket("/ws/voice")
async def voice(ws: WebSocket):

    await ws.accept()

    while True:

        data = await ws.receive_json()

        audio = base64.b64decode(data["audio"])

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio)
            path = f.name

        text = speech_to_text(path)

        ai = generate_ai_response(text)

        speak(ai)

        await ws.send_json({
            "user_text": text,
            "ai_response": ai
        })