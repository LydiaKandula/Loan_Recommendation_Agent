from fastapi import APIRouter, WebSocket
from app.services.groq_service import generate_ai_response

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()

    while True:
        msg = await ws.receive_text()

        ai = generate_ai_response(msg)

        await ws.send_text(ai)