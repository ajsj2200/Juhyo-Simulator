import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import InputGroup from '../InputGroup';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const LoanView = () => {
  const { loanCalc, setLoanCalc, loanCalcResult, loanChartData } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">대출 계산기</h1>
        <p className="text-body">대출 상환 계획을 시뮬레이션합니다.</p>
      </div>

      <Card>
        <h3 className="text-heading-3 mb-4">대출 조건</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputGroup
            label="대출액"
            value={loanCalc.amount}
            onChange={(v) => setLoanCalc((prev) => ({ ...prev, amount: v }))}
            min={0}
            max={200000}
            step={100}
            unit="만원"
          />
          <InputGroup
            label="금리"
            value={loanCalc.rate}
            onChange={(v) => setLoanCalc((prev) => ({ ...prev, rate: v }))}
            min={0}
            max={20}
            step={0.1}
            unit="%"
          />
          <InputGroup
            label="기간"
            value={loanCalc.years}
            onChange={(v) => setLoanCalc((prev) => ({ ...prev, years: v }))}
            min={1}
            max={40}
            step={1}
            unit="년"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상환 방식</label>
            <select
              value={loanCalc.type}
              onChange={(e) => setLoanCalc((prev) => ({ ...prev, type: e.target.value }))}
              className="input"
            >
              <option value="equalPayment">원리금균등</option>
              <option value="equalPrincipal">원금균등</option>
              <option value="increasing">체증식</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <InputGroup
            label="물가상승률"
            value={loanCalc.inflation}
            onChange={(v) => setLoanCalc((prev) => ({ ...prev, inflation: v }))}
            min={0}
            max={10}
            step={0.1}
            unit="%/년 (실질 상환액 계산)"
          />
        </div>
      </Card>

      {loanCalcResult && (
        <Card>
          <h3 className="text-heading-3 mb-4">상환 계획</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">초기 월 상환액</div>
              <div className="text-2xl font-bold text-blue-700">
                {loanCalcResult.monthly.toFixed(0).toLocaleString()}만원
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">1년차 월 상환액</div>
              <div className="text-2xl font-bold text-gray-800">
                {loanCalcResult.after1Year.toFixed(0).toLocaleString()}만원
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">5년차 월 상환액</div>
              <div className="text-2xl font-bold text-gray-800">
                {loanCalcResult.after5Year.toFixed(0).toLocaleString()}만원
              </div>
            </div>
          </div>

          {loanChartData.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loanChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    label={{ value: '개월', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.toFixed(0)}
                    label={{ value: '상환액(만원)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${Number(value).toFixed(0)}만원`,
                      props?.dataKey === 'payment' ? '명목' : '실질',
                    ]}
                    labelFormatter={(l) => `${l}개월차`}
                  />
                  <Line
                    type="monotone"
                    dataKey="payment"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="명목 상환액"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="realPayment"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="실질 상환액"
                    dot={false}
                    strokeDasharray="5 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span className="text-gray-600">명목 상환액</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed' }}></div>
              <span className="text-gray-600">실질 상환액 (인플레이션 반영)</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LoanView;
