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

const formatValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${abs.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}억`;
};

const formatAxisTick = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 100) return `${Math.round(value).toLocaleString('ko-KR')}억`;
  if (abs >= 10) return `${value.toFixed(0)}억`;
  if (abs >= 1) return `${value.toFixed(1)}억`;
  return `${value.toFixed(2)}억`;
};

const CustomTooltip = ({ active, payload, label, showNoMarriageComparison = true }) => {
  if (!active || !payload?.length) return null;

  const byKey = (key) => payload.find((p) => p.dataKey === key);
  const extractDisplayValue = (item) => {
    if (!item) return null;
    const rawKey = `${item.dataKey}__raw`;
    const raw = item?.payload?.[rawKey];
    return raw !== undefined ? raw : item.value;
  };

  const keys = ['you', showNoMarriageComparison ? 'youNoMarriage' : null, 'other', 'spouseWealth', 'house'].filter(Boolean);
  const rows = keys
    .map((key) => {
      const item = byKey(key);
      if (!item) return null;
      const val = extractDisplayValue(item);
      if (val === null || val === undefined) return null;
      return {
        key,
        name: item.name,
        color: item.color,
        value: val,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const mcP10 = extractDisplayValue(byKey('mc_p10'));
  const mcP50 = extractDisplayValue(byKey('mc_p50'));
  const mcP90 = extractDisplayValue(byKey('mc_p90'));

  return (
    <div className="min-w-[200px] rounded-xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="mb-2 border-b pb-1 text-sm font-bold text-gray-700">{label}년 후 자산</div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              {row.name}
            </div>
            <span className="font-bold text-gray-800">{formatValue(row.value)}</span>
          </div>
        ))}

        {(mcP10 !== null && mcP10 !== undefined) ||
        (mcP50 !== null && mcP50 !== undefined) ||
        (mcP90 !== null && mcP90 !== undefined) ? (
          <div className="pt-2 mt-2 border-t text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#d946ef' }} />
                몬테카를로(중앙값)
              </div>
              <span className="font-bold text-gray-800">{formatValue(mcP50 ?? null)}</span>
            </div>
            {mcP10 !== null && mcP10 !== undefined && mcP90 !== null && mcP90 !== undefined && (
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>범위(10~90%)</span>
                <span className="font-medium text-gray-700">
                  {formatValue(mcP10)} ~ {formatValue(mcP90)}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const CustomLegend = ({
  payload,
  chartData,
  marriagePlan,
  monteCarloEnabled,
  useHouseInChart,
  showNoMarriageComparison = true,
}) => {
  const lastDataPoint = chartData?.[chartData.length - 1];
  if (!lastDataPoint) return null;

  const allowed = ['you', 'youNoMarriage', 'other', 'spouseWealth', 'house'];
  if (monteCarloEnabled) allowed.push('mc_p50');
  const legendItems = payload.filter((p) => allowed.includes(p.dataKey));

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-3 text-xs sm:text-sm text-gray-700">
      {legendItems
        .filter((entry) => {
          if (!marriagePlan.enabled && entry.dataKey === 'youNoMarriage') return false;
          if (!showNoMarriageComparison && entry.dataKey === 'youNoMarriage') return false;
          if (!marriagePlan.enabled && entry.dataKey === 'spouseWealth') return false;
          if (!(marriagePlan.enabled && marriagePlan.buyHouse && useHouseInChart) && entry.dataKey === 'house') return false;
          return true;
        })
        .map((entry) => {
        let { dataKey, color, value: name } = entry;
        
        if (!name || name.startsWith('mc_p')) {
             if (dataKey === 'mc_p50') name = 'MC 중앙값';
             else return null;
        }

        const finalValue = lastDataPoint?.[`${dataKey}__raw`] ?? lastDataPoint?.[dataKey];
        
        if (finalValue === undefined || finalValue === null) return null;

        return (
          <div key={`item-${dataKey}`} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{name}:</span>
            <span className="font-bold text-gray-800">{formatValue(finalValue)}</span>
          </div>
        );
      })}
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
  useHouseInChart = true,
  onToggleHouseInChart,
  monteCarloEnabled = false,
  height = 480,
  showNoMarriageComparison = true,
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
  // 로그 스케일에서 0 이하 값은 표시를 위해 작은 양수로 clamp
  const yDomainMin = Number.isFinite(minPositive)
    ? Math.max(Math.min(minPositive * 0.1, 1), 0.001)
    : 0.001;
  const sanitizedData = chartData.map((d) => {
    const clampForLog = (val) => {
      if (val === null || val === undefined) return null;
      return val > 0 ? val : yDomainMin;
    };
    const clampForLinear = (val) => {
      if (val === null || val === undefined) return null;
      return val;
    };
    const clamp = useLogScale ? clampForLog : clampForLinear;

    const factor = useRealAsset
      ? Math.pow(1 + (inflationRate || 0) / 100, d.year || 0)
      : 1;
    const adjust = (val) => (val === null || val === undefined ? val : val / (factor || 1));

    const houseRaw = adjust(d.house);
    const remainingLoanRaw = adjust(d.remainingLoan);

    const applyHouseExclusion = (val) => {
      if (val === null || val === undefined) return val;
      if (useHouseInChart) return val;
      return val - (houseRaw ?? 0) + (remainingLoanRaw ?? 0);
    };

    const youRaw = applyHouseExclusion(adjust(d.you));
    const youNoMarriageRaw = adjust(d.youNoMarriage);
    const otherRaw = adjust(d.other);
    const spouseWealthRaw = adjust(d.spouseWealth);

    // MC 값은 SimulatorContext에서 이미 집 포함/제외가 선택된 데이터가 전달됨
    // 여기서는 실질가치 조정(adjust)만 적용 (applyHouseExclusion 불필요)
    const mcP10Raw = adjust(d.mc_p10);
    const mcP25Raw = adjust(d.mc_p25);
    const mcP50Raw = adjust(d.mc_p50);
    const mcP75Raw = adjust(d.mc_p75);
    const mcP90Raw = adjust(d.mc_p90);
    const mcMeanRaw = adjust(d.mc_mean);

    const you = clamp(youRaw);
    const youNoMarriage = clamp(youNoMarriageRaw);
    const other = clamp(otherRaw);
    const spouseWealth = clamp(spouseWealthRaw);
    const house = clamp(houseRaw);
    const remainingLoan = clamp(remainingLoanRaw);

    const mc_p10 = clamp(mcP10Raw);
    const mc_p25 = clamp(mcP25Raw);
    const mc_p50 = clamp(mcP50Raw);
    const mc_p75 = clamp(mcP75Raw);
    const mc_p90 = clamp(mcP90Raw);
    const mc_mean = clamp(mcMeanRaw);

    // 로그 스케일에서 밴드는 스택 Area로 표현(p10 baseline + (p90-p10))
    const mcOuterBase = mc_p10;
    const mcOuter =
      mc_p90 === null || mc_p90 === undefined || mcOuterBase === null || mcOuterBase === undefined
        ? null
        : Math.max(0, mc_p90 - mcOuterBase);
    const mcInnerBase = mc_p25;
    const mcInner =
      mc_p75 === null || mc_p75 === undefined || mcInnerBase === null || mcInnerBase === undefined
        ? null
        : Math.max(0, mc_p75 - mcInnerBase);

    return {
      ...d,
      you,
      youNoMarriage,
      other,
      house,
      spouseWealth,
      remainingLoan,
      mc_p10,
      mc_p25,
      mc_p50,
      mc_p75,
      mc_p90,
      mc_mean,
      mcOuterBase,
      mcOuter,
      mcInnerBase,
      mcInner,
      // raw values for tooltip/legend
      you__raw: youRaw,
      youNoMarriage__raw: youNoMarriageRaw,
      other__raw: otherRaw,
      house__raw: houseRaw,
      spouseWealth__raw: spouseWealthRaw,
      remainingLoan__raw: remainingLoanRaw,
      mc_p10__raw: mcP10Raw,
      mc_p25__raw: mcP25Raw,
      mc_p50__raw: mcP50Raw,
      mc_p75__raw: mcP75Raw,
      mc_p90__raw: mcP90Raw,
      mc_mean__raw: mcMeanRaw,
    };
  });
  // 선형 스케일 도메인 계산(옵션 적용 후 값 기준)
  const dataMin = sanitizedData.reduce((min, point) => {
    ['you__raw', 'youNoMarriage__raw', 'other__raw', 'spouseWealth__raw', 'mc_p50__raw'].forEach((key) => {
      const val = point[key];
      if (val !== null && val !== undefined && Number.isFinite(val) && val < min) min = val;
    });
    return min;
  }, 0);
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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500">이벤트 구간(결혼/은퇴/대출완료)과 함께 비교해 보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          {marriagePlan.enabled && marriagePlan.buyHouse && onToggleHouseInChart && (
            <button
              type="button"
              onClick={() => onToggleHouseInChart(!useHouseInChart)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                useHouseInChart
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {useHouseInChart ? '집 포함' : '집 제외'}
            </button>
          )}
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
      <ResponsiveContainer width="100%" height={height}>
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
            {/* Monte Carlo 밴드 그라데이션 */}
            <linearGradient id="mcBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="mcBandInnerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#c084fc" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 7" stroke="#f1f5f9" />
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
            domain={useLogScale ? [yDomainMin, 'auto'] : [dataMin < 0 ? dataMin * 1.1 : 0, 'auto']}
            allowDataOverflow={useLogScale}
            tickFormatter={formatAxisTick}
            label={{ value: '자산 (억원)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip showNoMarriageComparison={showNoMarriageComparison} />} />
          <Legend
            content={
              <CustomLegend
                chartData={sanitizedData}
                marriagePlan={marriagePlan}
                monteCarloEnabled={monteCarloEnabled}
                useHouseInChart={useHouseInChart}
                showNoMarriageComparison={showNoMarriageComparison}
              />
            }
            wrapperStyle={{ paddingTop: 20 }}
          />

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

          {/* Monte Carlo 밴드 */}
          {monteCarloEnabled && useLogScale && (
            <>
              <Area
                type="monotone"
                dataKey="mcOuterBase"
                stackId="mcOuter"
                stroke="none"
                fillOpacity={0}
                isAnimationActive={false}
                legendType="none"
                name="MC baseline"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="mcOuter"
                stackId="mcOuter"
                stroke="none"
                fill="url(#mcBandGradient)"
                fillOpacity={1}
                isAnimationActive={false}
                legendType="none"
                name="MC 10~90%"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="mcInnerBase"
                stackId="mcInner"
                stroke="none"
                fillOpacity={0}
                isAnimationActive={false}
                legendType="none"
                name="MC inner baseline"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="mcInner"
                stackId="mcInner"
                stroke="none"
                fill="url(#mcBandInnerGradient)"
                fillOpacity={1}
                isAnimationActive={false}
                legendType="none"
                name="MC 25~75%"
                dot={false}
              />
            </>
          )}
          {monteCarloEnabled && (
            <Line
              type="monotone"
              dataKey="mc_p50"
              stroke="#d946ef"
              strokeWidth={2.5}
              name="MC 중앙값"
              dot={false}
              opacity={0.9}
            />
          )}
          {monteCarloEnabled && !useLogScale && (
            <>
              <Line
                type="monotone"
                dataKey="mc_p10"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                name="MC p10"
                dot={false}
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="mc_p25"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="5 3"
                name="MC p25"
                dot={false}
                opacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="mc_p75"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="5 3"
                name="MC p75"
                dot={false}
                opacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="mc_p90"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                name="MC p90"
                dot={false}
                opacity={0.5}
              />
            </>
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
          {marriagePlan.enabled && showNoMarriageComparison && (
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
