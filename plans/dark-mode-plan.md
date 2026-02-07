## Plan: 다크모드 시스템 구현

Tailwind CSS v4 기반 다크모드 시스템 추가. CSS 변수 토큰화 + class 전략 사용, SimulatorContext에 테마 상태/localStorage 통합, 모든 뷰/컴포넌트/차트에 dark 스타일 적용, Header에 토글 UI 배치. 시스템 설정(prefers-color-scheme) 자동 감지 + 수동 토글 지원.

**Phases (6 phases)**

1. **Phase 1: 다크모드 인프라 구축**
   - **Objective:** CSS 변수 토큰 정의, Tailwind dark variant 설정, SimulatorContext에 테마 상태 추가
   - **Files/Functions to Modify/Create:**
     - [src/index.css](../src/index.css) - CSS 변수 정의 (:root, .dark)
     - [src/contexts/SimulatorContext.jsx](../src/contexts/SimulatorContext.jsx) - theme 상태, toggleTheme, localStorage 연동
     - [index.html](../index.html) - dark 클래스 토글 대상으로 html 태그 사용
     - [src/InvestmentCalculatorNew.jsx](../src/InvestmentCalculatorNew.jsx) - html 태그 dark 클래스 토글 useEffect
   - **Tests to Write:**
     - SimulatorContext theme 기본값 확인 (시스템 설정 자동 감지)
     - toggleTheme 동작 확인
     - localStorage 저장/복원 확인
   - **Steps:**
     1. index.css에 :root와 .dark CSS 변수 추가 (배경, 텍스트, 카드, 보더 색상)
     2. SimulatorContext에 theme 상태 추가 (시스템 설정 자동 감지 또는 localStorage 값 사용)
     3. toggleTheme 함수 구현, localStorage 연동
     4. InvestmentCalculatorNew에서 html 태그에 dark 클래스 토글하는 useEffect 추가
     5. 수동 테스트로 테마 전환 확인

2. **Phase 2: 레이아웃 컴포넌트 다크모드 적용**
   - **Objective:** AppLayout, Sidebar, Header, MobileNav에 다크모드 스타일 적용 및 토글 UI 추가
   - **Files/Functions to Modify/Create:**
     - [src/components/layout/AppLayout.jsx](../src/components/layout/AppLayout.jsx) - 배경 그라디언트 dark 변형
     - [src/components/layout/Header.jsx](../src/components/layout/Header.jsx) - 다크모드 토글 버튼 추가 (Sun/Moon 아이콘)
     - [src/components/layout/Sidebar.jsx](../src/components/layout/Sidebar.jsx) - dark 배경/텍스트 스타일
     - [src/components/layout/MobileNav.jsx](../src/components/layout/MobileNav.jsx) - dark 배경/텍스트 스타일
   - **Tests to Write:**
     - Header 토글 버튼 렌더링 확인
     - 토글 버튼 클릭 시 toggleTheme 호출 확인
     - AppLayout dark 클래스 적용 시 스타일 확인
   - **Steps:**
     1. Header에 Sun/Moon 아이콘 토글 버튼 추가, toggleTheme 연결
     2. AppLayout 배경을 CSS 변수 기반으로 변경 (dark 그라디언트 추가)
     3. Sidebar와 MobileNav dark 스타일 추가 (배경, 텍스트, 호버)
     4. 수동 테스트로 레이아웃 dark 모드 확인

3. **Phase 3: 공통 UI 컴포넌트 다크모드 적용**
   - **Objective:** Card, Modal, CollapsibleSection, InputGroup에 dark 스타일 적용
   - **Files/Functions to Modify/Create:**
     - [src/components/ui/Card.jsx](../src/components/ui/Card.jsx) - dark 배경/보더 변형
     - [src/components/ui/Modal.jsx](../src/components/ui/Modal.jsx) - dark 배경/텍스트
     - [src/components/ui/CollapsibleSection.jsx](../src/components/ui/CollapsibleSection.jsx) - dark 배경/보더
     - [src/components/InputGroup.jsx](../src/components/InputGroup.jsx) - dark 입력 필드 스타일
   - **Tests to Write:**
     - Card dark 클래스 시 스타일 확인
     - Modal dark 배경 적용 확인
     - InputGroup dark 입력 스타일 확인
   - **Steps:**
     1. Card 컴포넌트에 dark 배경/보더 클래스 추가
     2. Modal에 dark 배경/텍스트 클래스 추가 (오버레이 포함)
     3. CollapsibleSection dark 스타일 추가
     4. InputGroup dark 입력 필드 스타일 (배경, 보더, 텍스트, placeholder) 추가
     5. 수동 테스트로 공통 UI 컴포넌트 dark 모드 확인

4. **Phase 4: 주요 컴포넌트 다크모드 적용**
   - **Objective:** PersonCard, StatCard, PresetButtons 등 주요 폼/카드 컴포넌트에 dark 스타일 적용
   - **Files/Functions to Modify/Create:**
     - [src/components/PersonCard.jsx](../src/components/PersonCard.jsx) - dark 배경/그라디언트
     - [src/components/StatCard.jsx](../src/components/StatCard.jsx) - dark 그라디언트 변형
     - [src/components/PresetButtons.jsx](../src/components/PresetButtons.jsx) - dark 버튼 스타일
     - [src/components/MarriagePlanSection.jsx](../src/components/MarriagePlanSection.jsx) - dark 배경/보더
     - [src/components/RetirementPlanSection.jsx](../src/components/RetirementPlanSection.jsx) - dark 배경/보더
     - [src/components/PortfolioSection.jsx](../src/components/PortfolioSection.jsx) - dark 스타일
     - [src/components/InsightsSection.jsx](../src/components/InsightsSection.jsx) - dark 배경 그라디언트
   - **Tests to Write:**
     - PersonCard dark 스타일 적용 확인
     - StatCard dark 그라디언트 확인
     - PresetButtons dark 버튼 스타일 확인
   - **Steps:**
     1. PersonCard에 dark 배경/그라디언트 클래스 추가 (label, input, select 포함)
     2. StatCard dark 그라디언트 변형 추가
     3. PresetButtons dark 버튼 스타일 추가 (배경, 보더, 호버)
     4. MarriagePlanSection, RetirementPlanSection, PortfolioSection dark 스타일 추가
     5. InsightsSection dark 배경 그라디언트 추가
     6. 수동 테스트로 주요 컴포넌트 dark 모드 확인

5. **Phase 5: 차트 컴포넌트 다크모드 적용**
   - **Objective:** WealthChart, ResultsView, MonteCarloView 등의 Recharts 차트에 dark 테마 색상 적용
   - **Files/Functions to Modify/Create:**
     - [src/components/WealthChart.jsx](../src/components/WealthChart.jsx) - dark 툴팁/레전드 색상, theme 기반 조건부 색상
     - [src/components/views/ResultsView.jsx](../src/components/views/ResultsView.jsx) - dark 차트 색상 (grid, axes, bars)
     - [src/components/views/MonteCarloView.jsx](../src/components/views/MonteCarloView.jsx) - dark 히스토그램 색상
     - [src/components/views/CrisisView.jsx](../src/components/views/CrisisView.jsx) - dark 차트 색상
     - [src/components/views/LoanView.jsx](../src/components/views/LoanView.jsx) - dark 차트 색상
     - [src/components/views/AssetTrackingView.jsx](../src/components/views/AssetTrackingView.jsx) - dark 차트 색상
     - [src/components/StockSearchModal.jsx](../src/components/StockSearchModal.jsx) - dark 모달/차트 색상
   - **Tests to Write:**
     - WealthChart dark theme에서 색상 확인
     - ResultsView dark 모드에서 차트 색상 확인
   - **Steps:**
     1. WealthChart에서 useSimulator로 theme 가져오기
     2. dark 모드일 때 툴팁/레전드/grid/axes 색상 조건부 변경
     3. ResultsView, MonteCarloView, CrisisView, LoanView, AssetTrackingView 차트 색상 theme 기반으로 변경
     4. StockSearchModal dark 스타일 추가
     5. 수동 테스트로 모든 차트 dark 모드 확인

6. **Phase 6: 뷰 컴포넌트 및 기타 dark 스타일 마무리**
   - **Objective:** 모든 뷰 컴포넌트와 나머지 컴포넌트 dark 스타일 적용, SnowballAnimation 조정
   - **Files/Functions to Modify/Create:**
     - [src/components/views/DashboardView.jsx](../src/components/views/DashboardView.jsx) - dark 카드 스타일 확인
     - [src/components/views/ProfileView.jsx](../src/components/views/ProfileView.jsx) - dark 스타일 확인
     - [src/components/views/ComparisonView.jsx](../src/components/views/ComparisonView.jsx) - dark 스타일 확인
     - [src/components/views/PresetsView.jsx](../src/components/views/PresetsView.jsx) - dark 테이블 스타일
     - [src/components/SnowballAnimation.jsx](../src/components/SnowballAnimation.jsx) - dark 배경에 맞게 sky 그라디언트 조정
     - [src/index.css](../src/index.css) - 추가 유틸리티 클래스 dark 변형
   - **Tests to Write:**
     - PresetsView dark 테이블 스타일 확인
     - SnowballAnimation dark 배경 적용 확인
   - **Steps:**
     1. PresetsView 테이블 dark 스타일 (배경, 보더, hover) 추가
     2. SnowballAnimation sky 그라디언트 dark 변형 추가
     3. 모든 뷰 컴포넌트 수동 테스트로 dark 스타일 확인 및 누락 수정
     4. index.css에 추가 유틸리티 클래스 dark 변형 추가
     5. 전체 앱 수동 테스트 (모든 뷰 전환하며 dark 모드 확인)
     6. Lint 실행 및 수정

**Implementation Decisions**
- 다크모드 기본값: 시스템 설정(`prefers-color-scheme`) 자동 감지, localStorage로 수동 변경 우선
- 토글 버튼: Header에 배치 (데스크톱/모바일 모두 접근 가능)
- SnowballAnimation: dark 버전 추가 (배경 어둡게)
