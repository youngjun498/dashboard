from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/statistics")
async def get_greenery_statistics() -> Dict:
    return {
        "uptake": {
            "per_land_area": 11.9,  # 톤
            "per_tree_cover": [
                {"species": "모과나무", "count": 1, "total": 0.0203},
                {"species": "벚나무", "count": 500, "total": 7.051},
                {"species": "히말라야시다", "count": 70, "total": 0.5558},
                {"species": "소나무", "count": 300, "total": 2.15}
            ]
        },
        "storage": {
            "per_land_area": 130.93,  # 톤
            "per_tree_cover": 198.86  # 톤 (총합)
        }
    }