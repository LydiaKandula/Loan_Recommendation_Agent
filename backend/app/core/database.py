from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import DB_URL

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)

def get_db():
    return SessionLocal()