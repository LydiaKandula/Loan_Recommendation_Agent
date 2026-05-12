from app.services.emi_service import calculate_emi

def recommend(user, products):

    results = []

    for p in products:

        if p.loan_type.lower() == user.preferred_loan_type.lower():

            emi = calculate_emi(
                float(user.preferred_amount),
                float(p.interest_rate),
                int(p.tenure_months)
            )

            results.append({
                "bank": p.bank_name,
                "loan_type": p.loan_type,
                "emi": emi
            })

    return results