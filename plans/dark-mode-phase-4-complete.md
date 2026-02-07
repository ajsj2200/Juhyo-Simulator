## Phase 4 Complete: 주요 컴포넌트 다크모드 적용

PersonCard, StatCard, PresetButtons, MarriagePlanSection, RetirementPlanSection, PortfolioSection, InsightsSection에 다크모드 스타일 적용 완료.

**Files created/changed:**
- src/components/PersonCard.jsx - dark 배경/텍스트, 투자액 변경 스케줄 dark 스타일
- src/components/StatCard.jsx - dark 그라디언트 변형
- src/components/PresetButtons.jsx - dark 버튼 배경/보더/호버/활성
- src/components/MarriagePlanSection.jsx - dark 배경/보더/토글
- src/components/RetirementPlanSection.jsx - dark 배경/보더/라디오
- src/components/PortfolioSection.jsx - dark 입력/프리셋/커스텀 종목
- src/components/InsightsSection.jsx - dark 배경 그라디언트
- tests/components-dark-mode.test.js - 주요 컴포넌트 다크모드 테스트

**Functions created/changed:**
- PersonCard - 투자액 변경 스케줄 섹션 dark 스타일
- StatCard - gradient 배경 dark 변형
- PresetButtons - 버튼 dark 상태 (배경, 보더, 호버, 활성)
- MarriagePlanSection - 그라디언트 배경, 구분선, 토글 dark
- RetirementPlanSection - 그라디언트 배경, 정보 패널, 라디오 dark
- PortfolioSection - 입력 그룹, 프리셋, 커스텀 종목 dark
- InsightsSection - 배경 그라디언트 dark

**Tests created/changed:**
- PersonCard dark 스타일 테스트
- StatCard dark 그라디언트 테스트
- PresetButtons dark 버튼 테스트
- MarriagePlanSection dark 배경 테스트
- RetirementPlanSection dark 배경 테스트
- PortfolioSection dark 스타일 테스트
- InsightsSection dark 그라디언트 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Add dark mode to major components

- Add dark backgrounds and text to PersonCard with schedule section
- Add dark gradient variants to StatCard
- Add dark button styles to PresetButtons (hover, active)
- Add dark backgrounds and borders to MarriagePlanSection
- Add dark backgrounds and borders to RetirementPlanSection
- Add dark styles to PortfolioSection inputs and presets
- Add dark gradient to InsightsSection background
- Add component dark mode tests
