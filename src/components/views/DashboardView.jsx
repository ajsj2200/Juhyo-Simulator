import { useSimulator } from '../../contexts/SimulatorContext';
import { StatCard } from '../index';

const DashboardView = () => {
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
    youSavingsRate,
    otherSavingsRate,
  } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">대시보드</h1>
        <p className="text-body">주요 지표를 한눈에 확인하세요.</p>
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

      {/* Quick Insights */}
      <section className="section-amber rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>💡</span> 핵심 인사이트
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            • <strong>{you.name}</strong>의 저축률: <span className="text-blue-600 font-medium">{youSavingsRate}%</span>
            {' '}vs <strong>{other.name}</strong>: <span className="text-red-600 font-medium">{otherSavingsRate}%</span>
          </p>
          {crossoverYear !== null && crossoverYear > 0 && (
            <p className="text-green-600 font-medium">
              • {crossoverYear}년 후 {you.name}의 자산이 {other.name}을 추월합니다!
            </p>
          )}
          {finalYou > 0 && (
            <p>
              • {years}년 후 {you.name}의 월 자산소득(4%룰): <span className="font-medium">{((finalYou * 10000 * 0.04) / 12).toFixed(0)}만원</span>
            </p>
          )}
          {marriagePlan.enabled && marriagePlan.buyHouse && (
            <p>
              • 결혼 {marriagePlan.yearOfMarriage}년 후 주택 구매 예정 (대출: {marriagePlan.loanAmount.toLocaleString()}만원)
            </p>
          )}
          {retirementPlan.enabled && (
            <p>
              • 은퇴 목표: {you.retireYear}년 후, 월 생활비 {retirementPlan.monthlyExpense.toLocaleString()}만원
            </p>
          )}
        </div>
      </section>

      {/* Setting Status */}
      <section>
        <h3 className="text-heading-3 mb-3">현재 설정 상태</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💒</span>
              <span className="font-semibold text-gray-800">결혼/주택</span>
            </div>
            <div className="text-sm text-gray-600">
              {marriagePlan.enabled ? (
                <>
                  <p>✓ 활성화됨</p>
                  {marriagePlan.buyHouse && (
                    <p className="text-xs mt-1">주택 구매 계획 포함</p>
                  )}
                </>
              ) : (
                <p>비활성화</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏖️</span>
              <span className="font-semibold text-gray-800">은퇴 계획</span>
            </div>
            <div className="text-sm text-gray-600">
              {retirementPlan.enabled ? (
                <>
                  <p>✓ 활성화됨</p>
                  <p className="text-xs mt-1">{you.retireYear}년 후 은퇴</p>
                </>
              ) : (
                <p>비활성화</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📊</span>
              <span className="font-semibold text-gray-800">시뮬레이션</span>
            </div>
            <div className="text-sm text-gray-600">
              <p>기간: {years}년</p>
              <p className="text-xs mt-1">예상 수익률: {you.rate}%</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardView;
