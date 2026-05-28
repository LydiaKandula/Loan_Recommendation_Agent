"""
twilio_routes.py — Twilio voice call integration
Endpoints:
  POST /calls/initiate          → start outbound call
  POST /calls/twiml             → TwiML for what Twilio says on pickup
  POST /calls/status-callback   → Twilio posts call status updates here
  GET  /calls/logs              → user's call history
  GET  /calls/logs/{call_sid}   → single call detail
  POST /calls/analytics/{call_sid} → generate AI summary for a call
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx

from app.core.database import get_db
from app.core.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
from app.models.call_log import CallLog
from app.routes.auth import decode_token
from app.services.groq_service import generate_ai_response

router = APIRouter(prefix="/calls", tags=["calls"])


def _auth_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["id"] if payload else None


# ── Schemas ──────────────────────────────────────────────────────────────────
class InitiateCallRequest(BaseModel):
    to_number: str          # E.164 format e.g. +919876543210
    user_name: str = "there"
    loan_type: str = "loan"
    bank:      str = ""
    emi:       float = 0


# ── 1. Initiate outbound call ─────────────────────────────────────────────────
@router.post("/initiate")
async def initiate_call(
    body: InitiateCallRequest,
    db:   Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise HTTPException(500, "Twilio credentials not configured in .env")

    auth_user_id = _auth_id(authorization)

    # Build TwiML URL — Twilio will GET/POST this when the call connects
    twiml_url = "https://your-ngrok-or-domain.com/calls/twiml"   # ← update for production

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To":           body.to_number,
                "From":         TWILIO_FROM_NUMBER,
                "Url":          twiml_url,
                "StatusCallback": "https://your-ngrok-or-domain.com/calls/status-callback",
                "StatusCallbackMethod": "POST",
                "StatusCallbackEvent":  ["initiated","ringing","answered","completed"],
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(502, f"Twilio error: {resp.text}")

    data = resp.json()
    call_sid = data.get("sid")

    # Log to DB
    log = CallLog(
        auth_user_id=auth_user_id,
        call_sid=call_sid,
        to_number=body.to_number,
        from_number=TWILIO_FROM_NUMBER,
        status="initiated",
    )
    db.add(log)
    db.commit()

    return {"callSid": call_sid, "status": "initiated", "to": body.to_number}


# ── 2. TwiML — what the AI says when call connects ────────────────────────────
@router.post("/twiml")
@router.get("/twiml")
async def twiml_handler(request: Request):
    """
    Twilio fetches this URL when the call connects.
    Returns TwiML XML that plays a greeting and gathers speech.
    """
    params = dict(request.query_params)
    name      = params.get("user_name", "there")
    loan_type = params.get("loan_type", "loan")
    bank      = params.get("bank", "")
    emi       = params.get("emi", "")

    greeting = f"Hello {name}! This is your Loan AI assistant from LoanAI. "
    if bank and emi:
        greeting += f"We found a great {loan_type} loan from {bank} with an EMI of {emi} rupees per month. "
    greeting += "You can ask me any questions about your loan application. How can I help you today?"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">{greeting}</Say>
  <Gather input="speech" action="/calls/gather" method="POST"
          speechTimeout="3" language="en-IN" timeout="10">
    <Say voice="Polly.Aditi" language="en-IN">Please go ahead and speak.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">We did not receive any input. Thank you for calling LoanAI. Goodbye!</Say>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


# ── 3. Gather — process user speech mid-call ──────────────────────────────────
@router.post("/gather")
async def gather_handler(request: Request):
    form = await request.form()
    speech_result = form.get("SpeechResult", "").strip()

    if not speech_result:
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Sorry, I didn't catch that. Thank you for calling. Goodbye!</Say>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    # Call Groq for AI response
    ai_text = generate_ai_response(
        f"User said during a phone call about their loan: '{speech_result}'. "
        "Give a short, helpful, spoken response (2-3 sentences max). No special characters."
    )
    # Truncate for TTS
    ai_text = ai_text[:500]

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">{ai_text}</Say>
  <Gather input="speech" action="/calls/gather" method="POST"
          speechTimeout="3" language="en-IN" timeout="8">
    <Say voice="Polly.Aditi">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="Polly.Aditi">Thank you for calling LoanAI. Have a great day! Goodbye!</Say>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


# ── 4. Status callback — Twilio posts status updates ─────────────────────────
@router.post("/status-callback")
async def status_callback(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    call_sid     = form.get("CallSid")
    call_status  = form.get("CallStatus")
    duration     = form.get("CallDuration", 0)
    recording_url= form.get("RecordingUrl")

    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if log:
        log.status       = call_status
        log.duration_sec = int(duration) if duration else 0
        if recording_url:
            log.recording_url = recording_url
        db.commit()

    return Response(content="OK", media_type="text/plain")


# ── 5. Get call logs ──────────────────────────────────────────────────────────
@router.get("/logs")
def get_call_logs(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    auth_user_id = _auth_id(authorization)
    query = db.query(CallLog).order_by(CallLog.created_at.desc())
    if auth_user_id:
        query = query.filter(CallLog.auth_user_id == auth_user_id)
    logs = query.limit(100).all()
    return [_log_dict(l) for l in logs]


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


# ── 7. AI summary / analytics for a call ────────────────────────────────────
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

    transcript_text = log.transcript or "No transcript available."
    prompt = (
        f"Analyse this call transcript from a loan advisory call:\n\n{transcript_text}\n\n"
        "Provide: 1) A 2-sentence summary. 2) Customer sentiment (positive/neutral/negative). "
        "3) Key topics discussed. 4) Follow-up recommendations. Be concise."
    )
    summary   = generate_ai_response(prompt)
    sentiment = "positive" if any(w in summary.lower() for w in ["positive","happy","satisfied","interested"]) \
               else "negative" if any(w in summary.lower() for w in ["negative","unhappy","dissatisfied","confused"]) \
               else "neutral"

    log.ai_summary = summary
    log.sentiment  = sentiment
    db.commit()

    return {"callSid": call_sid, "summary": summary, "sentiment": sentiment}


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