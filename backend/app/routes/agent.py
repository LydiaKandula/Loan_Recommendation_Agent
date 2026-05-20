<<<<<<< Updated upstream
from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
def test_api():
    return {
        "message": "Backend Connected Successfully"
    }
@router.post("/recommend")
def recommend_loan(data: dict):

    income = data.get("income")
    loan_type = data.get("loan_type")
=======
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.interaction import Interaction
from app.services.recommendation_service import recommend_loan, find_best_loan

router = APIRouter()


def normalize_user_payload(data: dict):
    return {
        "full_name": data.get("fullName") or data.get("full_name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "age": data.get("age"),
        "job": data.get("job"),
        "monthly_income": data.get("monthlyIncome") or data.get("monthly_income"),
        "monthly_expenses": data.get("monthlyExpenses") or data.get("monthly_expenses"),
        "credit_score": data.get("creditScore") or data.get("credit_score"),
        "preferred_loan_type": data.get("preferredLoanType") or data.get("preferred_loan_type"),
        "preferred_amount": data.get("preferredAmount") or data.get("preferred_amount"),
        "preferred_tenure": data.get("preferredTenure") or data.get("preferred_tenure"),
    }


def format_application(user: User, recommendation: dict = None):
    status = (
        "Approved" if user.credit_score >= 750
        else "Under Review" if user.credit_score >= 650
        else "Rejected"
    )

    recommendation_text = None
    if recommendation and recommendation.get("bank"):
        recommendation_text = (
            f"{recommendation['bank']} @ {recommendation['rate']:.2f}% | EMI ₹{int(recommendation['emi'])}"
        )

    return {
        "id": user.id,
        "fullName": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "job": user.job,
        "monthlyIncome": float(user.monthly_income) if user.monthly_income is not None else None,
        "monthlyExpenses": float(user.monthly_expenses) if user.monthly_expenses is not None else None,
        "creditScore": user.credit_score,
        "preferredLoanType": user.preferred_loan_type,
        "preferredAmount": float(user.preferred_amount) if user.preferred_amount is not None else None,
        "preferredTenure": user.preferred_tenure,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "recommendationText": recommendation_text,
        "status": status,
    }


@router.post("/applications")
def create_application(data: dict, db: Session = Depends(get_db)):
    payload = normalize_user_payload(data)

    if not payload["email"] or not payload["phone"]:
        raise HTTPException(status_code=400, detail="Missing required user fields")

    user = User(**payload)
    db.add(user)
    db.commit()
    db.refresh(user)

    recommendation = recommend_loan(db, user)
    interaction = Interaction(
        user_id=user.id,
        user_message=f"{user.preferred_loan_type} loan request",
        ai_response=str(recommendation),
        communication_type="application",
    )

    db.add(interaction)
    db.commit()

    return format_application(user, recommendation)


@router.get("/applications")
def get_applications(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [format_application(user, find_best_loan(db, user)) for user in users]


@router.post("/chat")
def chat(data: dict, db: Session = Depends(get_db)):
    payload = normalize_user_payload(data)

    user = User(**payload)
    db.add(user)
    db.commit()
    db.refresh(user)
>>>>>>> Stashed changes

    if income >= 50000:
        recommendation = "SBI Home Loan"
    else:
        recommendation = "HDFC Personal Loan"

<<<<<<< Updated upstream
    return {
        "recommended_loan": recommendation,
        "loan_type": loan_type,
        "income": income
    }
=======
    interaction = Interaction(
        user_id=user.id,
        user_message=f"{user.preferred_loan_type} loan request",
        ai_response=str(result),
        communication_type="chat"
    )

    db.add(interaction)
    db.commit()

    return result
>>>>>>> Stashed changes
