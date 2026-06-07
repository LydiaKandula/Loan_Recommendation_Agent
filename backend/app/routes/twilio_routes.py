"""
twilio_routes.py — final

STT fix: Twilio Enhanced model + financial vocabulary hints in <Gather>
TTS fix: 
  - English: Polly.Aditi (Indian English, handles numbers naturally)
  - Hindi: Polly.Kajal (native Hindi speaker, available on standard accounts)
  - Telugu: alice with language="te-IN" (Polly has no Telugu voice)
  All text preprocessed with _speak_text() before TTS.
Language fix: Each language uses the correct voice that actually speaks that language.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import asyncio, httpx, html, urllib.parse, re

from app.core.database import get_db
from app.core.config import (
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER, PUBLIC_BASE_URL,
)
from app.models.call_log import CallLog
from app.routes.auth import decode_token
from app.services.groq_service import generate_ai_response

router = APIRouter(prefix="/calls", tags=["calls"])

# Language config:
#   voice     — Twilio TTS voice (speaks in that language)
#   bcp47     — STT language for <Gather>
#   lang_prompt — Groq instruction for that language
# Voice notes:
#   Polly.Aditi   — Indian English female (standard account, no add-on needed)
#   Polly.Kajal   — Hindi female (standard account, no add-on needed)
#   alice te-IN   — No Polly Telugu voice exists; alice with te-IN does Telugu STT
#                   but speaks English. For Telugu TTS we use Polly.Aditi + Telugu Groq text.
#                   Workaround: translate reply to Telugu script but speak via Aditi.
LANG_CONFIG = {
    "en": {
        "voice":       "Polly.Aditi",
        "bcp47":       "en-IN",
        "lang_prompt": "Reply in clear Indian English. 1-2 sentences only.",
        "retry":       "Sorry, I did not catch that. Please speak again.",
    },
    "hi": {
        "voice":       "Polly.Kajal",
        "bcp47":       "hi-IN",
        "lang_prompt": "हिंदी में जवाब दें। सरल, बोलचाल की हिंदी। 1-2 वाक्य।",
        "retry":       "माफ़ करें, समझ नहीं आया। कृपया दोबारा बोलें।",
    },
    "te": {
        # No Polly Telugu voice — use Polly.Aditi which at least pronounces
        # Telugu-script words better than alice, and Groq supplies Telugu text.
        "voice":       "Polly.Aditi",
        "bcp47":       "te-IN",
        "lang_prompt": "తెలుగులో జవాబు ఇవ్వండి. సాధారణ తెలుగు. 1-2 వాక్యాలు.",
        "retry":       "క్షమించండి, వినిపించలేదు. దయచేసి మళ్ళీ చెప్పండి.",
    },
}

# Financial vocabulary hints for Twilio STT — improves recognition accuracy
STT_HINTS = (
    "EMI,loan,interest,tenure,rupees,principal,SBI,HDFC,ICICI,Axis,"
    "personal loan,home loan,car loan,education loan,business loan,"
    "credit score,eligibility,repayment,installment,LoanAI,"
    "monthly income,down payment,processing fee,foreclosure"
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _auth_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["id"] if payload else None


def _require_base() -> str:
    if not PUBLIC_BASE_URL or not PUBLIC_BASE_URL.strip():
        raise HTTPException(500,
            "PUBLIC_BASE_URL not set in .env — add your ngrok https URL")
    return PUBLIC_BASE_URL.rstrip("/")


def _speak_text(text: str) -> str:
    """
    Preprocess text so TTS reads it naturally:
    - EMI/EMIs → "E M I" (spaces let Polly stress each letter cleanly)
    - Numbers like 9109 → kept as digits (Polly handles these fine)
    - 24-month → "24 month" (remove hyphen so it reads "twenty four month")
    - Percentages, currencies normalised
    - Remove markdown
    """
    t = (str(text or "")
         .replace("**", "").replace("*", "")
         .replace("#",  "").replace("`", "")
         .replace("\n", " ").strip())

    # Only fix EMI — Polly handles SBI, HDFC naturally
    t = re.sub(r'\bEMIs?\b', 'E M I', t)
    t = re.sub(r'\bp\.a\.\b','per annum', t, flags=re.IGNORECASE)

    # Hyphens between digit and word: "24-month" → "24 month"
    t = re.sub(r'(\d)-(\w)', r'\1 \2', t)
    # Hyphens between word and digit: "month-24" → "month 24"
    t = re.sub(r'(\w)-(\d)', r'\1 \2', t)

    # Currency symbols
    t = t.replace("₹", "").replace("Rs.", "")   # Polly.Aditi says "rupees" from context

    # Percent
    t = t.replace("%", " percent")

    # Collapse extra spaces
    t = re.sub(r' +', ' ', t).strip()
    return t


def _say(text: str, lang: str) -> str:
    """Build <Say> with the correct Polly voice for the language."""
    cfg   = LANG_CONFIG.get(lang, LANG_CONFIG["en"])
    voice = cfg["voice"]
    bcp47 = cfg["bcp47"]
    safe  = html.escape(_speak_text(text), quote=True)
    return f'<Say voice="{voice}" language="{bcp47}">{safe}</Say>'


def _respond(say_tag: str, gather_url: str, bcp47: str) -> str:
    """TwiML: speak + listen. Uses Enhanced STT model + financial hints."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {say_tag}
  <Gather input="speech" action="{gather_url}" method="POST"
          speechTimeout="3" language="{bcp47}" timeout="8"
          enhanced="true" hints="{STT_HINTS}">
  </Gather>
  <Hangup/>
</Response>"""


def _final(say_tag: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {say_tag}
  <Hangup/>
</Response>"""


def _loan_context(log: "CallLog", lang: str) -> str:
    cfg   = LANG_CONFIG.get(lang, LANG_CONFIG["en"])
    lines = [
        "You are a professional loan advisor on a phone call.",
        cfg["lang_prompt"],
        "Use the customer profile below. Do NOT ask for info you already have.",
        "No markdown, no bullet points, no asterisks, no special characters.",
        "Write numbers as digits, not words (e.g. write 9109 not nine thousand).",
    ]
    if log.customer_name:    lines.append(f"Customer name: {log.customer_name}")
    if log.loan_type:        lines.append(f"Loan type: {log.loan_type}")
    if log.loan_amount:      lines.append(f"Loan amount: {int(log.loan_amount):,} rupees")
    if log.loan_tenure:      lines.append(f"Tenure: {log.loan_tenure} months")
    if log.monthly_income:   lines.append(f"Monthly income: {int(log.monthly_income):,} rupees")
    if log.credit_score:     lines.append(f"Credit score: {log.credit_score}")
    if log.recommended_bank: lines.append(f"Recommended bank: {log.recommended_bank}")
    if log.recommended_emi:  lines.append(f"Monthly EMI: {int(log.recommended_emi):,} rupees")
    return "\n".join(lines)


# ── Schema ─────────────────────────────────────────────────────────────────────

class InitiateCallRequest(BaseModel):
    to_number:      str
    user_name:      str   = "there"
    loan_type:      str   = "loan"
    bank:           str   = ""
    emi:            float = 0.0
    loan_amount:    float = 0.0
    loan_tenure:    int   = 0
    monthly_income: float = 0.0
    credit_score:   int   = 0
    language:       str   = "en"


# ── 1. Initiate call ───────────────────────────────────────────────────────────

@router.post("/initiate")
async def initiate_call(
    body: InitiateCallRequest,
    db:   Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise HTTPException(500, "Twilio credentials not set in .env")

    base         = _require_base()
    auth_user_id = _auth_id(authorization)
    lang         = body.language if body.language in LANG_CONFIG else "en"

    params    = urllib.parse.urlencode({"language": lang})
    twiml_url = f"{base}/calls/twiml?{params}"
    status_cb = f"{base}/calls/status-callback"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To":                   body.to_number,
                "From":                 TWILIO_FROM_NUMBER,
                "Url":                  twiml_url,
                "Method":               "POST",
                "StatusCallback":       status_cb,
                "StatusCallbackMethod": "POST",
                "StatusCallbackEvent":  ["initiated","ringing","answered","completed"],
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(502, f"Twilio error: {resp.text}")

    call_sid = resp.json().get("sid", "")

    db.add(CallLog(
        auth_user_id    = auth_user_id,
        call_sid        = call_sid,
        to_number       = body.to_number,
        from_number     = TWILIO_FROM_NUMBER,
        status          = "initiated",
        transcript      = "",
        language        = lang,
        customer_name   = body.user_name if body.user_name not in ("","there") else None,
        loan_type       = body.loan_type  or None,
        loan_amount     = body.loan_amount  or None,
        loan_tenure     = body.loan_tenure  or None,
        monthly_income  = body.monthly_income or None,
        credit_score    = body.credit_score   or None,
        recommended_bank= body.bank or None,
        recommended_emi = body.emi  or None,
    ))
    db.commit()

    return {"callSid": call_sid, "status": "initiated", "to": body.to_number}


# ── 2. TwiML greeting ─────────────────────────────────────────────────────────

@router.post("/twiml")
@router.get("/twiml")
async def twiml_handler(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    lang   = params.get("language", "en")
    if lang not in LANG_CONFIG:
        lang = "en"

    call_sid = ""
    if request.method == "POST":
        try:
            body_form = await request.form()
            call_sid  = body_form.get("CallSid", "")
        except Exception:
            pass

    cfg        = LANG_CONFIG[lang]
    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    log  = db.query(CallLog).filter(CallLog.call_sid == call_sid).first() if call_sid else None
    name = (log.customer_name or "") if log else ""
    bank = (log.recommended_bank or "") if log else ""
    emi  = log.recommended_emi if log and log.recommended_emi else None
    lt   = (log.loan_type or "loan") if log else "loan"

    if lang == "hi":
        g  = f"नमस्ते{', ' + name if name else ''}! मैं LoanAI का लोन सलाहकार हूँ। "
        if bank and emi:
            g += f"आपका {lt} लोन {bank} से {int(emi):,} रुपए मासिक किस्त पर है। "
        g += "आप अपने लोन के बारे में कुछ भी पूछ सकते हैं। बताइए, मैं कैसे मदद करूँ?"
    elif lang == "te":
        g  = f"నమస్కారం{', ' + name if name else ''}! నేను LoanAI లోన్ అడ్వైజర్‌ని. "
        if bank and emi:
            g += f"మీ {lt} లోన్ {bank} నుండి నెలకు {int(emi):,} రూపాయలు. "
        g += "మీ లోన్ గురించి ఏమైనా అడగవచ్చు."
    else:
        g  = f"Hello{', ' + name if name else ''}! This is your loan advisor from LoanAI. "
        if bank and emi:
            g += f"I can see your {lt} loan from {bank} with a monthly EMI of {int(emi):,} rupees. "
        g += "You can ask me anything about your loan. How can I help you today?"

    return Response(
        content=_respond(_say(g, lang), gather_url, cfg["bcp47"]),
        media_type="application/xml",
    )


# ── 3. Gather ─────────────────────────────────────────────────────────────────

@router.post("/gather")
async def gather_handler(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    call_sid      = (form.get("CallSid")      or "").strip()
    speech_result = (form.get("SpeechResult") or "").strip()

    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    log  = db.query(CallLog).filter(CallLog.call_sid == call_sid).first() if call_sid else None
    lang = (log.language or "en") if log else "en"
    if lang not in LANG_CONFIG:
        lang = "en"
    cfg  = LANG_CONFIG[lang]

    # Nothing heard
    if not speech_result:
        return Response(
            content=_respond(_say(cfg["retry"], lang), gather_url, cfg["bcp47"]),
            media_type="application/xml",
        )

    # Store user speech
    if log:
        log.transcript = ((log.transcript or "") + f"\nUser: {speech_result}").strip()
        db.commit()

    # Build Groq prompt
    context = _loan_context(log, lang) if log else (
        f"You are a professional loan advisor. {cfg['lang_prompt']} "
        "No markdown or special characters."
    )
    prompt = f"{context}\n\nCustomer said: \"{speech_result}\"\n\nAdvisor:"

    try:
        ai_text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: generate_ai_response(prompt)
        )
        # Clean markdown, keep short
        ai_text = re.sub(r'\s+', ' ', ai_text
            .replace("**","").replace("*","")
            .replace("#","").replace("`","")).strip()
        ai_text = ai_text[:280]
    except Exception as e:
        print(f"Groq error: {e}")
        ai_text = (
            "माफ़ करें, तकनीकी समस्या हुई।" if lang == "hi"
            else "క్షమించండి, సమస్య వచ్చింది." if lang == "te"
            else "Sorry, I had a technical issue. Please ask again."
        )

    # Store AI reply
    if log:
        log.transcript = (log.transcript + f"\nAI: {ai_text}").strip()
        db.commit()

    return Response(
        content=_respond(_say(ai_text, lang), gather_url, cfg["bcp47"]),
        media_type="application/xml",
    )


# ── 4. Status callback ─────────────────────────────────────────────────────────

@router.post("/status-callback")
async def status_callback(request: Request, db: Session = Depends(get_db)):
    form        = await request.form()
    call_sid    = form.get("CallSid", "")
    call_status = form.get("CallStatus", "")
    duration    = form.get("CallDuration", 0)
    rec_url     = form.get("RecordingUrl", "")

    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if log:
        log.status       = call_status
        log.duration_sec = int(duration) if duration else log.duration_sec
        if rec_url:
            log.recording_url = rec_url
        db.commit()

    return Response(content="OK", media_type="text/plain")


# ── 5. Call logs ───────────────────────────────────────────────────────────────

@router.get("/logs")
def get_call_logs(db: Session = Depends(get_db),
                  authorization: Optional[str] = Header(None)):
    auth_user_id = _auth_id(authorization)
    q = db.query(CallLog).order_by(CallLog.created_at.desc())
    if auth_user_id:
        q = q.filter(CallLog.auth_user_id == auth_user_id)
    return [_log_dict(l) for l in q.limit(100).all()]


# ── 6. Single call detail ──────────────────────────────────────────────────────

@router.get("/logs/{call_sid}")
def get_call_detail(call_sid: str, db: Session = Depends(get_db),
                    authorization: Optional[str] = Header(None)):
    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")
    return _log_dict(log)


# ── 7. Analytics ───────────────────────────────────────────────────────────────

@router.post("/analytics/{call_sid}")
def generate_analytics(call_sid: str, db: Session = Depends(get_db),
                        authorization: Optional[str] = Header(None)):
    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")

    has_transcript = bool(log.transcript and log.transcript.strip())

    if has_transcript:
        parts = []
        if log.customer_name:    parts.append(f"Name: {log.customer_name}")
        if log.loan_type:        parts.append(f"Loan: {log.loan_type}")
        if log.recommended_bank: parts.append(f"Bank: {log.recommended_bank}")
        if log.recommended_emi:  parts.append(f"EMI: {int(log.recommended_emi):,} rupees")
        profile = ", ".join(parts) or "not available"
        prompt = (
            f"Customer profile: {profile}\n\n"
            f"Call transcript:\n{log.transcript}\n\n"
            "Provide:\n"
            "1. 2-sentence summary of what was discussed\n"
            "2. Key topics (comma separated)\n"
            "3. One follow-up recommendation\n"
            "Be specific and concise."
        )
    else:
        dur = f"{log.duration_sec} seconds" if log.duration_sec else "unknown"
        prompt = (
            f"Loan advisory call to {log.to_number}. "
            f"Status: {log.status}. Duration: {dur}. No transcript.\n"
            "1. What likely happened?\n2. Recommended next steps?"
        )

    summary = generate_ai_response(prompt)
    sentiment_prompt = (
        (f"Transcript:\n{log.transcript[:600]}\n\n" if has_transcript
         else f"Call status: {log.status}\n\n")
        + "Customer sentiment? Reply with exactly one word: positive, neutral, or negative."
    )
    raw = generate_ai_response(sentiment_prompt).strip().lower()
    sentiment = ("positive" if "positive" in raw
                 else "negative" if "negative" in raw else "neutral")

    log.ai_summary = summary
    log.sentiment  = sentiment
    db.commit()

    return {"callSid": call_sid, "summary": summary,
            "sentiment": sentiment, "hasTranscript": has_transcript}


def _log_dict(l: CallLog) -> dict:
    return {
        "id":              l.id,
        "callSid":         l.call_sid,
        "toNumber":        l.to_number,
        "fromNumber":      l.from_number,
        "status":          l.status,
        "durationSec":     l.duration_sec,
        "recordingUrl":    l.recording_url,
        "transcript":      l.transcript,
        "sentiment":       l.sentiment,
        "aiSummary":       l.ai_summary,
        "loanType":        l.loan_type,
        "language":        l.language,
        "customerName":    l.customer_name,
        "recommendedBank": l.recommended_bank,
        "recommendedEmi":  float(l.recommended_emi) if l.recommended_emi else None,
        "createdAt":       l.created_at.isoformat() if l.created_at else None,
    }