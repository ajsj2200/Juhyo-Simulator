import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import InputGroup from '../InputGroup';

const CrisisView = () => {
  const { crisis, setCrisis, useHistoricalReturns, setUseHistoricalReturns, historicalStartYear, setHistoricalStartYear, SP500_YEARS } = useSimulator();

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
              onChange={(e) => setUseHistoricalReturns(e.target.checked)}
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
              {SP500_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              선택한 연도부터 실제 S&P500 수익률이 순차적으로 적용됩니다.
            </p>
          </div>
        )}
      </Card>

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
