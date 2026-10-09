
// 디자인 가이드: 크림 카드 + 헤어라인 보더, 색은 액센트 도트와 수치 텍스트에만 절제해서 사용
const colorStyles = {
  blue: {
    text: 'text-coral-active dark:text-blue-300',
    accent: 'bg-coral',
  },
  red: {
    text: 'text-red-700 dark:text-red-300',
    accent: 'bg-red-500',
  },
  green: {
    text: 'text-green-700 dark:text-green-300',
    accent: 'bg-emerald-500',
  },
  purple: {
    text: 'text-accent-teal dark:text-accent-teal',
    accent: 'bg-accent-teal',
  },
  orange: {
    text: 'text-amber-700 dark:text-amber-300',
    accent: 'bg-accent-amber',
  },
  gray: {
    text: 'text-gray-700 dark:text-slate-200',
    accent: 'bg-gray-400',
  },
};

const StatCard = ({ title, value, subtitle, color = 'blue' }) => {
  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className="relative overflow-hidden rounded-xl border border-hairline bg-white/90 shadow-sm dark:bg-surface-dark-elevated/80 dark:border-slate-700">
      <div className="relative p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {title}
            </div>
            <div className={`mt-1 font-display text-3xl font-medium leading-tight tracking-tight ${style.text}`}>
              {value}
            </div>
          </div>
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.accent}`} aria-hidden="true" />
        </div>
        {subtitle && <div className="text-xs text-gray-600 dark:text-slate-300">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;
