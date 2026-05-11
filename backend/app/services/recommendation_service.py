from app.services.emi_service import calculate_emi

def recommend_loan(data):

    income = data["income"]

    credit = data["credit_score"]

    amount = data["loan_amount"]

    if credit >= 750:

        loan = "Premium Personal Loan"

        rate = 10

        risk = "LOW"

    elif credit >= 650:

        loan = "Standard Personal Loan"

        rate = 12

        risk = "MEDIUM"

    else:

        loan = "Secured Loan"

        rate = 15

        risk = "HIGH"

    emi = calculate_emi(
        amount,
        rate,
        24
    )

    return {

        "loan_type": loan,

        "interest_rate": rate,

        "emi": emi,

        "tenure": 24,

        "risk_level": risk
    }