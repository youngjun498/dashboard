// API 엔드포인트
const API_BASE_URL = 'http://localhost:8000/api';

// API 호출 함수
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}
// API에서 데이터 받아오기
async function drawGreeneryStackedBar() {
    const response = await fetch('http://localhost:8000/api/greenery/statistics');
    const data = await response.json();

    // 스택형 막대차트 데이터 구성
    const labels = ['per land area', 'per tree cover'];
    const uptakeData = [
        data.uptake.per_land_area,
        data.uptake.per_tree_cover.reduce((sum, t) => sum + t.total, 0)
    ];
    const storageData = [
        data.storage.per_land_area,
        data.storage.per_tree_cover
    ];

    const ctx = document.getElementById('greeneryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '탄소 흡수량 (ton)',
                    data: uptakeData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)'
                },
                {
                    label: '탄소 저장량 (ton)',
                    data: storageData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '흡수량 vs 저장량 (스택형 막대차트)' }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, title: { display: true, text: '톤(ton)' } }
            }
        }
    });
}

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('greeneryChart')) {
        drawGreeneryStackedBar();
    }
});

// 차트 데이터 정의
const chartData = {
    vehicle: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        datasets: [{
            label: '차량 탄소 배출량 (kg CO₂)',
            data: [65, 59, 80, 81, 56, 55],
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    },
    waste: {
        labels: ['일반폐기물', '재활용폐기물', '음식물폐기물', '건설폐기물'],
        datasets: [{
            label: '폐기물 유형별 배출량 (kg CO₂)',
            data: [30, 25, 20, 15],
            backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)'
            ]
        }]
    },
    water: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        datasets: [{
            label: '수자원 탄소 배출량 (kg CO₂)',
            data: [45, 42, 38, 35, 40, 38],
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            tension: 0.1
        }]
    },
    greenery: {
        labels: ['소나무', '단풍나무', '벚나무', '은행나무'],
        datasets: [{
            label: '식물 종류별 탄소 흡수량 (kg CO₂)',
            data: [-12, -8, -10, -9],
            backgroundColor: [
                'rgb(34, 139, 34)',
                'rgb(154, 205, 50)',
                'rgb(144, 238, 144)',
                'rgb(60, 179, 113)'
            ]
        }]
    }
};

// 차트 설정
const chartConfig = {
    vehicle: {
        type: 'line',
        data: chartData.vehicle,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '월별 차량 탄소 배출량 추이' }
            }
        }
    },
    waste: {
        type: 'pie',
        data: chartData.waste,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                title: { display: true, text: '폐기물 유형별 배출량' }
            }
        }
    },
    water: {
        type: 'line',
        data: chartData.water,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '월별 수자원 탄소 배출량 추이' }
            }
        }
    },
    greenery: {
        type: 'bar',
        data: chartData.greenery,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '식물 종류별 탄소 흡수량' }
            }
        }
    }
};

// 차트 생성
document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');
    
    if (page === 'index') {
        // 메인 페이지 차트
        const ctx = document.createElement('canvas');
        const chartContainer = document.querySelector('.card:nth-child(3)');
        chartContainer.innerHTML = '';
        chartContainer.appendChild(ctx);
        
        // API에서 데이터 가져오기
        const data = await fetchData('vehicle/statistics');
        if (data) {
            chartData.vehicle.datasets[0].data = data.monthly_trend.map(item => item.emission);
        }
        
        new Chart(ctx, chartConfig.vehicle);
    } else if (page in chartConfig) {
        // 각 페이지별 차트
        const ctx = document.getElementById(page + 'Chart');
        if (ctx) {
            // API에서 데이터 가져오기
            const data = await fetchData(`${page}/statistics`);
            if (data) {
                // 데이터에 따라 차트 업데이트
                updateChartData(page, data);
            }
            
            new Chart(ctx, chartConfig[page]);
        }
    }
});

// 차트 데이터 업데이트 함수
function updateChartData(page, data) {
    switch(page) {
        case 'vehicle':
            chartData.vehicle.datasets[0].data = data.monthly_trend.map(item => item.emission);
            break;
        case 'waste':
            chartData.waste.datasets[0].data = Object.values(data.emission_by_type);
            chartData.waste.labels = Object.keys(data.emission_by_type);
            break;
        case 'water':
            chartData.water.datasets[0].data = data.monthly_trend.map(item => item.emission);
            break;
        case 'greenery':
            chartData.greenery.datasets[0].data = Object.values(data.absorption_by_type);
            chartData.greenery.labels = Object.keys(data.absorption_by_type);
            break;
    }
} 