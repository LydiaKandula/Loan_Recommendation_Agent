def build_loan_prompt(user_data, loan_details):

    prompt = f"""
You are a financial assistant.

Customer Details:
- Monthly Income: ₹{user_data['monthly_income']}
- Credit Score: {user_data['credit_score']}
- Loan Type: {user_data['preferred_loan_type']}
- Loan Amount: ₹{user_data['preferred_amount']}
- Tenure: {user_data['preferred_tenure']} months

Recommended Loan:
- Bank: {loan_details['bank']}
- EMI: ₹{loan_details['emi']}

Explain clearly:
- Why this loan is suitable
- EMI affordability
- Keep response simple and friendly
"""

    return prompt