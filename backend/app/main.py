from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

app = FastAPI()

# CORS 미들웨어 설정
origins = [
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

DATA_DIR = "data"

# 차량 (vehicle)
@app.get("/api/vehicle/emissions")
def vehicle_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "vehicle.csv"))
    # 탄소배출량 계산
    df["탄소배출량"] = (df["주행거리"] / df["연비"]) * df["배출계수"] * df["차량수"]
    
    # 결과 데이터 구성
    result = df.groupby(["날짜", "연료종류"]).agg({
        "탄소배출량": "sum",
        "차량수": "sum"
    }).reset_index()
    
    # 데이터 형식 변환
    result = result.rename(columns={
        "날짜": "date",
        "연료종류": "fuel_type",
        "탄소배출량": "emissions",
        "차량수": "vehicle_count"
    })
    
    # 소수점 반올림
    result["emissions"] = result["emissions"].round(2)
    result["vehicle_count"] = result["vehicle_count"].round(0)
    
    return JSONResponse(content=result.to_dict(orient="records"))

# 폐기물 (waste)
@app.get("/api/emissions/waste")
def waste_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "waste.csv"))
    df["탄소배출량"] = df["MSW"] * df["DOC"] * df["DOCj"] * df["MCF"] * df["F"] * (16/12) * (1 - df["R"])
    result = df.groupby("날짜")["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return JSONResponse(content=result.to_dict(orient="records"))

# 녹지 - 나무 기반 (greenery_tree.csv)
@app.get("/api/emissions/greenery/tree")
def greenery_tree_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "greenery_tree.csv"))
    df["탄소흡수량"] = df["ΔV"] * df["D"] * df["BEF"] * (1 + df["R"]) * df["CF"] * (44 / 12)
    result = df.groupby("날짜")["탄소흡수량"].sum().reset_index()
    result["탄소흡수량"] = result["탄소흡수량"].round(2)
    return JSONResponse(content=result.to_dict(orient="records"))

# 녹지 - 면적 기반 (greenery_area.csv)
@app.get("/api/emissions/greenery/area")
def greenery_area_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "greenery_area.csv"))
    def calc(row):
        if row["구분"] == "Land Area":
            return row["면적"] * row["carbon_uptake"] + row["면적"] * row["carbon_storage"]
        elif row["구분"] == "Tree Cover":
            return row["면적"] * row["carbon_storage"]
        return 0
    df["탄소흡수량"] = df.apply(calc, axis=1)
    result = df.groupby("날짜")["탄소흡수량"].sum().reset_index()
    result["탄소흡수량"] = result["탄소흡수량"].round(2)
    return JSONResponse(content=result.to_dict(orient="records"))

# 물 (water)
@app.get("/api/emissions/water")
def water_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "water.csv"))
    df["탄소배출량"] = df["상수도사용량"] * df["전력원단위"] * df["배출계수"]
    result = df.groupby("날짜")["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return JSONResponse(content=result.to_dict(orient="records"))

# 전기 (electric)
@app.get("/api/emissions/electric")
def electric_emissions():
    df = pd.read_csv(os.path.join(DATA_DIR, "electric.csv"))
    df["탄소배출량"] = df["사용량(kWh)"] * df["배출계수"]
    result = df.groupby("날짜")["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return JSONResponse(content=result.to_dict(orient="records"))