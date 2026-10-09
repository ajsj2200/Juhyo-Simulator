export const navItems = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'results', icon: '📈', label: '결과/차트' },
  { id: 'profile', icon: '👤', label: '내 정보' },
  { id: 'comparison', icon: '⚖️', label: '비교 대상' },
  {
    id: 'plans',
    icon: '📋',
    label: '인생 계획',
    children: [
      { id: 'marriage', icon: '💒', label: '결혼/주택' },
      { id: 'retirement', icon: '🏖️', label: '은퇴 계획' },
    ],
  },
  {
    id: 'advanced',
    icon: '⚙️',
    label: '고급 설정',
    children: [
      { id: 'portfolio', icon: '📦', label: '포트폴리오' },
      { id: 'montecarlo', icon: '🎲', label: '몬테카를로' },
      { id: 'crisis', icon: '⚠️', label: '위기 시나리오' },
    ],
  },
  {
    id: 'tools',
    icon: '🧮',
    label: '도구',
    children: [
      { id: 'loan', icon: '🏦', label: '대출 계산기' },
      { id: 'assetTracking', icon: '📈', label: '자산 추적' },
      { id: 'assetSalary', icon: '💸', label: '자산 월급' },
      { id: 'presets', icon: '💾', label: '프리셋 관리' },
    ],
  },
];
