# backend/app/routes/chat_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.groq_service import generate_ai_response_with_history
from app.services.tts_service import synthesise
from app.models.interaction import Interaction
from app.core.database import SessionLocal
from app.routes.auth import decode_token
import json, asyncio

router      = APIRouter()
router_extra = APIRouter()

LANGUAGE_MAP = {
    "en": ("English", "en-IN"),
    "hi": ("Hindi",   "hi-IN"),
    "te": ("Telugu",  "te-IN"),
}

# Only two voices — best quality per gender across all languages
BEST_VOICES = {"female": "ritu", "male": "shubh"}


@router_extra.get("/voices")
def get_voices():
    """Returns the two curated voices used for all languages."""
    return {"female": ["ritu"], "male": ["shubh"]}


@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    db = SessionLocal()

    conversation_history = []
    user_context  = None
    language_code = "en"
    voice_gender  = "female"
    auth_user_id  = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {"type": "message", "text": raw}

            msg_type = payload.get("type", "message")

            if msg_type == "context":
                user_context  = payload.get("user")
                language_code = payload.get("language", "en")
                voice_gender  = payload.get("voiceGender", "female")
                token         = payload.get("token")

                if language_code not in LANGUAGE_MAP:
                    language_code = "en"

                if token:
                    decoded = decode_token(token)
                    auth_user_id = decoded["id"] if decoded else None

                conversation_history = []
                greeting = _build_greeting(user_context, language_code)
                conversation_history.append({"role": "assistant", "content": greeting})

                # ── Synthesise greeting in background — send text immediately ──
                await ws.send_json({"type": "greeting", "text": greeting,
                                    "language": language_code, "audio": None})

                # Then synthesise and send audio separately so text appears fast
                speaker = BEST_VOICES.get(voice_gender, "ritu")
                audio   = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: synthesise(greeting, language_code, speaker, voice_gender)
                )
                if audio:
                    await ws.send_json({"type": "audio", "audio": audio})
                continue

            user_text = payload.get("text", "").strip()
            if not user_text:
                continue

            conversation_history.append({"role": "user", "content": user_text})

            # ── Generate AI text (run in executor so WS stays responsive) ──
            ai_response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: generate_ai_response_with_history(
                    conversation_history=conversation_history,
                    user_context=user_context,
                    language_code=language_code,
                )
            )
            conversation_history.append({"role": "assistant", "content": ai_response})

            # ── Send text immediately — don't wait for TTS ──────────────────
            await ws.send_json({"type": "message", "text": ai_response,
                                "language": language_code, "audio": None})

            # ── Synthesise audio in background, send when ready ─────────────
            speaker = BEST_VOICES.get(voice_gender, "ritu")
            audio   = await asyncio.get_event_loop().run_in_executor(
                None, lambda: synthesise(ai_response, language_code, speaker, voice_gender)
            )
            if audio:
                await ws.send_json({"type": "audio", "audio": audio})

            # Persist
            try:
                uid = user_context.get("id") if user_context else None
                db.add(Interaction(user_id=uid, auth_user_id=auth_user_id,
                                   user_message=user_text, ai_response=ai_response,
                                   communication_type="chat"))
                db.commit()
            except Exception as dbe:
                db.rollback(); print(f"DB: {dbe}")

    except WebSocketDisconnect:
        print("Chat WS disconnected")
    except Exception as e:
        print(f"Chat WS error: {e}")
        try:
            await ws.send_json({"type": "error", "text": "Something went wrong."})
        except Exception:
            pass
    finally:
        db.close()


def _build_greeting(user_context, lang):
    name      = (user_context or {}).get("fullName") or (user_context or {}).get("full_name") or ""
    loan_type = (user_context or {}).get("preferredLoanType") or "loan"
    amount    = (user_context or {}).get("preferredAmount")
    tenure    = (user_context or {}).get("preferredTenure")
    bank      = (user_context or {}).get("bank")
    emi       = (user_context or {}).get("emi")
    credit    = (user_context or {}).get("creditScore")

    if lang == "te":
        if not user_context:
            return "నమస్కారం! నేను మీ లోన్ రికమెండేషన్ అసిస్టెంట్‌ని. మీరు లోన్‌కు సంబంధించి ఏ విషయమైనా అడగవచ్చు!"
        g = f"నమస్కారం{' ' + name if name else ''}! మీ లోన్ అప్లికేషన్ పరిశీలించాను."
        if bank and emi: g += f" {bank} నుండి {loan_type} లోన్ మీకు సరిపోతుంది, నెలవారీ EMI {float(emi):,.0f} రూపాయలు."
        if credit: g += " మీ క్రెడిట్ స్కోర్ బాగుంది!" if int(credit) >= 700 else " క్రెడిట్ స్కోర్ మెరుగు పరచుకోవడానికి సహాయం చేస్తాను."
        return g + " ఏదైనా సందేహాలుంటే అడగండి!"

    if lang == "hi":
        if not user_context:
            return "नमस्ते! मैं आपका लोन रिकमेंडेशन असिस्टेंट हूँ। कोई भी सवाल पूछें!"
        g = f"नमस्ते{' ' + name if name else ''}! मैंने आपकी लोन एप्लिकेशन देखी है।"
        if bank and emi: g += f" {bank} से {loan_type} लोन उपयुक्त है, EMI {float(emi):,.0f} रुपए।"
        if credit: g += " क्रेडिट स्कोर अच्छा है!" if int(credit) >= 700 else " क्रेडिट स्कोर सुधारने में मदद कर सकता हूँ।"
        return g + " कोई भी सवाल पूछें!"

    if not user_context:
        return "Hello! I'm your Loan Recommendation Assistant. Ask me anything about loans, EMI, or eligibility!"
    parts = [f"Hi{' ' + name if name else ''}! I've reviewed your application."]
    if bank and emi:
        parts.append(f"A {loan_type} loan from {bank} — EMI of {float(emi):,.0f} rupees/month" + (f" over {tenure} months." if tenure else "."))
    elif amount:
        parts.append(f"Applied for {float(amount):,.0f} rupee {loan_type} loan" + (f" over {tenure} months." if tenure else "."))
    if credit:
        parts.append("Credit score looks strong!" if int(credit) >= 750 else "Credit score is decent." if int(credit) >= 650 else "I can also help improve your credit score.")
    parts.append("Feel free to ask anything!")
    return " ".join(parts)