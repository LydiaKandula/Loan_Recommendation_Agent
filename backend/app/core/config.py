import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ✅ FIX: Read DATABASE_URL from .env so credentials aren't hardcoded
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Jesus@localhost:5432/loan_recommendation_db"
)