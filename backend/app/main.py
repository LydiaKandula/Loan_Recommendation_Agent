from fastapi import FastAPI
from app.routes.agent import router
from app.core.database import Base, engine

app = FastAPI()

# 🔥 CREATE TABLES AUTOMATICALLY (IMPORTANT FIX)
Base.metadata.create_all(bind=engine)

app.include_router(router)