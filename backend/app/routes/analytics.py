from fastapi import APIRouter

from app.services.analytics_service import get_analytics

router = APIRouter()

@router.get("/analytics")

async def analytics():

    return get_analytics()