// 폐기물 데이터 처리 및 차트 초기화를 위한 클래스
class WasteDashboard {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        // IndexedDB 초기화
        await this.initDatabase();
        // 차트 초기화
        this.initCharts();
        // 이벤트 리스너 설정
        this.setupEventListeners();
        // 초기 데이터 로드
        await this.loadData();
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

    async loadCSVData(csvFile) {
        const response = await fetch(csvFile);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); // 헤더 제외
        
        const transaction = this.db.transaction(['wasteData'], 'readwrite');
        const store = transaction.objectStore('wasteData');

        for (const row of rows) {
            if (!row.trim()) continue;
            
            const [date, type, amount] = row.split(',');
            const wasteData = {
                date: new Date(date),
                type: type.trim(),
                amount: parseFloat(amount),
                carbonEmission: this.calculateCarbonEmission(type.trim(), parseFloat(amount))
            };

            await store.add(wasteData);
        }
    }

    calculateCarbonEmission(type, amount) {
        // 폐기물 유형별 탄소배출계수 (kg CO2/kg)
        const emissionFactors = {
            '의료폐기물': 2.5,
            '지정폐기물': 1.8,
            '산업폐수': 0.5
        };

        return amount * (emissionFactors[type] || 1.0);
    }

    async getMonthlyData(type, year) {
        const transaction = this.db.transaction(['wasteData'], 'readonly');
        const store = transaction.objectStore('wasteData');
        const index = store.index('typeDate');

        const monthlyData = new Array(12).fill(0);
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.bound(
                [type, new Date(year, 0, 1)],
                [type, new Date(year, 11, 31)]
            ));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const data = cursor.value;
                    const month = data.date.getMonth();
                    monthlyData[month] += data.carbonEmission;
                    cursor.continue();
                } else {
                    resolve(monthlyData);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    initCharts() {
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
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'tCO₂eq'
                            }
                        }
                    }
                }
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
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'tCO₂eq'
                            }
                        }
                    }
                }
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
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'tCO₂eq'
                            }
                        }
                    }
                }
            }
        );
    }

    setupEventListeners() {
        // 연도 선택 이벤트
        document.getElementById('yearSelector').addEventListener('change', async (e) => {
            await this.loadData(e.target.value);
        });

        // 보고서 다운로드 이벤트
        document.querySelector('button').addEventListener('click', () => {
            this.downloadReport();
        });
    }

    async loadData(year = new Date().getFullYear()) {
        try {
            // 각 폐기물 유형별 데이터 로드
            const medicalData = await this.getMonthlyData('의료폐기물', year);
            const designatedData = await this.getMonthlyData('지정폐기물', year);
            const industrialData = await this.getMonthlyData('산업폐수', year);

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
        chart.data.datasets[0].data = data;
        chart.update();
    }

    updateSummary(medicalData, designatedData, industrialData) {
        const totalWaste = [...medicalData, ...designatedData, ...industrialData]
            .reduce((sum, val) => sum + val, 0);
        
        const totalCarbon = totalWaste / 1000; // kg to ton

        // 요약 카드 업데이트
        document.querySelector('.summary-card:nth-child(1) h3').textContent = 
            `${totalWaste.toFixed(1)} kg`;
        document.querySelector('.summary-card:nth-child(2) h3').textContent = 
            `${totalCarbon.toFixed(2)} tCO₂eq`;
    }

    async downloadReport() {
        const year = document.getElementById('yearSelector').value;
        const data = {
            year,
            medical: await this.getMonthlyData('의료폐기물', year),
            designated: await this.getMonthlyData('지정폐기물', year),
            industrial: await this.getMonthlyData('산업폐수', year)
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
}

// 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new WasteDashboard();
});