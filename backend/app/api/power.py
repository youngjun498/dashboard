from fastapi import APIRouter, HTTPException
from typing import List, Dict
from app.services.power import PowerService

router = APIRouter()
power_service = PowerService()

@router.get("/buildings/{year}/{month}")
async def get_building_emissions(year: int, month: int) -> List[Dict]:
    """특정 년월의 건물별 탄소 배출량을 조회합니다."""
    try:
        return power_service.get_building_emissions(year, month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics/{year}/{month}")
async def get_power_statistics(year: int, month: int) -> Dict:
    """특정 년월의 전력 사용 통계를 조회합니다."""
    try:
        return power_service.get_monthly_statistics(year, month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))