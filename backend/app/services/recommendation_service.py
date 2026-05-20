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

    best = None
    lowest_emi = float("inf")

    for p in products:
        if user.preferred_amount <= p.max_amount:
           emi = calculate_emi(
    float(user.preferred_amount),
    float(p.interest_rate),
    int(user.preferred_tenure))

        if emi < lowest_emi:
                lowest_emi = emi
                best = (p, emi)

    if best:
       product, emi = best

       rec = LoanRecommendation(
        user_id=user.id,
        product_id=product.id,
        emi=emi,
        total_payable=emi * user.preferred_tenure,
        recommendation_reason="Lowest EMI option"
    )

    db.add(rec)
    db.commit()

    # ✅ Build AI prompt
    loan_details = {
        "bank": product.bank_name,
        "emi": emi
    }

    user_data = {
        "monthly_income": user.monthly_income,
        "credit_score": user.credit_score,
        "preferred_loan_type": user.preferred_loan_type,
        "preferred_amount": user.preferred_amount,
        "preferred_tenure": user.preferred_tenure
    }

    prompt = build_loan_prompt(user_data, loan_details)

    # ✅ AI response
    ai_response = generate_ai_response(prompt)

    return {
        "bank": product.bank_name,
        "emi": emi,
        "ai_message": ai_response
    }  
    return {"message": "No suitable loan found"}