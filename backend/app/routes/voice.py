from fastapi import APIRouter, WebSocket

router = APIRouter()

@router.websocket("/ws/voice")
async def voice_ws(ws: WebSocket):

    await ws.accept()

    while True:

        text = await ws.receive_text()

        ai_response = f"Voice AI Response: {text}"

        await ws.send_text(ai_response)