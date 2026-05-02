from sqlalchemy import Column, Integer, String
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    phone = Column(String(15))
    email = Column(String(100))
    income = Column(Integer)
    credit_score = Column(Integer)