from app.models import User, Interaction, LoanRecommendation, StatusTracking

def save_user(db, data):
    user = User(
        name=data.get("name"),
        phone=data.get("phone"),
        email=data.get("email"),
        income=data.get("income"),
        credit_score=data.get("credit_score")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def log_interaction(db, user_id, user_input, response):
    log = Interaction(
        user_id=user_id,
        input=user_input,
        response=response
    )
    db.add(log)
    db.commit()


def save_recommendations(db, user_id, recs):
    for r in recs:
        row = LoanRecommendation(
            user_id=user_id,
            loan_type=r["loan"],
            emi=r["emi"],
            tenure=r["tenure"],
            interest=r["interest"]
        )
        db.add(row)
    db.commit()


def update_status(db, user_id, stage):
    status = StatusTracking(
        user_id=user_id,
        stage=stage
    )
    db.add(status)
    db.commit()