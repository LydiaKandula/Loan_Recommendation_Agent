from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class StatusTracking(Base):
    __tablename__ = "status_tracking"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    stage = Column(String(100))
    updated_at = Column(TIMESTAMP, server_default=func.now())