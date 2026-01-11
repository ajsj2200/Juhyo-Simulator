import { useState } from 'react';

const ChevronIcon = ({ className = '', isOpen = false }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${className}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CollapsibleSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  color = 'gray',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    gray: 'border-gray-200 bg-gray-50',
    blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
    pink: 'border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50',
    green: 'border-green-200 bg-gradient-to-br from-green-50 to-teal-50',
    purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50',
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
    red: 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50',
  };

  const badgeColorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-600',
    pink: 'bg-pink-100 text-pink-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all ${colorClasses[color]} ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <span className="font-semibold text-gray-800">{title}</span>
          {badge && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${badgeColorClasses[color]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <ChevronIcon isOpen={isOpen} className="text-gray-500" />
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 bg-white/80 border-t border-gray-100">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
