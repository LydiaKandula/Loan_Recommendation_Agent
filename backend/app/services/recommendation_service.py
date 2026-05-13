from app.services.emi_service import calculate_emi

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