import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

const formatValue = (value) => `${value.toFixed(2)}억`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 p-3 shadow-lg backdrop-blur">
      <div className="text-xs font-semibold text-gray-500 mb-2">{label}년 후</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </div>
            <span className="font-semibold text-gray-900">{formatValue(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WealthChart = ({
  chartData,
  you,
  other,
  marriagePlan,
  retirementPlan,
  personRetireYear,
  spouseRetireYear,
  jepqFinancialIndependenceYear,
  crisis,
  useLogScale = true,
  onToggleLogScale,
  useCompound,
  useRealAsset = false,
  inflationRate = 0,
  onToggleRealAsset,
}) => {
  const effectiveRetireYear =
    marriagePlan.enabled && retirementPlan.enabled
      ? Math.max(personRetireYear, spouseRetireYear)
      : retirementPlan.enabled
      ? personRetireYear
      : null;
  const lastYear = chartData?.[chartData.length - 1]?.year ?? 0;
  const crisisStart = crisis?.enabled ? crisis.startYear : null;
  const crisisEnd = crisis?.enabled ? crisis.startYear + crisis.duration : null;
  const minPositive = chartData.reduce((min, point) => {
    ['you', 'youNoMarriage', 'other', 'house', 'spouseWealth'].forEach((key) => {
      const val = point[key];
      if (val > 0 && val < min) min = val;
    });
    return min;
  }, Infinity);
  const yDomainMin = Number.isFinite(minPositive) ? Math.max(minPositive * 0.5, 0.001) : 0.001;
  const sanitizedData = chartData.map((d) => {
    const clamp = (val) => {
      if (val === null || val === undefined) return null;
      return val > 0 ? val : yDomainMin;
    };
    const base = {
      ...d,
      you: clamp(d.you),
      youNoMarriage: clamp(d.youNoMarriage),
      other: clamp(d.other),
      house: clamp(d.house),
      spouseWealth: clamp(d.spouseWealth),
    };
    if (!useRealAsset) return base;
    const factor = Math.pow(1 + (inflationRate || 0) / 100, d.year || 0);
    const adjust = (val) => (val === null || val === undefined ? val : val / (factor || 1));
    return {
      ...base,
      you: adjust(base.you),
      youNoMarriage: adjust(base.youNoMarriage),
      other: adjust(base.other),
      house: adjust(base.house),
      spouseWealth: adjust(base.spouseWealth),
    };
  });
  const loanCompletionYear =
    marriagePlan.enabled && marriagePlan.buyHouse
      ? marriagePlan.yearOfMarriage +
        (marriagePlan.prepayEnabled
          ? Math.min(marriagePlan.prepayYear, marriagePlan.loanYears)
          : marriagePlan.loanYears)
      : null;
  const xMax = Math.max(
    lastYear,
    crisisEnd ?? 0,
    loanCompletionYear ?? 0,
    marriagePlan.enabled ? marriagePlan.yearOfMarriage : 0,
    effectiveRetireYear ?? 0,
    spouseRetireYear ?? 0
  );

  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-2xl shadow-lg border border-gray-100 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">자산 증가 추이</h2>
          <p className="text-sm text-gray-500">이벤트 구간(결혼/은퇴/대출완료)과 함께 비교해 보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          {onToggleRealAsset && (
            <button
              type="button"
              onClick={() => onToggleRealAsset(!useRealAsset)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                useRealAsset
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {useRealAsset ? '실질가치' : '명목가치'}
            </button>
          )}
          {onToggleLogScale && (
            <button
              type="button"
              onClick={() => onToggleLogScale(!useLogScale)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                useLogScale
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              Y축: {useLogScale ? '로그' : '선형'} {useCompound === false ? '(단리 비교)' : ''}
            </button>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={480}>
        <ComposedChart data={sanitizedData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="youGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="youNoMarriageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="otherGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="houseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="spouseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 6" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, xMax]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: '년', position: 'insideBottomRight', offset: -5, fill: '#6b7280' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            scale={useLogScale ? 'log' : 'linear'}
            domain={useLogScale ? [yDomainMin, 'auto'] : [0, 'auto']}
            allowDataOverflow={useLogScale}
            tickFormatter={(value) => value.toFixed(0)}
            label={{ value: '자산 (억원)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />

          {/* 은퇴 이후 구간 강조 */}
          {retirementPlan.enabled &&
            effectiveRetireYear !== null &&
            lastYear > effectiveRetireYear && (
              <ReferenceArea
                x1={effectiveRetireYear}
                x2={lastYear}
                fill="#f3f4f6"
                fillOpacity={0.5}
                strokeOpacity={0}
                label={{
                  value: '은퇴 이후',
                  position: 'insideTopLeft',
                  fill: '#6b7280',
                  fontSize: 12,
                  offset: 8,
                }}
              />
            )}

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
          {marriagePlan.enabled && marriagePlan.buyHouse && loanCompletionYear !== null && (
            <ReferenceLine
              x={loanCompletionYear}
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
          {/* 대공황 구간 표시 */}
          {crisisStart !== null && crisisEnd !== null && (
            <ReferenceArea
              x1={crisisStart}
              x2={crisisEnd}
              fill="#fef3c7"
              fillOpacity={0.35}
              stroke="#f59e0b"
              strokeOpacity={0.6}
              label={{
                value: `⚠️ 대공황: ${crisisStart}~${crisisEnd}년, ${crisis.drawdownRate}%`,
                position: 'insideTop',
                fill: '#b45309',
                fontSize: 12,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="you"
            stroke="#3b82f6"
            fill="url(#youGradient)"
            strokeWidth={3}
            name={marriagePlan.enabled ? `${you.name} (결혼 O)` : you.name}
            dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
          {marriagePlan.enabled && (
            <Area
              type="monotone"
              dataKey="youNoMarriage"
              stroke="#60a5fa"
              fill="url(#youNoMarriageGradient)"
              strokeWidth={2}
              strokeDasharray="4 3"
              name={`${you.name} (결혼 X)`}
              dot={{ r: 2.5, strokeWidth: 1.5, stroke: '#fff' }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              opacity={0.75}
            />
          )}
          <Area
            type="monotone"
            dataKey="other"
            stroke="#ef4444"
            fill="url(#otherGradient)"
            strokeWidth={3}
            strokeDasharray="5 4"
            name={other.name}
            dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
          {marriagePlan.enabled && marriagePlan.buyHouse && (
            <Area
              type="monotone"
              dataKey="house"
              stroke="#f59e0b"
              fill="url(#houseGradient)"
              strokeWidth={2}
              strokeDasharray="4 2"
              name="집 가치"
              dot={false}
              opacity={0.65}
            />
          )}
          {marriagePlan.enabled && (
            <Area
              type="monotone"
              dataKey="spouseWealth"
              stroke="#8b5cf6"
              fill="url(#spouseGradient)"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              name="배우자 자산(단독)"
              dot={{ r: 2.5, strokeWidth: 1.5, stroke: '#fff' }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center text-sm space-y-1">
        {marriagePlan.enabled && (
          <div className="text-pink-600">💒 {marriagePlan.yearOfMarriage}년 후 결혼</div>
        )}
        {marriagePlan.enabled && marriagePlan.buyHouse && (
          <div className="text-green-600">
            🏠 {loanCompletionYear}년 후 대출 완료
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
