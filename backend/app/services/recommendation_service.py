from sqlalchemy.orm import Session
from app.models.loan_product import LoanProduct
from app.models.loan_recommendation import LoanRecommendation
from app.services.emi_service import calculate_emi

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

        return {
            "bank": product.bank_name,
            "emi": emi
        }

    return {"message": "No suitable loan found"}