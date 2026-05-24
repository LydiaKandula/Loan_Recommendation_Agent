"""
backend/app/routes/auth.py
Simple username + password auth using bcrypt.
No JWT for now — returns a plain session token stored in localStorage.
For production, swap to JWT + httpOnly cookies.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_user import AuthUser
import bcrypt
import secrets

router = APIRouter()


@router.post("/auth/signup")
def signup(data: dict, db: Session = Depends(get_db)):
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("fullName") or data.get("full_name") or "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(AuthUser).filter(AuthUser.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken.")

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    token  = secrets.token_hex(32)

    user = AuthUser(
        username=username,
        full_name=full_name or username,
        hashed_password=hashed,
        session_token=token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "token":    token,
        "userId":   user.id,
        "username": user.username,
        "fullName": user.full_name,
    }


@router.post("/auth/login")
def login(data: dict, db: Session = Depends(get_db)):
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    user = db.query(AuthUser).filter(AuthUser.username == username).first()
    if not user or not bcrypt.checkpw(password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # Rotate session token on every login
    token = secrets.token_hex(32)
    user.session_token = token
    db.commit()

    return {
        "token":    token,
        "userId":   user.id,
        "username": user.username,
        "fullName": user.full_name,
    }


@router.post("/auth/logout")
def logout(data: dict, db: Session = Depends(get_db)):
    token = data.get("token")
    if token:
        user = db.query(AuthUser).filter(AuthUser.session_token == token).first()
        if user:
            user.session_token = None
            db.commit()
    return {"ok": True}


@router.get("/auth/me")
def me(token: str, db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.session_token == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return {"userId": user.id, "username": user.username, "fullName": user.full_name}