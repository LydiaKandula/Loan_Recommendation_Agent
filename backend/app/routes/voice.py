from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File

import shutil

from app.services.speech_service import speech_to_text
from app.services.groq_service import generate_ai_response

router = APIRouter()

@router.post("/voice-chat")

async def voice_chat(file: UploadFile = File(...)):

    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as buffer:

        shutil.copyfileobj(file.file, buffer)

    user_text = speech_to_text(file_path)

    ai_response = generate_ai_response(user_text)

    return {

        "user_text": user_text,

        "ai_response": ai_response
    }