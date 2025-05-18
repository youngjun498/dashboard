# backend/app/api/power.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from app.services.power import PowerService
from app.schemas.power import PowerResponse, PowerStatistics

router = APIRouter()
power_service = PowerService()

@router.get(
    "/buildings/{year}/{month}",
    response_model=List[PowerResponse],
    summary="건물별 탄소 배출량 조회",
    description="특정 년월의 건물별 탄소 배출량을 조회합니다."
)
async def get_building_emissions(
    year: int,
    month: int,
    db: Session = Depends(get_db)
) -> List[PowerResponse]:
    try:
        return power_service.get_building_emissions(year, month, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))