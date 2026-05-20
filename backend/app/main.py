from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
=======

from app.routes import agent
from app.routes import application
from app.routes import chat

from app.core.database import engine
from app.models.application import Base
>>>>>>> c6238e05c6eb22f9867b0c5565266ba4fedb70c9

from app.routes import agent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
<<<<<<< HEAD
=======
app.include_router(application.router)
app.include_router(chat.router)
>>>>>>> c6238e05c6eb22f9867b0c5565266ba4fedb70c9

@app.get("/")
def home():
    return {
        "message": "Backend Running"
    }