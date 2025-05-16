from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import power, water
from app.api import greenery

app = FastAPI(
    title="Carbon Dashboard API",
    description="부경대학교 탄소 배출량 모니터링 대시보드 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Power, Water API 라우터 등록
app.include_router(power.router, prefix="/api/power", tags=["power"])
app.include_router(water.router, prefix="/api/water", tags=["water"])
app.include_router(greenery.router, prefix="/api/greenery", tags=["greenery"])

@app.get("/")
async def root():
    return {"message": "Carbon Dashboard API"}