from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP
from app.core.database import Base
from sqlalchemy.sql import func

class User(Base):
    _tablename_ = "users"

    id = Column(Integer, primary_key=True, index=True)
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

    created_at = Column(TIMESTAMP, server_default=func.now())