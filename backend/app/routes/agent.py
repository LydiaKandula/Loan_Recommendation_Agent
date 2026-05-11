from fastapi import APIRouter
from app.services.groq_service import generate_loan_recommendation

router = APIRouter()

@router.post("/recommend")
def recommend(data: dict):
    result = generate_loan_recommendation(data)
    return {"recommendation": result}