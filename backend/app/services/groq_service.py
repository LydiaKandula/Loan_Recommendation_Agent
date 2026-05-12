from groq import Groq
from app.core.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

def generate_chat_response(data):

    prompt = f"""
    You are a smart loan advisor.

    Answer conversationally.
    Reply in same language.

    User:
    Income: {data.get("income")}
    Credit Score: {data.get("credit_score")}
    Loan Amount: {data.get("loan_amount")}
    Purpose: {data.get("purpose")}
    Tenure: {data.get("tenure")}

    Question:
    {data.get("question")}
    """

    res = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}]
    )

    return res.choices[0].message.content


def generate_loan_recommendation(data):

    prompt = f"""
    Suggest best loan with:
    loan type, emi, interest, risk.

    User:
    Income: {data.get("income")}
    Credit Score: {data.get("credit_score")}
    Loan Amount: {data.get("loan_amount")}
    """

    res = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}]
    )

    return res.choices[0].message.content