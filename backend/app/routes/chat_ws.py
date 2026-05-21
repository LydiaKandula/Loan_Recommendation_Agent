from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.groq_service import generate_ai_response
from app.core.database import SessionLocal
from app.models.user import User
from app.models.interaction import Interaction

router = APIRouter()

chat_sessions = {}

@router.websocket("/ws/chat/{user_id}")
async def chat_ws(ws: WebSocket, user_id: int):

    await ws.accept()
    db = SessionLocal()

    if user_id not in chat_sessions:
        chat_sessions[user_id] = []

    try:
        while True:

            user_msg = await ws.receive_text()

            user = db.query(User).filter(User.id == user_id).first()

            if not user:
                await ws.send_text("⚠️ Please submit loan form first")
                continue

            system_prompt = {
                "role": "system",
                "content": f"""
You are a smart Loan Assistant.

User Info:
Income: {user.monthly_income}
Credit Score: {user.credit_score}
Loan Type: {user.preferred_loan_type}
Amount: {user.preferred_amount}
Tenure: {user.preferred_tenure}

Be conversational and helpful.
"""
            }

            messages = [system_prompt] + chat_sessions[user_id] + [
                {"role": "user", "content": user_msg}
            ]

            ai_reply = generate_ai_response(messages)

            chat_sessions[user_id].append({
                "role": "user",
                "content": user_msg
            })

            chat_sessions[user_id].append({
                "role": "assistant",
                "content": ai_reply
            })

            interaction = Interaction(
                user_id=user_id,
                user_message=user_msg,
                ai_response=ai_reply,
                communication_type="chat"
            )

            db.add(interaction)
            db.commit()

            await ws.send_text(ai_reply)

    except WebSocketDisconnect:
        print("Disconnected")

    finally:
        db.close()