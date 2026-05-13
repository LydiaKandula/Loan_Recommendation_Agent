from groq import Groq

from app.core.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

<<<<<<< HEAD
def generate_ai_response(user_message):

    try:

        completion = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[

                {
                    "role": "system",

                    "content": """
                    You are a professional AI Loan Recommendation Assistant.

                    Your responsibilities:
                    - Help users choose loans
                    - Explain EMI clearly
                    - Suggest affordable loan options
                    - Be simple and professional
                    """
                },

                {
                    "role": "user",

                    "content": user_message
                }
            ],

            temperature=0.5,

            max_tokens=300
        )

        return completion.choices[0].message.content

    except Exception as e:

        return str(e)
=======
def generate_ai_response(message):

    response = client.chat.completions.create(
        model="llama3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a loan assistant AI. Be clear and helpful."
            },
            {
                "role": "user",
                "content": message
            }
        ],
        temperature=0.6,
        max_tokens=500
    )

    return response.choices[0].message.content
>>>>>>> main
