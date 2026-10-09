import { useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import { getThemeMeta, getNextTheme } from '../../utils/theme';

const Header = ({ onCopyResults, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const { activeView, setActiveView, theme, toggleTheme } = useSimulator();

  const themeMeta = getThemeMeta(theme);
  const themeTitle = `테마: ${themeMeta.label} (클릭 시 ${getThemeMeta(getNextTheme(theme)).label})`;

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
      results: '결과/차트',
      profile: '내 정보',
      comparison: '비교 대상',
      marriage: '결혼/주택 계획',
      retirement: '은퇴 계획',
      portfolio: '포트폴리오',
      montecarlo: '몬테카를로 시뮬레이션',
      crisis: '위기 시나리오',
      loan: '대출 계산기',
      assetTracking: '자산 추적',
      assetSalary: '자산 월급',
      presets: '프리셋 관리',
    };
    return titles[activeView] || '대시보드';
  };

  return (
    <header
      className={`lg:hidden sticky top-0 z-30 bg-canvas/80 backdrop-blur-lg
        border-b border-hairline dark:bg-surface-dark/80 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2 text-ink dark:text-on-dark"
        >
          <span className="text-xl" aria-hidden="true">✳</span>
          <span className="font-display font-medium text-sm">{getViewTitle()}</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeTitle}
            title={themeTitle}
            className="
              w-9 h-9 flex items-center justify-center rounded-full border border-hairline
              bg-canvas/80 text-ink transition-colors duration-150
              hover:bg-surface-soft dark:border-slate-700 dark:bg-surface-dark-elevated
              dark:text-slate-200 dark:hover:bg-slate-700
            "
          >
            <span aria-hidden="true">{themeMeta.icon}</span>
          </button>
          <button
            onClick={handleCopy}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-coral hover:bg-coral-active text-white'
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
