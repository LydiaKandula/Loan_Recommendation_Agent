from sqlalchemy import Column, Integer, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    input = Column(Text)
    response = Column(Text)
    timestamp = Column(TIMESTAMP, server_default=func.now())