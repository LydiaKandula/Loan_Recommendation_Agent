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

    # reset session when new user comes
    chat_sessions[user_id] = []

    try:
        while True:

            user_msg = await ws.receive_text()

            user = db.query(User).filter(User.id == user_id).first()

            # 👋 Greeting logic
            if user_msg.lower() in ["hi", "hello", "hey"]:
                ai_reply = f"Hello {user.full_name}! 👋 I am your Loan Assistant. I can help you find the best loan based on your profile. Ask me anything!"
            else:
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

Instructions:
- Talk like ChatGPT
- Answer step by step
- Keep responses short
- Suggest loans when needed
"""
                }

                messages = (
                    [system_prompt]
                    + chat_sessions[user_id]
                    + [{"role": "user", "content": user_msg}]
                )

                ai_reply = generate_ai_response(messages)

            # store chat history
            chat_sessions[user_id].append({
                "role": "user",
                "content": user_msg
            })

            chat_sessions[user_id].append({
                "role": "assistant",
                "content": ai_reply
            })

            # save interaction
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