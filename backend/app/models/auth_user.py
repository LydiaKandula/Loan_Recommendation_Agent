from sqlalchemy import Column, Integer, String, TIMESTAMP
from app.core.database import Base
from sqlalchemy.sql import func


class AuthUser(Base):
    __tablename__ = "auth_users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, nullable=False)
    full_name       = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    session_token   = Column(String, nullable=True)
    created_at      = Column(TIMESTAMP, server_default=func.now())