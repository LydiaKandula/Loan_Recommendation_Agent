from sqlalchemy import Column, Integer, String
from app.core.database import Base

class LoanRecommendation(Base):

    __tablename__ = "loan_recommendations"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer)

    loan_type = Column(String)

    emi = Column(Integer)

    interest_rate = Column(Integer)

    tenure = Column(Integer)

    risk_level = Column(String)