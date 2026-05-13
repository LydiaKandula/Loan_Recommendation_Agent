from fastapi import APIRouter

from app.services.groq_service import generate_ai_response

router = APIRouter()

@router.post("/chat")

def chat(data: dict):

    user_message = data.get("message")

    ai_response = generate_ai_response(user_message)

    return {

        "user_message": user_message,

        "ai_response": ai_response
    }