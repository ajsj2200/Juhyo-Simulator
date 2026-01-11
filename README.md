# 주효 인생 시뮬레이터
세후 월급·생활비를 넣고 결혼/주택/대출/은퇴/대공황 시나리오까지 한 번에 돌려보는 자산 시뮬레이터입니다. 로그 스케일, 집 포함/제외, 실질가치 전환, 몬테카를로 분포까지 UI로 제공합니다.

## 다운로드
- Windows portable exe: (여기에 릴리즈 링크를 추가하세요)

## 주요 기능
- 본인/비교 대상/배우자 입력: 세후 월급, 생활비, 초기 자산, 투자액 스케줄.
- 결혼/주택: 대출 방식(원리금균등·원금균등·체증식), 중도상환, 집 가치/대출 잔액 표시.
- 은퇴: 4% 룰, JEPQ/VOO 배분, 인플레이션 반영.
- 이벤트/차트: 대공황 구간 음영, 로그 스케일, 집 포함/제외 토글.
- 몬테카를로: S&P500 과거 연도별 수익률을 셔플해 퍼센타일·분포 차트 표시.
- 대출 계산기: 명목/실질 상환액 라인 차트.

## 설치 및 실행 (소스)
```bash
git clone <repo-url>
cd voo-app
npm install
```

### 웹 개발 서버
```bash
npm run dev
```
→ http://localhost:5173

### 린트
```bash
npm run lint
```

## Electron
- 개발
  ```bash
  npm run dev:electron
  ```
- 빌드 (Windows portable exe)
  ```bash
  npm run build:app
  ```
  - 결과물: `release/` 폴더
  - 아이콘 사용 시 `build/icon.ico` 추가

## 주요 파일
- `src/InvestmentCalculator.jsx`: 메인 UI
- `src/utils/calculations.js`: 계산 로직
- `electron/main.js`: Electron 엔트리
