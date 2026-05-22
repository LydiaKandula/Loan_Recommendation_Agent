from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import agent, chat_ws, voice_ws
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

# ✅ FIX: CORS middleware — required for React frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(chat_ws.router)
app.include_router(voice_ws.router)

@app.get("/")
def home():
    return {"message": "Loan AI Voice Assistant Running"}