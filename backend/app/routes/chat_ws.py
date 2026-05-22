from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.groq_service import generate_ai_response_with_history
from app.models.interaction import Interaction
from app.core.database import SessionLocal
import json

router = APIRouter()

# Language code → (display name, STT/TTS BCP-47 tag, Groq instruction)
LANGUAGE_MAP = {
    "en": ("English",  "en-US",  "Respond only in English."),
    "hi": ("Hindi",    "hi-IN",  "Respond only in Hindi (Devanagari script). Use simple, conversational Hindi."),
    "te": ("Telugu",   "te-IN",  "Respond only in Telugu (Telugu script). Use simple, conversational Telugu."),
}


@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    db = SessionLocal()

    conversation_history = []
    user_context  = None
    language_code = "en"   # default — overridden when frontend sends context

    try:
        while True:
            raw = await ws.receive_text()

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {"type": "message", "text": raw}

            msg_type = payload.get("type", "message")

            # ── context: sent once when chat opens OR when user/language changes ──
            if msg_type == "context":
                user_context  = payload.get("user")
                language_code = payload.get("language", "en")
                if language_code not in LANGUAGE_MAP:
                    language_code = "en"

                # Reset history when context changes (new user or language switch)
                conversation_history = []

                greeting = _build_greeting(user_context, language_code)
                conversation_history.append({"role": "assistant", "content": greeting})

                await ws.send_json({
                    "type":     "greeting",
                    "text":     greeting,
                    "language": language_code,
                    "ttsLang":  LANGUAGE_MAP[language_code][1],
                })
                continue

            # ── regular chat message ────────────────────────────────────────────
            user_text = payload.get("text", "").strip()
            if not user_text:
                continue

            conversation_history.append({"role": "user", "content": user_text})

            ai_response = generate_ai_response_with_history(
                conversation_history=conversation_history,
                user_context=user_context,
                language_code=language_code,
            )

            conversation_history.append({"role": "assistant", "content": ai_response})

            # Persist
            try:
                user_id = user_context.get("id") if user_context else None
                db.add(Interaction(
                    user_id=user_id,
                    user_message=user_text,
                    ai_response=ai_response,
                    communication_type="chat",
                ))
                db.commit()
            except Exception as db_err:
                db.rollback()
                print(f"DB error: {db_err}")

            await ws.send_json({
                "type":     "message",
                "text":     ai_response,
                "language": language_code,
                "ttsLang":  LANGUAGE_MAP[language_code][1],
            })

    except WebSocketDisconnect:
        print("Chat WebSocket disconnected")
    except Exception as e:
        print(f"Chat WebSocket error: {e}")
        try:
            await ws.send_json({"type": "error", "text": "Something went wrong. Please try again."})
        except Exception:
            pass
    finally:
        db.close()


def _build_greeting(user_context: dict | None, lang: str) -> str:
    name      = (user_context or {}).get("fullName") or (user_context or {}).get("full_name") or ""
    loan_type = (user_context or {}).get("preferredLoanType") or (user_context or {}).get("preferred_loan_type") or "loan"
    amount    = (user_context or {}).get("preferredAmount")   or (user_context or {}).get("preferred_amount")
    tenure    = (user_context or {}).get("preferredTenure")   or (user_context or {}).get("preferred_tenure")
    bank      = (user_context or {}).get("bank")
    emi       = (user_context or {}).get("emi")
    credit    = (user_context or {}).get("creditScore")       or (user_context or {}).get("credit_score")

    if lang == "te":
        if not user_context:
            return "నమస్కారం! నేను మీ లోన్ రికమెండేషన్ అసిస్టెంట్‌ని. మీరు లోన్‌కు సంబంధించి ఏ విషయమైనా అడగవచ్చు!"
        greeting = f"నమస్కారం{' ' + name if name else ''}! మీ లోన్ అప్లికేషన్ పరిశీలించాను."
        if bank and emi:
            greeting += f" {bank} నుండి {loan_type} లోన్ మీకు సరిపోతుంది, నెలవారీ EMI ₹{float(emi):,.0f}."
        if credit:
            greeting += " మీ క్రెడిట్ స్కోర్ బాగుంది!" if int(credit) >= 700 else " మీ క్రెడిట్ స్కోర్ మెరుగు పరచుకోవడానికి సహాయం చేస్తాను."
        greeting += " మీకు ఏదైనా సందేహాలుంటే అడగండి!"
        return greeting

    if lang == "hi":
        if not user_context:
            return "नमस्ते! मैं आपका लोन रिकमेंडेशन असिस्टेंट हूँ। आप लोन के बारे में कुछ भी पूछ सकते हैं!"
        greeting = f"नमस्ते{' ' + name if name else ''}! मैंने आपकी लोन एप्लिकेशन देखी है।"
        if bank and emi:
            greeting += f" {bank} से {loan_type} लोन आपके लिए उपयुक्त है, मासिक EMI ₹{float(emi):,.0f}।"
        if credit:
            greeting += " आपका क्रेडिट स्कोर अच्छा है!" if int(credit) >= 700 else " मैं आपके क्रेडिट स्कोर सुधारने में भी मदद कर सकता हूँ।"
        greeting += " कोई भी सवाल पूछें!"
        return greeting

    # English (default)
    if not user_context:
        return "Hello! I'm your Loan Recommendation Assistant. Ask me anything about loans, EMI, or eligibility!"

    parts = [f"Hi{' ' + name if name else ''}! I've reviewed your loan application."]
    if bank and emi:
        parts.append(f"A {loan_type} loan from {bank} looks great for you — EMI of ₹{float(emi):,.0f}/month" + (f" over {tenure} months." if tenure else "."))
    elif amount:
        parts.append(f"You've applied for a ₹{float(amount):,.0f} {loan_type} loan" + (f" over {tenure} months." if tenure else "."))
    if credit:
        parts.append("Your credit score looks strong!" if int(credit) >= 750 else "Your credit score is decent." if int(credit) >= 650 else "I can suggest ways to improve your credit score too.")
    parts.append("Feel free to ask me anything!")
    return " ".join(parts)