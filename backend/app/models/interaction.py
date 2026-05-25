from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from app.core.database import Base
from sqlalchemy.sql import func

class Interaction(Base):
    __tablename__ = "interactions"

    id           = Column(Integer, primary_key=True)
    user_id      = Column(Integer, ForeignKey("users.id"))
    # NEW: track which logged-in account owns this interaction
    auth_user_id = Column(Integer, ForeignKey("auth_users.id"), nullable=True)

    user_message       = Column(Text)
    ai_response        = Column(Text)
    communication_type = Column(String)
    created_at         = Column(TIMESTAMP, server_default=func.now())