from fastapi import APIRouter
from app.services.groq_service import generate_ai_response

router = APIRouter()

@router.post("/start-agent")
def start(data: dict):

    prompt = f"""
    Income: {data['monthly_income']}
    Credit Score: {data['credit_score']}
    Loan Type: {data['preferred_loan_type']}
    Amount: {data['preferred_amount']}
    """

    return {
        "response": generate_ai_response(prompt)
    }