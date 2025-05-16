# carbon-dashboard 프로젝트 구조 및 페이지 연결성

## 📁 디렉토리 구조

```
carbon-dashboard/
│
├── index.html              # 메인 대시보드(홈)
├── vehicle.html            # 차량 관련 대시보드
├── waste.html              # 폐기물 관련 대시보드
├── water.html              # 수자원 관련 대시보드
├── greenery.html           # 녹지 관련 대시보드
│
├── css/
│   └── style.css           # 공통 스타일시트
│
├── js/
│   └── charts.js           # 차트 및 시각화 스크립트
│
└── assets/
    └── img/                # 이미지, 아이콘 등 정적 리소스
```

## 🔗 페이지 연결성
- 모든 HTML 파일(예: `index.html`, `vehicle.html` 등)은 **사이드바 메뉴**를 동일하게 포함합니다.
- 각 메뉴는 `<a href="vehicle.html">차량</a>`처럼 **다른 페이지로 이동**할 수 있도록 연결되어 있습니다.
- 현재 위치한 페이지의 메뉴에는 `class="active"`를 추가하여 시각적으로 구분합니다.
- 예시(사이드바):

```html
<aside class="sidebar">
  <h2>탄소 대시보드</h2>
  <nav>
    <ul>
      <li><a href="index.html" class="active">홈</a></li>
      <li><a href="vehicle.html">차량</a></li>
      <li><a href="waste.html">폐기물</a></li>
      <li><a href="water.html">수자원</a></li>
      <li><a href="greenery.html">녹지</a></li>
    </ul>
  </nav>
</aside>
```

- 각 페이지는 독립적으로 열리며, Live Server 등 정적 서버 환경에서 정상적으로 이동 및 표시됩니다.

## 📝 기타
- 정적 구조이므로 서버 없이도 동작하지만, fetch 등 일부 JS 기능은 Live Server 환경에서만 정상 동작할 수 있습니다.
- 추후 확장 시, `data/` 폴더에 JSON 파일을 두고 JS에서 불러오는 구조로 발전시킬 수 있습니다. 