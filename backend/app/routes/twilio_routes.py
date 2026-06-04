"""
twilio_routes.py
ROOT CAUSE OF "application error":
  request.base_url returns http://127.0.0.1:8000 inside FastAPI even when
  the request arrives via ngrok. Twilio gets http://127.0.0.1/calls/gather
  as the action URL — which it cannot reach — so it throws "application error".
  
FIX: PUBLIC_BASE_URL in .env MUST be set to your ngrok https URL.
  This file validates it at startup and gives a clear error if missing,
  instead of silently building an unreachable URL.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import asyncio, httpx, html, urllib.parse

from app.core.database import get_db
from app.core.config import (
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER, PUBLIC_BASE_URL,
)
from app.models.call_log import CallLog
from app.routes.auth import decode_token
from app.services.groq_service import generate_ai_response

router = APIRouter(prefix="/calls", tags=["calls"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _auth_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["id"] if payload else None


def _require_base() -> str:
    """
    Returns PUBLIC_BASE_URL stripped of trailing slash.
    Raises a clear 500 with instructions if it is not set.
    PUBLIC_BASE_URL must be your ngrok https URL, e.g.:
      PUBLIC_BASE_URL=https://abcd-12-34-56-78.ngrok-free.app
    """
    if not PUBLIC_BASE_URL or PUBLIC_BASE_URL.strip() == "":
        raise HTTPException(
            status_code=500,
            detail=(
                "PUBLIC_BASE_URL is not set in backend/.env  "
                "Run: ngrok http 8000  "
                "Copy the https://xxxx.ngrok-free.app URL  "
                "Add to .env: PUBLIC_BASE_URL=https://xxxx.ngrok-free.app  "
                "Then restart uvicorn."
            )
        )
    return PUBLIC_BASE_URL.rstrip("/")


def _xml(text: str) -> str:
    """Escape text safely for TwiML XML."""
    clean = (str(text or "")
             .replace("**", "").replace("*", "")
             .replace("#", "").replace("`", "")
             .replace("\n", " ").strip())
    return html.escape(clean, quote=True)


# ── Schemas ───────────────────────────────────────────────────────────────────

class InitiateCallRequest(BaseModel):
    to_number: str
    user_name: str   = "there"
    loan_type: str   = "loan"
    bank:      str   = ""
    emi:       float = 0.0


# ── 1. Initiate outbound call ─────────────────────────────────────────────────

@router.post("/initiate")
async def initiate_call(
    body: InitiateCallRequest,
    db:   Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise HTTPException(500, "Twilio credentials not set in .env")

    base         = _require_base()   # fails fast with clear message if missing
    auth_user_id = _auth_id(authorization)

    # Build TwiML URL — Twilio will POST to this when the call is answered
    params = urllib.parse.urlencode({
        "user_name": body.user_name,
        "loan_type": body.loan_type,
        "bank":      body.bank,
        "emi":       str(int(body.emi)) if body.emi else "",
    })
    twiml_url       = f"{base}/calls/twiml?{params}"
    status_callback = f"{base}/calls/status-callback"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To":                   body.to_number,
                "From":                 TWILIO_FROM_NUMBER,
                "Url":                  twiml_url,
                "Method":               "POST",
                "StatusCallback":       status_callback,
                "StatusCallbackMethod": "POST",
                "StatusCallbackEvent":  ["initiated", "ringing", "answered", "completed"],
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(502, f"Twilio error: {resp.text}")

    data     = resp.json()
    call_sid = data.get("sid", "")

    db.add(CallLog(
        auth_user_id=auth_user_id,
        call_sid=call_sid,
        to_number=body.to_number,
        from_number=TWILIO_FROM_NUMBER,
        status="initiated",
        transcript="",
    ))
    db.commit()

    return {"callSid": call_sid, "status": "initiated", "to": body.to_number}


# ── 2. TwiML — greeting played when call connects ────────────────────────────

@router.post("/twiml")
@router.get("/twiml")
async def twiml_handler(request: Request):
    params    = dict(request.query_params)
    name      = params.get("user_name", "")
    loan_type = params.get("loan_type", "loan")
    bank      = params.get("bank", "")
    emi       = params.get("emi", "")

    greeting = f"Hello{', ' + name if name and name not in ('', 'there') else ''}! "
    greeting += "This is your Loan AI assistant from LoanAI. "
    if bank and emi and emi not in ("0", "0.0", ""):
        greeting += (
            f"We found a great {loan_type} loan from {bank} "
            f"with a monthly EMI of {emi} rupees per month. "
        )
    greeting += (
        "You can ask me anything about your loan, EMI, eligibility, or repayment. "
        "How can I help you today?"
    )

    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">{_xml(greeting)}</Say>
  <Gather input="speech" action="{gather_url}" method="POST"
          speechTimeout="3" language="en-IN" timeout="10">
  </Gather>
  <Say voice="alice" language="en-IN">We did not hear anything. Thank you for calling LoanAI. Goodbye!</Say>
  <Hangup/>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


# ── 3. Gather — process speech, reply, store transcript ──────────────────────

@router.post("/gather")
async def gather_handler(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    speech_result = (form.get("SpeechResult") or "").strip()
    call_sid      = (form.get("CallSid") or "").strip()

    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    # Nothing heard — ask again once
    if not speech_result:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Sorry, I did not catch that. Please go ahead and speak.</Say>
  <Gather input="speech" action="{gather_url}" method="POST"
          speechTimeout="3" language="en-IN" timeout="10">
  </Gather>
  <Say voice="alice" language="en-IN">Thank you for calling LoanAI. Goodbye!</Say>
  <Hangup/>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    # Save user turn to transcript
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first() if call_sid else None
    if log:
        existing       = log.transcript or ""
        log.transcript = (existing + f"\nUser: {speech_result}").strip()
        db.commit()

    # Generate AI reply (non-blocking)
    prompt = (
        f"A customer on a phone call about their loan said: '{speech_result}'. "
        "Reply in 1-2 sentences. Plain spoken English only. "
        "No bullet points, asterisks, markdown, or special characters."
    )
    try:
        ai_text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: generate_ai_response(prompt)
        )
        ai_text = (ai_text
                   .replace("**", "").replace("*", "")
                   .replace("#", "").replace("`", "")
                   .replace("\n", " ").strip())
        ai_text = ai_text[:450]
    except Exception as e:
        print(f"Groq error in gather: {e}")
        ai_text = "I'm sorry, I had a technical issue. Could you please repeat your question?"

    # Save AI turn to transcript
    if log:
        log.transcript = (log.transcript + f"\nAI: {ai_text}").strip()
        db.commit()

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">{_xml(ai_text)}</Say>
  <Gather input="speech" action="{gather_url}" method="POST"
          speechTimeout="3" language="en-IN" timeout="10">
    <Say voice="alice" language="en-IN">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice" language="en-IN">Thank you for calling LoanAI. Have a great day! Goodbye!</Say>
  <Hangup/>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


# ── 4. Status callback ────────────────────────────────────────────────────────

@router.post("/status-callback")
async def status_callback(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    call_sid      = form.get("CallSid", "")
    call_status   = form.get("CallStatus", "")
    duration      = form.get("CallDuration", 0)
    recording_url = form.get("RecordingUrl", "")

    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if log:
        log.status       = call_status
        log.duration_sec = int(duration) if duration else log.duration_sec
        if recording_url:
            log.recording_url = recording_url
        db.commit()

    return Response(content="OK", media_type="text/plain")


# ── 5. Call logs ──────────────────────────────────────────────────────────────

@router.get("/logs")
def get_call_logs(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    auth_user_id = _auth_id(authorization)
    q = db.query(CallLog).order_by(CallLog.created_at.desc())
    if auth_user_id:
        q = q.filter(CallLog.auth_user_id == auth_user_id)
    return [_log_dict(l) for l in q.limit(100).all()]


# ── 6. Single call detail ─────────────────────────────────────────────────────

@router.get("/logs/{call_sid}")
def get_call_detail(
    call_sid: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")
    return _log_dict(log)


# ── 7. AI analytics ──────────────────────────────────────────────────────────

@router.post("/analytics/{call_sid}")
def generate_analytics(
    call_sid: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")

    has_transcript = bool(log.transcript and log.transcript.strip())

    if has_transcript:
        prompt = (
            f"Analyse this loan advisory phone call transcript:\n\n{log.transcript}\n\n"
            "Provide:\n"
            "1. A 2-sentence summary of the conversation.\n"
            "2. Customer sentiment: positive, neutral, or negative.\n"
            "3. Key topics discussed (comma separated).\n"
            "4. One recommended follow-up action for the advisor.\n"
            "Be specific and concise."
        )
    else:
        duration_str = f"{log.duration_sec} seconds" if log.duration_sec else "unknown"
        prompt = (
            f"A loan advisory call was made to {log.to_number}. "
            f"Status: {log.status}. Duration: {duration_str}. "
            f"No transcript was captured.\n\n"
            "Based only on this metadata:\n"
            "1. Describe what likely happened based on the call status.\n"
            "2. Suggest whether to follow up and how.\n"
            "3. Note that a transcript is unavailable and the call may need to be rescheduled "
            "if it did not complete successfully.\n"
            "Be practical and concise."
        )

    # ── Step 1: get plain summary ────────────────────────────────────────────
    summary = generate_ai_response(prompt)

    # ── Step 2: ask Groq explicitly for sentiment ─────────────────────────
    # Keyword scanning was unreliable — Groq writes "the customer seemed
    # interested" not the word "positive", so keywords never matched.
    # Now we ask Groq directly with a forced single-word answer.
    if has_transcript:
        sentiment_prompt = (
            f"Read this call transcript and the summary below.\n\n"
            f"Transcript:\n{log.transcript}\n\n"
            f"Summary:\n{summary}\n\n"
            "Based on the customer's tone and words, what was the customer's sentiment?\n"
            "Reply with EXACTLY one word — either: positive, neutral, or negative.\n"
            "Do not write anything else. Just the one word."
        )
    else:
        sentiment_prompt = (
            f"A phone call had status '{log.status}' and lasted "
            f"{log.duration_sec or 0} seconds.\n"
            "Based only on this, what was the likely customer sentiment?\n"
            "Reply with EXACTLY one word — either: positive, neutral, or negative.\n"
            "Do not write anything else. Just the one word."
        )

    raw_sentiment = generate_ai_response(sentiment_prompt).strip().lower()

    # Normalise — Groq sometimes says "positive." or "the sentiment is positive"
    if "positive" in raw_sentiment:
        sentiment = "positive"
    elif "negative" in raw_sentiment:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    log.ai_summary = summary
    log.sentiment  = sentiment
    db.commit()

    return {
        "callSid":       call_sid,
        "summary":       summary,
        "sentiment":     sentiment,
        "hasTranscript": has_transcript,
    }


def _log_dict(l: CallLog) -> dict:
    return {
        "id":           l.id,
        "callSid":      l.call_sid,
        "toNumber":     l.to_number,
        "fromNumber":   l.from_number,
        "status":       l.status,
        "durationSec":  l.duration_sec,
        "recordingUrl": l.recording_url,
        "transcript":   l.transcript,
        "sentiment":    l.sentiment,
        "aiSummary":    l.ai_summary,
        "createdAt":    l.created_at.isoformat() if l.created_at else None,
    }