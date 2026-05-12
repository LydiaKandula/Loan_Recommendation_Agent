from sqlalchemy import Column, Integer, String, Numeric
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    full_name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)

    age = Column(Integer)
    job = Column(String)

    monthly_income = Column(Numeric)
    monthly_expenses = Column(Numeric)

    credit_score = Column(Integer)

    preferred_loan_type = Column(String)
    preferred_amount = Column(Numeric)
    preferred_tenure = Column(Integer)