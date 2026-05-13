from app.services.emi_service import calculate_emi

<<<<<<< HEAD
def generate_recommendation(user, loan_products):

    recommendations = []

    for product in loan_products:

        if product.loan_type.lower() == user.preferred_loan_type.lower():

            emi = calculate_emi(
                float(user.preferred_amount),
                float(product.interest_rate),
                int(user.preferred_tenure)
            )

            recommendations.append({

                "bank_name": product.bank_name,

                "loan_type": product.loan_type,

                "interest_rate": float(product.interest_rate),

                "emi": emi,

                "tenure_months": user.preferred_tenure
            })

    return recommendations
=======
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
>>>>>>> main
