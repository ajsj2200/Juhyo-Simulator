import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const WealthChart = ({
  chartData,
  you,
  other,
  marriagePlan,
  retirementPlan,
  personRetireYear,
  spouseRetireYear,
  jepqFinancialIndependenceYear,
}) => {
  const effectiveRetireYear =
    marriagePlan.enabled && retirementPlan.enabled
      ? Math.max(personRetireYear, spouseRetireYear)
      : retirementPlan.enabled
      ? personRetireYear
      : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">자산 증가 추이</h2>
      <ResponsiveContainer width="100%" height={450}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" label={{ value: '년', position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: '자산 (억원)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value) => `${value.toFixed(2)}억원`}
            labelFormatter={(label) => `${label}년 후`}
          />
          <Legend />

          {/* 결혼 시점 표시 */}
          {marriagePlan.enabled && (
            <ReferenceLine
              x={marriagePlan.yearOfMarriage}
              stroke="#ec4899"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: '💒 결혼', position: 'top', fill: '#ec4899', fontSize: 12 }}
            />
          )}

          {/* 대출 완료 시점 표시 */}
          {marriagePlan.enabled && marriagePlan.buyHouse && (
            <ReferenceLine
              x={marriagePlan.yearOfMarriage + marriagePlan.loanYears}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: '🏠 대출완료', position: 'top', fill: '#22c55e', fontSize: 12 }}
            />
          )}

          {/* 본인 은퇴 시점 */}
          {retirementPlan.enabled && (
            <ReferenceLine
              x={personRetireYear}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: '🧑 본인 은퇴', position: 'insideTopRight', fill: '#3b82f6', fontSize: 10 }}
            />
          )}

          {/* 배우자 은퇴 시점 */}
          {marriagePlan.enabled && retirementPlan.enabled && spouseRetireYear !== personRetireYear && (
            <ReferenceLine
              x={spouseRetireYear}
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: '👫 배우자 은퇴', position: 'insideTopRight', fill: '#a855f7', fontSize: 10 }}
            />
          )}

          {/* JEPQ 배당금으로 생활비 충당 가능 시점 */}
          {jepqFinancialIndependenceYear !== null && (
            <ReferenceLine
              x={jepqFinancialIndependenceYear}
              stroke="#f59e0b"
              strokeWidth={3}
              strokeDasharray="5 5"
              label={{ 
                value: '💰 JEPQ 자유', 
                position: 'insideBottom', 
                fill: '#f59e0b', 
                fontSize: 12, 
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}

          <Line
            type="monotone"
            dataKey="you"
            stroke="#3b82f6"
            strokeWidth={3}
            name={marriagePlan.enabled ? `${you.name} (결혼 O)` : you.name}
            dot={{ r: 4 }}
          />
          {marriagePlan.enabled && (
            <Line
              type="monotone"
              dataKey="youNoMarriage"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="3 3"
              name={`${you.name} (결혼 X)`}
              dot={{ r: 3 }}
              opacity={0.6}
            />
          )}
          <Line
            type="monotone"
            dataKey="other"
            stroke="#ef4444"
            strokeWidth={3}
            strokeDasharray="5 5"
            name={other.name}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center text-sm space-y-1">
        {marriagePlan.enabled && (
          <div className="text-pink-600">💒 {marriagePlan.yearOfMarriage}년 후 결혼</div>
        )}
        {marriagePlan.enabled && marriagePlan.buyHouse && (
          <div className="text-green-600">
            🏠 {marriagePlan.yearOfMarriage + marriagePlan.loanYears}년 후 대출 완료
          </div>
        )}
        {retirementPlan.enabled && (
          <div className="text-blue-600">🧑 {personRetireYear}년 후 본인 은퇴</div>
        )}
        {marriagePlan.enabled && retirementPlan.enabled && (
          <div className="text-purple-600">👫 {spouseRetireYear}년 후 배우자 은퇴</div>
        )}
        {jepqFinancialIndependenceYear !== null && (
          <div className="text-amber-600">
            💰 {jepqFinancialIndependenceYear}년 후 JEPQ 배당금으로 생활비 충당 가능
          </div>
        )}
      </div>
    </div>
  );
};

export default WealthChart;
