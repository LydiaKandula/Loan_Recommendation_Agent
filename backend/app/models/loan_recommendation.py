from sqlalchemy import Column, Integer, Numeric, Text, ForeignKey, TIMESTAMP
from app.core.database import Base
from sqlalchemy.sql import func

class LoanRecommendation(Base):
    __tablename__ = "loan_recommendations"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("loan_products.id"))

    emi = Column(Numeric)
    total_payable = Column(Numeric)

    recommendation_reason = Column(Text)

    created_at = Column(TIMESTAMP, server_default=func.now())