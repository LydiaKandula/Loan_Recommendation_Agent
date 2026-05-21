from sqlalchemy.orm import Session

from app.models.loan_product import LoanProduct
from app.models.loan_recommendation import LoanRecommendation

from app.services.emi_service import calculate_emi
from app.services.prompt_service import build_loan_prompt
from app.services.groq_service import generate_ai_response


def recommend_loan(db: Session, user):

    products = db.query(LoanProduct).filter(
        LoanProduct.loan_type == user.preferred_loan_type
    ).all()

    best_product = None
    lowest_emi = float("inf")

    for product in products:

        if float(user.preferred_amount) <= float(product.max_amount):

            emi = calculate_emi(
                float(user.preferred_amount),
                float(product.interest_rate),
                int(user.preferred_tenure)
            )

            if emi < lowest_emi:
                lowest_emi = emi
                best_product = product

    if not best_product:
        return {"message": "No suitable loan found"}

    total_payable = lowest_emi * int(user.preferred_tenure)

    recommendation = LoanRecommendation(
        user_id=user.id,
        product_id=best_product.id,
        emi=lowest_emi,
        total_payable=total_payable,
        recommendation_reason="Lowest EMI option"
    )

    db.add(recommendation)
    db.commit()

    loan_details = {
        "bank": best_product.bank_name,
        "emi": lowest_emi
    }

    user_data = {
        "monthly_income": user.monthly_income,
        "credit_score": user.credit_score,
        "preferred_loan_type": user.preferred_loan_type,
        "preferred_amount": user.preferred_amount,
        "preferred_tenure": user.preferred_tenure
    }

    prompt = build_loan_prompt(user_data, loan_details)

    messages = [
    {
        "role": "system",
        "content": "You are a helpful loan advisor."
    },
    {
        "role": "user",
        "content": prompt
    }
]

    ai_response = generate_ai_response(messages)

    return {
        "bank": best_product.bank_name,
        "loan_type": best_product.loan_type,
        "interest_rate": float(best_product.interest_rate),
        "emi": lowest_emi,
        "total_payable": total_payable,
        "ai_message": ai_response
    }