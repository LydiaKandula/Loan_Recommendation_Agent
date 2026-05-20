from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
def test_api():
    return {
        "message": "Backend Connected Successfully"
    }
@router.post("/recommend")
def recommend_loan(data: dict):

    income = data.get("income")
    loan_type = data.get("loan_type")

    if income >= 50000:
        recommendation = "SBI Home Loan"
    else:
        recommendation = "HDFC Personal Loan"

    return {
        "recommended_loan": recommendation,
        "loan_type": loan_type,
        "income": income
    }