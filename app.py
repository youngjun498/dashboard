from flask import Flask, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__, template_folder='.', static_folder='.')
CORS(app)

DATA_DIR = "data"

# 페이지 라우트들
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/vehicle')
def vehicle():
    return render_template('vehicle.html')

@app.route('/waste')
def waste():
    return render_template('waste.html')

@app.route('/water')
def water():
    return render_template('water.html')

@app.route('/greenery')
def greenery():
    return render_template('greenery.html')

@app.route('/power')
def power():
    return render_template('power.html')

@app.route('/macc')
def macc():
    return render_template('macc.html')

@app.route('/backend/data/image.png')
def get_image():
    return app.send_static_file('backend/data/image.png')

# API 엔드포인트들
@app.route('/api/emission/vehicle', methods=['GET'])
def vehicle_emission_flask():
    filepath = os.path.join(DATA_DIR, 'vehicle.csv')
    if not os.path.exists(filepath):
        return jsonify({"error": "CSV file not found. Please upload vehicle.csv to data/ folder."}), 404

    df = pd.read_csv(filepath)
    factors = {'gasoline': 2.31, 'diesel': 2.68}
    df['emission'] = df.apply(
        lambda row: row['distance_km'] * factors.get(row['fuel_type'], 0),
        axis=1
    )

    result = df[['date', 'emission']]
    return jsonify(result.to_dict(orient='records'))

@app.route("/api/emissions/vehicle", methods=['GET'])
def vehicle_emissions_fastapi_converted():
    filepath = os.path.join(DATA_DIR, "vehicle.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "CSV file not found. Please upload vehicle.csv to data/ folder."}), 404

    df = pd.read_csv(filepath)
    df["탄소배출량"] = (df["주행거리"] / df["연비"]) * df["배출계수"] * df["차량수"]
    result = df.groupby("날짜")["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return jsonify(result.to_dict(orient="records"))

@app.route("/api/emissions/waste", methods=["GET"])
def waste_emissions_updated():
    filepath = os.path.join(DATA_DIR, "waste.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "waste.csv 파일이 없습니다."}), 404

    df = pd.read_csv(filepath)

    # 기본값 초기화
    df["탄소배출량"] = 0.0

    # 의료폐기물 - 매립
    mask_med_landfill = (df["종류"] == "의료폐기물") & (df["처리방식"] == "매립")
    df.loc[mask_med_landfill, "탄소배출량"] = (
        df.loc[mask_med_landfill, "MSW"] *
        df.loc[mask_med_landfill, "DOC"] *
        df.loc[mask_med_landfill, "DOCj"] *
        df.loc[mask_med_landfill, "MCF"] *
        df.loc[mask_med_landfill, "F"] *
        (16 / 12) *
        (1 - df.loc[mask_med_landfill, "R"])
    )

    # 의료폐기물 - 소각
    mask_med_inc = (df["종류"] == "의료폐기물") & (df["처리방식"] == "소각")
    df.loc[mask_med_inc, "탄소배출량"] = (
        df.loc[mask_med_inc, "MSW"] *
        df.loc[mask_med_inc, "소각배출계수"]
    )

    # 지정폐기물 (매립)
    mask_des = (df["종류"] == "지정폐기물")
    df.loc[mask_des, "탄소배출량"] = (
        df.loc[mask_des, "MSW"] *
        df.loc[mask_des, "DOC"] *
        df.loc[mask_des, "DOCj"] *
        df.loc[mask_des, "MCF"] *
        df.loc[mask_des, "F"] *
        (16 / 12) *
        (1 - df.loc[mask_des, "R"])
    )

    # 산업폐수
    mask_indus = (df["종류"] == "산업폐수")
    df.loc[mask_indus, "탄소배출량"] = (
        df.loc[mask_indus, "TOW"] *
        df.loc[mask_indus, "EF"] *
        (1 - df.loc[mask_indus, "R"])
    )

    # 날짜별 합산
    result = df.groupby("날짜")["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(4)
    return jsonify(result.to_dict(orient="records"))

@app.route("/api/emissions/waste/by-type", methods=["GET"])
def waste_emissions_by_type():
    filepath = os.path.join(DATA_DIR, "waste.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "waste.csv 파일이 없습니다."}), 404

    df = pd.read_csv(filepath)

    # 기본값 초기화
    df["탄소배출량"] = 0.0

    # 의료폐기물 - 매립
    mask_med_landfill = (df["종류"] == "의료폐기물") & (df["처리방식"] == "매립")
    df.loc[mask_med_landfill, "탄소배출량"] = (
        df.loc[mask_med_landfill, "MSW"] *
        df.loc[mask_med_landfill, "DOC"] *
        df.loc[mask_med_landfill, "DOCj"] *
        df.loc[mask_med_landfill, "MCF"] *
        df.loc[mask_med_landfill, "F"] *
        (16 / 12) *
        (1 - df.loc[mask_med_landfill, "R"])
    )

    # 의료폐기물 - 소각
    mask_med_inc = (df["종류"] == "의료폐기물") & (df["처리방식"] == "소각")
    df.loc[mask_med_inc, "탄소배출량"] = (
        df.loc[mask_med_inc, "MSW"] *
        df.loc[mask_med_inc, "소각배출계수"]
    )

    # 지정폐기물 (매립)
    mask_des = (df["종류"] == "지정폐기물")
    df.loc[mask_des, "탄소배출량"] = (
        df.loc[mask_des, "MSW"] *
        df.loc[mask_des, "DOC"] *
        df.loc[mask_des, "DOCj"] *
        df.loc[mask_des, "MCF"] *
        df.loc[mask_des, "F"] *
        (16 / 12) *
        (1 - df.loc[mask_des, "R"])
    )

    # 산업폐수
    mask_indus = (df["종류"] == "산업폐수")
    df.loc[mask_indus, "탄소배출량"] = (
        df.loc[mask_indus, "TOW"] *
        df.loc[mask_indus, "EF"] *
        (1 - df.loc[mask_indus, "R"])
    )

    # 날짜별, 종류별로 그룹화
    result = df.groupby(["날짜", "종류"])["탄소배출량"].sum().reset_index()
    result["탄소배출량"] = result["탄소배출량"].round(4)
    
    # 종류별로 분리하여 반환
    medical_data = result[result["종류"] == "의료폐기물"][["날짜", "탄소배출량"]].to_dict(orient="records")
    designated_data = result[result["종류"] == "지정폐기물"][["날짜", "탄소배출량"]].to_dict(orient="records")
    industrial_data = result[result["종류"] == "산업폐수"][["날짜", "탄소배출량"]].to_dict(orient="records")
    
    return jsonify({
        "의료폐기물": medical_data,
        "지정폐기물": designated_data,
        "산업폐수": industrial_data
    })


@app.route("/api/emissions/greenery", methods=["GET"])
def greenery_total_emissions():
    total_absorption = 0.0

    # === 면적 기반 ===
    area_path = os.path.join(DATA_DIR, "greenery_area.csv")
    if os.path.exists(area_path):
        df_area = pd.read_csv(area_path)

        def calc_area(row):
            if row["구분"] == "Land Area":
                return row["면적(m²)"] * row["carbon_uptake"] + row["면적(m²)"] * row["carbon_storage"]
            elif row["구분"] == "Tree Cover":
                return row["면적(m²)"] * row["carbon_storage"]
            return 0

        df_area["흡수량"] = df_area.apply(calc_area, axis=1)
        total_absorption += df_area["흡수량"].sum()

    # === 나무 기반 ===
    tree_path = os.path.join(DATA_DIR, "greenery_tree.csv")
    if os.path.exists(tree_path):
        df_tree = pd.read_csv(tree_path)

        df_tree["단위흡수량"] = (
            df_tree["ΔV"] * df_tree["D"] * df_tree["BEF"] *
            (1 + df_tree["R"]) * df_tree["CF"] * (44 / 12)
        )
        df_tree["총흡수량"] = df_tree["단위흡수량"] * df_tree["개체수"]
        total_absorption += df_tree["총흡수량"].sum()

    return jsonify({
        "총 탄소흡수량(tCO₂)": round(total_absorption, 4)
    })

@app.route("/api/emissions/greenery/details", methods=["GET"])
def greenery_details():
    result = {
        "summary": {"총_녹지_면적": 0, "총_수목_수": 0, "연간_탄소_저장량": 0, "연간_탄소_흡수량": 0},
        "tree_data": [],
        "area_data": []
    }

    try:
        # 나무별 총 흡수량 계산
        total_tree_absorption = 0  # 나무별 흡수량 총합
        
        tree_path = os.path.join(DATA_DIR, "greenery_tree.csv")
        if os.path.exists(tree_path):
            df_tree = pd.read_csv(tree_path)
            
            result["summary"]["총_수목_수"] = int(df_tree["개체수"].sum())
            
            # 나무별 계산 (면적 0.002ha 추가)
            for _, row in df_tree.iterrows():
                tree_name = str(row["수종명"])
                tree_count = int(row["개체수"])
                
                # 각 값 추출
                delta_v = float(row["ΔV"])
                d = float(row["D"])  
                bef = float(row["BEF"])
                r = float(row["R"])
                cf = float(row["CF"])
                
                # 수정된 계산: 면적 0.002ha 추가
                unit_absorption_per_ha = delta_v * d * bef * (1 + r) * cf * (44 / 12)
                unit_absorption_per_tree = unit_absorption_per_ha * 0.002  # 1그루당 0.002ha
                tree_total_absorption = unit_absorption_per_tree * tree_count
                
                result["tree_data"].append({
                    "수종명": tree_name,
                    "개체수": tree_count,
                    "탄소흡수량": round(tree_total_absorption, 4)
                })
                
                # 나무별 흡수량 총합에 추가
                total_tree_absorption += tree_total_absorption
                result["summary"]["연간_탄소_흡수량"] += tree_total_absorption

        # 면적 기반 데이터
        area_path = os.path.join(DATA_DIR, "greenery_area.csv")
        if os.path.exists(area_path):
            df_area = pd.read_csv(area_path)
            
            result["summary"]["총_녹지_면적"] = float(df_area["면적(m²)"].sum())
            
            for _, row in df_area.iterrows():
                if row["구분"] == "Land Area":
                    absorption = float(row["면적(m²)"]) * float(row["carbon_uptake"])
                    storage = float(row["면적(m²)"]) * float(row["carbon_storage"])
                    result["summary"]["연간_탄소_저장량"] += storage
                    result["area_data"].append({
                        "구분": "비수관면적 (땅)",
                        "흡수량": round(absorption, 2),
                        "저장량": round(storage, 2)
                    })
                elif row["구분"] == "Tree Cover":
                    storage = float(row["면적(m²)"]) * float(row["carbon_storage"])
                    result["summary"]["연간_탄소_저장량"] += storage
                    
                    # 수관면적의 흡수량을 나무별 흡수량 총합으로 교체
                    result["area_data"].append({
                        "구분": "수관면적 (나무)",
                        "흡수량": round(total_tree_absorption, 2),  # 나무별 총합 사용
                        "저장량": round(storage, 2)
                    })

        # 반올림
        result["summary"]["총_녹지_면적"] = round(result["summary"]["총_녹지_면적"], 0)
        result["summary"]["연간_탄소_저장량"] = round(result["summary"]["연간_탄소_저장량"], 2)
        result["summary"]["연간_탄소_흡수량"] = round(result["summary"]["연간_탄소_흡수량"], 4)

        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"데이터 처리 중 오류: {str(e)}"}), 500
    
@app.route("/api/emissions/water", methods=["GET"])
def water_emissions():
    filepath = os.path.join(DATA_DIR, "water.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "CSV file not found."}), 404

    df = pd.read_csv(filepath)

    # 탄소배출량 계산
    df["탄소배출량"] = df["총량"] * df["전력원단위"] * df["배출계수"]

    result = df[["날짜", "탄소배출량"]].copy()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return jsonify(result.to_dict(orient="records"))

@app.route("/api/emissions/electric", methods=["GET"])
def electric_emissions():
    filepath = os.path.join(DATA_DIR, "electric.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "electric.csv not found."}), 404

    df = pd.read_csv(filepath)

    df["탄소배출량"] = df["총 사용 전력량"] * df["배출계수"]
    result = df[["날짜", "탄소배출량"]].copy()
    result["탄소배출량"] = result["탄소배출량"].round(2)
    return jsonify(result.to_dict(orient="records"))

@app.route("/api/emissions/electric/detailed", methods=["GET"])
def electric_emissions_detailed():
    filepath = os.path.join(DATA_DIR, "electric.csv")
    if not os.path.exists(filepath):
        return jsonify({"error": "electric.csv not found."}), 404

    try:
        df = pd.read_csv(filepath)
        
        # 데이터 구조 확인을 위한 로그
        print("CSV columns:", df.columns.tolist())
        print("CSV shape:", df.shape)
        print("First row:", df.iloc[0].to_dict() if len(df) > 0 else "No data")
        
        # 탄소배출량 계산 (배출계수가 있는 경우)
        if '배출계수' in df.columns:
            df["탄소배출량"] = df["총 사용 전력량"] * df["배출계수"]
        else:
            # 기본 배출계수 사용 (0.4541 tCO2/MWh)
            df["탄소배출량"] = df["총 사용 전력량"] * 0.4541
        
        # 전체 데이터를 JSON으로 반환
        result = df.to_dict(orient="records")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in electric_emissions_detailed: {str(e)}")
        return jsonify({"error": f"데이터 처리 중 오류가 발생했습니다: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5173)