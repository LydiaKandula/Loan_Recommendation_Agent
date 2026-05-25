from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey
from app.core.database import Base
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # NEW: link each loan application to a logged-in account
    auth_user_id = Column(Integer, ForeignKey("auth_users.id"), nullable=True)

    full_name        = Column(String)
    email            = Column(String)          # NOT unique — same person can apply twice
    phone            = Column(String)
    age              = Column(Integer)
    job              = Column(String)
    monthly_income   = Column(Numeric)
    monthly_expenses = Column(Numeric)
    credit_score     = Column(Integer)
    preferred_loan_type = Column(String)
    preferred_amount    = Column(Numeric)
    preferred_tenure    = Column(Integer)
    created_at          = Column(TIMESTAMP, server_default=func.now())