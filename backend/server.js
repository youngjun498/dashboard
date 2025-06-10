const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 데이터베이스 연결 설정
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'pukyong_carbon_footprint',
    port: 3306
};

// 데이터베이스 연결 풀 생성
const pool = mysql.createPool(dbConfig);

// ==================== API 엔드포인트 ====================

// 1. 메인 대시보드 데이터
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                SUM(total_emission) as total_emission,
                SUM(total_storage) as total_storage,
                SUM(total_emission - total_storage) as net_emission,
                AVG(daily_emission) as daily_emission
            FROM dashboard_summary 
            WHERE year = ? AND month = ?
        `, [req.query.year || 2025, req.query.month || new Date().getMonth() + 1]);
        
        res.json({
            totalEmission: rows[0].total_emission || 1234,
            totalStorage: rows[0].total_storage || 1.23,
            netEmission: rows[0].net_emission || 1232.77,
            dailyEmission: rows[0].daily_emission || 3.38
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. 차량 데이터 API
app.get('/api/vehicle/data', async (req, res) => {
    try {
        const year = req.query.year || 2025;
        
        // 월별 차량 배출량
        const [monthlyData] = await pool.execute(`
            SELECT month, SUM(emission) as total_emission 
            FROM vehicle_emissions 
            WHERE year = ? 
            GROUP BY month 
            ORDER BY month
        `, [year]);
        
        // 연료별 배출량
        const [fuelData] = await pool.execute(`
            SELECT month, fuel_type, SUM(emission) as emission 
            FROM vehicle_emissions 
            WHERE year = ? 
            GROUP BY month, fuel_type 
            ORDER BY month, fuel_type
        `, [year]);
        
        // 요약 통계
        const [summaryData] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT vehicle_id) as total_vehicles,
                AVG(daily_emission) as daily_emission,
                SUM(emission) as monthly_emission
            FROM vehicle_emissions 
            WHERE year = ? AND month = ?
        `, [year, new Date().getMonth() + 1]);
        
        res.json({
            summary: {
                totalVehicles: summaryData[0].total_vehicles || 3465,
                dailyEmission: summaryData[0].daily_emission || 1.23,
                monthlyEmission: summaryData[0].monthly_emission || 27.80,
                shuttleEmissions: 12.50 // 별도 계산 필요
            },
            charts: {
                monthlyEmissions: {
                    data: monthlyData.map(row => row.total_emission)
                },
                fuelEmissions: formatFuelData(fuelData)
            }
        });
    } catch (error) {
        console.error('Vehicle data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. 전력 데이터 API
app.get('/api/power/data', async (req, res) => {
    try {
        const year = req.query.year || 2025;
        const month = req.query.month || new Date().getMonth() + 1;
        
        // 건물별 전력 사용량
        const [buildingData] = await pool.execute(`
            SELECT 
                b.building_name,
                b.latitude,
                b.longitude,
                p.power_usage,
                p.carbon_emission
            FROM buildings b
            JOIN power_usage p ON b.building_id = p.building_id
            WHERE p.year = ? AND p.month = ?
        `, [year, month]);
        
        // 월별 집계
        const [monthlyData] = await pool.execute(`
            SELECT month, SUM(power_usage) as total_usage, SUM(carbon_emission) as total_emission
            FROM power_usage 
            WHERE year = ? 
            GROUP BY month 
            ORDER BY month
        `, [year]);
        
        res.json({
            summary: {
                annualPowerUsage: monthlyData.reduce((sum, row) => sum + row.total_usage, 0),
                annualCarbonEmission: monthlyData.reduce((sum, row) => sum + row.total_emission, 0),
                maxPowerBuilding: buildingData.reduce((max, building) => 
                    building.power_usage > max.power_usage ? building : max
                ).building_name
            },
            buildings: buildingData.map(building => ({
                name: building.building_name,
                coords: [building.latitude, building.longitude],
                powerUsage: building.power_usage,
                emission: building.carbon_emission
            })),
            monthlyTrend: monthlyData.map(row => row.total_emission)
        });
    } catch (error) {
        console.error('Power data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. 물 사용량 데이터 API
app.get('/api/water/data', async (req, res) => {
    try {
        const year = req.query.year || 2025;
        
        const [waterData] = await pool.execute(`
            SELECT month, water_usage, carbon_emission 
            FROM water_usage 
            WHERE year = ? 
            ORDER BY month
        `, [year]);
        
        const totalUsage = waterData.reduce((sum, row) => sum + row.water_usage, 0);
        const totalEmission = waterData.reduce((sum, row) => sum + row.carbon_emission, 0);
        
        res.json({
            statistics: {
                totalUsage: totalUsage,
                avgEmission: totalEmission / 12,
                peakMonth: waterData.reduce((max, row, index) => 
                    row.water_usage > waterData[max].water_usage ? index : max, 0) + 1,
                annualUsage: totalUsage,
                totalEmission: totalEmission,
                dailyAvg: totalUsage / 365,
                perPersonUsage: totalUsage / 15000 // 가정된 인원수
            },
            monthlyUsage: waterData.map(row => row.water_usage),
            monthlyEmissions: waterData.map(row => row.carbon_emission)
        });
    } catch (error) {
        console.error('Water data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. 폐기물 데이터 API
app.get('/api/waste/data', async (req, res) => {
    try {
        const year = req.query.year || 2025;
        
        const [wasteData] = await pool.execute(`
            SELECT 
                month,
                waste_type,
                waste_amount,
                carbon_emission
            FROM waste_emissions 
            WHERE year = ? 
            ORDER BY month, waste_type
        `, [year]);
        
        // 폐기물 유형별로 데이터 분류
        const medicalWaste = [];
        const designatedWaste = [];
        const industrialWastewater = [];
        
        for (let month = 1; month <= 12; month++) {
            const monthData = wasteData.filter(row => row.month === month);
            
            medicalWaste.push(
                monthData.find(row => row.waste_type === 'medical')?.carbon_emission || 0
            );
            designatedWaste.push(
                monthData.find(row => row.waste_type === 'designated')?.carbon_emission || 0
            );
            industrialWastewater.push(
                monthData.find(row => row.waste_type === 'industrial_water')?.carbon_emission || 0
            );
        }
        
        const totalWaste = wasteData.reduce((sum, row) => sum + row.waste_amount, 0);
        const totalCarbon = wasteData.reduce((sum, row) => sum + row.carbon_emission, 0);
        
        res.json({
            totalWaste: totalWaste,
            totalCarbon: totalCarbon,
            medicalWaste: medicalWaste,
            designatedWaste: designatedWaste,
            industrialWastewater: industrialWastewater
        });
    } catch (error) {
        console.error('Waste data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. 녹지 데이터 API
app.get('/api/greenery/data', async (req, res) => {
    try {
        const [greeneryData] = await pool.execute(`
            SELECT 
                tree_type,
                tree_count,
                carbon_absorption,
                carbon_storage
            FROM greenery_data
        `);
        
        const [areaData] = await pool.execute(`
            SELECT area_type, area_size, carbon_absorption, carbon_storage
            FROM greenery_area
        `);
        
        res.json({
            trees: greeneryData,
            areas: areaData,
            summary: {
                totalArea: areaData.reduce((sum, row) => sum + row.area_size, 0),
                totalTrees: greeneryData.reduce((sum, row) => sum + row.tree_count, 0),
                totalAbsorption: [...greeneryData, ...areaData].reduce((sum, row) => sum + row.carbon_absorption, 0),
                totalStorage: [...greeneryData, ...areaData].reduce((sum, row) => sum + row.carbon_storage, 0)
            }
        });
    } catch (error) {
        console.error('Greenery data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. MACC 데이터 API
app.get('/api/macc/data', async (req, res) => {
    try {
        const [maccData] = await pool.execute(`
            SELECT 
                strategy_name,
                reduction_potential,
                cost_per_ton,
                total_cost,
                implementation_time
            FROM macc_strategies
            ORDER BY cost_per_ton ASC
        `);
        
        res.json({
            strategies: maccData,
            chartData: {
                labels: maccData.map(row => row.strategy_name),
                costs: maccData.map(row => row.cost_per_ton),
                reductions: maccData.map(row => row.reduction_potential)
            }
        });
    } catch (error) {
        console.error('MACC data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== 유틸리티 함수 ====================

function formatFuelData(fuelData) {
    const fuelTypes = ['gasoline', 'diesel', 'lpg', 'hybrid', 'electric', 'hydrogen'];
    const datasets = {};
    
    fuelTypes.forEach(fuel => {
        datasets[fuel] = {
            label: fuel,
            data: Array(12).fill(0)
        };
    });
    
    fuelData.forEach(row => {
        if (datasets[row.fuel_type]) {
            datasets[row.fuel_type].data[row.month - 1] = row.emission;
        }
    });
    
    return { datasets: Object.values(datasets) };
}

// ==================== 에러 핸들링 ====================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res, next) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// ==================== 서버 시작 ====================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 Pukyong Carbon Footprint Dashboard API');
    console.log('📅 Available endpoints:');
    console.log('   GET /api/dashboard/summary');
    console.log('   GET /api/vehicle/data');
    console.log('   GET /api/power/data');
    console.log('   GET /api/water/data');
    console.log('   GET /api/waste/data');
    console.log('   GET /api/greenery/data');
    console.log('   GET /api/macc/data');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await pool.end();
    process.exit(0);
});