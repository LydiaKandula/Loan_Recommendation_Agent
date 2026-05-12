from groq import Groq
from app.core.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

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