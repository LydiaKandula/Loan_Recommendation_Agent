from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.interaction import Interaction
from app.services.recommendation_service import recommend_loan

router = APIRouter()

<<<<<<< Updated upstream
@router.post("/chat")
def chat(data: dict, db: Session = Depends(get_db)):

    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)

    result = recommend_loan(db, user)

    # ✅ store interaction (CHAT)
    interaction = Interaction(
        user_id=user.id,
        user_message=f"{user.preferred_loan_type} loan request",
        ai_response=str(result),
        communication_type="chat"
    )

    db.add(interaction)
    db.commit()

    return result
=======
@router.get("/test")
def test_api():
    return {
        "message": "Backend Connected Successfully"
    }
@router.post("/recommend")
def recommend_loan(data: dict):

    income = data.get("income")
    loan_type = data.get("loan_type")

    if income >= 50000:
        recommendation = "SBI Home Loan"
    else:
        recommendation = "HDFC Personal Loan"

    return {
        "recommended_loan": recommendation,
        "loan_type": loan_type,
        "income": income
    }
>>>>>>> Stashed changes
