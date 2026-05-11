import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_chat_response(data):

    prompt = f"""
    You are a smart loan advisor.

    User details:
    Income: {data.get("income")}
    Credit Score: {data.get("credit_score")}
    Loan Amount: {data.get("loan_amount")}
    Purpose: {data.get("purpose")}
    Tenure: {data.get("tenure")}

    User question: {data.get("question")}

    Give a clear recommendation with:
    - loan type
    - EMI estimate
    - interest
    - risk
    - explanation
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )

    return response.choices[0].message.content