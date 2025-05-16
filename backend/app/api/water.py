from fastapi import APIRouter
from typing import List, Dict

router = APIRouter()

# 예시 데이터 (실제 데이터로 교체 가능)
WATER_MONTHLY = [
    {"month": 1, "emission": 45},
    {"month": 2, "emission": 42},
    {"month": 3, "emission": 38},
    {"month": 4, "emission": 35},
    {"month": 5, "emission": 40},
    {"month": 6, "emission": 38},
    {"month": 7, "emission": 41},
    {"month": 8, "emission": 39},
    {"month": 9, "emission": 37},
    {"month": 10, "emission": 36},
    {"month": 11, "emission": 34},
    {"month": 12, "emission": 33},
]

@router.get("/statistics")
async def get_water_statistics() -> Dict:
    return {
        "monthly_trend": WATER_MONTHLY
    }