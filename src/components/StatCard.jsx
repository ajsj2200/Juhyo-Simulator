
const colorClasses = {
  blue: 'text-blue-600',
  red: 'text-red-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  gray: 'text-gray-600',
};

const StatCard = ({ title, value, subtitle, color = 'blue' }) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <div className="text-sm text-gray-600 mb-1">{title}</div>
    <div className={`text-2xl font-bold ${colorClasses[color] || colorClasses.blue}`}>
      {value}
    </div>
    {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

export default StatCard;
