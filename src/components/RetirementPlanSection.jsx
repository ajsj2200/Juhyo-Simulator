import InputGroup from './InputGroup';

const RetirementPlanSection = ({
  retirementPlan,
  setRetirementPlan,
  personRetireYear,
  spouseRetireYear,
  marriageEnabled,
  years,
  retireYearAsset,
}) => {
  // 실제 은퇴 시점 (둘 중 늦은 시점)
  const effectiveRetireYear = marriageEnabled
    ? Math.max(personRetireYear, spouseRetireYear)
    : personRetireYear;

  return (
    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow mb-8 border-2 border-green-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">🏖️ 은퇴 계획</h2>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={retirementPlan.enabled}
            onChange={(e) =>
              setRetirementPlan({ ...retirementPlan, enabled: e.target.checked })
            }
            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">활성화</span>
        </label>
      </div>

      {retirementPlan.enabled && (
        <>
          {/* 은퇴 시점 안내 */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-green-200">
            <h3 className="font-semibold text-gray-700 mb-3">⏰ 은퇴 시점</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-gray-600">본인 은퇴</div>
                <div className="text-xl font-bold text-blue-600">{personRetireYear}년 후</div>
                <div className="text-xs text-gray-500">
                  (PersonCard에서 설정)
                </div>
              </div>
              {marriageEnabled && (
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-gray-600">배우자 은퇴</div>
                  <div className="text-xl font-bold text-purple-600">{spouseRetireYear}년 후</div>
                  <div className="text-xs text-gray-500">
                    (결혼 계획에서 설정)
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
              <span className="font-semibold text-gray-700">실제 인출 시작: </span>
              <span className="text-orange-600 font-bold">{effectiveRetireYear}년 후</span>
              <span className="text-gray-500 text-xs ml-2">
                (둘 다 은퇴한 시점부터)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 인출 전략 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">인출 전략</h3>

              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-gray-700 text-sm">전략 선택</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retirementPlan.useJEPQ}
                    onChange={(e) =>
                      setRetirementPlan({ ...retirementPlan, useJEPQ: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm">JEPQ 혼합</span>
                </label>
              </div>

              {!retirementPlan.useJEPQ ? (
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <p className="font-semibold text-gray-700">4% 룰 (VOO 100%)</p>
                  <p className="text-gray-600 text-xs mt-1">
                    자산의 4%를 매년 인출
                    <br />
                    30년 이상 유지 가능
                  </p>
                </div>
              ) : (
                <>
                  <InputGroup
                    label="JEPQ 비율"
                    value={retirementPlan.jepqRatio}
                    onChange={(v) => setRetirementPlan({ ...retirementPlan, jepqRatio: v })}
                    min={0}
                    max={100}
                    step={10}
                    unit="%"
                  />

                  <div className="p-3 bg-purple-50 rounded text-sm">
                    <p className="text-gray-600">
                      JEPQ {retirementPlan.jepqRatio}% / VOO {100 - retirementPlan.jepqRatio}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">JEPQ: 배당 수입 | VOO: 자산 성장</p>
                  </div>
                </>
              )}
            </div>

            {/* 생활비 & 수익률 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">생활비 & 수익률</h3>

              <InputGroup
                label="월 생활비"
                value={retirementPlan.monthlyExpense}
                onChange={(v) => setRetirementPlan({ ...retirementPlan, monthlyExpense: v })}
                min={100}
                max={1000}
                step={50}
                unit="만원"
              />

              <InputGroup
                label="인플레이션"
                value={retirementPlan.inflationRate}
                onChange={(v) => setRetirementPlan({ ...retirementPlan, inflationRate: v })}
                min={0}
                max={5}
                step={0.5}
                unit="%"
              />

              {retirementPlan.useJEPQ && (
                <>
                  <InputGroup
                    label="JEPQ 배당률"
                    value={retirementPlan.jepqDividendRate}
                    onChange={(v) =>
                      setRetirementPlan({ ...retirementPlan, jepqDividendRate: v })
                    }
                    min={5}
                    max={12}
                    step={0.5}
                    unit="%"
                  />

                  <InputGroup
                    label="VOO 성장률 (은퇴 후)"
                    value={retirementPlan.vooGrowthRate}
                    onChange={(v) =>
                      setRetirementPlan({ ...retirementPlan, vooGrowthRate: v })
                    }
                    min={4}
                    max={12}
                    step={0.5}
                    unit="%"
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {retirementPlan.enabled && (
        <div className="mt-4 p-4 bg-white rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">📊 은퇴 계획 요약</h4>

          {effectiveRetireYear > years ? (
            <div className="text-sm text-orange-600 p-3 bg-orange-50 rounded">
              ⚠️ 은퇴 시점({effectiveRetireYear}년)이 투자 기간({years}년)보다 깁니다.
              <br />
              투자 기간을 {effectiveRetireYear}년 이상으로 설정해주세요.
            </div>
          ) : (
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                • {effectiveRetireYear}년 후 은퇴 시 자산:
                <strong className="text-green-600 ml-2">{retireYearAsset.toFixed(2)}억원</strong>
              </p>

              {retirementPlan.useJEPQ ? (
                <>
                  <div className="pt-2 border-t">
                    <p className="font-semibold text-purple-600">
                      JEPQ {retirementPlan.jepqRatio}% + VOO {100 - retirementPlan.jepqRatio}% 전략
                    </p>
                  </div>
                  <p>
                    • JEPQ 자산 ({retirementPlan.jepqRatio}%):
                    <strong className="ml-2">
                      {((retireYearAsset * retirementPlan.jepqRatio) / 100).toFixed(2)}억원
                    </strong>
                  </p>
                  <p className="ml-4 text-xs">
                    → 월 배당 (세전):{' '}
                    {(
                      ((((retireYearAsset * retirementPlan.jepqRatio) / 100) * 10000 * retirementPlan.jepqDividendRate) / 100) /
                      12
                    ).toFixed(0)}
                    만원
                  </p>
                  <p className="ml-4 text-xs">
                    → 월 배당 (세후 84.6%):{' '}
                    {(
                      (((((retireYearAsset * retirementPlan.jepqRatio) / 100) * 10000 * retirementPlan.jepqDividendRate) / 100) / 12) *
                      0.846
                    ).toFixed(0)}
                    만원
                  </p>
                  <p>
                    • VOO 자산 ({100 - retirementPlan.jepqRatio}%):
                    <strong className="ml-2">
                      {((retireYearAsset * (100 - retirementPlan.jepqRatio)) / 100).toFixed(2)}억원
                    </strong>
                  </p>
                  <p className="ml-4 text-xs text-gray-500">
                    → 연 {retirementPlan.vooGrowthRate}% 성장 예상
                  </p>
                  <div className="pt-2 border-t mt-2">
                    <p>
                      • 월 생활비 (현재):
                      <strong className="text-gray-700 ml-2">{retirementPlan.monthlyExpense}만원</strong>
                    </p>
                    <p>
                      • {effectiveRetireYear}년 후 생활비 (인플레이션):
                      <strong className="text-orange-600 ml-2">
                        {(
                          retirementPlan.monthlyExpense *
                          Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)
                        ).toFixed(0)}
                        만원
                      </strong>
                    </p>
                    <p className="font-semibold mt-2">
                      {(((((retireYearAsset * retirementPlan.jepqRatio) / 100) * 10000 * retirementPlan.jepqDividendRate) / 100 / 12) * 0.846) >=
                      retirementPlan.monthlyExpense * Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)
                        ? '✅ JEPQ 배당만으로 생활비 충당 가능!'
                        : '⚠️ JEPQ 배당 부족, VOO 일부 매도 필요'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    • 연간 인출 가능액 (4% 룰):
                    <strong className="text-green-600 ml-2">
                      {(retireYearAsset * 10000 * 0.04).toFixed(0)}만원
                    </strong>
                  </p>
                  <p>
                    • 월 사용 가능액:
                    <strong className="text-green-600 ml-2">
                      {((retireYearAsset * 10000 * 0.04) / 12).toFixed(0)}만원
                    </strong>
                  </p>
                  <p>
                    • 월 생활비 (현재):
                    <strong className="text-gray-700 ml-2">{retirementPlan.monthlyExpense}만원</strong>
                  </p>
                  <p>
                    • {effectiveRetireYear}년 후 생활비 (인플레이션):
                    <strong className="text-orange-600 ml-2">
                      {(
                        retirementPlan.monthlyExpense *
                        Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)
                      ).toFixed(0)}
                      만원
                    </strong>
                  </p>
                  <div className="pt-2 border-t mt-2">
                    <p className="font-semibold">
                      {(retireYearAsset * 10000 * 0.04) / 12 >=
                      retirementPlan.monthlyExpense * Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)
                        ? '✅ 은퇴 가능! (4% 룰로 생활비 충당)'
                        : '⚠️ 은퇴 자산 부족 (더 저축하거나 은퇴 시점 연기 필요)'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RetirementPlanSection;
