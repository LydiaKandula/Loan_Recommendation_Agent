import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

DB_URL = "postgresql://postgres:3684@localhost/loan_ai"