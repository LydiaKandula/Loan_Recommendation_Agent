from sqlalchemy import Column, Integer, String, Text, Numeric, TIMESTAMP, ForeignKey
from app.core.database import Base
from sqlalchemy.sql import func

class CallLog(Base):
    __tablename__ = "call_logs"

    id              = Column(Integer, primary_key=True, index=True)
    auth_user_id    = Column(Integer, ForeignKey("auth_users.id"), nullable=True)
    call_sid        = Column(String(64), unique=True)
    to_number       = Column(String(32))
    from_number     = Column(String(32))
    status          = Column(String(32))
    duration_sec    = Column(Integer, default=0)
    recording_url   = Column(Text, nullable=True)
    transcript      = Column(Text, nullable=True)
    sentiment       = Column(String(32), nullable=True)
    ai_summary      = Column(Text, nullable=True)
    language        = Column(String(8), default="en")

    # Full loan profile stored at call time — used for AI context
    customer_name    = Column(String(120), nullable=True)
    loan_type        = Column(String(50),  nullable=True)
    loan_amount      = Column(Numeric,     nullable=True)
    loan_tenure      = Column(Integer,     nullable=True)
    monthly_income   = Column(Numeric,     nullable=True)
    credit_score     = Column(Integer,     nullable=True)
    recommended_bank = Column(String(100), nullable=True)
    recommended_emi  = Column(Numeric,     nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())