# AGENTS Guide

## 개요
- 주효 인생 시뮬레이터: 세후 월급/생활비 기반 자산 시뮬레이터. 결혼·주택·대출·은퇴·대공황·히스토리컬 시나리오와 몬테카를로 분포를 멀티뷰 인터페이스로 제공합니다.
- UI/텍스트는 한국어, 금액 입력 단위는 `만원`, 차트/복사본은 주로 `억원`.
- 멀티뷰 아키텍처: 사이드바/모바일 네비게이션으로 대시보드/결과/프로필/포트폴리오/몬테카를로/위기/대출/프리셋/자산추적 등 12개 뷰 전환.

## 스택 & 스크립트
- React 19 + Vite, Tailwind CSS v4(@import만 사용), Recharts, Plotly(일부 3D).
- npm scripts:
  - `npm run dev` (웹 개발 서버)
  - `npm run dev:electron` (Vite + Electron 동시 실행)
  - `npm run electron:start` (Electron 단독 실행)
  - `npm run build` (웹 번들)
  - `npm run build:app` (Electron portable - 플랫폼별 자동 빌드, 출력: `release/`)
  - `npm run build:win` (Windows 빌드)
  - `npm run build:mac` (macOS 빌드)
  - `npm run preview` (빌드 결과 미리보기)
  - `npm run lint`

## 주요 파일/폴더

### 메인 엔트리
- `src/App.jsx`: 앱 루트 - InvestmentCalculatorNew 마운트.
- `src/InvestmentCalculatorNew.jsx`: 멀티뷰 메인 페이지 - SimulatorContext 제공, 레이아웃(사이드바/모바일 네비) 및 뷰 라우팅.
- `src/InvestmentCalculator.jsx`: 레거시 단일 페이지 버전(유지 중).
- `src/contexts/SimulatorContext.jsx`: 전체 상태 관리 허브 - 인물/기간/결혼·은퇴·대공황/포트폴리오/몬테카를로/히스토리컬·환율/자산추적/대출/프리셋/UI 토글 + 실행/복사/프리셋 관리 액션.

### 레이아웃 컴포넌트
- `src/components/layout/AppLayout.jsx`: 메인 레이아웃 컨테이너.
- `src/components/layout/Sidebar.jsx`: 데스크톱 사이드바 네비게이션.
- `src/components/layout/MobileNav.jsx`: 모바일 하단 네비게이션.
- `src/components/layout/Header.jsx`: 헤더(복사 버튼 포함).

### 뷰 컴포넌트 (src/components/views/)
- `DashboardView.jsx`: 대시보드 요약 - 요약 카드, 인사이트, 결혼/은퇴/시뮬 상태.
- `ResultsView.jsx`: 결과 차트 - 자산 성장(로그/실질/주택/MC 밴드), 실제 자산 오버레이, S&P500/포트폴리오 MC 비교·히스토그램.
- `ProfileView.jsx`: 프로필 입력 - 투자 기간 슬라이더 + 본인 정보(PersonCard).
- `ComparisonView.jsx`: 비교 대상 - 프리셋 + PersonCard.
- `MarriageView.jsx`: 결혼/주택 계획 입력.
- `RetirementView.jsx`: 은퇴 계획 - JEPQ/4% 전략 포함.
- `PortfolioView.jsx`: 포트폴리오 - 배분/커스텀 종목/포트폴리오 MC.
- `MonteCarloView.jsx`: S&P500 몬테카를로 - 현대/전체 범위, 누적 실행, 결과 요약·히스토그램, 환율 반영 토글.
- `CrisisView.jsx`: 히스토리컬/대공황 - 시작 연도/환율, S&P500 차트, 대공황 시나리오.
- `LoanView.jsx`: 대출 계산기 - 상환방식/인플레, 명목·실질 상환액 차트.
- `PresetsView.jsx`: 프리셋 관리 - 저장/업데이트/불러오기/삭제 + 변경사항 Diff 표.
- `AssetTrackingView.jsx`: 자산 추적 - 입력/표, 통계·스노우볼 애니메이션·추세선·예측, CSV 입출력.

### 유틸리티
- `src/utils/calculations.js`: 월 단위 복리·결혼·주택·대출·은퇴·대공황 계산, 대출 스케줄, 히스토리컬/몬테카를로 플랜.
- `src/utils/assetTracking.js`: 자산 기록 수익률/통계/CAGR·변동성, 예측, CSV 입출력, 회귀 추세선.

### 상수
- `src/constants/defaults.js`: 기본 인물/프리셋/결혼·은퇴·대공황 기본값.
- `src/constants/sp500History.js`: S&P500 연간 수익률(1928~2024) + 통계/범위.
- `src/constants/assetData.js`: VOO/SCHD/BND/현금 데이터, 포트폴리오 프리셋/수익률·변동성/포트폴리오 MC.
- `src/constants/exchangeHistory.js`: 원/달러 연도별 환율 히스토리(히스토리컬 모드용).

### 서비스
- `src/services/stockApiService.js`: Yahoo Finance API 기반 커스텀 종목 검색/추가.

### 기타 UI 컴포넌트
- `src/components/*`: PersonCard, StatCard, InputGroup, InsightsSection, WealthChart, StockSearchModal, SnowballAnimation 등.
- `src/components/ui/*`: Card, Modal, CollapsibleSection 등 공통 UI.

### Electron
- `electron/main.js`: Electron 엔트리(개발 시 dev 서버, 배포 시 dist 로드).

## 계산/로직 포인트
- 결혼 포함 계산: `calculateWealthWithMarriage`(실시간), `calculateWealthWithMarriageHistorical`(연도별 수익률 적용).
- 몬테카를로: 
  - S&P500 MC: `runMonteCarloPlan`이 S&P500 연간 수익률을 셔플해 전체 시나리오(결혼/주택/은퇴) 퍼센타일+분포(samplesByYear 포함)를 계산.
  - 포트폴리오 MC: `runPortfolioMonteCarlo` (assetData.js에서 자산별 수익률·변동성 기반).
- 히스토리컬 모드: 실제 S&P500 연도별 수익률 + 환율 히스토리 적용.
- 대출: 원리금균등/원금균등/체증식(이진탐색으로 월 증가율 결정), 중도상환, 잔액/집 가치 차트 표시.
- 자산 음수 허용: 은퇴/상환 후 자산이 0 이하로 내려갈 수 있음(로그 스케일 사용 시 주의).
- 단위 변환: 계산은 만원, 차트는 억(÷10000) 사용.
- 투자액 변경 스케줄: 항목별 `투자액 증가율 반영` 토글로 고정/성장 적용.
- 자산 추적: 월 수익률 = (현재 총자산 - 이전 총자산 - 투자금) / 이전 총자산, 투자금은 원금 증가분 기반.

## UI/기능 요약
- 멀티뷰 네비게이션: 사이드바(데스크톱)/하단 네비(모바일)로 12개 뷰 전환.
- 월급/생활비 자동으로 월 투자액 계산, 투자액 변경 스케줄(본인/비교/배우자).
- 프리셋: 단리/복리 토글(비교 대상), 은퇴/주택/결혼 기본 활성화 가능, 저장/업데이트/불러오기/삭제 + 변경사항 Diff 표.
- 차트: 로그/선형 토글, 집 포함/제외 토글, 실질가치 전환, 대공황 음영, 이벤트 라벨(결혼/대출 완료/은퇴).
- 포트폴리오:
  - 배분: VOO/SCHD/BND/현금 비율 조정 + 프리셋(공격적/성장/균형/안정적/채권/현금).
  - 커스텀 종목: Yahoo Finance API 기반 종목 검색/추가 (StockSearchModal).
  - 포트폴리오 MC: 자산별 수익률·변동성 기반 몬테카를로 시뮬레이션.
- 몬테카를로:
  - S&P500 MC: 현대(1950~)/전체(1928~) 범위 선택, 누적 실행, 결과 요약·히스토그램.
  - 환율 반영 토글: 원화/달러 전환 옵션.
  - 연도 슬라이더: 특정 연도의 분포 히스토그램 표시(samplesByYear 제공 시).
  - 요약 카드: 선택한 연도 기준 p5/p50/p95·평균·파산확률 표시.
- 히스토리컬 모드: 실제 S&P500 수익률(1928~2024) + 환율 히스토리 적용, 시작 연도 선택.
- 대출 계산기: 원리금균등/원금균등/체증식 상환방식, 명목/실질 상환액 라인 차트, 물가상승률 입력.
- 복사본: 대출/집 가치/대출 잔액/세후 월급·생활비/대공황 정보 포함.
- 자산 추적: 
  - CSV 입출력, 월/누적 수익률 표, CAGR·변동성·샤프비율 통계.
  - 추세선/예측선 차트, 스노우볼 애니메이션.
  - 실제 기록 표시 토글(ResultsView에서 오버레이).
- 대시보드: 요약 카드(총자산/연평균 수익률/순자산/주택자산), 인사이트, 결혼/은퇴/시뮬 상태.

## 테스트/주의
- 자동 테스트 없음. 변경 후 `npm run lint`와 간단 수동 시나리오(슬라이더, 결혼/대출 옵션, 몬테카를로 실행) 확인.
- Electron 빌드: `npm run build:app` (플랫폼별 자동), `npm run build:win` (Windows), `npm run build:mac` (macOS).
- 빌드 아티팩트(`release/`, `*.exe`, `*.dmg`)는 gitignore 처리. 필요 시 `build/icon.ico` 추가.
- `npm run preview`로 웹 빌드 결과 미리보기 가능.
