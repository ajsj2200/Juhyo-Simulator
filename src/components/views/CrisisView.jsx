import { useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import InputGroup from '../InputGroup';
import Modal from '../ui/Modal';
import { SP500_ANNUAL_RETURNS } from '../../constants/sp500History';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

const CrisisView = () => {
  const {
    crisis,
    setCrisis,
    useHistoricalReturns,
    setUseHistoricalReturns,
    historicalStartYear,
    setHistoricalStartYear,
    useExchangeRate,
    setUseExchangeRate,
    SP500_YEARS,
    mcResult,
    clearSp500MonteCarlo,
    theme,
  } = useSimulator();

  const [exclusiveModalOpen, setExclusiveModalOpen] = useState(false);

  const chartColors = {
    grid: theme === 'dark' ? '#334155' : '#e5e7eb',
    axis: theme === 'dark' ? '#475569' : '#e5e7eb',
    tick: theme === 'dark' ? '#cbd5e1' : '#6b7280',
    tooltipBg: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: theme === 'dark' ? '#334155' : '#e5e7eb',
    tooltipText: theme === 'dark' ? '#e2e8f0' : '#374151',
    tooltipCursor: theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(99, 102, 241, 0.06)',
    zeroLine: theme === 'dark' ? '#64748b' : '#94a3b8',
    highlight: theme === 'dark' ? '#4ade80' : '#16a34a',
    line: theme === 'dark' ? '#60a5fa' : '#2563eb',
    barPositive: theme === 'dark' ? '#22c55e' : '#86efac',
    barNegative: theme === 'dark' ? '#f87171' : '#fca5a5',
    barPositiveActive: theme === 'dark' ? '#4ade80' : '#16a34a',
    barNegativeActive: theme === 'dark' ? '#f87171' : '#dc2626',
  };

  const onToggleHistorical = (next) => {
    if (next && mcResult) {
      setExclusiveModalOpen(true);
      return;
    }
    setUseHistoricalReturns(next);
  };

  const maxYearsToShow = 100;
  const yearsToShow = SP500_YEARS.slice(Math.max(0, SP500_YEARS.length - maxYearsToShow));

  const sp500ChartData = yearsToShow.reduce((acc, year, idx) => {
    const ret = Number(SP500_ANNUAL_RETURNS[year] ?? 0);
    const prevLevel = idx === 0 ? 100 : Number(acc[acc.length - 1]?.level ?? 100);
    const level = idx === 0 ? 100 : prevLevel * (1 + ret / 100);
    return [...acc, { year, ret, level }];
  }, []);

  const formatIndexTick = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${Math.round(n / 1000).toLocaleString('ko-KR')}k`;
    return Math.round(n).toLocaleString('ko-KR');
  };

  const selectedReturn = SP500_ANNUAL_RETURNS[historicalStartYear];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">위기 시나리오</h1>
        <p className="text-body">대공황 등 위기 상황을 시뮬레이션합니다.</p>
      </div>

      {/* Historical Returns Mode */}
      <Card variant="green">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-heading-3">히스토리컬 수익률 모드</h3>
            <p className="text-sm text-gray-500">과거 S&P500 실제 수익률로 시뮬레이션</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useHistoricalReturns}
              onChange={(e) => onToggleHistorical(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {useHistoricalReturns && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작 연도
            </label>
            <select
              value={historicalStartYear}
              onChange={(e) => setHistoricalStartYear(Number(e.target.value))}
              className="input"
            >
              {yearsToShow.map((year) => (
                <option key={year} value={year}>
                  {year}년 ({(SP500_ANNUAL_RETURNS[year] ?? 0).toFixed(2)}%)
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              선택한 연도부터 실제 S&P500 수익률이 순차적으로 적용됩니다.
            </p>
            <div className="mt-2 text-xs text-gray-600">
              선택 연도 수익률: <span className="font-semibold">{(selectedReturn ?? 0).toFixed(2)}%</span>
            </div>

            {/* 환율 반영 토글 */}
            <div className="mt-4 p-4 bg-white/50 rounded-lg border border-green-100 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">원/달러 환율 변동 반영</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    과거 실제 환율 변동을 적용하여 원화 기준 수익률을 계산합니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={useExchangeRate}
                    onChange={(e) => setUseExchangeRate(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-800">
                  최근 {yearsToShow.length}년 S&P500 차트 (최대 100년)
                </div>
                <div className="text-xs text-gray-500">선택 연도는 세로선으로 표시</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2">
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    S&P500 누적 지수 (시작=100)
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sp500ChartData} margin={{ top: 8, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                          dataKey="year"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          tickLine={false}
                          axisLine={{ stroke: chartColors.axis }}
                          interval={9}
                          tickFormatter={(v) => `${v}`}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          tickLine={false}
                          axisLine={{ stroke: chartColors.axis }}
                          tickFormatter={formatIndexTick}
                          width={48}
                        />
                        <ReferenceLine x={historicalStartYear} stroke={chartColors.highlight} strokeDasharray="4 4" />
                        <Tooltip
                          formatter={(v, name) => {
                            if (name === 'level') {
                              return [formatIndexTick(v), '지수(시작=100)'];
                            }
                            if (name === 'ret') {
                              return [`${Number(v).toFixed(2)}%`, '연 수익률'];
                            }
                            return [String(v), name];
                          }}
                          labelFormatter={(l) => `${l}년`}
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                          labelStyle={{ color: chartColors.tooltipText }}
                          itemStyle={{ color: chartColors.tooltipText }}
                        />
                        <Line
                          type="monotone"
                          dataKey="level"
                          stroke={chartColors.line}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-2">
                  <div className="text-xs font-semibold text-gray-700 mb-1">연도별 수익률 (Total Return)</div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sp500ChartData} margin={{ top: 8, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                          dataKey="year"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          tickLine={false}
                          axisLine={{ stroke: chartColors.axis }}
                          interval={9}
                          tickFormatter={(v) => `${v}`}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: chartColors.tick }}
                          tickLine={false}
                          axisLine={{ stroke: chartColors.axis }}
                          tickFormatter={(v) => `${v}%`}
                          width={42}
                        />
                        <ReferenceLine y={0} stroke={chartColors.zeroLine} strokeDasharray="4 4" />
                        <ReferenceLine x={historicalStartYear} stroke={chartColors.highlight} strokeDasharray="4 4" />
                        <Tooltip
                          cursor={{ fill: chartColors.tooltipCursor }}
                          formatter={(v) => [`${Number(v).toFixed(2)}%`, '수익률']}
                          labelFormatter={(l) => `${l}년`}
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                          labelStyle={{ color: chartColors.tooltipText }}
                          itemStyle={{ color: chartColors.tooltipText }}
                        />
                        <Bar dataKey="ret" radius={[4, 4, 0, 0]}>
                          {sp500ChartData.map((row) => (
                            <Cell
                              key={row.year}
                              fill={
                                row.year === historicalStartYear
                                  ? row.ret >= 0
                                    ? chartColors.barPositiveActive
                                    : chartColors.barNegativeActive
                                  : row.ret >= 0
                                  ? chartColors.barPositive
                                  : chartColors.barNegative
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                누적 지수는 해당 구간의 첫 해를 100으로 두고, 연 수익률을 누적 적용한 값입니다.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={exclusiveModalOpen}
        title="몬테카를로 모드 선택"
        description="히스토리컬 수익률 모드와 S&P500 몬테카를로는 동시에 적용될 수 없습니다. 하나만 선택해 주세요."
        onClose={() => setExclusiveModalOpen(false)}
      >
        <div className="space-y-3">
          <button
            type="button"
            className="w-full btn btn-primary"
            onClick={() => {
              clearSp500MonteCarlo();
              setUseHistoricalReturns(true);
              setExclusiveModalOpen(false);
            }}
          >
            히스토리컬 수익률 모드 사용
          </button>
          <button
            type="button"
            className="w-full btn btn-secondary"
            onClick={() => {
              setUseHistoricalReturns(false);
              setExclusiveModalOpen(false);
            }}
          >
            S&P500 몬테카를로 유지
          </button>
          <button
            type="button"
            className="w-full btn"
            onClick={() => setExclusiveModalOpen(false)}
          >
            취소
          </button>
        </div>
      </Modal>

      {/* Crisis Scenario */}
      <Card variant="amber">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-heading-3">위기 시나리오 (대공황)</h3>
            <p className="text-sm text-gray-500">특정 기간 동안 시장 하락을 가정</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={crisis.enabled}
              onChange={(e) => setCrisis((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {crisis.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <InputGroup
              label="시작 시점"
              value={crisis.startYear}
              onChange={(v) => setCrisis((prev) => ({ ...prev, startYear: v }))}
              min={1}
              max={50}
              step={1}
              unit="년차"
            />
            <InputGroup
              label="지속 기간"
              value={crisis.duration}
              onChange={(v) => setCrisis((prev) => ({ ...prev, duration: v }))}
              min={1}
              max={10}
              step={1}
              unit="년"
            />
            <InputGroup
              label="하락률"
              value={crisis.drawdownRate}
              onChange={(v) => setCrisis((prev) => ({ ...prev, drawdownRate: v }))}
              min={-50}
              max={0}
              step={1}
              unit="%"
            />
          </div>
        )}

        {crisis.enabled && (
          <div className="mt-4 p-3 bg-amber-100 rounded-lg">
            <p className="text-sm text-amber-800">
              {crisis.startYear}년차부터 {crisis.duration}년간 연 {crisis.drawdownRate}% 수익률이 적용됩니다.
              이는 대공황 수준의 극단적인 시나리오입니다.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CrisisView;
