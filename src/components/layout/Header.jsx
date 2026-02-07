import { useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';

const Header = ({ onCopyResults, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const { activeView, setActiveView, theme, toggleTheme } = useSimulator();

  const themeIcon = theme === 'dark' ? '☀️' : '🌙';

  const handleCopy = async () => {
    if (onCopyResults) {
      await onCopyResults();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getViewTitle = () => {
    const titles = {
      dashboard: '대시보드',
      profile: '내 정보',
      comparison: '비교 대상',
      marriage: '결혼/주택 계획',
      retirement: '은퇴 계획',
      portfolio: '포트폴리오',
      montecarlo: '몬테카를로 시뮬레이션',
      crisis: '위기 시나리오',
      loan: '대출 계산기',
      presets: '프리셋 관리',
    };
    return titles[activeView] || '대시보드';
  };

  return (
    <header
      className={`lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-lg
        border-b border-gray-200 dark:bg-slate-900/80 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2 text-gray-800 dark:text-slate-100"
        >
          <span className="text-xl">💰</span>
          <span className="font-semibold text-sm">{getViewTitle()}</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="테마 전환"
            className="
              w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200
              bg-white/80 text-gray-700 transition-colors duration-150
              hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800
              dark:text-slate-200 dark:hover:bg-slate-700
            "
          >
            <span aria-hidden="true">{themeIcon}</span>
          </button>
          <button
            onClick={handleCopy}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {copied ? '복사됨!' : '📋 복사'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
