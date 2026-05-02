from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    task_name = Column(String(100))
    status = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=func.now())