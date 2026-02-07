
const colorStyles = {
  blue: {
    text: 'text-blue-700 dark:text-blue-300',
    bg: 'from-blue-50/80 via-white to-blue-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-blue-500',
    border: 'border-blue-100 dark:border-slate-700',
  },
  red: {
    text: 'text-red-700 dark:text-red-300',
    bg: 'from-rose-50/80 via-white to-rose-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-red-500',
    border: 'border-rose-100 dark:border-slate-700',
  },
  green: {
    text: 'text-green-700 dark:text-green-300',
    bg: 'from-emerald-50/80 via-white to-emerald-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-emerald-500',
    border: 'border-emerald-100 dark:border-slate-700',
  },
  purple: {
    text: 'text-purple-700 dark:text-purple-300',
    bg: 'from-purple-50/80 via-white to-purple-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-purple-500',
    border: 'border-purple-100 dark:border-slate-700',
  },
  orange: {
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'from-amber-50/80 via-white to-amber-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-amber-500',
    border: 'border-amber-100 dark:border-slate-700',
  },
  gray: {
    text: 'text-gray-700 dark:text-slate-200',
    bg: 'from-gray-50/80 via-white to-gray-100/70 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-800/50',
    accent: 'bg-gray-400',
    border: 'border-gray-100 dark:border-slate-700',
  },
};

const StatCard = ({ title, value, subtitle, color = 'blue' }) => {
  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className="relative overflow-hidden rounded-xl border shadow-sm bg-white/90 backdrop-blur dark:bg-slate-900/80 dark:border-slate-700">
      <div className={`absolute inset-0 bg-gradient-to-br ${style.bg}`} aria-hidden />
      <div className="relative p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {title}
            </div>
            <div className={`mt-1 text-3xl font-extrabold leading-tight ${style.text}`}>
              {value}
            </div>
          </div>
          <div
            className={`h-10 w-10 rounded-full bg-white shadow-inner border ${style.border} flex items-center justify-center dark:bg-slate-800/80`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${style.accent} shadow`} />
          </div>
        </div>
        {subtitle && <div className="text-xs text-gray-600 dark:text-slate-300">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;
