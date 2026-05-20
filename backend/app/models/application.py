from sqlalchemy import Column, Integer, String
from app.core.database import Base


class Application(Base):

    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)

    email = Column(String, nullable=False)

    phone = Column(String, nullable=False)

    age = Column(Integer, nullable=False)

    job = Column(String, nullable=False)

    monthly_income = Column(Integer, nullable=False)

    monthly_expenses = Column(Integer, nullable=False)

    credit_score = Column(Integer, nullable=False)

    preferred_loan_type = Column(String, nullable=False)

    preferred_amount = Column(Integer, nullable=False)

    preferred_tenure = Column(Integer, nullable=False)

    status = Column(String, default="Under Review")