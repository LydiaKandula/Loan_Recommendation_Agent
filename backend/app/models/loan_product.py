from sqlalchemy import Column, Integer, String, Numeric
from app.core.database import Base

class LoanProduct(Base):

    __tablename__ = "loan_products"

<<<<<<< HEAD
    id = Column(Integer, primary_key=True, index=True)

    bank_name = Column(String(100))

    loan_type = Column(String(50))

    interest_rate = Column(Numeric)

=======
    id = Column(Integer, primary_key=True)

    bank_name = Column(String)
    loan_type = Column(String)

    interest_rate = Column(Numeric)
>>>>>>> main
    max_amount = Column(Numeric)

    tenure_months = Column(Integer)