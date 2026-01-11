import { useSimulator } from '../../contexts/SimulatorContext';
import { StatCard, WealthChart } from '../index';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
    // S&P500 Monte Carlo  
    mcResult,
  } = useSimulator();

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">결과 및 차트</h1>
        <p className="text-body">{years}년 후 예상 자산과 성장 추이를 확인하세요.</p>
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
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useLogScale}
                onChange={(e) => setUseLogScale(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              로그 스케일
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useRealAsset}
                onChange={(e) => setUseRealAsset(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              실질가치
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useHouseInChart}
                onChange={(e) => setUseHouseInChart(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              주택 포함
            </label>
            {hasMonteCarloBand && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
          useLogScale={useLogScale}
          useRealAsset={useRealAsset}
          inflationRate={retirementPlan.inflationRate || 2}
          useHouseInChart={useHouseInChart}
          loanCompletionYear={loanCompletionYear}
          monteCarloEnabled={hasMonteCarloBand && showMCBands}
          height={wealthChartHeight}
        />

        {/* Resize Handle */}
        <div
          onPointerDown={startWealthChartResize}
          className="h-3 w-full cursor-row-resize rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors mt-2 flex items-center justify-center"
        >
          <div className="w-8 h-1 bg-gray-300 rounded" />
        </div>
      </section>

      {/* Monte Carlo Comparison Section - Shows both MC results side by side */}
      {(mcResult || (portfolio?.enabled && portfolioMcResult)) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* S&P500 Monte Carlo Results */}
          {mcResult && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200 shadow-sm">
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
                <div className="p-3 rounded-lg bg-white/80 border border-indigo-100">
                  <div className="text-xs text-gray-500">5% (워스트)</div>
                  <div className="text-xl font-bold text-indigo-700">
                    {(mcResult.p5 / 10000).toFixed(2)}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-indigo-100">
                  <div className="text-xs text-gray-500">50% (중앙값)</div>
                  <div className="text-xl font-bold text-indigo-900">
                    {(mcResult.median / 10000).toFixed(2)}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-indigo-100">
                  <div className="text-xs text-gray-500">95% (베스트)</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {(mcResult.p95 / 10000).toFixed(2)}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-indigo-100">
                  <div className="text-xs text-gray-500">파산 확률</div>
                  <div className="text-xl font-bold text-red-600">
                    {(mcResult.belowZeroProbability * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-indigo-600 bg-indigo-100/50 p-2 rounded">
                <strong>시뮬레이션 횟수:</strong> {mcResult.iterations}회 · 
                <strong> 평균:</strong> {(mcResult.mean / 10000).toFixed(2)}억
              </div>
            </div>
          )}

          {/* Portfolio Monte Carlo Results */}
          {portfolio?.enabled && portfolioMcResult && (
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
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
                <div className="p-3 rounded-lg bg-white/80 border border-purple-100">
                  <div className="text-xs text-gray-500">10% (보수적)</div>
                  <div className="text-xl font-bold text-purple-700">
                    {(portfolioMcResult.percentiles?.p10?.[years] / 10000)?.toFixed(2) || '-'}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-purple-100">
                  <div className="text-xs text-gray-500">50% (중앙값)</div>
                  <div className="text-xl font-bold text-purple-900">
                    {(portfolioMcResult.percentiles?.p50?.[years] / 10000)?.toFixed(2) || '-'}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-purple-100">
                  <div className="text-xs text-gray-500">90% (낙관적)</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {(portfolioMcResult.percentiles?.p90?.[years] / 10000)?.toFixed(2) || '-'}억
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/80 border border-purple-100">
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

              {/* Portfolio MC Chart */}
              {portfolioMcChartData.length > 0 && (
                <div className="h-48 bg-white/60 rounded-lg p-2">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="year" tickFormatter={(v) => `${v}년`} tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v?.toFixed(0) || 0}억`} tick={{ fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          if (!row) return null;
                          const fmt = (v) => (v === null || v === undefined ? '-' : `${v.toFixed(2)}억`);
                          return (
                            <div className="rounded-xl border border-purple-200 bg-white/95 p-3 shadow-lg text-xs">
                              <div className="font-semibold text-gray-800 mb-1">{label}년 후</div>
                              <div className="space-y-0.5 text-gray-600">
                                <div className="flex justify-between gap-3"><span>p10</span><span className="font-bold text-purple-700">{fmt(row.p10)}</span></div>
                                <div className="flex justify-between gap-3"><span>p50</span><span className="font-bold text-purple-900">{fmt(row.p50)}</span></div>
                                <div className="flex justify-between gap-3"><span>p90</span><span className="font-bold text-emerald-700">{fmt(row.p90)}</span></div>
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
            </div>
          )}
        </section>
      )}

      {/* MC Comparison Guide */}
      {mcResult && portfolio?.enabled && portfolioMcResult && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <span>💡</span> 두 몬테카를로 시뮬레이션의 차이
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
              <div className="font-semibold text-indigo-700 mb-1">🎲 S&P500 몬테카를로</div>
              <ul className="text-gray-600 text-xs space-y-1">
                <li>• <strong>과거 데이터:</strong> 1975~2024 실제 S&P500 수익률 사용</li>
                <li>• <strong>이벤트 반영:</strong> 결혼, 주택구매, 대출상환, 은퇴 인출 모두 포함</li>
                <li>• <strong>용도:</strong> 실제 인생 계획의 리스크 분석</li>
              </ul>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
              <div className="font-semibold text-purple-700 mb-1">📊 포트폴리오 몬테카를로</div>
              <ul className="text-gray-600 text-xs space-y-1">
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
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📋</span> 상세 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
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
