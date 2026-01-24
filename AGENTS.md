# AGENTS Guide

## 개요
- 주효 인생 시뮬레이터: 세후 월급/생활비 기반 자산 시뮬레이터. 결혼·주택·대출·은퇴·대공황 시나리오와 몬테카를로 분포를 한 화면에서 제공합니다.
- UI/텍스트는 한국어, 금액 입력 단위는 `만원`, 차트/복사본은 주로 `억원`.

## 스택 & 스크립트
- React 19 + Vite, Tailwind CSS v4(@import만 사용), Recharts, Plotly(일부 3D).
- npm scripts:
  - `npm run dev` (웹 개발 서버)
  - `npm run dev:electron` (Vite + Electron 동시 실행)
  - `npm run build` (웹 번들)
  - `npm run build:app` (Electron portable exe, 출력: `release/`)
  - `npm run lint`

## 주요 파일/폴더
- `src/InvestmentCalculator.jsx`: 메인 페이지 상태/입력/차트/몬테카를로/복사 기능.
- `src/utils/calculations.js`: 월 단위 복리·대출·은퇴·대공황·몬테카를로(전체 시나리오) 계산.
- `src/constants/defaults.js`: 기본 값, 프리셋, 결혼/은퇴 기본 설정.
- `src/constants/sp500History.js`: S&P500 연도별 수익률(몬테카를로/히스토리 계산용).
- `src/components/*`: 카드/입력/차트/인사이트/프리셋 버튼 등 UI 조각.
- `src/components/views/AssetTrackingView.jsx`: 자산 추적 입력/표/차트(추세선, 예측, CSV).
- `src/utils/assetTracking.js`: 월 수익률·CAGR·변동성·추세선·예측·CSV 처리.
- `electron/main.js`: Electron 엔트리(개발 시 dev 서버, 배포 시 dist 로드).

## 계산/로직 포인트
- 결혼 포함 계산: `calculateWealthWithMarriage`(실시간), `calculateWealthWithMarriageHistorical`(연도별 수익률 적용).
- 몬테카를로: `runMonteCarloPlan`이 S&P500 연간 수익률을 셔플해 전체 시나리오(결혼/주택/은퇴) 퍼센타일+분포(samplesByYear 포함)를 계산.
- 대출: 원리금균등/원금균등/체증식(이진탐색으로 월 증가율 결정), 중도상환, 잔액/집 가치 차트 표시.
- 자산 음수 허용: 은퇴/상환 후 자산이 0 이하로 내려갈 수 있음(로그 스케일 사용 시 주의).
- 단위 변환: 계산은 만원, 차트는 억(÷10000) 사용.
- 투자액 변경 스케줄: 항목별 `투자액 증가율 반영` 토글로 고정/성장 적용.
- 자산 추적: 월 수익률 = (현재 총자산 - 이전 총자산 - 투자금) / 이전 총자산, 투자금은 원금 증가분 기반.

## UI/기능 요약
- 월급/생활비 자동으로 월 투자액 계산, 투자액 변경 스케줄(본인/비교/배우자).
- 프리셋: 단리/복리 토글(비교 대상), 은퇴/주택/결혼 기본 활성화 가능.
- 차트: 로그/선형 토글, 집 포함/제외 토글, 실질가치 전환, 대공황 음영, 이벤트 라벨(결혼/대출 완료/은퇴).
- 대출 계산기: 명목/실질 상환액 라인 차트, 물가상승률 입력.
- 복사본: 대출/집 가치/대출 잔액/세후 월급·생활비/대공황 정보 포함.
- 로컬 프리셋: 입력 상태 저장/불러오기/삭제(로컬스토리지).
- 자산 추적: CSV 입출력, 월/누적 수익률 표, 추세선/예측선 차트, 실제 기록 표시 토글.
- 몬테카를로 결과: 연도 슬라이더 기반 분포 히스토그램(샘플 제공 시).

## 테스트/주의
- 자동 테스트 없음. 변경 후 `npm run lint`와 간단 수동 시나리오(슬라이더, 결혼/대출 옵션, 몬테카를로 실행) 확인.
- Electron 빌드 아티팩트(`release/`, `*.exe`)는 gitignore 처리. 필요 시 `build/icon.ico` 추가.
