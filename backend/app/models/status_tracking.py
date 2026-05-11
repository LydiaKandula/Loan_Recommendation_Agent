from sqlalchemy import Column, Integer, String
from app.core.database import Base

class StatusTracking(Base):

    __tablename__ = "status_tracking"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer)

    stage = Column(String)