from fastapi import APIRouter
from app.core.database import SessionLocal
from app.services.db_service import (
    save_user,
    log_interaction,
    save_recommendations,
    update_status
)

router = APIRouter()

@router.post("/start-agent")
def start_agent(data: dict):
    db = SessionLocal()

    user_id = save_user(db, data)
    update_status(db, user_id, "STARTED")

    results = [
        {"loan": "Home Loan", "interest": 8.5, "tenure": 60, "emi": 10000}
    ]

    update_status(db, user_id, "RECOMMENDATION_DONE")

    response = "You are eligible for a Home Loan."

    log_interaction(db, user_id, str(data), response)
    save_recommendations(db, user_id, results)

    update_status(db, user_id, "COMPLETED")

    return {"message": response, "recommendations": results}