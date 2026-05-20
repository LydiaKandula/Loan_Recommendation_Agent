from fastapi import FastAPI
from app.routes import agent, chat_ws, voice_ws
from app.core.database import Base, engine

<<<<<<< Updated upstream
=======
from app.routes import agent
from app.routes import application
from app.routes import chat
from app.routes import voice

from app.core.database import engine
from app.models.application import Base

>>>>>>> Stashed changes
Base.metadata.create_all(bind=engine)

app = FastAPI()

<<<<<<< Updated upstream
app.include_router(agent.router)
app.include_router(chat_ws.router)
app.include_router(voice_ws.router)
=======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# EXISTING ROUTES
app.include_router(agent.router)
app.include_router(application.router)

# NEW ROUTES
app.include_router(chat.router)
app.include_router(voice.router)
>>>>>>> Stashed changes

@app.get("/")
@app.post("/submit-application")
def home():
    return {"message": "Loan AI Voice Assistant Running"}


#Base.metadata.create_all(bind=engine)