from sqlalchemy import Column, Integer, String
from app.core.database import Base

class CallLog(Base):

    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer)

    phone = Column(String)

    call_sid = Column(String)

    status = Column(String)