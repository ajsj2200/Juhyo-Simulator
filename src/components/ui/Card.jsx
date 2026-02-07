const Card = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  padding = 'normal',
  onClick,
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200';

  const variantClasses = {
    default:
      'bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm dark:bg-slate-900/80 dark:border-slate-700',
    solid: 'bg-white border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-700',
    ghost: 'bg-transparent',
    blue:
      'bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
    pink:
      'bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
    green:
      'bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
    purple:
      'bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
    amber:
      'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
    red:
      'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 dark:from-slate-900/70 dark:to-slate-800/50 dark:border-slate-700',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    normal: 'p-4 lg:p-6',
    lg: 'p-6 lg:p-8',
  };

  const hoverClasses = hover
    ? 'hover:shadow-md hover:border-gray-200 cursor-pointer'
    : '';

  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};

export default Card;
