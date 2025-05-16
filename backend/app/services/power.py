import pandas as pd

class PowerService:
    def __init__(self):
        self.excel_path = "data/power_consumption.xlsx"
        self.data = None
        self.load_data()

    def load_data(self):
        try:
            # 전체 데이터 읽기
            df = pd.read_excel(self.excel_path)
            # M열(건물명)~Y열(12월)만 추출
            df = df.loc[:, df.columns[12:]]
            df = df.rename(columns={df.columns[0]: "건물"})
            df = df.dropna(subset=["건물"])
            df.set_index("건물", inplace=True)
            # 컬럼명에서 '1월', '2월'...로 되어 있으면 숫자만 추출
            df.columns = [int(str(col).replace('월', '').strip()) for col in df.columns]
            self.data = df
            print("엑셀 데이터 로드 성공:", self.data.head())
        except Exception as e:
            print(f"Error loading data: {e}")
            self.data = pd.DataFrame()

    def get_building_emissions(self, year: int, month: int):
        if self.data is None or self.data.empty:
            print("데이터 없음")
            return []
        building_emissions = []
        for building in self.data.index:
            try:
                power_consumption = self.data.loc[building, month]
                total_emission = power_consumption * 0.5  # 예시 변환식
                building_emissions.append({
                    'id': len(building_emissions) + 1,
                    'name': building,
                    'emission': round(total_emission, 2)
                })
            except Exception as e:
                print(f"{building} 데이터 없음: {e}")
        print("API 반환 데이터:", building_emissions)
        return building_emissions