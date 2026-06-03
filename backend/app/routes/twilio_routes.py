"""
twilio_routes.py — Bulletproof version

Root cause of "application error":
  request.base_url behind ngrok returns http://127.0.0.1:8000 (internal address).
  Twilio cannot reach 127.0.0.1 — so gather action URL was unreachable.

Fix:
  _get_base() now reads ngrok's X-Forwarded-Host / X-Original-Host headers
  that ngrok injects on every forwarded request.  Falls back to PUBLIC_BASE_URL
  from .env, and finally to request.base_url as last resort.
  Also forces https:// because Twilio requires HTTPS for action URLs.
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


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _auth_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["id"] if payload else None


def _get_base(request: Request) -> str:
    """
    Returns the correct public base URL for building TwiML action URLs.

    Priority order:
    1. PUBLIC_BASE_URL from .env  (most explicit — always wins)
    2. X-Forwarded-Host header    (ngrok / any reverse proxy injects this)
    3. X-Original-Host header     (alternative ngrok header)
    4. Host header + https scheme (works when ngrok sets Host correctly)
    5. request.base_url           (last resort — may be internal address)

    Always returns https:// because Twilio rejects http:// action URLs.
    """
    # 1. Explicit env var — user set this, trust it completely
    if PUBLIC_BASE_URL and PUBLIC_BASE_URL.strip():
        return PUBLIC_BASE_URL.strip().rstrip("/")

    headers = request.headers

    # 2 & 3. ngrok / proxy forwarded host headers
    forwarded_host = (
        headers.get("x-forwarded-host") or
        headers.get("x-original-host")  or
        headers.get("host")
    )

    if forwarded_host:
        # Strip port if present (ngrok URLs never have a port)
        host = forwarded_host.split(":")[0] if ":" in forwarded_host else forwarded_host
        # ngrok domains always look like xxxx.ngrok-free.app or xxxx.ngrok.io
        if "ngrok" in host or "." in host:
            return f"https://{host}"

    # 4. Fall back to base_url from request (may be http://127.0.0.1 behind proxy)
    base = str(request.base_url).rstrip("/")
    # Force https — Twilio requires it
    if base.startswith("http://"):
        base = "https://" + base[7:]
    return base


def _xml(text: str) -> str:
    """Escape any special characters so they don't break the TwiML XML."""
    return html.escape(str(text or ""), quote=False)


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class InitiateCallRequest(BaseModel):
    to_number: str
    user_name: str  = "there"
    loan_type: str  = "loan"
    bank:      str  = ""
    emi:       float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 1. Initiate outbound call
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/initiate")
async def initiate_call(
    body: InitiateCallRequest,
    request: Request,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise HTTPException(500,
            "Twilio credentials missing. Add TWILIO_ACCOUNT_SID, "
            "TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to your .env file.")

    base         = _get_base(request)
    auth_user_id = _auth_id(authorization)

    # Pass call context as query params so twiml_handler can personalise greeting
    qs = urllib.parse.urlencode({
        "user_name": body.user_name,
        "loan_type": body.loan_type,
        "bank":      body.bank,
        "emi":       str(int(body.emi)) if body.emi else "",
    })
    twiml_url       = f"{base}/calls/twiml?{qs}"
    status_callback = f"{base}/calls/status-callback"

    print(f"[Twilio] Initiating call to {body.to_number}")
    print(f"[Twilio] TwiML URL: {twiml_url}")

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
                "StatusCallbackEvent":  ["initiated","ringing","answered","completed"],
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(502, f"Twilio API error: {resp.text}")

    call_sid = resp.json().get("sid", "")
    print(f"[Twilio] Call SID: {call_sid}")

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


# ─────────────────────────────────────────────────────────────────────────────
# 2. TwiML — greeting + open speech gather
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/twiml")
@router.get("/twiml")
async def twiml_handler(request: Request):
    params    = dict(request.query_params)
    name      = params.get("user_name", "").strip()
    loan_type = params.get("loan_type", "loan")
    bank      = params.get("bank", "").strip()
    emi       = params.get("emi",  "").strip()

    greeting  = "Hello"
    if name and name.lower() != "there":
        greeting += f" {name}"
    greeting += "! This is your Loan AI assistant from LoanAI. "

    if bank and emi and emi not in ("0", "0.0", ""):
        greeting += (
            f"We found a great {loan_type} loan from {bank} "
            f"with a monthly EMI of {emi} rupees. "
        )

    greeting += (
        "You can ask me anything about your loan, EMI, or eligibility. "
        "How can I help you today?"
    )

    base       = _get_base(request)
    gather_url = f"{base}/calls/gather"

    print(f"[TwiML] Serving greeting. Gather URL: {gather_url}")

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Say voice="alice" language="en-IN">{_xml(greeting)}</Say>\n'
        f'  <Gather input="speech" action="{gather_url}" method="POST" '
        f'speechTimeout="3" language="en-IN" timeout="10">\n'
        f'  </Gather>\n'
        f'  <Say voice="alice" language="en-IN">'
        f'We did not hear anything. Thank you for calling LoanAI. Goodbye!</Say>\n'
        f'  <Hangup/>\n'
        f'</Response>'
    )

    return Response(content=twiml, media_type="application/xml")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Gather — process speech, reply with AI, loop
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/gather")
async def gather_handler(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    speech_result = (form.get("SpeechResult") or "").strip()
    call_sid      = (form.get("CallSid") or "").strip()

    base       = _get_base(request)
    gather_url = f"{base}/calls/gather"

    print(f"[Gather] CallSid={call_sid} Speech='{speech_result[:80] if speech_result else ''}'")

    # ── Nothing heard ────────────────────────────────────────────────────────
    if not speech_result:
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '  <Say voice="alice" language="en-IN">Sorry, I did not catch that. Please go ahead and speak.</Say>\n'
            f'  <Gather input="speech" action="{gather_url}" method="POST" '
            f'speechTimeout="3" language="en-IN" timeout="10">\n'
            f'  </Gather>\n'
            f'  <Say voice="alice" language="en-IN">Thank you for calling LoanAI. Goodbye!</Say>\n'
            f'  <Hangup/>\n'
            f'</Response>'
        )
        return Response(content=twiml, media_type="application/xml")

    # ── Store user turn ──────────────────────────────────────────────────────
    if call_sid:
        log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
        if log:
            prev = log.transcript or ""
            log.transcript = (prev + f"\nUser: {speech_result}").strip()
            db.commit()
    else:
        log = None

    # ── AI response (non-blocking) ───────────────────────────────────────────
    prompt = (
        f"A customer on a loan advisory phone call said: '{speech_result}'. "
        "Reply in 1 to 2 short sentences. Plain English, no bullet points, "
        "no asterisks, no markdown. Sound natural and helpful."
    )
    try:
        ai_text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: generate_ai_response(prompt)
        )
        ai_text = (
            ai_text.replace("**","").replace("*","")
                   .replace("#","").replace("`","")
                   .replace("\n"," ").strip()
        )
        if len(ai_text) > 400:
            # Cut at last sentence boundary
            ai_text = ai_text[:400].rsplit(".",1)[0] + "."
    except Exception as exc:
        print(f"[Gather] Groq error: {exc}")
        ai_text = "I'm sorry, I had a technical issue. Could you please repeat that?"

    # ── Store AI turn ────────────────────────────────────────────────────────
    if log:
        log.transcript = (log.transcript + f"\nAI: {ai_text}").strip()
        db.commit()

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'  <Say voice="alice" language="en-IN">{_xml(ai_text)}</Say>\n'
        f'  <Gather input="speech" action="{gather_url}" method="POST" '
        f'speechTimeout="3" language="en-IN" timeout="10">\n'
        f'    <Say voice="alice" language="en-IN">Is there anything else I can help you with?</Say>\n'
        f'  </Gather>\n'
        f'  <Say voice="alice" language="en-IN">Thank you for calling LoanAI. Have a great day! Goodbye!</Say>\n'
        f'  <Hangup/>\n'
        f'</Response>'
    )

    return Response(content=twiml, media_type="application/xml")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Status callback
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/status-callback")
async def status_callback(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    call_sid      = (form.get("CallSid") or "").strip()
    call_status   = (form.get("CallStatus") or "").strip()
    duration      = form.get("CallDuration") or 0
    recording_url = form.get("RecordingUrl") or ""

    print(f"[Status] CallSid={call_sid} Status={call_status} Duration={duration}")

    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if log:
        log.status       = call_status
        log.duration_sec = int(duration) if duration else (log.duration_sec or 0)
        if recording_url:
            log.recording_url = recording_url
        db.commit()

    return Response(content="OK", media_type="text/plain")


# ─────────────────────────────────────────────────────────────────────────────
# 5. List call logs
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# 6. Single call detail
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# 7. Generate AI analytics
# ─────────────────────────────────────────────────────────────────────────────

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
            f"Analyse this loan advisory phone call:\n\n{log.transcript}\n\n"
            "Provide:\n"
            "1. A 2-sentence summary.\n"
            "2. Customer sentiment (positive / neutral / negative).\n"
            "3. Key topics discussed.\n"
            "4. One follow-up recommendation.\n"
            "Be concise and specific."
        )
    else:
        duration_str = f"{log.duration_sec} seconds" if log.duration_sec else "unknown"
        prompt = (
            f"A loan advisory call was placed to {log.to_number}. "
            f"Status: {log.status}. Duration: {duration_str}. "
            "No transcript is recorded for this call. "
            "Based only on the metadata, give a brief note on the call outcome "
            "and a recommendation for follow-up. Do not invent conversation content."
        )

    summary   = generate_ai_response(prompt)
    sentiment = (
        "positive" if any(w in summary.lower() for w in
            ["positive","happy","satisfied","interested","great","excellent"])
        else "negative" if any(w in summary.lower() for w in
            ["negative","unhappy","dissatisfied","confused","angry","failed"])
        else "neutral"
    )

    log.ai_summary = summary
    log.sentiment  = sentiment
    db.commit()

    return {
        "callSid":       call_sid,
        "summary":       summary,
        "sentiment":     sentiment,
        "hasTranscript": has_transcript,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Serialiser
# ─────────────────────────────────────────────────────────────────────────────

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