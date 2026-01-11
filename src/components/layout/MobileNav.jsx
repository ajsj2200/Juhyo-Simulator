import { useSimulator } from '../../contexts/SimulatorContext';

const mobileNavItems = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'results', icon: '📈', label: '결과' },
  { id: 'profile', icon: '👤', label: '내정보' },
  { id: 'marriage', icon: '💒', label: '계획' },
  { id: 'loan', icon: '🧮', label: '도구' },
];

const MobileNav = ({ className = '' }) => {
  const { activeView, setActiveView } = useSimulator();

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0
        bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`
                flex flex-col items-center justify-center py-2 px-3 min-w-[64px]
                transition-colors duration-150
                ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}
              `}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
