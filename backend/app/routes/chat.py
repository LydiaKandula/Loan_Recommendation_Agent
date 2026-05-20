from fastapi import APIRouter, WebSocket
from pydantic import BaseModel

router = APIRouter()

# =========================
# NORMAL API CHAT
# =========================

class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat_ai(data: ChatRequest):

    user_message = data.message.lower()

    # AI LOGIC

    if "home loan" in user_message:

        reply = (
            "Based on your profile, SBI Home Loan is recommended with lower interest rates."
        )

    elif "personal loan" in user_message:

        reply = (
            "HDFC Personal Loan is suitable for quick approval."
        )

    elif "credit score" in user_message:

        reply = (
            "A credit score above 750 improves approval chances."
        )

    elif "emi" in user_message:

        reply = (
            "EMI depends on amount, tenure, and interest rate."
        )

    elif "hello" in user_message or "hi" in user_message:

        reply = (
            "Hello! Welcome to Loan Recommendation AI Assistant."
        )

    else:

        reply = (
            "I can help with loan recommendations, EMI, "
            "credit score, eligibility, and repayment plans."
        )

    return {
        "response": reply
    }


# =========================
# WEBSOCKET CHAT
# =========================

@router.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):

    await ws.accept()

    while True:

        message = await ws.receive_text()

        lower = message.lower()

        # AI RESPONSES

        if "hi" in lower or "hello" in lower:

            reply = (
                "Hello! Welcome to Loan Recommendation AI Assistant."
            )

        elif "home loan" in lower:

            reply = (
                "SBI Home Loan is recommended for long tenure and low interest."
            )

        elif "personal loan" in lower:

            reply = (
                "HDFC Personal Loan provides quick approval."
            )

        elif "credit score" in lower:

            reply = (
                "Credit score above 750 improves approval chances."
            )

        elif "emi" in lower:

            reply = (
                "EMI depends on amount, tenure, and interest rate."
            )

        elif "education loan" in lower:

            reply = (
                "Axis Bank Education Loan supports higher studies with flexible repayment."
            )

        elif "car loan" in lower:

            reply = (
                "ICICI Car Loan offers fast approval and flexible EMI options."
            )

        elif "loan eligibility" in lower:

            reply = (
                "Loan eligibility depends on your income, expenses, age, and credit score."
            )

        else:

            reply = (
                "I can help with loan eligibility, EMI, repayment, credit score, and loan recommendations."
            )

        await ws.send_text(reply)