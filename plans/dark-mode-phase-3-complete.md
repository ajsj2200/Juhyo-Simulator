## Phase 3 Complete: 공통 UI 컴포넌트 다크모드 적용

Card, Modal, CollapsibleSection, InputGroup에 다크모드 스타일 적용 완료. 모든 variant와 상태(hover, focus)에 dark: 변형 추가.

**Files created/changed:**
- src/components/ui/Card.jsx - dark 배경/보더 변형 (default, gradient)
- src/components/ui/Modal.jsx - dark 오버레이/배경/텍스트/버튼
- src/components/ui/CollapsibleSection.jsx - dark 헤더/콘텐츠 배경/보더
- src/components/InputGroup.jsx - dark label/input/select/placeholder/focus
- tests/ui-dark-mode.test.js - UI 공통 컴포넌트 다크모드 테스트

**Functions created/changed:**
- Card 컴포넌트 - default와 gradient variant dark 스타일
- Modal 컴포넌트 - 오버레이, 본체, 헤더, 닫기 버튼 dark 스타일
- CollapsibleSection 컴포넌트 - 헤더, 콘텐츠 dark 배경/보더
- InputGroup 컴포넌트 - 모든 입력 요소 dark 스타일

**Tests created/changed:**
- Card dark 클래스 적용 테스트
- Modal dark 배경/텍스트 테스트
- CollapsibleSection dark 스타일 테스트
- InputGroup dark 입력 필드 테스트

**Review Status:** APPROVED

**Git Commit Message:**
feat: Add dark mode to common UI components

- Add dark variants to Card (default and gradient)
- Add dark overlay and surface styles to Modal
- Add dark header and content styles to CollapsibleSection
- Add dark label, input, select, and focus styles to InputGroup
- Add UI component dark mode tests
