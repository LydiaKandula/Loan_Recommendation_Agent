from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.interaction import Interaction
from app.models.loan_recommendation import LoanRecommendation
from app.models.loan_product import LoanProduct
from app.services.recommendation_service import recommend_loan

router = APIRouter()


def map_frontend_to_user(data: dict) -> dict:
    return {
        "full_name":           data.get("fullName")         or data.get("full_name"),
        "email":               data.get("email"),
        "phone":               data.get("phone"),
        "age":                 data.get("age"),
        "job":                 data.get("job"),
        "monthly_income":      data.get("monthlyIncome")    or data.get("monthly_income"),
        "monthly_expenses":    data.get("monthlyExpenses")  or data.get("monthly_expenses"),
        "credit_score":        data.get("creditScore")      or data.get("credit_score"),
        "preferred_loan_type": data.get("preferredLoanType")or data.get("preferred_loan_type"),
        "preferred_amount":    data.get("preferredAmount")  or data.get("preferred_amount"),
        "preferred_tenure":    data.get("preferredTenure")  or data.get("preferred_tenure"),
    }


def _user_to_dict(u: User, rec=None) -> dict:
    """Shared serializer — used by /applications and /users/{id}."""
    if u.credit_score and u.credit_score >= 750:
        status = "Approved"
    elif u.credit_score and u.credit_score >= 650:
        status = "Under Review"
    else:
        status = "Rejected"

    return {
        "id":                  u.id,
        "fullName":            u.full_name,
        "email":               u.email,
        "phone":               u.phone,
        "age":                 u.age,
        "job":                 u.job,
        "monthlyIncome":       float(u.monthly_income)   if u.monthly_income   else 0,
        "monthlyExpenses":     float(u.monthly_expenses) if u.monthly_expenses else 0,
        "creditScore":         u.credit_score,
        "preferredLoanType":   u.preferred_loan_type,
        "preferredAmount":     float(u.preferred_amount) if u.preferred_amount else 0,
        "preferredTenure":     u.preferred_tenure,
        "status":              status,
        "bank":                rec.loan_product.bank_name if rec and rec.loan_product else None,
        "emi":                 float(rec.emi)             if rec and rec.emi     else None,
        "recommendationText":  rec.recommendation_reason if rec                 else None,
        "createdAt":           u.created_at.isoformat()  if u.created_at        else None,
    }


@router.post("/chat")
def chat(data: dict, db: Session = Depends(get_db)):
    try:
        mapped = map_frontend_to_user(data)
        user = User(**mapped)
        db.add(user)
        db.commit()
        db.refresh(user)

        result = recommend_loan(db, user)

        interaction = Interaction(
            user_id=user.id,
            user_message=f"{user.preferred_loan_type} loan request",
            ai_response=str(result.get("ai_message", "")),
            communication_type="chat"
        )
        db.add(interaction)
        db.commit()

        # Also return the user id so frontend can store it
        return {**result, "userId": user.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applications")
def get_applications(db: Session = Depends(get_db)):
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        result = []
        for u in users:
            rec = (
                db.query(LoanRecommendation)
                .filter(LoanRecommendation.user_id == u.id)
                .order_by(LoanRecommendation.created_at.desc())
                .first()
            )
            # Eagerly load loan product for bank name
            if rec and rec.product_id:
                rec.loan_product = db.query(LoanProduct).filter(
                    LoanProduct.id == rec.product_id
                ).first()
            else:
                if rec:
                    rec.loan_product = None
            result.append(_user_to_dict(u, rec))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── NEW: list all registered users (for the user-switcher dropdown) ──────────
@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return [
            {
                "id":       u.id,
                "fullName": u.full_name,
                "email":    u.email,
                "preferredLoanType": u.preferred_loan_type,
                "creditScore": u.credit_score,
            }
            for u in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── NEW: fetch a single user's full profile + recommendation ─────────────────
@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    try:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")

        rec = (
            db.query(LoanRecommendation)
            .filter(LoanRecommendation.user_id == u.id)
            .order_by(LoanRecommendation.created_at.desc())
            .first()
        )
        if rec and rec.product_id:
            rec.loan_product = db.query(LoanProduct).filter(
                LoanProduct.id == rec.product_id
            ).first()
        elif rec:
            rec.loan_product = None

        return _user_to_dict(u, rec)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    try:
        interactions = (
            db.query(Interaction)
            .order_by(Interaction.created_at.desc())
            .limit(100)
            .all()
        )
        return [
            {
                "id":                  i.id,
                "user_id":             i.user_id,
                "user_message":        i.user_message,
                "ai_response":         i.ai_response,
                "communication_type":  i.communication_type,
                "created_at":          i.created_at.isoformat() if i.created_at else None,
            }
            for i in interactions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))