import { calculateMonthlyPaymentEqual } from '../utils/calculations';

const InsightsSection = ({
  you,
  other,
  youSavingsRate,
  otherSavingsRate,
  marriagePlan,
  finalYou,
  finalYouNoMarriage,
  marriageDifference,
  crossoverYear,
  youIncome,
  years,
  jepqFinancialIndependenceYear,
  loanCompletionYear,
}) => {
  const initialMonthlyPayment = marriagePlan.buyHouse
    ? calculateMonthlyPaymentEqual(marriagePlan.loanAmount, marriagePlan.loanRate, marriagePlan.loanYears)
    : 0;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg shadow border-l-4 border-yellow-500">
      <h3 className="text-lg font-bold text-gray-800 mb-3">💡 핵심 인사이트</h3>
      <div className="space-y-2 text-gray-700">
        <p>
          • <strong>{you.name}</strong>의 저축률:{' '}
          <span className="text-blue-600 font-bold">{youSavingsRate}%</span> vs{' '}
          <strong>{other.name}</strong>:{' '}
          <span className="text-red-600 font-bold">{otherSavingsRate}%</span>
        </p>
        <p>
          • <strong>{you.name}</strong> 수익률:{' '}
          <span className="text-blue-600 font-bold">{you.rate}%</span> vs{' '}
          <strong>{other.name}</strong>:{' '}
          <span className="text-red-600 font-bold">{other.rate}%</span>
          {other.rate <= 3.5 && (
            <span className="ml-2 text-xs text-gray-600">
              (📊 실제 통계: 적금 67% + 주식 단타 29%)
            </span>
          )}
        </p>
        <p>
          • 세후 월급 차이: <strong>{Math.abs(you.salary - other.salary).toLocaleString()}만원</strong>{' '}
          ({you.salary > other.salary ? you.name : other.name}이 더 높음)
        </p>
        <p>
          • 월 투자액 차이: <strong>{Math.abs(you.monthly - other.monthly)}만원</strong>{' '}
          ({you.monthly > other.monthly ? you.name : other.name}이 더 많이 투자)
        </p>

        {marriagePlan.enabled && (
          <div className="pt-2 border-t border-yellow-300 mt-3">
            <p className="text-purple-600 font-semibold">
              💒 {marriagePlan.yearOfMarriage}년 후 결혼 계획:
            </p>
            <p className="ml-4">
              • 결혼 후 월 순저축:{' '}
              <strong className="text-green-600">
                {Math.max(
                  0,
                  you.monthly +
                    marriagePlan.spouse.monthly -
                    (marriagePlan.buyHouse ? initialMonthlyPayment : 0)
                ).toFixed(0)}
                만원
              </strong>{' '}
              (본인 {you.monthly} + 배우자 {marriagePlan.spouse.monthly}
              {marriagePlan.buyHouse && ` - 대출 ${initialMonthlyPayment.toFixed(0)}`})
            </p>
            {marriagePlan.buyHouse && (
              <>
                <p className="ml-4 text-sm text-gray-600">
                  • {marriagePlan.housePrice.toLocaleString()}만원 (
                  {(marriagePlan.housePrice / 10000).toFixed(1)}억) 집 구매
                </p>
                <p className="ml-4 text-sm text-gray-600">
                  • 대출 {marriagePlan.loanAmount.toLocaleString()}만원, {marriagePlan.loanRate}% 금리,{' '}
                  {marriagePlan.loanYears}년 상환
                </p>
                <p className="ml-4 text-sm text-green-600 font-semibold">
                  • 대출 완료: 결혼 {loanCompletionYear - marriagePlan.yearOfMarriage}년 후 (투자 시작{' '}
                  {loanCompletionYear}년 후)
                </p>
              </>
            )}
            <p className="ml-4 mt-2">
              • 결혼 안했을 때: <span className="text-gray-600">{finalYouNoMarriage.toFixed(2)}억</span> →
              결혼 후:{' '}
              <span className={marriageDifference >= 0 ? 'text-green-600' : 'text-orange-600'}>
                {finalYou.toFixed(2)}억 ({marriageDifference >= 0 ? '+' : ''}
                {marriageDifference.toFixed(2)}억)
              </span>
            </p>
            <p className="ml-4 text-sm">
              {marriageDifference >= 0
                ? `✨ 결혼으로 자산이 ${Math.abs(marriageDifference).toFixed(2)}억 더 늘어납니다!`
                : `⚠️ 대출 부담으로 자산이 ${Math.abs(marriageDifference).toFixed(2)}억 줄어듭니다.`}
            </p>
          </div>
        )}

        {crossoverYear !== null && (
          <p className="text-green-600 font-bold">
            ✓ {crossoverYear}년 후에 {finalYou > finalYouNoMarriage ? you.name : other.name}이
            역전합니다!
          </p>
        )}

        <p className="text-purple-600 font-bold mt-4">
          {years}년 후 {you.name}의 자산소득(연 {you.rate}%)은 월{' '}
          <strong>{(youIncome / 12).toFixed(0)}만원</strong>입니다.
        </p>

        {/* JEPQ 경제적 자유 시점 */}
        {jepqFinancialIndependenceYear !== null && (
          <p className="text-amber-600 font-bold mt-2 p-3 bg-amber-50 rounded-lg border border-amber-300">
            💰 {jepqFinancialIndependenceYear}년 후부터 JEPQ 배당금만으로 생활비 충당 가능!
          </p>
        )}
      </div>

      {/* 일반인 모드 설명 */}
      {other.rate <= 3.5 && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-yellow-300">
          <h4 className="font-semibold text-gray-800 mb-2">📊 왜 일반인은 수익률이 3.4%일까?</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• 적금 비중 67% (수익률 3.5%) = 2.33%</p>
            <p>• 주식 비중 29% (실제 수익률 3.5%) = 1.00%</p>
            <p className="text-xs text-gray-600 ml-4">
              ※ 코스피는 6.5% 올라도 단타 매매로 실제는 3~4%만 벌어감
            </p>
            <p className="text-xs text-gray-600 ml-4">
              ※ 거래 회전율 270%+, 심리적 실수, 수수료 → 수익률 급락
            </p>
            <p className="font-semibold pt-2 border-t border-yellow-200 mt-2">
              → 가중평균: <span className="text-orange-600">3.4%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsSection;
