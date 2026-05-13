from sqlalchemy import Column, Integer, String, Numeric
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(100))
    email = Column(String(100), unique=True)
    phone = Column(String(20))

    age = Column(Integer)

    job = Column(String(100))

    monthly_income = Column(Numeric)

    monthly_expenses = Column(Numeric)

    credit_score = Column(Integer)

    preferred_loan_type = Column(String(50))

    preferred_amount = Column(Numeric)

    preferred_tenure = Column(Integer)