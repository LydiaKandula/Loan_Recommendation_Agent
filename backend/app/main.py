from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import agent, chat_ws, voice_ws
from app.core.database import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agent.router)
app.include_router(chat_ws.router)
app.include_router(voice_ws.router)

@app.get("/")
def home():
    return {"message": "Loan AI Voice Assistant Running"}