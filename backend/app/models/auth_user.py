# backend/app/models/auth_user.py
from sqlalchemy import Column, Integer, String, TIMESTAMP
from app.core.database import Base
from sqlalchemy.sql import func


class AuthUser(Base):
    """App-level login accounts — separate from loan applicant User records."""
    __tablename__ = "auth_users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(80),  unique=True, nullable=False)
    email         = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(TIMESTAMP, server_default=func.now())