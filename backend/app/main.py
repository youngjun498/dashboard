from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import power, water
from app.api import greenery, vehicle, waste

app = FastAPI(
    title="Carbon Dashboard API",
    description="부경대학교 탄소 배출량 모니터링 대시보드 API",
    version="1.0.0"
)

# CORS 설정 개선
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5501"],  # 실제 프론트엔드 도메인으로 변경
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 모든 API 라우터 등록
app.include_router(power.router, prefix="/api/power", tags=["power"])
app.include_router(water.router, prefix="/api/water", tags=["water"])
app.include_router(greenery.router, prefix="/api/greenery", tags=["greenery"])
app.include_router(vehicle.router, prefix="/api/vehicle", tags=["vehicle"])
app.include_router(waste.router, prefix="/api/waste", tags=["waste"])

@app.get("/")
async def root():
    return {"message": "Carbon Dashboard API"}