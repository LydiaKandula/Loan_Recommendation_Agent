from sqlalchemy import Column, Integer, String, Float, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class LoanRecommendation(Base):
    __tablename__ = "loan_recommendations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    loan_type = Column(String(100))
    emi = Column(Float)
    tenure = Column(Integer)
    interest = Column(Float)
    created_at = Column(TIMESTAMP, server_default=func.now())