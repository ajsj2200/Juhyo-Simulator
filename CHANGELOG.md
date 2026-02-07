# Project Changelog

## 2026-02-07 - 다크모드 시스템 구현

**Plan Completed**

- 전체 다크모드 시스템 구현 완료: 6개 Phase, 31개 파일 수정, 6개 테스트 파일 추가
- 시스템 설정 자동 감지, localStorage 저장, Header 토글 버튼, 전체 앱 dark 스타일
- Status: ✅ COMPLETE

**Phase 6 Completed**

- 뷰 컴포넌트 및 기타 dark 스타일 마무리: PresetsView, DashboardView, ProfileView, ComparisonView, SnowballAnimation
- Files: src/components/views/PresetsView.jsx, DashboardView.jsx, ProfileView.jsx, ComparisonView.jsx, src/components/SnowballAnimation.jsx, tests/views-dark-mode.test.js
- Status: ✅ APPROVED

**Phase 5 Completed**

- 차트 컴포넌트 다크모드 적용: WealthChart, ResultsView, MonteCarloView, CrisisView, LoanView, AssetTrackingView, StockSearchModal
- Files: src/components/WealthChart.jsx, src/components/views/ResultsView.jsx, MonteCarloView.jsx, CrisisView.jsx, LoanView.jsx, AssetTrackingView.jsx, src/components/StockSearchModal.jsx, tests/charts-dark-mode.test.js
- Status: ✅ APPROVED

**Phase 4 Completed**

- 주요 컴포넌트 다크모드 적용: PersonCard, StatCard, PresetButtons, MarriagePlanSection, RetirementPlanSection, PortfolioSection, InsightsSection
- Files: src/components/PersonCard.jsx, StatCard.jsx, PresetButtons.jsx, MarriagePlanSection.jsx, RetirementPlanSection.jsx, PortfolioSection.jsx, InsightsSection.jsx, tests/components-dark-mode.test.js
- Status: ✅ APPROVED

**Phase 3 Completed**

- 공통 UI 컴포넌트 다크모드 적용: Card, Modal, CollapsibleSection, InputGroup dark 스타일
- Files: src/components/ui/Card.jsx, src/components/ui/Modal.jsx, src/components/ui/CollapsibleSection.jsx, src/components/InputGroup.jsx, tests/ui-dark-mode.test.js
- Status: ✅ APPROVED

**Phase 2 Completed**

- 레이아웃 컴포넌트 다크모드 적용: Header 토글 버튼, AppLayout/Sidebar/MobileNav dark 스타일
- Files: src/components/layout/Header.jsx, src/components/layout/AppLayout.jsx, src/components/layout/Sidebar.jsx, src/components/layout/MobileNav.jsx, tests/layout-dark-mode.test.js
- Status: ✅ APPROVED

**Phase 1 Completed**

- 다크모드 인프라 구축: CSS 변수, theme 상태, localStorage 연동, 시스템 설정 자동 감지
- Files: src/index.css, src/contexts/SimulatorContext.jsx, src/InvestmentCalculatorNew.jsx, src/utils/theme.js, tests/theme.test.js
- Status: ✅ APPROVED

