from sqlalchemy import Column, Integer, String
from app.core.database import Base

class AgentTask(Base):

    __tablename__ = "agent_tasks"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer)

    task_type = Column(String)

    status = Column(String)