from sqlalchemy import Column, Integer, String, Numeric, Text
from app.core.database import Base

class LoanProduct(Base):
    _tablename_ = "loan_products"

    id = Column(Integer, primary_key=True)

    bank_name = Column(String)
    loan_type = Column(String)

    interest_rate = Column(Numeric)
    max_amount = Column(Numeric)

    tenure_months = Column(Integer)
    processing_fee = Column(Numeric)

    description = Column(Text)