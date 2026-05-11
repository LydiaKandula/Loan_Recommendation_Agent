from fastapi import APIRouter
from app.services.groq_service import generate_chat_response

router = APIRouter()

@router.post("/chat")
def chat(data: dict):
    reply = generate_chat_response(data)
    return {"reply": reply}