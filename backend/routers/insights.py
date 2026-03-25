from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/")
async def get_insights(start_date: str = None, end_date: str = None):
    """Retorna métricas dos criativos publicados."""
    from services.tiktok_api import get_metricas, TIKTOK_ADVERTISER_ID
    try:
        return await get_metricas(TIKTOK_ADVERTISER_ID, start_date, end_date)
    except NotImplementedError as e:
        raise HTTPException(status_code=503, detail=str(e))
