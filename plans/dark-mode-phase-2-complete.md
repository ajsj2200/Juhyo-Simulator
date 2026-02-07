## Phase 2 Complete: 레이아웃 컴포넌트 다크모드 적용

AppLayout, Sidebar, Header, MobileNav에 다크모드 스타일 적용 완료. Header에 Sun/Moon 아이콘 토글 버튼 추가. 모든 레이아웃 컴포넌트에서 dark: 변형 클래스 사용.

**Files created/changed:**
- src/components/layout/Header.jsx - 다크모드 토글 버튼 추가 (Sun/Moon SVG 아이콘)
- src/components/layout/AppLayout.jsx - 배경 그라디언트 dark 변형 추가
- src/components/layout/Sidebar.jsx - dark 배경/텍스트/호버 스타일
- src/components/layout/MobileNav.jsx - dark 배경/아이콘/활성 상태 스타일
- tests/layout-dark-mode.test.js - 레이아웃 다크모드 테스트

**Functions created/changed:**
- Header 컴포넌트 - useSimulator로 theme, toggleTheme 접근, 토글 버튼 렌더링
- AppLayout 컴포넌트 - dark 그라디언트 클래스 추가
- Sidebar 컴포넌트 - 네비게이션 아이템, footer dark 스타일
- MobileNav 컴포넌트 - 아이콘 버튼 dark 스타일

**Tests created/changed:**
- Header 토글 버튼 렌더링 테스트
- Header 토글 버튼 클릭 동작 테스트
- AppLayout dark 클래스 적용 테스트
- Sidebar/MobileNav dark 스타일 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Add dark mode to layout components with theme toggle

- Add theme toggle button with sun/moon icons in Header
- Apply dark mode gradients to AppLayout background
- Add dark mode styles to Sidebar navigation and footer
- Add dark mode styles to MobileNav icons and active states
- Add layout dark mode tests
