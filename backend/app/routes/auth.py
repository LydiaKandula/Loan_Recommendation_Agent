# backend/app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.auth_user import AuthUser
import hashlib, secrets

router = APIRouter(prefix="/auth", tags=["auth"])


# ── helpers ─────────────────────────────────────────────────────────────────
def _hash(password: str) -> str:
    """Simple SHA-256 hash. For production use bcrypt."""
    return hashlib.sha256(password.encode()).hexdigest()


def _make_token(user_id: int, username: str) -> str:
    """Stateless token: base64(user_id:username:rand). Good enough for intern demo."""
    import base64
    raw = f"{user_id}:{username}:{secrets.token_hex(8)}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_token(token: str) -> dict | None:
    """Decode token → {id, username} or None."""
    try:
        import base64
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split(":")
        return {"id": int(parts[0]), "username": parts[1]}
    except Exception:
        return None


# ── schemas ──────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    username: str
    email:    str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ── endpoints ─────────────────────────────────────────────────────────────────
@router.post("/signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if not body.username.strip() or not body.password:
        raise HTTPException(400, "Username and password required")

    if db.query(AuthUser).filter(AuthUser.username == body.username).first():
        raise HTTPException(409, "Username already taken")

    if db.query(AuthUser).filter(AuthUser.email == body.email).first():
        raise HTTPException(409, "Email already registered")

    user = AuthUser(
        username=body.username.strip(),
        email=body.email.strip(),
        password_hash=_hash(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _make_token(user.id, user.username)
    return {"token": token, "userId": user.id, "username": user.username}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.username == body.username).first()
    if not user or user.password_hash != _hash(body.password):
        raise HTTPException(401, "Invalid username or password")

    token = _make_token(user.id, user.username)
    return {"token": token, "userId": user.id, "username": user.username}


@router.get("/me")
def me(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user = db.query(AuthUser).filter(AuthUser.id == payload["id"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user.id, "username": user.username, "email": user.email}