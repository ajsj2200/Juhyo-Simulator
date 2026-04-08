import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useSimulator } from '../../contexts/SimulatorContext';
import { StatCard } from '../index';

const formatManwon = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${Math.round(n).toLocaleString('ko-KR')}만원`;
};

const formatYear = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const text = Number.isInteger(n) ? n.toString() : n.toFixed(1);
  return `${text}년`;
};

const formatCoverage = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${(n * 100).toFixed(0)}%`;
};

const formatRate = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(2)}%`;
};

const AssetSalaryTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;

  const itemMap = new Map(payload.map((entry) => [entry.dataKey, entry]));
  const rows = [
    ['assetSalary', '월 자산월급'],
    ['actualAssetSalary', '실제 자산 월급'],
    ['targetExpense', '은퇴 목표 생활비'],
    ['mc_p50_salary', 'MC 중앙값'],
  ]
    .map(([key, name]) => {
      const item = itemMap.get(key);
      if (!item || item.value == null) return null;
      return {
        key,
        name,
        color: item.color,
        value: item.value,
      };
    })
    .filter(Boolean);

  const p10 = itemMap.get('salaryBand90Base')?.value;
  const p90Delta = itemMap.get('salaryBand90')?.value;
  const p90 = p10 != null && p90Delta != null ? p10 + p90Delta : null;
  const expectedRate = itemMap.get('assetSalary')?.payload?.expectedRate;

  const containerClass = isDark
    ? 'min-w-[220px] rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm'
    : 'min-w-[220px] rounded-xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm';
  const titleClass = isDark
    ? 'mb-2 border-b border-slate-700 pb-1 text-sm font-bold text-slate-200'
    : 'mb-2 border-b border-gray-200 pb-1 text-sm font-bold text-gray-700';
  const labelClass = isDark ? 'text-slate-300' : 'text-gray-600';
  const valueClass = isDark ? 'text-slate-100' : 'text-gray-800';
  const subtleClass = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className={containerClass}>
      <div className={titleClass}>{formatYear(label)} 기준</div>
      <div className="space-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div className={`flex items-center gap-2 ${labelClass}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              <span>{row.name}</span>
            </div>
            <span className={`font-semibold ${valueClass}`}>{formatManwon(row.value)}</span>
          </div>
        ))}

        {(p10 != null || p90 != null) && (
          <div className={`border-t pt-2 mt-2 text-xs ${subtleClass}`}>
            <div>몬테카를로 월 자산월급 범위</div>
            <div className="mt-1">{p10 != null && p90 != null ? `${formatManwon(p10)} ~ ${formatManwon(p90)}` : '-'}</div>
          </div>
        )}

        <div className={`border-t pt-2 mt-2 text-xs ${subtleClass}`}>
          <div>적용 기대수익률</div>
          <div className="mt-1">{formatRate(expectedRate)}</div>
        </div>
      </div>
    </div>
  );
};

const AssetSalaryView = () => {
  const {
    years,
    chartDataWithMonteCarlo,
    hasMonteCarloBand,
    showMCBands,
    setShowMCBands,
    useRealAsset,
    setUseRealAsset,
    useHouseInChart,
    setUseHouseInChart,
    showActualAssets,
    setShowActualAssets,
    retirementPlan,
    portfolio,
    portfolioRate,
    assetRecords,
    theme,
  } = useSimulator();

  const isDark = theme === 'dark';
  const chartColors = {
    grid: isDark ? '#334155' : '#e5e7eb',
    axis: isDark ? '#475569' : '#e5e7eb',
    tick: isDark ? '#cbd5e1' : '#6b7280',
    salary: isDark ? '#38bdf8' : '#2563eb',
    actual: isDark ? '#f59e0b' : '#d97706',
    target: isDark ? '#fb7185' : '#e11d48',
    mcMedian: isDark ? '#c084fc' : '#9333ea',
    mcBandOuter: isDark ? 'rgba(168, 85, 247, 0.14)' : 'rgba(168, 85, 247, 0.16)',
    mcBandInner: isDark ? 'rgba(192, 132, 252, 0.22)' : 'rgba(192, 132, 252, 0.24)',
  };

  const salaryChartData = useMemo(() => {
    const inflationRate = (retirementPlan?.inflationRate || 0) / 100;
    const defaultRate = Number.isFinite(Number(portfolioRate)) ? Number(portfolioRate) : null;

    const toSalary = (assetInEok, annualRate) => {
      if (assetInEok == null || !Number.isFinite(Number(assetInEok))) return null;
      if (annualRate == null) return null;
      if (!Number.isFinite(Number(annualRate))) return null;
      return (Number(assetInEok) * 10000 * (Number(annualRate) / 100)) / 12;
    };

    return chartDataWithMonteCarlo.map((point) => {
      const factor = useRealAsset ? Math.pow(1 + inflationRate, point.year || 0) : 1;
      const adjust = (value) => {
        if (value == null || !Number.isFinite(Number(value))) return value;
        return Number(value) / factor;
      };

      const house = adjust(point.house);
      const remainingLoan = adjust(point.remainingLoan);
      const excludeHouse = (value) => {
        if (value == null) return null;
        if (useHouseInChart) return value;
        return value - (house ?? 0) + (remainingLoan ?? 0);
      };

      const expectedRate =
        point.returnRate !== null && point.returnRate !== undefined && Number.isFinite(Number(point.returnRate))
          ? Number(point.returnRate)
          : defaultRate;

      const assetBase = excludeHouse(adjust(point.you));
      const mcP10 = adjust(point.mc_p10);
      const mcP25 = adjust(point.mc_p25);
      const mcP50 = adjust(point.mc_p50);
      const mcP75 = adjust(point.mc_p75);
      const mcP90 = adjust(point.mc_p90);
      const actualAsset = adjust(point.actualAsset);
      const targetExpense = retirementPlan.enabled
        ? retirementPlan.monthlyExpense * Math.pow(1 + inflationRate, point.year || 0)
        : null;

      const salaryBand90Base = toSalary(mcP10, expectedRate);
      const salaryBand90Top = toSalary(mcP90, expectedRate);
      const salaryBand50Base = toSalary(mcP25, expectedRate);
      const salaryBand50Top = toSalary(mcP75, expectedRate);

      return {
        ...point,
        expectedRate,
        assetSalary: toSalary(assetBase, expectedRate),
        targetExpense,
        actualAssetSalary: toSalary(actualAsset, expectedRate),
        mc_p50_salary: toSalary(mcP50, expectedRate),
        salaryBand90Base,
        salaryBand90:
          salaryBand90Base != null && salaryBand90Top != null ? Math.max(0, salaryBand90Top - salaryBand90Base) : null,
        salaryBand50Base,
        salaryBand50:
          salaryBand50Base != null && salaryBand50Top != null ? Math.max(0, salaryBand50Top - salaryBand50Base) : null,
      };
    });
  }, [chartDataWithMonteCarlo, portfolio.enabled, portfolioRate, retirementPlan, useHouseInChart, useRealAsset]);

  const integerYearData = useMemo(
    () => salaryChartData.filter((point) => Number.isInteger(point.year)).sort((a, b) => a.year - b.year),
    [salaryChartData]
  );

  const finalPoint = integerYearData.find((point) => point.year === years) || integerYearData[integerYearData.length - 1];
  const startPoint = integerYearData.find((point) => point.year === 0) || integerYearData[0];
  const fireYear = integerYearData.find(
    (point) => point.assetSalary != null && point.targetExpense != null && point.assetSalary >= point.targetExpense
  )?.year;

  const hasActualAssetData = assetRecords.length > 0 && salaryChartData.some((point) => point.actualAssetSalary != null);
  const coverageRatio =
    finalPoint?.assetSalary != null && finalPoint?.targetExpense != null && finalPoint.targetExpense > 0
      ? finalPoint.assetSalary / finalPoint.targetExpense
      : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">자산 월급</h1>
        <p className="text-body">
          자산 × 기대수익률 ÷ 12로 계산한 월 기대수익 흐름입니다. 일반 모드는 연 수익률 가정, 포트폴리오 모드는 가중 기대수익률,
          히스토리컬 모드는 각 연도의 실제 수익률을 사용합니다.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="현재 자산 월급"
          value={formatManwon(startPoint?.assetSalary)}
          subtitle={`${formatYear(startPoint?.year)} · ${formatRate(startPoint?.expectedRate)}`}
          color="blue"
        />
        <StatCard
          title={`${years}년 후 자산 월급`}
          value={formatManwon(finalPoint?.assetSalary)}
          subtitle={`${formatRate(finalPoint?.expectedRate)} 적용`}
          color="purple"
        />
        <StatCard
          title="은퇴 생활비 커버율"
          value={formatCoverage(coverageRatio)}
          subtitle={retirementPlan.enabled ? '최종 연도 기준' : '은퇴 계획 비활성화'}
          color="green"
        />
        <StatCard
          title="FIRE 달성 시점"
          value={fireYear != null ? `${fireYear}년` : '-'}
          subtitle={retirementPlan.enabled ? '목표 생활비 충당 시점' : '은퇴 계획 필요'}
          color="orange"
        />
      </section>

      <section className="chart-container">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-heading-2">월 자산월급 차트</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                자산 규모와 같은 해의 기대수익률이 만나면 월 기준으로 어느 정도 수익을 만들지 보여줍니다.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              현재 기준 기대수익률: <strong>{formatRate(finalPoint?.expectedRate)}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer dark:text-slate-300">
              <input
                type="checkbox"
                checked={useRealAsset}
                onChange={(e) => setUseRealAsset(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              실질가치
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer dark:text-slate-300">
              <input
                type="checkbox"
                checked={useHouseInChart}
                onChange={(e) => setUseHouseInChart(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              주택 포함
            </label>
            {hasMonteCarloBand && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showMCBands}
                  onChange={(e) => setShowMCBands(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600"
                />
                MC 밴드
              </label>
            )}
            {hasActualAssetData && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showActualAssets}
                  onChange={(e) => setShowActualAssets(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
                실제 자산 월급
              </label>
            )}
          </div>
        </div>

        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={salaryChartData} margin={{ top: 20, right: 24, left: 8, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="year"
                type="number"
                domain={[0, 'dataMax']}
                tickFormatter={(value) => formatYear(value)}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick, fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => formatManwon(value).replace('만원', '')}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick, fontSize: 12 }}
                width={72}
              />
              <Tooltip content={<AssetSalaryTooltip isDark={isDark} />} />
              <Legend />

              {hasMonteCarloBand && showMCBands && (
                <>
                  <Area
                    type="monotone"
                    dataKey="salaryBand90Base"
                    stackId="salaryBand90"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                    legendType="none"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="salaryBand90"
                    stackId="salaryBand90"
                    name="MC 10~90%"
                    stroke="none"
                    fill={chartColors.mcBandOuter}
                    isAnimationActive={false}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="salaryBand50Base"
                    stackId="salaryBand50"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                    legendType="none"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="salaryBand50"
                    stackId="salaryBand50"
                    name="MC 25~75%"
                    stroke="none"
                    fill={chartColors.mcBandInner}
                    isAnimationActive={false}
                    connectNulls
                  />
                </>
              )}

              <Line
                type="monotone"
                dataKey="assetSalary"
                name="월 자산월급"
                stroke={chartColors.salary}
                strokeWidth={3}
                dot={false}
                connectNulls
              />

              {retirementPlan.enabled && (
                <Line
                  type="monotone"
                  dataKey="targetExpense"
                  name="은퇴 목표 생활비"
                  stroke={chartColors.target}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}

              {hasMonteCarloBand && showMCBands && (
                <Line
                  type="monotone"
                  dataKey="mc_p50_salary"
                  name="MC 중앙값"
                  stroke={chartColors.mcMedian}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}

              {hasActualAssetData && showActualAssets && (
                <Line
                  type="monotone"
                  dataKey="actualAssetSalary"
                  name="실제 자산 월급"
                  stroke={chartColors.actual}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}

              {fireYear != null && retirementPlan.enabled && (
                <ReferenceLine
                  x={fireYear}
                  stroke={chartColors.target}
                  strokeDasharray="3 3"
                  label={{ value: `FIRE ${fireYear}년`, position: 'top', fill: chartColors.target, fontSize: 12 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <h3 className="text-heading-3 mb-2">해석 가이드</h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            <p>• 이 탭의 자산 월급은 자산을 팔아 쓰는 금액이 아니라, 해당 연도의 기대수익률로 환산한 월 기대수익입니다.</p>
            <p>• 주택 포함을 끄면 주택 순자산을 제외한 금융자산 기준으로 다시 계산합니다.</p>
            <p>• 실질가치를 켜면 은퇴 계획의 물가상승률을 적용해 현재 가치로 환산합니다.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <h3 className="text-heading-3 mb-2">현재 설정 요약</h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            <p>• 차트 기간: {years}년</p>
            <p>• 최종 연도 기대수익률: {formatRate(finalPoint?.expectedRate)}</p>
            <p>• 몬테카를로 밴드: {hasMonteCarloBand && showMCBands ? '표시 중' : '숨김'}</p>
            <p>• 실제 자산 기록: {hasActualAssetData ? `${assetRecords.length}개 기록 반영 가능` : '기록 없음'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssetSalaryView;
