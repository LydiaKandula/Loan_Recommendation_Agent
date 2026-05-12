from fastapi import FastAPI

from app.routes.chat_ws import router as chat_router
from app.routes.voice_ws import router as voice_router
from app.routes.agent import router as agent_router

app = FastAPI()

app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(agent_router)

@app.get("/")
def home():
    return {"message": "Loan AI Voice Assistant Running"}