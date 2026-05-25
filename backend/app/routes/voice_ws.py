from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.speech_service import speech_to_text
from app.services.tts_service import synthesise
from app.services.groq_service import generate_ai_response
from app.models.interaction import Interaction
from app.core.database import SessionLocal

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_ws(ws: WebSocket):
    await ws.accept()

    # ✅ FIX: Original never closed the DB session on disconnect — resource leak.
    db = SessionLocal()

    try:
        while True:
            # Receive user_id from client so we don't hardcode 1
            # ✅ FIX: Original hardcoded user_id=1 — now expects JSON {"user_id": X, "text": "..."}
            # or falls back to text-only mode for backward compatibility.
            raw = await ws.receive_text()

            import json
            try:
                payload = json.loads(raw)
                user_id = payload.get("user_id", 1)
                user_text = payload.get("text", "")
            except Exception:
                # Fallback: plain text from browser speech recognition
                user_text = raw
                user_id = 1

            if not user_text:
                user_text = speech_to_text()

            ai_response = generate_ai_response(user_text)

            # TTS on server side (optional — browser TTS in ChatUI is preferred)
            synthesise(ai_response)

            interaction = Interaction(
                user_id=user_id,
                user_message=user_text,
                ai_response=ai_response,
                communication_type="voice"
            )
            db.add(interaction)
            db.commit()

            await ws.send_json({
                "user": user_text,
                "ai":   ai_response
            })

    except WebSocketDisconnect:
        print("Voice WebSocket disconnected")
    except Exception as e:
        print(f"Voice WebSocket error: {e}")
    finally:
        # ✅ FIX: Always close the DB session
        db.close()