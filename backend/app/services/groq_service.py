from groq import Groq
from app.core.config import GROQ_API_KEY


def get_client():
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in your .env file")
    return Groq(api_key=GROQ_API_KEY)


# ── Single-turn: used by recommendation_service ───────────────────────────────
def generate_ai_response(user_message: str) -> str:
    try:
        client = get_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional AI Loan Recommendation Assistant. "
                        "Help users choose loans, explain EMI clearly, "
                        "suggest affordable options, and be simple and professional. "
                        "Keep responses concise and friendly."
                    )
                },
                {"role": "user", "content": str(user_message)}
            ],
            temperature=0.5,
            max_tokens=400
        )
        return completion.choices[0].message.content
    except ValueError as e:
        raise e
    except Exception as e:
        return f"AI Error: {str(e)}"


# ── Multi-turn: used by chat WebSocket ────────────────────────────────────────
def generate_ai_response_with_history(
    conversation_history: list,
    user_context: dict | None = None,
    language_code: str = "en",
) -> str:
    try:
        client = get_client()
        system_content = _build_system_prompt(user_context, language_code)
        messages = [{"role": "system", "content": system_content}] + conversation_history

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.6,
            max_tokens=400
        )
        return completion.choices[0].message.content
    except ValueError as e:
        raise e
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"


def _build_system_prompt(user_context: dict | None, language_code: str = "en") -> str:

    # Language instruction — must be first so the model obeys it
    lang_instructions = {
        "en": "Respond only in English.",
        "hi": "Respond only in Hindi (Devanagari script). Use simple, everyday Hindi that is easy to understand.",
        "te": "Respond only in Telugu (Telugu script). Use simple, everyday Telugu that is easy to understand.",
    }
    lang_instruction = lang_instructions.get(language_code, lang_instructions["en"])

    base = (
        f"{lang_instruction} "
        "You are a professional and friendly AI Loan Recommendation Assistant. "
        "Help users understand loan options, EMI calculations, eligibility, and financial planning. "
        "Keep responses conversational and concise — 2 to 4 sentences per reply. "
        "Never produce a wall of text. Break details into steps only when the user asks for them. "
        "Stay focused on loans and personal finance. "
        "If asked something unrelated, politely redirect the user."
    )

    if not user_context:
        return base

    # Inject the user's profile so AI never re-asks for known data
    name      = user_context.get("fullName")         or user_context.get("full_name")
    job       = user_context.get("job")
    income    = user_context.get("monthlyIncome")    or user_context.get("monthly_income")
    expenses  = user_context.get("monthlyExpenses")  or user_context.get("monthly_expenses")
    credit    = user_context.get("creditScore")      or user_context.get("credit_score")
    loan_type = user_context.get("preferredLoanType")or user_context.get("preferred_loan_type")
    amount    = user_context.get("preferredAmount")  or user_context.get("preferred_amount")
    tenure    = user_context.get("preferredTenure")  or user_context.get("preferred_tenure")
    bank      = user_context.get("bank")
    emi       = user_context.get("emi")

    lines = ["\nYou already know this user's profile — do not ask for it again:"]
    if name:      lines.append(f"- Name: {name}")
    if job:       lines.append(f"- Job: {job}")
    if income:    lines.append(f"- Monthly Income: ₹{income}")
    if expenses:  lines.append(f"- Monthly Expenses: ₹{expenses}")
    if credit:    lines.append(f"- Credit Score: {credit}")
    if loan_type: lines.append(f"- Preferred Loan Type: {loan_type}")
    if amount:    lines.append(f"- Loan Amount: ₹{amount}")
    if tenure:    lines.append(f"- Tenure: {tenure} months")
    if bank and emi: lines.append(f"- Recommended Bank: {bank}, EMI: ₹{emi}/month")
    lines.append("Use this data for personalised answers.")

    return base + "\n".join(lines)