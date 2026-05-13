from fastapi import APIRouter
<<<<<<< HEAD

=======
>>>>>>> main
from app.services.groq_service import generate_ai_response

router = APIRouter()

@router.post("/start-agent")
<<<<<<< HEAD

def start_agent(data: dict):

    income = data["monthly_income"]

    credit_score = data["credit_score"]

    loan_type = data["preferred_loan_type"]

    amount = data["preferred_amount"]

    prompt = f"""

    Customer income is {income}

    Credit score is {credit_score}

    Customer wants {loan_type}

    Loan amount required is {amount}

    Recommend suitable loan options.
    """

    response = generate_ai_response(prompt)

    return {

        "message": "AI recommendation generated",

        "recommendation": response
=======
def start(data: dict):

    prompt = f"""
    Income: {data['monthly_income']}
    Credit Score: {data['credit_score']}
    Loan Type: {data['preferred_loan_type']}
    Amount: {data['preferred_amount']}
    """

    return {
        "response": generate_ai_response(prompt)
>>>>>>> main
    }