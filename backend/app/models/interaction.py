from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base


class Interaction(Base):

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)

    user_message = Column(Text, nullable=False)

    ai_response = Column(Text, nullable=False)

    communication_type = Column(String(20), nullable=False)
