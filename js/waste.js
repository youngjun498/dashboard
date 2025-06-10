// 폐기물 데이터 처리 및 차트 초기화를 위한 클래스
class WasteDashboard {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // IndexedDB 초기화
            await this.initDatabase();
            // 차트 초기화
            this.initCharts();
            // 이벤트 리스너 설정
            this.setupEventListeners();
            // CSV 데이터 로드
            await this.loadCSVData('backend/data/waste.csv');
            // 초기 데이터 로드
            await this.loadData();
        } catch (error) {
            console.error('초기화 중 오류 발생:', error);
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WasteDashboardDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 폐기물 데이터 스토어 생성
                const wasteStore = db.createObjectStore('wasteData', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                wasteStore.createIndex('type', 'type', { unique: false });
                wasteStore.createIndex('date', 'date', { unique: false });
                wasteStore.createIndex('typeDate', ['type', 'date'], { unique: false });
            };
        });
    }

    async loadCSVData(csvPath) {
        try {
            const response = await fetch(csvPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const lines = csvText.split('\n');
            
            if (lines.length < 2) {
                throw new Error('CSV 파일이 비어있거나 형식이 잘못되었습니다.');
            }

            // 헤더 라인 건너뛰기
            const headers = lines[1].split(',').map(h => h.trim());
            const wasteTypes = headers.slice(1); // 첫 번째 열(날짜) 제외
            
            // 데이터 처리
            const data = [];
            for (let i = 2; i < lines.length - 1; i++) { // 마지막 총량 행 제외
                const values = lines[i].split(',');
                if (values.length < 2) continue; // 빈 줄 건너뛰기
                
                const month = values[0].trim();
                
                wasteTypes.forEach((type, index) => {
                    const amount = parseFloat(values[index + 1].replace(/"/g, '').replace(/,/g, ''));
                    if (!isNaN(amount)) {
                        data.push({
                            date: month,
                            type: type,
                            amount: amount,
                            carbonEmission: this.calculateCarbonEmission(type, amount)
                        });
                    }
                });
            }
            
            // 데이터베이스에 저장
            const db = await this.db;
            const tx = db.transaction('wasteData', 'readwrite');
            const store = tx.objectStore('wasteData');
            
            // 기존 데이터 삭제
            await store.clear();
            
            // 새 데이터 추가
            for (const item of data) {
                await store.add(item);
            }
            
            console.log('CSV 데이터 로드 완료:', data.length, '개의 레코드');
        } catch (error) {
            console.error('CSV 데이터 로드 실패:', error);
            // 에러 발생 시 빈 데이터로 차트 초기화
            this.updateChart(this.medicalWasteChart, new Array(12).fill(0));
            this.updateChart(this.designatedWasteChart, new Array(12).fill(0));
            this.updateChart(this.industrialWastewaterChart, new Array(12).fill(0));
        }
    }

    calculateCarbonEmission(type, amount) {
        // 폐기물 유형별 탄소배출계수 (kg CO2/kg)
        const emissionFactors = {
            '의료폐기물': 2.5,
            '지정폐기물': 1.8,
            '산업폐수': 0.5,
           
        };

        return amount * (emissionFactors[type] || 1.0);
    }

    async getMonthlyData(type) {
        const transaction = this.db.transaction(['wasteData'], 'readonly');
        const store = transaction.objectStore('wasteData');
        const index = store.index('type');

        const monthlyData = new Array(12).fill(0);
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(type));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const data = cursor.value;
                    // 월 추출 (예: "Jan-25" -> 0)
                    const monthStr = data.date.split('-')[0];
                    const monthMap = {
                        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                    };
                    const month = monthMap[monthStr];
                    if (month !== undefined) {
                         // 해당 월의 탄소배출량을 저장 (kgCO₂eq)
                        monthlyData[month] = data.carbonEmission;
                    }
                    cursor.continue();
                } else {
                    resolve(monthlyData); // kgCO₂eq 단위의 월별 데이터 반환
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    initCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'tCO₂eq'
                    },
                     ticks: { // y축 라벨 단위를 tCO₂eq로 표시
                        callback: function(value, index, values) {
                            return value.toFixed(2) + ' tCO₂eq';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        };

        // 의료 폐기물 차트
        this.medicalWasteChart = new Chart(
            document.getElementById('medicalWasteChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    datasets: [{
                        label: '월별 탄소배출량 (tCO₂eq)',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6'
                    }]
                },
                options: chartOptions
            }
        );

        // 지정 폐기물 차트
        this.designatedWasteChart = new Chart(
            document.getElementById('designatedWasteChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    datasets: [{
                        label: '월별 탄소배출량 (tCO₂eq)',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: chartOptions
            }
        );

        // 산업 폐수 차트
        this.industrialWastewaterChart = new Chart(
            document.getElementById('industrialWastewaterChart').getContext('2d'),
            {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    datasets: [{
                        label: '월별 탄소배출량 (tCO₂eq)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#f59e0b'
                    }]
                },
                options: chartOptions
            }
        );
    }

    setupEventListeners() {
        // 연도 선택 이벤트
        const yearSelector = document.getElementById('yearSelector');
        if (yearSelector) {
            yearSelector.addEventListener('change', async (e) => {
                await this.loadData(e.target.value);
            });
        }

        // 보고서 다운로드 이벤트
        const downloadButton = document.querySelector('button');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => {
                this.downloadReport();
            });
        }
    }

    async loadData(year = new Date().getFullYear()) {
        try {
            // 모든 폐기물 데이터를 가져옴
            const allWasteData = await this.getAllWasteData();
            
            // 선택된 연도의 데이터만 필터링
            const yearFilteredData = allWasteData.filter(data => {
                 const dataYear = parseInt(data.date.split('-')[1]) + 2000; // '25' -> 2025
                 return dataYear === parseInt(year);
            });

            // 폐기물 유형별로 데이터 분리 및 월별 합산
            const medicalData = new Array(12).fill(0);
            const designatedData = new Array(12).fill(0);
            const industrialData = new Array(12).fill(0);

            const monthMap = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };

            yearFilteredData.forEach(data => {
                const monthStr = data.date.split('-')[0];
                const month = monthMap[monthStr];
                if (month !== undefined) {
                    if (data.type === '의료폐기물') {
                        medicalData[month] = data.carbonEmission; // kgCO₂eq
                    } else if (data.type === '지정폐기물') {
                        designatedData[month] = data.carbonEmission; // kgCO₂eq
                    } else if (data.type === '폐수') {
                        industrialData[month] = data.carbonEmission; // kgCO₂eq
                    }
                }
            });
            
            // 차트 업데이트
            this.updateChart(this.medicalWasteChart, medicalData);
            this.updateChart(this.designatedWasteChart, designatedData);
            this.updateChart(this.industrialWastewaterChart, industrialData);

            // 요약 통계 업데이트
            this.updateSummary(medicalData, designatedData, industrialData);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        }
    }

    updateChart(chart, data) {
        // 데이터를 tCO₂eq로 변환하여 차트에 전달
        chart.data.datasets[0].data = data.map(val => val / 1000);
        chart.update();
    }

    updateSummary(medicalData, designatedData, industrialData) {
        // getMonthlyData에서 반환된 kgCO₂eq 단위 데이터를 합산
        const totalWasteKg = [...medicalData, ...designatedData, ...industrialData]
            .reduce((sum, val) => sum + val, 0);
        
        const totalCarbonTon = totalWasteKg / 1000; // kgCO₂eq to tCO₂eq

        // 요약 카드 업데이트
        document.querySelector('.summary-card:nth-child(1) h3').textContent = 
            `${totalWasteKg.toFixed(1)} kg`;
        document.querySelector('.summary-card:nth-child(2) h3').textContent = 
            `${totalCarbonTon.toFixed(2)} tCO₂eq`;
    }

    async downloadReport() {
        const year = document.getElementById('yearSelector').value;
        const data = {
            year,
            medical: await this.getMonthlyData('의료폐기물'),
            designated: await this.getMonthlyData('지정폐기물'),
            industrial: await this.getMonthlyData('산업폐수')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waste-report-${year}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async getAllWasteData() {
        const transaction = this.db.transaction(['wasteData'], 'readonly');
        const store = transaction.objectStore('wasteData');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new WasteDashboard();
}); 