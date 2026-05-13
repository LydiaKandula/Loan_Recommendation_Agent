from sqlalchemy import Column, Integer, String, Numeric
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

<<<<<<< HEAD
    full_name = Column(String(100))
    email = Column(String(100), unique=True)
    phone = Column(String(20))

    age = Column(Integer)

    job = Column(String(100))

    monthly_income = Column(Numeric)

=======
    full_name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)

    age = Column(Integer)
    job = Column(String)

    monthly_income = Column(Numeric)
>>>>>>> main
    monthly_expenses = Column(Numeric)

    credit_score = Column(Integer)

<<<<<<< HEAD
    preferred_loan_type = Column(String(50))

    preferred_amount = Column(Numeric)

=======
    preferred_loan_type = Column(String)
    preferred_amount = Column(Numeric)
>>>>>>> main
    preferred_tenure = Column(Integer)