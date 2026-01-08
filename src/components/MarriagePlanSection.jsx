import InputGroup from './InputGroup';
import { calculateMonthlyPaymentEqual, getLoanPaymentAtMonth } from '../utils/calculations';

const MarriagePlanSection = ({ marriagePlan, setMarriagePlan, personMonthly }) => {
  const updateSpouse = (updates) => {
    const next = { ...marriagePlan.spouse, ...updates };
    const income = Number(next.salary) || 0;
    const expense = Number(next.expense) || 0;
    next.monthly = Math.max(0, income - expense);
    setMarriagePlan({ ...marriagePlan, spouse: next });
  };

  const clampLoanByLTV = (housePrice, loanAmount) => {
    const maxLoan = housePrice * 0.8; // LTV 80%
    return Math.min(Math.max(0, loanAmount), maxLoan);
  };

  const handleHousePriceChange = (v) => {
    const clampedLoan = clampLoanByLTV(v, marriagePlan.loanAmount);
    const downPayment = Math.max(0, v - clampedLoan);
    setMarriagePlan({ ...marriagePlan, housePrice: v, loanAmount: clampedLoan, downPayment });
  };

  const handleLoanAmountChange = (v) => {
    const clampedLoan = clampLoanByLTV(marriagePlan.housePrice, v);
    const downPayment = Math.max(0, marriagePlan.housePrice - clampedLoan);
    setMarriagePlan({ ...marriagePlan, loanAmount: clampedLoan, downPayment });
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

  // 중도상환 예상 잔액
  const prepayRemaining =
    marriagePlan.buyHouse && marriagePlan.prepayEnabled
      ? (() => {
          const monthsSinceLoanStart = Math.floor((marriagePlan.prepayYear || 0) * 12);
          const info = getLoanPaymentAtMonth(
            marriagePlan.loanAmount,
            marriagePlan.loanRate,
            marriagePlan.loanYears,
            marriagePlan.repaymentType,
            monthsSinceLoanStart
          );
          return Math.max(0, info.remainingPrincipal);
        })()
      : 0;

  const effectiveLoanYears = marriagePlan.prepayEnabled
    ? Math.min(marriagePlan.prepayYear, marriagePlan.loanYears)
    : marriagePlan.loanYears;

  const addSpouseAdjustment = () => {
    setMarriagePlan({
      ...marriagePlan,
      spouse: {
        ...marriagePlan.spouse,
        adjustments: [
          ...(marriagePlan.spouse.adjustments || []),
          { year: (marriagePlan.spouse.adjustments?.slice(-1)[0]?.year || 0) + 1, monthly: marriagePlan.spouse.monthly },
        ],
      },
    });
  };

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
                label="배우자 세후 월급"
                value={marriagePlan.spouse.salary}
                onChange={(v) => updateSpouse({ salary: v })}
                min={0}
                max={2000}
                step={10}
                unit="만원/월"
              />

              <InputGroup
                label="배우자 초기 자산"
                value={marriagePlan.spouse.initial || 0}
                onChange={(v) => updateSpouse({ initial: v })}
                min={-100000}
                max={100000}
                step={100}
                unit="만원"
              />

              <InputGroup
                label="배우자 월 생활비"
                value={marriagePlan.spouse.expense || 0}
                onChange={(v) => updateSpouse({ expense: v })}
                min={0}
                max={2000}
                step={10}
                unit="만원/월"
              />

              <div className="p-3 bg-purple-50 rounded mb-2">
                <div className="text-sm text-gray-600">배우자 월 투자 가능액</div>
                <div className="text-xl font-bold text-purple-700">
                  {marriagePlan.spouse.monthly}만원
                </div>
              </div>

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
                label="배우자 연 수익률"
                value={marriagePlan.spouse.rate || 0}
                onChange={(v) => updateSpouse({ rate: v })}
                min={0}
                max={30}
                step={0.5}
                unit="%"
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
                    ? ((marriagePlan.spouse.monthly / marriagePlan.spouse.salary) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">배우자 저축 변경</h4>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-700"
                    onClick={addSpouseAdjustment}
                  >
                    + 추가
                  </button>
                </div>
                {(marriagePlan.spouse.adjustments || []).length === 0 && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    특정 연도부터 투자액을 변경하려면 “+ 추가”를 눌러 입력하세요.
                  </div>
                )}
                <div className="space-y-2">
                  {(marriagePlan.spouse.adjustments || []).map((adj, idx) => (
                    <div key={`${idx}-${adj.year}`} className="grid grid-cols-2 gap-2 items-end bg-gray-50 p-2 rounded">
                      <InputGroup
                        label="변경 시점(년 후)"
                        value={adj.year}
                        onChange={(v) => {
                          const next = [...marriagePlan.spouse.adjustments];
                          next[idx] = { ...next[idx], year: v };
                          updateSpouse({ adjustments: next });
                        }}
                        min={0}
                        max={70}
                        step={0.5}
                        unit="년"
                      />
                      <InputGroup
                        label="변경 후 월 투자액"
                        value={adj.monthly}
                        onChange={(v) => {
                          const next = [...marriagePlan.spouse.adjustments];
                          next[idx] = { ...next[idx], monthly: v };
                          updateSpouse({ adjustments: next });
                        }}
                        min={0}
                        max={2000}
                        step={10}
                        unit="만원"
                      />
                      <button
                        type="button"
                        className="col-span-2 text-xs text-red-600 hover:underline"
                        onClick={() => {
                          const next = [...marriagePlan.spouse.adjustments];
                          next.splice(idx, 1);
                          updateSpouse({ adjustments: next });
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
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
                  label="대출금액 (최대 LTV 80%)"
                  value={marriagePlan.loanAmount}
                  onChange={handleLoanAmountChange}
                  min={0}
                  max={marriagePlan.housePrice * 0.8}
                  step={100}
                  unit="만원"
                />

                <div className="p-3 bg-blue-50 rounded">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>대출금액</span>
                    <span>LTV {(marriagePlan.housePrice > 0 ? (marriagePlan.loanAmount / marriagePlan.housePrice) * 100 : 0).toFixed(1)}%</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {marriagePlan.loanAmount.toLocaleString()}만원
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({(marriagePlan.loanAmount / 10000).toFixed(1)}억원)
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    자기자본: {marriagePlan.downPayment.toLocaleString()}만원 ({(marriagePlan.downPayment / 10000).toFixed(1)}억)
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

                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-gray-700">중도상환</h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marriagePlan.prepayEnabled}
                      onChange={(e) =>
                        setMarriagePlan({ ...marriagePlan, prepayEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="ml-2 text-sm text-amber-700">결혼 후 일시 상환</span>
                  </label>
                </div>

                {marriagePlan.prepayEnabled && (
                  <>
                    <InputGroup
                      label="중도상환 시점"
                      value={marriagePlan.prepayYear}
                      onChange={(v) =>
                        setMarriagePlan({
                          ...marriagePlan,
                          prepayYear: Math.min(Math.max(0, v), marriagePlan.loanYears),
                        })
                      }
                      min={0}
                      max={marriagePlan.loanYears}
                      step={1}
                      unit="년 (결혼 후)"
                    />
                    <div className="p-3 bg-amber-50 rounded text-sm text-amber-800">
                      예상 잔액: {prepayRemaining.toLocaleString()}만원
                      <span className="text-xs text-gray-600 ml-2">
                        (대출 {marriagePlan.prepayYear}년차 기준)
                      </span>
                    </div>
                  </>
                )}

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
                      결혼 {effectiveLoanYears}년 후
                      <span className="text-xs font-normal ml-1">
                        (투자 시작 {marriagePlan.yearOfMarriage + effectiveLoanYears}년 후)
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
