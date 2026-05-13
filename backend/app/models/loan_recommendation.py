from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from app.core.database import Base

class LoanRecommendation(Base):

    __tablename__ = "loan_recommendations"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    product_id = Column(Integer, ForeignKey("loan_products.id"))

    emi = Column(Numeric)

    total_payable = Column(Numeric)

    recommendation_reason = Column(String(255))
