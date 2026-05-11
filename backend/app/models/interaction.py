from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Interaction(Base):

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer)

    user_message = Column(String)

    bot_response = Column(String)