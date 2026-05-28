from sqlalchemy import Column, Integer, String, Text, Numeric, TIMESTAMP, ForeignKey
from app.core.database import Base
from sqlalchemy.sql import func

class CallLog(Base):
    __tablename__ = "call_logs"

    id              = Column(Integer, primary_key=True, index=True)
    auth_user_id    = Column(Integer, ForeignKey("auth_users.id"), nullable=True)
    call_sid        = Column(String(64), unique=True)          # Twilio CallSid
    to_number       = Column(String(32))
    from_number     = Column(String(32))
    status          = Column(String(32))                       # initiated/ringing/in-progress/completed/failed
    duration_sec    = Column(Integer, default=0)
    recording_url   = Column(Text, nullable=True)
    transcript      = Column(Text, nullable=True)
    sentiment       = Column(String(32), nullable=True)        # positive/neutral/negative
    ai_summary      = Column(Text, nullable=True)
    created_at      = Column(TIMESTAMP, server_default=func.now())
    updated_at      = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())