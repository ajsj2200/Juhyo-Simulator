import InputGroup from './InputGroup';
import { calculateMonthlyPaymentEqual } from '../utils/calculations';

const MarriagePlanSection = ({ marriagePlan, setMarriagePlan, personMonthly }) => {
  const updateSpouse = (updates) => {
    setMarriagePlan({
      ...marriagePlan,
      spouse: { ...marriagePlan.spouse, ...updates },
    });
  };

  const updateLoanAmount = (housePrice, downPayment) => {
    return Math.max(0, housePrice - downPayment);
  };

  const handleHousePriceChange = (v) => {
    const newLoanAmount = updateLoanAmount(v, marriagePlan.downPayment);
    setMarriagePlan({ ...marriagePlan, housePrice: v, loanAmount: newLoanAmount });
  };

  const handleDownPaymentChange = (v) => {
    const newLoanAmount = updateLoanAmount(marriagePlan.housePrice, v);
    setMarriagePlan({ ...marriagePlan, downPayment: v, loanAmount: newLoanAmount });
  };

  // 초기 월 상환액 계산
  const initialMonthlyPayment = marriagePlan.buyHouse
    ? (() => {
        if (marriagePlan.repaymentType === 'increasing') {
          // 체증식: 초기에는 이자만
          return marriagePlan.loanAmount * (marriagePlan.loanRate / 100 / 12);
        } else if (marriagePlan.repaymentType === 'equalPrincipal') {
          // 원금균등: 원금 + 초기 이자
          const monthlyPrincipal = marriagePlan.loanAmount / (marriagePlan.loanYears * 12);
          const interest = marriagePlan.loanAmount * (marriagePlan.loanRate / 100 / 12);
          return monthlyPrincipal + interest;
        } else {
          // 원리금균등
          return calculateMonthlyPaymentEqual(marriagePlan.loanAmount, marriagePlan.loanRate, marriagePlan.loanYears);
        }
      })()
    : 0;

  // 대출 완료 후 월 순저축
  const netSavingsAfterLoan = personMonthly + marriagePlan.spouse.monthly;

  // 대출 중 월 순저축
  const netSavingsDuringLoan = Math.max(0, netSavingsAfterLoan - initialMonthlyPayment);

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg shadow mb-8 border-2 border-pink-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">💒 결혼 계획</h2>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={marriagePlan.enabled}
            onChange={(e) => setMarriagePlan({ ...marriagePlan, enabled: e.target.checked })}
            className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">활성화</span>
        </label>
      </div>

      {marriagePlan.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">기본 정보</h3>

            <InputGroup
              label="결혼 시점"
              value={marriagePlan.yearOfMarriage}
              onChange={(v) => setMarriagePlan({ ...marriagePlan, yearOfMarriage: v })}
              min={0}
              max={20}
              step={1}
              unit="년 후"
            />

            <div className="p-4 bg-white rounded-lg border border-pink-200">
              <h4 className="font-semibold text-gray-700 mb-3">👫 배우자 정보</h4>

              <InputGroup
                label="배우자 이름"
                value={marriagePlan.spouse.name}
                onChange={(v) => updateSpouse({ name: v })}
                min={0}
                max={500}
                step={10}
                unit=""
              />

              <InputGroup
                label="배우자 월 투자액"
                value={marriagePlan.spouse.monthly}
                onChange={(v) => updateSpouse({ monthly: v })}
                min={0}
                max={500}
                step={10}
                unit="만원"
              />

              <InputGroup
                label="배우자 투자액 증가율"
                value={marriagePlan.spouse.monthlyGrowthRate}
                onChange={(v) => updateSpouse({ monthlyGrowthRate: v })}
                min={0}
                max={10}
                step={0.1}
                unit="%/년"
              />

              <InputGroup
                label="배우자 연봉"
                value={marriagePlan.spouse.salary}
                onChange={(v) => updateSpouse({ salary: v })}
                min={0}
                max={30000}
                step={100}
                unit="만원"
              />

              <InputGroup
                label="배우자 은퇴 시점"
                value={marriagePlan.spouse.retireYear}
                onChange={(v) => updateSpouse({ retireYear: v })}
                min={1}
                max={40}
                step={1}
                unit="년 후"
              />

              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-600">배우자 저축률: </span>
                <span className="font-bold text-purple-600">
                  {marriagePlan.spouse.salary > 0
                    ? ((marriagePlan.spouse.monthly / (marriagePlan.spouse.salary / 12)) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* 주택 대출 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-gray-700">🏠 주택 구매</h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={marriagePlan.buyHouse}
                  onChange={(e) =>
                    setMarriagePlan({ ...marriagePlan, buyHouse: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">집 구매</span>
              </label>
            </div>

            {marriagePlan.buyHouse && (
              <>
                <InputGroup
                  label="집 가격"
                  value={marriagePlan.housePrice}
                  onChange={handleHousePriceChange}
                  min={10000}
                  max={200000}
                  step={1000}
                  unit="만원"
                />

                <InputGroup
                  label="자기자본 (보증금/현금)"
                  value={marriagePlan.downPayment}
                  onChange={handleDownPaymentChange}
                  min={0}
                  max={marriagePlan.housePrice}
                  step={1000}
                  unit="만원"
                />

                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-sm text-gray-600">대출금액</div>
                  <div className="text-xl font-bold text-blue-600">
                    {marriagePlan.loanAmount.toLocaleString()}만원
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({(marriagePlan.loanAmount / 10000).toFixed(1)}억원)
                    </span>
                  </div>
                </div>

                <InputGroup
                  label="대출 금리"
                  value={marriagePlan.loanRate}
                  onChange={(v) => setMarriagePlan({ ...marriagePlan, loanRate: v })}
                  min={0}
                  max={10}
                  step={0.1}
                  unit="%"
                />

                <InputGroup
                  label="대출 기간"
                  value={marriagePlan.loanYears}
                  onChange={(v) => setMarriagePlan({ ...marriagePlan, loanYears: v })}
                  min={10}
                  max={40}
                  step={1}
                  unit="년"
                />

                <InputGroup
                  label="주택 가격 상승률"
                  value={marriagePlan.houseAppreciationRate}
                  onChange={(v) => setMarriagePlan({ ...marriagePlan, houseAppreciationRate: v })}
                  min={-5}
                  max={10}
                  step={0.1}
                  unit="%/년"
                />

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상환 방식
                  </label>
                  <select
                    value={marriagePlan.repaymentType}
                    onChange={(e) =>
                      setMarriagePlan({ ...marriagePlan, repaymentType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="equalPayment">원리금균등 (매월 동일 납부)</option>
                    <option value="equalPrincipal">원금균등 (점차 감소)</option>
                    <option value="increasing">체증식 (초기 이자 위주, 점차 증가)</option>
                  </select>
                </div>

                <div className="p-3 bg-orange-50 rounded space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">초기 월 상환액: </span>
                    <span className="font-bold text-orange-600">
                      {initialMonthlyPayment.toFixed(0)}만원
                    </span>
                  </div>
                  {marriagePlan.repaymentType === 'equalPrincipal' && (
                    <div className="text-xs text-gray-500">
                      * 원금균등: 매월 원금 {(marriagePlan.loanAmount / marriagePlan.loanYears / 12).toFixed(0)}만원 상환,
                      이자는 점차 감소
                    </div>
                  )}
                  {marriagePlan.repaymentType === 'increasing' && (
                    <div className="text-xs text-gray-500">
                      * 체증식: 초기 이자 위주로 납부, 시간이 지날수록 원금 상환 증가
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-600">대출 완료 시점: </span>
                    <span className="font-bold text-green-600">
                      결혼 {marriagePlan.loanYears}년 후
                      <span className="text-xs font-normal ml-1">
                        (투자 시작 {marriagePlan.yearOfMarriage + marriagePlan.loanYears}년 후)
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {marriagePlan.enabled && (
        <div className="mt-4 p-4 bg-white rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">📊 결혼 후 월 순저축</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• 본인 투자: +{personMonthly}만원</p>
            <p>• 배우자 투자: +{marriagePlan.spouse.monthly}만원</p>
            {marriagePlan.buyHouse && (
              <>
                <p className="text-red-600">
                  • 대출 상환 (초기): -{initialMonthlyPayment.toFixed(0)}만원
                </p>
                <p className="font-bold text-lg pt-2 border-t">
                  대출 중 순저축: {netSavingsDuringLoan.toFixed(0)}만원
                </p>
                <p className="font-bold text-lg text-green-600">
                  대출 완료 후: {netSavingsAfterLoan}만원
                </p>
              </>
            )}
            {!marriagePlan.buyHouse && (
              <p className="font-bold text-lg pt-2 border-t">합계: {netSavingsAfterLoan}만원</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarriagePlanSection;
