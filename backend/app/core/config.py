import os
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
SARVAM_API_KEY     = os.getenv("SARVAM_API_KEY")
DATABASE_URL       = os.getenv("DATABASE_URL","postgresql://postgres:password@localhost:5432/loan_recommendation_db")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")