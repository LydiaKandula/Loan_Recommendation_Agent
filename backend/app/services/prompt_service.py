def build_loan_prompt(user_data):

    prompt = f"""

    Customer Details:

    Income: {user_data['monthly_income']}
    Credit Score: {user_data['credit_score']}
    Loan Type: {user_data['preferred_loan_type']}
    Loan Amount: {user_data['preferred_amount']}
    Tenure: {user_data['preferred_tenure']}

    Recommend suitable loans clearly.
    Explain EMI and affordability simply.
    """

    return prompt