from fastapi import FastAPI
from app.routes import agent, chat_ws, voice_ws
from app.core.database import Base, engine, SessionLocal
from app.models.loan_product import LoanProduct

Base.metadata.create_all(bind=engine)


def seed_loan_products():
    session = SessionLocal()
    try:
        if session.query(LoanProduct).count() == 0:
            products = [
                LoanProduct(
                    bank_name="HDFC Bank",
                    loan_type="personal",
                    interest_rate=13.9,
                    max_amount=1000000,
                    tenure_months=60,
                    processing_fee=1.0,
                    description="Flexible personal loan from HDFC Bank.",
                ),
                LoanProduct(
                    bank_name="ICICI Bank",
                    loan_type="personal",
                    interest_rate=14.4,
                    max_amount=800000,
                    tenure_months=60,
                    processing_fee=1.2,
                    description="Competitive personal loan from ICICI Bank.",
                ),
                LoanProduct(
                    bank_name="State Bank of India",
                    loan_type="home",
                    interest_rate=8.05,
                    max_amount=5000000,
                    tenure_months=240,
                    processing_fee=0.5,
                    description="Home loan from SBI with low interest.",
                ),
                LoanProduct(
                    bank_name="HDFC Bank",
                    loan_type="home",
                    interest_rate=8.25,
                    max_amount=4000000,
                    tenure_months=240,
                    processing_fee=0.6,
                    description="Home loan from HDFC Bank for first-time buyers.",
                ),
                LoanProduct(
                    bank_name="SBI",
                    loan_type="auto",
                    interest_rate=8.25,
                    max_amount=2000000,
                    tenure_months=84,
                    processing_fee=0.6,
                    description="Auto loan from SBI with attractive EMI options.",
                ),
                LoanProduct(
                    bank_name="Axis Bank",
                    loan_type="business",
                    interest_rate=12.9,
                    max_amount=3000000,
                    tenure_months=120,
                    processing_fee=1.0,
                    description="Business loan from Axis Bank.",
                ),
                LoanProduct(
                    bank_name="SBI",
                    loan_type="education",
                    interest_rate=9.15,
                    max_amount=2000000,
                    tenure_months=120,
                    processing_fee=0.4,
                    description="Education loan from SBI for students.",
                ),
            ]
            session.add_all(products)
            session.commit()
    finally:
        session.close()


seed_loan_products()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# EXISTING ROUTES
app.include_router(agent.router)
app.include_router(application.router)

# NEW ROUTES
app.include_router(chat.router)
app.include_router(voice.router)

@app.get("/")
@app.post("/submit-application")
def home():
    return {
        "message": "Backend Running"
    }