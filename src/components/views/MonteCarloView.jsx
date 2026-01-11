import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import InputGroup from '../InputGroup';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const MonteCarloView = () => {
  const {
    years,
    mcOptions,
    setMcOptions,
    mcAccumulateEnabled,
    setMcAccumulateEnabled,
    mcResult,
    mcChartData,
    mcHistogramTotal,
    runMonteCarlo,
    SP500_STATS,
  } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">몬테카를로 시뮬레이션</h1>
        <p className="text-body">S&P500 과거 수익률을 기반으로 다양한 시나리오를 시뮬레이션합니다.</p>
      </div>

      <Card variant="blue">
        <div className="space-y-4">
          <div>
            <h3 className="text-heading-3 mb-2">시뮬레이션 설정</h3>
            <p className="text-sm text-gray-600 mb-4">
              {SP500_STATS.startYear}~{SP500_STATS.endYear} 연도별 수익률을 무작위 순서로 섞어 {years}년간
              현재 시나리오(결혼/주택/은퇴 포함)를 시뮬레이션합니다.
              {mcAccumulateEnabled && mcResult ? ` (누적 총 ${mcResult.iterations}회)` : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputGroup
              label="시뮬레이션 횟수"
              value={mcOptions.iterations}
              onChange={(v) => setMcOptions((prev) => ({ ...prev, iterations: v }))}
              min={100}
              max={20000}
              step={100}
              unit="회"
            />
            <InputGroup
              label="시드"
              value={mcOptions.seed}
              onChange={(v) => setMcOptions((prev) => ({ ...prev, seed: v }))}
              min={1}
              max={1000000000}
              step={1}
              unit=""
            />
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={mcAccumulateEnabled}
                  onChange={(e) => setMcAccumulateEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
                이전 결과에 누적
              </label>
              <button
                type="button"
                onClick={runMonteCarlo}
                className="btn btn-primary"
              >
                실행
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
            <p>• <strong>샘플링:</strong> 매년 과거 수익률 목록에서 1개를 복원추출로 뽑아 {years}년 시퀀스를 만듭니다.</p>
            <p>• <strong>적용:</strong> 결혼/주택/은퇴 이벤트를 월 단위로 동일 엔진에 적용합니다.</p>
            <p>• <strong>결과:</strong> 최종 순자산 분포와 연도별 분위수 밴드(p10/p25/p50/p75/p90)를 계산합니다.</p>
            <p>• <strong>Seed:</strong> 동일 시드/동일 입력이면 결과가 재현됩니다.</p>
          </div>
        </div>
      </Card>

      {mcResult && (
        <Card>
          <h3 className="text-heading-3 mb-4">시뮬레이션 결과</h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs text-gray-600">5% (워스트)</div>
              <div className="text-lg font-bold text-blue-700">
                {(mcResult.p5 / 10000).toFixed(2)}억
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-600">50% (중앙값)</div>
              <div className="text-lg font-bold text-gray-800">
                {(mcResult.median / 10000).toFixed(2)}억
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-gray-600">95% (베스트)</div>
              <div className="text-lg font-bold text-emerald-700">
                {(mcResult.p95 / 10000).toFixed(2)}억
              </div>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
              <div className="text-xs text-gray-600">평균</div>
              <div className="text-lg font-bold text-orange-700">
                {(mcResult.mean / 10000).toFixed(2)}억
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="text-xs text-gray-600">파산 확률</div>
              <div className="text-lg font-bold text-red-700">
                {(mcResult.belowZeroProbability * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {mcChartData.length > 0 && (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mcChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => {
                        const count = Number(v) || 0;
                        const pct = mcHistogramTotal > 0 ? (count / mcHistogramTotal) * 100 : 0;
                        return [`${count}회 (${pct.toFixed(2)}%)`, '빈도'];
                      }}
                      labelFormatter={(l) => `구간: ${l}`}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                이 히스토그램은 "최종 순자산(집 포함, 대출 차감)"의 분포입니다.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default MonteCarloView;
