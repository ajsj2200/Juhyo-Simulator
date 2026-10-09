import { useMemo, useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import { StatCard, WealthChart } from '../index';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const ResultsView = () => {
  const {
    you,
    other,
    years,
    finalYou,
    finalOther,
    difference,
    crossoverYear,
    marriagePlan,
    retirementPlan,
    chartDataWithMonteCarlo,
    hasMonteCarloBand,
    useLogScale,
    setUseLogScale,
    useRealAsset,
    setUseRealAsset,
    useHouseInChart,
    setUseHouseInChart,
    wealthChartHeight,
    setWealthChartHeight,
    showMCBands,
    setShowMCBands,
    loanCompletionYear,
    jepqFinancialIndependenceYear,
    houseValueFinal,
    remainingLoanFinal,
    netHouseEquity,
    finalFinancialAssets,
    // Portfolio Monte Carlo
    portfolio,
    portfolioMcResult,
    portfolioMcChartData,
    portfolioStdDev,
    portfolioRate,
    portfolioMcChartHeight,
    setPortfolioMcChartHeight,
    // S&P500 Monte Carlo  
    mcResult,
    // Asset Tracking
    assetRecords,
    showActualAssets,
    setShowActualAssets,
    copyResults,
    copied,
    resolvedTheme: theme,
  } = useSimulator();
  const [mcYear, setMcYear] = useState(years);
  const [portfolioMcYear, setPortfolioMcYear] = useState(years);

  const isDark = theme === 'dark';
  const chartColors = {
    grid: theme === 'dark' ? '#3a3733' : '#e6dfd8',
    axis: theme === 'dark' ? '#4a463f' : '#e6dfd8',
    tick: theme === 'dark' ? '#c9c5bd' : '#6c6a64',
    tooltipBg: theme === 'dark' ? 'rgba(24, 23, 21, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: theme === 'dark' ? '#3a3733' : '#e6dfd8',
    tooltipText: theme === 'dark' ? '#dedad2' : '#3d3d3a',
  };
  const mcHistogramFill = theme === 'dark' ? '#818cf8' : '#6366f1';
  const portfolioHistogramFill = theme === 'dark' ? '#c084fc' : '#a855f7';
  const portfolioTooltipContainer = isDark
    ? 'rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-lg text-xs'
    : 'rounded-xl border border-purple-200 bg-white/95 p-3 shadow-lg text-xs';
  const portfolioTooltipTitle = isDark ? 'text-slate-200' : 'text-gray-800';
  const portfolioTooltipText = isDark ? 'text-slate-300' : 'text-gray-600';
  const portfolioTooltipP10 = isDark ? 'text-purple-300' : 'text-purple-700';
  const portfolioTooltipP50 = isDark ? 'text-purple-100' : 'text-purple-900';
  const portfolioTooltipP90 = isDark ? 'text-emerald-300' : 'text-emerald-700';

  const formatEok = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${(n / 10000).toFixed(2)}억`;
  };

  const formatPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${(n * 100).toFixed(2)}%`;
  };

  const buildHistogram = (samples = [], bins = 18) => {
    if (!samples?.length) return [];
    const positive = samples.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (!positive.length) return [];
    const min = positive[0];
    const max = positive[positive.length - 1];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0) return [];
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logWidth = logMax === logMin ? 1 : (logMax - logMin) / bins;
    const hist = new Array(bins).fill(0);
    positive.forEach((v) => {
      const idx = logMax === logMin ? 0 : Math.min(bins - 1, Math.floor((Math.log10(v) - logMin) / logWidth));
      hist[idx] += 1;
    });
    return hist.map((count, i) => {
      const start = Math.pow(10, logMin + i * logWidth);
      const end = Math.pow(10, logMin + (i + 1) * logWidth);
      return { label: `${(start / 10000).toFixed(1)}~${(end / 10000).toFixed(1)}억`, count };
    });
  };

  const buildSampleStats = (samples = []) => {
    if (!samples?.length) return null;
    const filtered = samples.filter((v) => Number.isFinite(v));
    if (!filtered.length) return null;
    const sorted = [...filtered].sort((a, b) => a - b);
    const pick = (p) => {
      const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
      return sorted[idx];
    };
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const belowZeroProbability = sorted.filter((v) => v <= 0).length / sorted.length;
    return {
      p5: pick(0.05),
      p50: pick(0.5),
      p95: pick(0.95),
      mean,
      belowZeroProbability,
    };
  };

  const mcHistogramData = useMemo(() => buildHistogram(mcResult?.samplesByYear?.[mcYear]), [mcResult, mcYear]);
  const mcHistogramTotal = useMemo(() => mcHistogramData.reduce((s, d) => s + (d.count || 0), 0), [mcHistogramData]);
  const mcSummary = useMemo(() => {
    if (!mcResult) return null;
    const stats = buildSampleStats(mcResult.samplesByYear?.[mcYear]);
    if (stats) return stats;
    return {
      p5: mcResult.p5,
      p50: mcResult.median,
      p95: mcResult.p95,
      mean: mcResult.mean,
      belowZeroProbability: mcResult.belowZeroProbability,
    };
  }, [mcResult, mcYear]);

  const portfolioMcHistogramData = useMemo(
    () => buildHistogram(portfolioMcResult?.samplesByYear?.[portfolioMcYear]),
    [portfolioMcResult, portfolioMcYear]
  );
  const portfolioMcHistogramTotal = useMemo(
    () => portfolioMcHistogramData.reduce((s, d) => s + (d.count || 0), 0),
    [portfolioMcHistogramData]
  );

  const startWealthChartResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = wealthChartHeight;

    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.max(260, Math.min(900, startHeight + delta));
      setWealthChartHeight(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startPortfolioMcResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = portfolioMcChartHeight;

    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.max(180, Math.min(700, startHeight + delta));
      setPortfolioMcChartHeight(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">결과 및 차트</h1>
        <p className="text-body">{years}년 후 예상 자산과 성장 추이를 확인하세요.</p>
        <div className="mt-4">
          <button
            onClick={copyResults}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              copied
                ? 'bg-emerald-500 text-white shadow-emerald-100'
                : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 shadow-sm dark:bg-surface-dark-elevated dark:text-indigo-300 dark:border-slate-600 dark:hover:bg-slate-700'
            }`}
          >
            {copied ? (
              <>
                <span>✓</span> 복사 완료!
              </>
            ) : (
              <>
                <span>📋</span> 결과 복사하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={`${you.name} 자산`}
          value={`${finalYou.toFixed(2)}억`}
          subtitle={`${years}년 후 예상`}
          color="blue"
        />
        <StatCard
          title={`${other.name} 자산`}
          value={`${finalOther.toFixed(2)}억`}
          subtitle={`${years}년 후 예상`}
          color="red"
        />
        <StatCard
          title="자산 차이"
          value={`${Math.abs(difference).toFixed(2)}억`}
          subtitle={difference >= 0 ? `${you.name} 우위` : `${other.name} 우위`}
          color={difference >= 0 ? 'green' : 'orange'}
        />
        <StatCard
          title="추월 시점"
          value={crossoverYear !== null ? `${crossoverYear}년` : '-'}
          subtitle={crossoverYear !== null ? '후 역전' : '이미 우위'}
          color="purple"
        />
      </section>

      {/* Asset Breakdown */}
      {marriagePlan.enabled && marriagePlan.buyHouse && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="금융 자산"
            value={`${finalFinancialAssets.toFixed(2)}억`}
            subtitle="투자 자산"
            color="blue"
          />
          <StatCard
            title="주택 순자산"
            value={`${netHouseEquity.toFixed(2)}억`}
            subtitle={`집값 ${houseValueFinal.toFixed(1)}억 - 대출 ${remainingLoanFinal.toFixed(1)}억`}
            color="green"
          />
          <StatCard
            title="월 자산소득"
            value={`${((finalYou * 10000 * 0.04) / 12).toFixed(0)}만원`}
            subtitle="4% 룰 기준"
            color="purple"
          />
        </section>
      )}

      {/* Main Chart */}
      <section className="chart-container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-heading-2">자산 성장 차트</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer dark:text-slate-300">
              <input
                type="checkbox"
                checked={useLogScale}
                onChange={(e) => setUseLogScale(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              로그 스케일
            </label>
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
          </div>
        </div>

        <WealthChart
          chartData={chartDataWithMonteCarlo}
          you={you}
          other={other}
          years={years}
          marriagePlan={marriagePlan}
          retirementPlan={retirementPlan}
          personRetireYear={you.retireYear}
          spouseRetireYear={marriagePlan.spouse?.retireYear || you.retireYear}
          jepqFinancialIndependenceYear={jepqFinancialIndependenceYear}
          useLogScale={useLogScale}
          useRealAsset={useRealAsset}
          inflationRate={retirementPlan.inflationRate || 2}
          useHouseInChart={useHouseInChart}
          loanCompletionYear={loanCompletionYear}
          monteCarloEnabled={hasMonteCarloBand && showMCBands}
          height={wealthChartHeight}
          showNoMarriageComparison={false}
          showActualAssets={showActualAssets}
          onToggleActualAssets={setShowActualAssets}
          hasActualAssetData={assetRecords && assetRecords.length > 0}
        />

        {/* Resize Handle */}
        <div
          onPointerDown={startWealthChartResize}
          className="h-3 w-full cursor-row-resize rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors mt-2 flex items-center justify-center dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          <div className="w-8 h-1 bg-gray-300 rounded" />
        </div>
      </section>

      {/* Monte Carlo Comparison Section - Shows both MC results side by side */}
      {(mcResult || (portfolio?.enabled && portfolioMcResult)) && (
        <section className="grid grid-cols-1 gap-6">
          {/* S&P500 Monte Carlo Results */}
          {mcResult && (
            <div className="bg-surface-soft rounded-xl p-5 border border-hairline shadow-sm dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-lg">
                  🎲
                </div>
                <div>
                  <h3 className="text-lg font-bold text-indigo-800">S&P500 몬테카를로</h3>
                  <p className="text-xs text-indigo-600">과거 수익률 셔플 기반 · 결혼/주택/은퇴 반영</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">5% (워스트)</div>
                  <div className="text-xl font-bold text-indigo-700">
                    {formatEok(mcSummary?.p5)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">50% (중앙값)</div>
                  <div className="text-xl font-bold text-indigo-900">
                    {formatEok(mcSummary?.p50)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">95% (베스트)</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {formatEok(mcSummary?.p95)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">파산 확률</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatPercent(mcSummary?.belowZeroProbability)}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-indigo-600 bg-indigo-100/50 p-2 rounded">
                <strong>시뮬레이션 횟수:</strong> {mcResult.iterations}회 · 
                <strong> 평균:</strong> {formatEok(mcSummary?.mean)}
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                <div className="font-semibold">분포 연도</div>
                <input
                  type="range"
                  min={0}
                  max={years}
                  value={mcYear}
                  onChange={(e) => setMcYear(Number(e.target.value))}
                  className="w-48"
                />
                <div className="text-xs text-gray-500">{mcYear}년 후</div>
              </div>
              {mcHistogramData.length > 0 && (
                <div className="mt-3 h-56 bg-white/60 rounded-lg p-2 dark:bg-surface-dark-elevated/60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mcHistogramData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="label"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={60}
                        tick={{ fontSize: 10, fill: chartColors.tick }}
                        axisLine={{ stroke: chartColors.axis }}
                        tickLine={{ stroke: chartColors.axis }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: chartColors.tick }}
                        axisLine={{ stroke: chartColors.axis }}
                        tickLine={{ stroke: chartColors.axis }}
                      />
                      <Tooltip
                        formatter={(v) => {
                          const count = Number(v) || 0;
                          const pct = mcHistogramTotal > 0 ? (count / mcHistogramTotal) * 100 : 0;
                          return [`${count}회 (${pct.toFixed(2)}%)`, '빈도'];
                        }}
                        labelFormatter={(l) => `구간: ${l}`}
                        contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                        labelStyle={{ color: chartColors.tooltipText }}
                        itemStyle={{ color: chartColors.tooltipText }}
                      />
                      <Bar dataKey="count" fill={mcHistogramFill} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Portfolio Monte Carlo Results */}
          {portfolio?.enabled && portfolioMcResult && (
            <div className="bg-surface-soft rounded-xl p-5 border border-hairline shadow-sm dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-800">포트폴리오 몬테카를로</h3>
                  <p className="text-xs text-purple-600">자산 배분 변동성 기반 · 단순 적립 시뮬레이션</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">10% (보수적)</div>
                  <div className="text-xl font-bold text-purple-700">
                    {formatEok(portfolioMcResult.percentiles?.p10?.[portfolioMcYear])}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">50% (중앙값)</div>
                  <div className="text-xl font-bold text-purple-900">
                    {formatEok(portfolioMcResult.percentiles?.p50?.[portfolioMcYear])}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">90% (낙관적)</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {formatEok(portfolioMcResult.percentiles?.p90?.[portfolioMcYear])}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-hairline dark:bg-surface-dark-elevated/80 dark:border-slate-700">
                  <div className="text-xs text-gray-500">기대수익률</div>
                  <div className="text-xl font-bold text-purple-600">
                    {portfolioRate.toFixed(1)}%
                  </div>
                </div>
              </div>
              
                <div className="text-xs text-purple-600 bg-purple-100/50 p-2 rounded mb-4">
                  <strong>시뮬레이션:</strong> {portfolioMcResult.numSimulations}회 · 
                  <strong> 표준편차:</strong> σ {portfolioStdDev.toFixed(1)}%
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                  <div className="font-semibold">분포 연도</div>
                  <input
                    type="range"
                    min={0}
                    max={years}
                    value={portfolioMcYear}
                    onChange={(e) => setPortfolioMcYear(Number(e.target.value))}
                    className="w-48"
                  />
                  <div className="text-xs text-gray-500">{portfolioMcYear}년 후</div>
                </div>
                {portfolioMcHistogramData.length > 0 && (
                  <div className="mt-3 h-56 bg-white/60 rounded-lg p-2 dark:bg-surface-dark-elevated/60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portfolioMcHistogramData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                          dataKey="label"
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={60}
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          axisLine={{ stroke: chartColors.axis }}
                          tickLine={{ stroke: chartColors.axis }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          axisLine={{ stroke: chartColors.axis }}
                          tickLine={{ stroke: chartColors.axis }}
                        />
                        <Tooltip
                          formatter={(v) => {
                            const count = Number(v) || 0;
                            const pct = portfolioMcHistogramTotal > 0 ? (count / portfolioMcHistogramTotal) * 100 : 0;
                            return [`${count}회 (${pct.toFixed(2)}%)`, '빈도'];
                          }}
                          labelFormatter={(l) => `구간: ${l}`}
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                          labelStyle={{ color: chartColors.tooltipText }}
                          itemStyle={{ color: chartColors.tooltipText }}
                        />
                        <Bar dataKey="count" fill={portfolioHistogramFill} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

              {/* Portfolio MC Chart */}
              {portfolioMcChartData.length > 0 && (
                <div className="bg-white/60 rounded-lg p-2 dark:bg-surface-dark-elevated/60" style={{ height: portfolioMcChartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={portfolioMcChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioMc90" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c084fc" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="portfolioMc50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(v) => `${v}년`}
                        tick={{ fontSize: 10, fill: chartColors.tick }}
                        axisLine={{ stroke: chartColors.axis }}
                        tickLine={{ stroke: chartColors.axis }}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v?.toFixed(0) || 0}억`}
                        tick={{ fontSize: 10, fill: chartColors.tick }}
                        axisLine={{ stroke: chartColors.axis }}
                        tickLine={{ stroke: chartColors.axis }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          if (!row) return null;
                          const fmt = (v) => (v === null || v === undefined ? '-' : `${v.toFixed(2)}억`);
                          return (
                            <div className={portfolioTooltipContainer}>
                              <div className={`font-semibold mb-1 ${portfolioTooltipTitle}`}>{label}년 후</div>
                              <div className={`space-y-0.5 ${portfolioTooltipText}`}>
                                <div className="flex justify-between gap-3">
                                  <span>p10</span>
                                  <span className={`font-bold ${portfolioTooltipP10}`}>{fmt(row.p10)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span>p50</span>
                                  <span className={`font-bold ${portfolioTooltipP50}`}>{fmt(row.p50)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span>p90</span>
                                  <span className={`font-bold ${portfolioTooltipP90}`}>{fmt(row.p90)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {/* 10~90% band */}
                      <Area type="monotone" dataKey="band90Base" stackId="mc90" stroke="none" fillOpacity={0} isAnimationActive={false} />
                      <Area type="monotone" dataKey="band90" stackId="mc90" stroke="none" fill="url(#portfolioMc90)" fillOpacity={1} isAnimationActive={false} />
                      {/* 25~75% band */}
                      <Area type="monotone" dataKey="band50Base" stackId="mc50" stroke="none" fillOpacity={0} isAnimationActive={false} />
                      <Area type="monotone" dataKey="band50" stackId="mc50" stroke="none" fill="url(#portfolioMc50)" fillOpacity={1} isAnimationActive={false} />
                      {/* Median line */}
                      <Line type="monotone" dataKey="p50" stroke="#7c3aed" strokeWidth={2.5} name="중앙값" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {portfolioMcChartData.length > 0 && (
                <div
                  onPointerDown={startPortfolioMcResize}
                  className="h-3 w-full cursor-row-resize rounded bg-white/60 border border-purple-200 hover:bg-white/80 transition-colors mt-2 flex items-center justify-center"
                >
                  <div className="w-8 h-1 bg-purple-300 rounded" />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* MC Comparison Guide */}
      {mcResult && portfolio?.enabled && portfolioMcResult && (
        <section className="bg-surface-card border border-hairline rounded-xl p-4 dark:bg-surface-dark-elevated dark:border-slate-700">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <span>💡</span> 두 몬테카를로 시뮬레이션의 차이
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/70 rounded-lg p-3 border border-hairline dark:bg-surface-dark-soft/70 dark:border-slate-700">
              <div className="font-semibold text-indigo-700 mb-1 dark:text-indigo-300">🎲 S&P500 몬테카를로</div>
              <ul className="text-gray-600 text-xs space-y-1 dark:text-slate-300">
                <li>• <strong>과거 데이터:</strong> 1975~2024 실제 S&P500 수익률 사용</li>
                <li>• <strong>이벤트 반영:</strong> 결혼, 주택구매, 대출상환, 은퇴 인출 모두 포함</li>
                <li>• <strong>용도:</strong> 실제 인생 계획의 리스크 분석</li>
              </ul>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
              <div className="font-semibold text-purple-700 mb-1 dark:text-purple-300">📊 포트폴리오 몬테카를로</div>
              <ul className="text-gray-600 text-xs space-y-1 dark:text-slate-300">
                <li>• <strong>변동성 모델:</strong> 정규분포 기반 포트폴리오 변동성 시뮬레이션</li>
                <li>• <strong>이벤트 미반영:</strong> 단순 적립만 계산 (결혼/주택/은퇴 제외)</li>
                <li>• <strong>용도:</strong> 자산 배분 전략의 수익률 범위 분석</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Summary Info */}
      <section className="section-amber rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 dark:text-slate-100">
          <span>📋</span> 상세 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-slate-300">
          <div>
            <h4 className="font-semibold mb-2">{you.name} (본인)</h4>
            <ul className="space-y-1">
              <li>• 초기 자산: {you.initial.toLocaleString()}만원</li>
              <li>• 월 투자: {you.monthly.toLocaleString()}만원</li>
              <li>• 연 수익률: {you.rate}%</li>
              {retirementPlan.enabled && (
                <li>• 은퇴 시점: {you.retireYear}년 후</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{other.name} (비교대상)</h4>
            <ul className="space-y-1">
              <li>• 초기 자산: {other.initial.toLocaleString()}만원</li>
              <li>• 월 투자: {other.monthly.toLocaleString()}만원</li>
              <li>• 연 수익률: {other.rate}%</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResultsView;
