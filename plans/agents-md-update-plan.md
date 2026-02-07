## Plan: AGENTS.md 최신화

현재 코드베이스 조사를 완료했습니다. 프로젝트가 Context 기반 구조로 대폭 개편되었으며, View 라우팅 시스템과 포트폴리오 기능이 추가되었습니다. AGENTS.md를 최신 구조에 맞게 업데이트하겠습니다.

**Phases (3개)**

1. **Phase 1: 앱 구조 및 주요 파일 섹션 업데이트**
   - **Objective:** InvestmentCalculatorNew.jsx, SimulatorContext, View 기반 라우팅 구조 반영
   - **Files/Functions to Modify/Create:** [AGENTS.md](AGENTS.md)의 "주요 파일/폴더" 섹션
   - **Tests to Write:** N/A (문서 업데이트)
   - **Steps:**
     1. InvestmentCalculator.jsx → InvestmentCalculatorNew.jsx로 주요 파일 변경 설명
     2. SimulatorContext.jsx 역할 추가 (전역 상태 관리)
     3. App.jsx 구조 설명 추가 (ViewRouter 패턴)
     4. 12개 View 컴포넌트 목록 및 역할 추가
     5. Layout 컴포넌트 (AppLayout, Header, Sidebar, MobileNav) 추가

2. **Phase 2: 새로운 기능 및 상수 파일 추가**
   - **Objective:** 포트폴리오, 환율, 주식 검색 등 새 기능 문서화
   - **Files/Functions to Modify/Create:** [AGENTS.md](AGENTS.md)의 "주요 파일/폴더" 및 "UI/기능 요약" 섹션
   - **Tests to Write:** N/A (문서 업데이트)
   - **Steps:**
     1. assetData.js 설명 추가 (SCHD, BND, 포트폴리오 계산)
     2. exchangeHistory.js 설명 추가
     3. stockApiService.js 설명 추가
     4. UI 컴포넌트 섹션 업데이트 (Card, CollapsibleSection, Modal)
     5. 포트폴리오 기능 UI/기능 요약에 추가

3. **Phase 3: 스크립트 및 기타 정보 업데이트**
   - **Objective:** package.json scripts 최신화 및 전체 문서 일관성 검토
   - **Files/Functions to Modify/Create:** [AGENTS.md](AGENTS.md)의 "스택 & 스크립트" 섹션
   - **Tests to Write:** N/A (문서 업데이트)
   - **Steps:**
     1. build:app, build:win, build:mac 스크립트 추가
     2. dev:electron, electron:start 스크립트 설명 업데이트
     3. 의존성 정보 업데이트 (plotly.js-dist-min 추가 등)
     4. 전체 문서 읽고 일관성/정확성 검토
     5. 오타 및 불필요한 내용 정리

**Open Questions**
1. InvestmentCalculator.jsx (구버전)을 완전히 제거해야 하나요, 아니면 레거시로 유지하나요?
2. 포트폴리오 기능의 설명 수준 - 간단한 언급만 할까요, 아니면 자세한 자산 목록을 포함할까요?
3. 각 View 컴포넌트의 역할을 개별적으로 설명할까요, 아니면 목록만 제시할까요?
