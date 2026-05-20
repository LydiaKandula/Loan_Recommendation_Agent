from fastapi import APIRouter
from app.core.database import SessionLocal
from app.models.application import Application

router = APIRouter()


# =========================
# TEST ROUTE
# =========================

@router.get("/test")
def test_api():

    return {
        "message": "Backend Connected Successfully"
    }


# =========================
# SUBMIT APPLICATION
# =========================

@router.post("/submit-application")
def submit_application(data: dict):

    db = SessionLocal()

    try:

        credit_score = data.get("creditScore")

        # LOAN STATUS LOGIC

        if credit_score >= 750:
            status = "Approved"

        elif credit_score >= 650:
            status = "Under Review"

        else:
            status = "Rejected"

        # CREATE DATABASE OBJECT

        new_application = Application(

            full_name=data.get("fullName"),

            email=data.get("email"),

            phone=data.get("phone"),

            age=data.get("age"),

            job=data.get("job"),

            monthly_income=data.get("monthlyIncome"),

            monthly_expenses=data.get("monthlyExpenses"),

            credit_score=credit_score,

            preferred_loan_type=data.get("preferredLoanType"),

            preferred_amount=data.get("preferredAmount"),

            preferred_tenure=data.get("preferredTenure"),

            status=status
        )

        # SAVE TO DATABASE

        db.add(new_application)

        db.commit()

        db.refresh(new_application)

        return {

            "message": "Application Submitted Successfully",

            "status": status,

            "application_id": new_application.id
        }

    except Exception as e:

        db.rollback()

        return {
            "error": str(e)
        }

    finally:

        db.close()


# =========================
# GET ALL APPLICATIONS
# =========================

@router.get("/applications")
def get_all_applications():

    db = SessionLocal()

    applications = db.query(Application).all()

    result = []

    for app in applications:

        result.append({

            "id": app.id,

            "fullName": app.full_name,

            "email": app.email,

            "phone": app.phone,

            "age": app.age,

            "job": app.job,

            "monthlyIncome": app.monthly_income,

            "monthlyExpenses": app.monthly_expenses,

            "creditScore": app.credit_score,

            "preferredLoanType": app.preferred_loan_type,

            "preferredAmount": app.preferred_amount,

            "preferredTenure": app.preferred_tenure,

            "status": app.status
        })

    db.close()

    return result