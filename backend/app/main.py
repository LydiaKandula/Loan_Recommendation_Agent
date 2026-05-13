from fastapi import FastAPI

from app.core.database import Base, engine

#from app.models.user import User
#from app.models.interaction import Interaction
#from app.models.loan_product import LoanProduct
#from app.models.loan_recommendation import LoanRecommendation


from app.routes.chat import router as chat_router
from app.routes.voice import router as voice_router
from app.routes.agent import router as agent_router

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(chat_router)

app.include_router(voice_router)

app.include_router(agent_router)

@app.get("/")
def home():
    return {
        "message": "Loan Recommendation Agent API Running"
    }








