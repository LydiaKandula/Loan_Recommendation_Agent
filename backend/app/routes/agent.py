from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.interaction import Interaction
from app.services.recommendation_service import recommend_loan

router = APIRouter()

# ==============================
# SUBMIT APPLICATION
# ==============================

@router.post("/chat")
def chat(data: dict, db: Session = Depends(get_db)):

    user = User(
        full_name=data["fullName"],
        email=data["email"],
        phone=data["phone"],
        age=data["age"],
        job=data["job"],
        monthly_income=data["monthlyIncome"],
        monthly_expenses=data["monthlyExpenses"],
        credit_score=data["creditScore"],
        preferred_loan_type=data["preferredLoanType"],
        preferred_amount=data["preferredAmount"],
        preferred_tenure=data["preferredTenure"]
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    result = recommend_loan(db, user)

    interaction = Interaction(
        user_id=user.id,
        user_message=f"{user.preferred_loan_type} loan request",
        ai_response=str(result),
        communication_type="chat"
    )

    db.add(interaction)
    db.commit()

    return result


# ==============================
# FETCH APPLICATIONS
# ==============================

@router.get("/applications")
def get_applications(db: Session = Depends(get_db)):

    users = db.query(User).all()

    results = []

    for user in users:

        status = (
            "Approved"
            if user.credit_score >= 750
            else "Under Review"
            if user.credit_score >= 650
            else "Rejected"
        )

        results.append({
            "id": user.id,
            "fullName": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "age": user.age,
            "job": user.job,
            "monthlyIncome": float(user.monthly_income),
            "monthlyExpenses": float(user.monthly_expenses),
            "creditScore": user.credit_score,
            "preferredLoanType": user.preferred_loan_type,
            "preferredAmount": float(user.preferred_amount),
            "preferredTenure": user.preferred_tenure,
            "status": status,
            "createdAt": user.created_at
        })

    return results