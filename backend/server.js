const express = require('express');
const cors = require('cors');
const path = require('path');
const wasteRoutes = require('./routes/waste');

const app = express();
const PORT = 3000;

// CORS 설정 - 모든 origin 허용
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (image.png 등)
app.use('/data', express.static(path.join(__dirname, 'data')));

// API 라우트
app.use('/api/waste', wasteRoutes);

// 프론트엔드 파일 제공
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행중입니다.`);
});