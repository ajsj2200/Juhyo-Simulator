## Phase 1 Complete: 다크모드 인프라 구축

CSS 변수 토큰 시스템 추가, SimulatorContext에 theme 상태 추가, localStorage 연동, html 태그 dark 클래스 토글 로직 구현. 시스템 설정(prefers-color-scheme) 자동 감지 지원.

**Files created/changed:**
- src/index.css - :root와 .dark CSS 변수 정의
- src/contexts/SimulatorContext.jsx - theme 상태, toggleTheme 함수, localStorage 연동
- src/InvestmentCalculatorNew.jsx - html 태그 dark 클래스 토글 useEffect
- src/utils/theme.js - theme 유틸리티 함수 (getInitialTheme, resolveTheme)
- tests/theme.test.js - theme 로직 단위 테스트

**Functions created/changed:**
- getInitialTheme() - localStorage 또는 시스템 설정에서 초기 테마 감지
- resolveTheme(theme) - 'system' 설정을 실제 'light'/'dark'로 변환
- toggleTheme() - 테마 순환 (light → dark → system) 및 localStorage 저장

**Tests created/changed:**
- getInitialTheme 테스트 (localStorage, matchMedia)
- resolveTheme 테스트 (system 감지)
- toggleTheme 사이클 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Add dark mode infrastructure with theme state and CSS variables

- Add CSS variables for light/dark themes in index.css
- Add theme state management in SimulatorContext with localStorage persistence
- Implement system preference detection (prefers-color-scheme)
- Add theme toggle cycling (light → dark → system)
- Wire HTML dark class toggling in InvestmentCalculatorNew
- Add theme utility functions with unit tests
