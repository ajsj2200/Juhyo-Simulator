import { useSimulator } from '../../contexts/SimulatorContext';
import { getThemeMeta, getNextTheme } from '../../utils/theme';
import { navItems } from './navItems';

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

  const themeMeta = getThemeMeta(theme);
  const nextThemeMeta = getThemeMeta(getNextTheme(theme));
  const themeTitle = `테마: ${themeMeta.label} (클릭 시 ${nextThemeMeta.label})`;

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64
        bg-canvas/90 backdrop-blur-lg border-r border-hairline
        dark:bg-surface-dark/90 dark:border-slate-800
        z-40 ${className}`}
    >
      {/* Header */}
      <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-hairline-soft dark:border-slate-800">
        <h1 className="font-display text-lg font-medium tracking-tight text-ink dark:text-on-dark">
          ✳ 인생 시뮬레이터
        </h1>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={themeTitle}
          title={themeTitle}
          className="
            w-9 h-9 flex items-center justify-center rounded-full border border-hairline
            bg-canvas text-ink transition-colors duration-150
            hover:bg-surface-soft dark:border-slate-700 dark:bg-surface-dark-elevated
            dark:text-slate-200 dark:hover:bg-slate-700
          "
        >
          <span aria-hidden="true">{themeMeta.icon}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
      <div className="shrink-0 p-4 border-t border-hairline-soft bg-canvas/50 dark:border-slate-800 dark:bg-surface-dark/60">
        <div className="text-xs text-gray-500 text-center dark:text-slate-400">
          주효 인생 시뮬레이터 v1.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
