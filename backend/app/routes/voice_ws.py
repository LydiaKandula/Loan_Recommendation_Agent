from fastapi import APIRouter, WebSocket
from app.services.speech_service import speech_to_text
from app.services.tts_service import speak
from app.services.groq_service import generate_ai_response
from app.models.interaction import Interaction
from app.core.database import SessionLocal

router = APIRouter()

@router.websocket("/ws/voice")
async def voice_ws(ws: WebSocket):
    await ws.accept()

    db = SessionLocal()

    while True:

        # 🎤 Step 1: User speaks
        user_text = speech_to_text()

        # 🤖 Step 2: AI response
        ai_response = generate_ai_response(user_text)

        # 🔊 Step 3: AI speaks
        speak(ai_response)

        # 💾 Step 4: Store in DB
        interaction = Interaction(
            user_id=1,
            user_message=user_text,
            ai_response=ai_response,
            communication_type="voice"
        )

        db.add(interaction)
        db.commit()

        # 📤 Step 5: Send to frontend (optional)
        await ws.send_json({
            "user": user_text,
            "ai": ai_response
        })