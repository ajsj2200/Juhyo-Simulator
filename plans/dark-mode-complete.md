## Plan Complete: 다크모드 시스템 구현

Tailwind CSS v4 기반 다크모드 시스템 완전 구현. CSS 변수 토큰화, SimulatorContext 통합, 전체 앱 dark 스타일 적용, Header 토글 UI, 시스템 설정 자동 감지 및 localStorage 저장 지원.

**Phases Completed:** 6 of 6
1. ✅ Phase 1: 다크모드 인프라 구축
2. ✅ Phase 2: 레이아웃 컴포넌트 다크모드 적용
3. ✅ Phase 3: 공통 UI 컴포넌트 다크모드 적용
4. ✅ Phase 4: 주요 컴포넌트 다크모드 적용
5. ✅ Phase 5: 차트 컴포넌트 다크모드 적용
6. ✅ Phase 6: 뷰 컴포넌트 및 기타 dark 스타일 마무리

**All Files Created/Modified:**
- src/index.css - CSS 변수 정의 (:root, .dark)
- src/utils/theme.js - theme 유틸리티 함수
- src/contexts/SimulatorContext.jsx - theme 상태 관리
- src/InvestmentCalculatorNew.jsx - html 태그 dark 클래스 토글
- src/components/layout/Header.jsx - 토글 버튼
- src/components/layout/AppLayout.jsx - dark 그라디언트
- src/components/layout/Sidebar.jsx - dark 네비게이션
- src/components/layout/MobileNav.jsx - dark 모바일 네비
- src/components/ui/Card.jsx - dark 카드 스타일
- src/components/ui/Modal.jsx - dark 모달 스타일
- src/components/ui/CollapsibleSection.jsx - dark 콜랩스 스타일
- src/components/InputGroup.jsx - dark 입력 필드
- src/components/PersonCard.jsx - dark 폼 카드
- src/components/StatCard.jsx - dark 통계 카드
- src/components/PresetButtons.jsx - dark 버튼
- src/components/MarriagePlanSection.jsx - dark 결혼 계획
- src/components/RetirementPlanSection.jsx - dark 은퇴 계획
- src/components/PortfolioSection.jsx - dark 포트폴리오
- src/components/InsightsSection.jsx - dark 인사이트
- src/components/WealthChart.jsx - dark 차트 색상
- src/components/StockSearchModal.jsx - dark 모달 차트
- src/components/SnowballAnimation.jsx - dark 애니메이션
- src/components/views/DashboardView.jsx - dark 대시보드
- src/components/views/ResultsView.jsx - dark 결과 차트
- src/components/views/ProfileView.jsx - dark 프로필
- src/components/views/ComparisonView.jsx - dark 비교
- src/components/views/MonteCarloView.jsx - dark 몬테카를로
- src/components/views/CrisisView.jsx - dark 위기 시나리오
- src/components/views/LoanView.jsx - dark 대출
- src/components/views/PresetsView.jsx - dark 프리셋 테이블
- src/components/views/AssetTrackingView.jsx - dark 자산 추적
- tests/theme.test.js - theme 로직 테스트
- tests/layout-dark-mode.test.js - 레이아웃 테스트
- tests/ui-dark-mode.test.js - UI 컴포넌트 테스트
- tests/components-dark-mode.test.js - 주요 컴포넌트 테스트
- tests/charts-dark-mode.test.js - 차트 테스트
- tests/views-dark-mode.test.js - 뷰 테스트

**Key Functions/Classes Added:**
- getInitialTheme() - 초기 테마 감지 (localStorage + system)
- resolveTheme(theme) - 'system' 설정 해석
- toggleTheme() - 테마 순환 (light → dark → system)
- Theme toggle button - Sun/Moon 아이콘
- Dark mode CSS variables - 전체 색상 토큰
- Dark mode Tailwind classes - 모든 컴포넌트 적용
- Theme-based chart colors - Recharts 조건부 색상

**Test Coverage:**
- Total tests written: 36개 (6개 파일)
- All tests passing: ✅

**Recommendations for Next Steps:**
- 수동 UI 테스트: `npm run dev`로 전체 뷰 확인 및 테마 전환 테스트
- 기존 lint 에러 수정 (SnowballAnimation Math.random, WealthChart 등)
- 다크모드 스크린샷 캡처 및 문서 업데이트
- 사용자 피드백 수집 및 색상 미세 조정
