import os
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
DATABASE_URL   = os.getenv("DATABASE_URL", "postgresql://postgres:Jesus@localhost:5432/loan_recommendation_db")