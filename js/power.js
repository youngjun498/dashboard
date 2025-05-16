// API 엔드포인트
const API_BASE_URL = 'http://localhost:8000/api/power';

// 건물 위치 정보 (실제 건물 배치에 맞게 수정 필요)
const buildingPositions = {
    '': { x: 10, y: 10, width: 100, height: 60 },
    '건축관': { x: 120, y: 10, width: 120, height: 80 },
    '공학1관': { x: 80, y: 10, width: 100, height: 70 },
    '대학극장': { x: 10, y: 80, width: 90, height: 65 },
    '동원장보고관': { x: 110, y: 100, width: 140, height: 90 },
    '복합교육센터': { x: 260, y: 90, width: 80, height: 50 }
};

// 현재 선택된 월
let currentDate = new Date();

// 히트맵 초기화
async function initHeatmap() {
    const heatmap = document.getElementById('buildingHeatmap');
    const tooltip = document.getElementById('tooltip');

    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const response = await fetch(`${API_BASE_URL}/buildings/${year}/${month}`);
        const buildings = await response.json();

        // 디버깅: API에서 받은 데이터 확인
        console.log("API에서 받은 건물 데이터:", buildings);

        heatmap.innerHTML = '';

        buildings.forEach(building => {
            const position = buildingPositions[building.name];
            // 디버깅: 각 건물명과 position 확인
            console.log(`건물명: ${building.name}, position:`, position);

            if (!position) {
                console.warn(`buildingPositions에 없는 건물: ${building.name}`);
                return;
            }

            const buildingElement = document.createElement('div');
            buildingElement.className = 'building';
            buildingElement.style.left = `${position.x}px`;
            buildingElement.style.top = `${position.y}px`;
            buildingElement.style.width = `${position.width}px`;
            buildingElement.style.height = `${position.height}px`;

            const emissionClass = getEmissionClass(building.emission);
            buildingElement.classList.add(emissionClass);

            buildingElement.addEventListener('mouseenter', (e) => {
                tooltip.style.opacity = '1';
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
                document.getElementById('tooltipTitle').textContent = building.name;
                document.getElementById('tooltipContent').textContent = 
                    `탄소 배출량: ${building.emission} kg CO₂`;
            });

            buildingElement.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });

            buildingElement.addEventListener('mousemove', (e) => {
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
            });

            heatmap.appendChild(buildingElement);
        });
    } catch (error) {
        console.error('Error loading building data:', error);
    }
}

// 배출량에 따른 색상 클래스 반환
function getEmissionClass(emission) {
    if (emission < 20) return 'emission-low';
    if (emission < 30) return 'emission-medium';
    return 'emission-high';
}

// 월 선택기 이벤트 처리
function initMonthSelector() {
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    const monthDisplay = document.getElementById('currentMonth');

    function updateMonthDisplay() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        monthDisplay.textContent = `${year}년 ${month}월`;
    }

    prevButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateMonthDisplay();
        updateData();
    });

    nextButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateMonthDisplay();
        updateData();
    });

    updateMonthDisplay();
}

// 차트 초기화
async function initChart() {
    const ctx = document.getElementById('powerChart').getContext('2d');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    try {
        const response = await fetch(`${API_BASE_URL}/statistics/${year}/${month}`);
        const data = await response.json();

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.monthly_trend.map(item => `${item.month}월`),
                datasets: [{
                    label: '전력 탄소 배출량 (kg CO₂)',
                    data: data.monthly_trend.map(item => item.emission),
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: '월별 전력 탄소 배출량 추이'
                    }
                }
            }
        });

        // 통계 정보 업데이트
        document.querySelector('.stat-box:nth-child(1) div:last-child').innerHTML = 
            `${data.total_emission} <span style="font-size:1rem;">kg CO₂</span>`;
        document.querySelector('.stat-box:nth-child(2) div:last-child').innerHTML = 
            `${data.saving_rate}%`;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// 데이터 업데이트
async function updateData() {
    await initHeatmap();
    await initChart();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMonthSelector();
    updateData();
}); 