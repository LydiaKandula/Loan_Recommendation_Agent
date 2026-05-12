from sqlalchemy import Column, Integer, Text, ForeignKey, String
from app.core.database import Base

class Interaction(Base):

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    user_message = Column(Text)
    ai_response = Column(Text)

    communication_type = Column(String)