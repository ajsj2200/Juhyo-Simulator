import { useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import { navItems } from './navItems';

const mobileNavItems = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'results', icon: '📈', label: '결과' },
  { id: 'profile', icon: '👤', label: '내정보' },
  { id: 'assetTracking', icon: '💹', label: '자산' },
];

// 사이드바 트리를 평탄화해 전체 메뉴 시트에 사용
const allViews = navItems.flatMap((item) => (item.children ? item.children : [item]));

const MobileNav = ({ className = '' }) => {
  const { activeView, setActiveView } = useSimulator();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = (id) => {
    setActiveView(id);
    setMenuOpen(false);
  };

  return (
    <>
      {/* 전체 메뉴 시트 (디자인 가이드: 모바일 메뉴는 풀스크린 크림 시트) */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-canvas dark:bg-surface-dark">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4 dark:border-slate-800">
            <span className="font-display text-lg font-medium tracking-tight text-ink dark:text-on-dark">
              전체 메뉴
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="메뉴 닫기"
              className="rounded-lg px-2 py-1 text-gray-500 hover:bg-surface-soft hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-8">
            <div className="grid grid-cols-2 gap-3">
              {allViews.map((view) => {
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => handleSelect(view.id)}
                    className={`
                      flex items-center gap-3 rounded-xl border p-4 text-left transition-colors
                      ${
                        isActive
                          ? 'border-coral bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'border-hairline bg-white text-gray-700 dark:bg-surface-dark-elevated dark:border-slate-700 dark:text-slate-200'
                      }
                    `}
                  >
                    <span className="text-xl">{view.icon}</span>
                    <span className="text-sm font-medium">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0
          bg-canvas/90 backdrop-blur-lg border-t border-hairline z-50
          dark:bg-surface-dark/90 dark:border-slate-800 ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  flex flex-col items-center justify-center py-2 px-3 min-w-[56px]
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300'
                  }
                `}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-3 min-w-[56px] text-gray-500 hover:text-blue-600 transition-colors duration-150 dark:text-slate-400 dark:hover:text-blue-300"
            aria-label="전체 메뉴 열기"
          >
            <span className="text-xl mb-0.5">☰</span>
            <span className="text-xs">메뉴</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
