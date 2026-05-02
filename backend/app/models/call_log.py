from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    call_status = Column(String(50))
    duration = Column(Integer)
    timestamp = Column(TIMESTAMP, server_default=func.now())