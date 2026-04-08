import { useSimulator } from '../../contexts/SimulatorContext';

const navItems = [
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

const NavItem = ({ item, activeView, onViewChange, level = 0 }) => {
  const isActive = activeView === item.id;
  const hasChildren = item.children && item.children.length > 0;
  const isParentActive = hasChildren && item.children.some((child) => child.id === activeView);

  return (
    <div>
      <button
        onClick={() => !hasChildren && onViewChange(item.id)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
          transition-colors duration-150
          ${level > 0 ? 'pl-10 text-sm' : ''}
          ${
            isActive
              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-slate-800 dark:text-blue-200'
              : isParentActive
                ? 'text-gray-800 dark:text-slate-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }
          ${hasChildren ? 'cursor-default' : 'cursor-pointer'}
        `}
      >
        <span className={`${level > 0 ? 'text-base' : 'text-lg'}`}>{item.icon}</span>
        <span>{item.label}</span>
      </button>

      {hasChildren && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              activeView={activeView}
              onViewChange={onViewChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ className = '' }) => {
  const { activeView, setActiveView, theme, toggleTheme } = useSimulator();
  
  const themeIcon = theme === 'dark' ? '☀️' : '🌙';

  return (
    <aside
      className={`hidden lg:block fixed left-0 top-0 h-screen w-64
        bg-white/80 backdrop-blur-lg border-r border-gray-200
        dark:bg-slate-900/80 dark:border-slate-800
        overflow-y-auto z-40 ${className}`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-slate-800">
        <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">
          💰 인생 시뮬레이터
        </h1>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="
            w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200
            bg-white text-gray-700 transition-colors duration-150
            hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800
            dark:text-slate-200 dark:hover:bg-slate-700
          "
        >
          <span aria-hidden="true">{themeIcon}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            activeView={activeView}
            onViewChange={setActiveView}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/50 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="text-xs text-gray-500 text-center dark:text-slate-400">
          주효 인생 시뮬레이터 v1.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
