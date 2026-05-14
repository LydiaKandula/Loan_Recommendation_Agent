from fastapi import FastAPI
from app.routes import agent, chat_ws, voice_ws
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(agent.router)
app.include_router(chat_ws.router)
app.include_router(voice_ws.router)

@app.get("/")
def home():
    return {"message": "Loan AI Voice Assistant Running"}


#Base.metadata.create_all(bind=engine)