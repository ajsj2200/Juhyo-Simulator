const Card = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  padding = 'normal',
  onClick,
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200';

  // 디자인 가이드: 크림/크림카드/다크 3-서피스 체계. 색상 변형은 크림 강도 차이로만 표현.
  const creamCard =
    'bg-surface-soft border border-hairline dark:bg-surface-dark-soft dark:border-slate-700';

  const variantClasses = {
    default:
      'bg-white/90 backdrop-blur-sm border border-hairline shadow-sm dark:bg-surface-dark-elevated/80 dark:border-slate-700',
    solid: 'bg-white border border-hairline shadow-sm dark:bg-surface-dark-elevated dark:border-slate-700',
    ghost: 'bg-transparent',
    blue: creamCard,
    pink: creamCard,
    green: creamCard,
    purple: creamCard,
    amber:
      'bg-surface-card border border-hairline dark:bg-surface-dark-elevated dark:border-slate-700',
    red:
      'bg-red-50/60 border border-red-200 dark:bg-rose-500/10 dark:border-rose-500/30',
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
