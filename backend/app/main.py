from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import agent, chat_ws, voice_ws
from app.routes import auth
from app.routes.chat_ws import router_extra
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Loan AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(agent.router)
app.include_router(chat_ws.router)
app.include_router(router_extra)
app.include_router(voice_ws.router)

@app.get("/")
def home():
    return {"message": "Loan AI Agent Running"}