## Phase 5 Complete: 차트 컴포넌트 다크모드 적용

WealthChart, ResultsView, MonteCarloView, CrisisView, LoanView, AssetTrackingView, StockSearchModal의 Recharts 차트에 다크모드 색상 적용 완료. 툴팁, 레전드, grid, axes 모두 theme 기반 조건부 색상 적용.

**Files created/changed:**
- src/components/WealthChart.jsx - theme 기반 툴팁/레전드/grid/axes 색상
- src/components/views/ResultsView.jsx - 모든 차트 dark 색상 (grid, axes, bars)
- src/components/views/MonteCarloView.jsx - 히스토그램 dark 색상
- src/components/views/CrisisView.jsx - 차트 dark 색상
- src/components/views/LoanView.jsx - 차트 dark 색상
- src/components/views/AssetTrackingView.jsx - 차트 dark 색상
- src/components/StockSearchModal.jsx - 모달/차트 dark 색상
- tests/charts-dark-mode.test.js - 차트 다크모드 테스트

**Functions created/changed:**
- WealthChart - useSimulator로 theme 가져오기, 조건부 색상 적용
- ResultsView - theme 기반 차트 팔레트, 히스토그램/grid/axes 색상
- MonteCarloView - theme 기반 히스토그램 색상
- CrisisView - theme 기반 차트 색상
- LoanView - theme 기반 차트 색상
- AssetTrackingView - theme 기반 차트 색상
- StockSearchModal - theme 기반 차트 색상

**Tests created/changed:**
- WealthChart dark theme 색상 테스트
- ResultsView dark 차트 색상 테스트
- MonteCarloView dark 히스토그램 테스트
- CrisisView dark 차트 테스트
- LoanView dark 차트 테스트
- AssetTrackingView dark 차트 테스트
- StockSearchModal dark 차트 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Add dark mode to chart components

- Add theme-based colors to WealthChart (tooltip, legend, grid, axes)
- Add dark chart palettes to ResultsView (histograms, bars, grid)
- Add dark histogram colors to MonteCarloView
- Add dark chart colors to CrisisView
- Add dark chart colors to LoanView
- Add dark chart colors to AssetTrackingView
- Add dark chart colors to StockSearchModal
- Add chart dark mode tests
