<<<<<<< HEAD
from sqlalchemy import Column, Integer, String, Text
=======
from sqlalchemy import Column, Integer, Text, ForeignKey, String
>>>>>>> main
from app.core.database import Base


class Interaction(Base):

    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)

<<<<<<< HEAD
    user_message = Column(Text, nullable=False)

    ai_response = Column(Text, nullable=False)

    communication_type = Column(String(20), nullable=False)
=======
    user_id = Column(Integer, ForeignKey("users.id"))

    user_message = Column(Text)
    ai_response = Column(Text)

    communication_type = Column(String)
>>>>>>> main
