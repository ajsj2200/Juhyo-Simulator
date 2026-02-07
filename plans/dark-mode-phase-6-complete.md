## Phase 6 Complete: 뷰 컴포넌트 및 기타 dark 스타일 마무리

PresetsView, DashboardView, ProfileView, ComparisonView, SnowballAnimation에 다크모드 스타일 적용 완료. 전체 앱 다크모드 시스템 구축 완료.

**Files created/changed:**
- src/components/views/PresetsView.jsx - dark 테이블 스타일 (배경, 보더, 호버, Diff 색상)
- src/components/views/DashboardView.jsx - dark 텍스트/섹션 확인
- src/components/views/ProfileView.jsx - dark 텍스트 확인
- src/components/views/ComparisonView.jsx - dark 텍스트 확인
- src/components/SnowballAnimation.jsx - dark sky 그라디언트, empty-state 배경
- tests/views-dark-mode.test.js - 뷰 다크모드 테스트

**Functions created/changed:**
- PresetsView - 테이블 dark 배경/보더/호버, Diff 색상 (added, removed, changed)
- SnowballAnimation - sky 그라디언트 dark 변형
- DashboardView - dark 텍스트 확인
- ProfileView - dark 텍스트 확인
- ComparisonView - dark 텍스트 확인

**Tests created/changed:**
- PresetsView dark 테이블 스타일 테스트
- DashboardView dark 스타일 테스트
- ProfileView dark 스타일 테스트
- ComparisonView dark 스타일 테스트
- SnowballAnimation dark 배경 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Complete dark mode implementation for all views

- Add dark table styles to PresetsView (background, border, hover, diff colors)
- Add dark text and section styles to DashboardView
- Add dark text styles to ProfileView
- Add dark text styles to ComparisonView
- Add dark sky gradient and empty-state to SnowballAnimation
- Add view dark mode tests
