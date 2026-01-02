import { useState, useMemo } from 'react';
import {
  PersonCard,
  StatCard,
  PresetButtons,
  MarriagePlanSection,
  RetirementPlanSection,
  WealthChart,
  InsightsSection,
} from './components';
import {
  DEFAULT_PERSON,
  PRESETS,
  DEFAULT_MARRIAGE_PLAN,
  DEFAULT_RETIREMENT_PLAN,
} from './constants/defaults';
import {
  calculateWealthWithMarriage,
  calculateWealth,
  calculateSavingsRate,
  calculateMonthlyPaymentEqual,
} from './utils/calculations';

const InvestmentCalculator = () => {
  // 본인 정보 (은퇴 시점 포함)
  const [you, setYou] = useState(DEFAULT_PERSON.you);

  // 비교 대상
  const [other, setOther] = useState(DEFAULT_PERSON.other);

  // 투자 기간
  const [years, setYears] = useState(10);

  // 결혼 계획 (배우자 은퇴 시점 포함)
  const [marriagePlan, setMarriagePlan] = useState(DEFAULT_MARRIAGE_PLAN);

  // 은퇴 계획
  const [retirementPlan, setRetirementPlan] = useState(DEFAULT_RETIREMENT_PLAN);

  // 프리셋 적용
  const applyPreset = (presetName) => {
    setOther(PRESETS[presetName]);
  };

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    const data = [];
    for (let year = 0; year <= years; year++) {
      data.push({
        year,
        you:
          calculateWealthWithMarriage(you, year, marriagePlan, retirementPlan) / 10000,
        youNoMarriage: calculateWealth(you.initial, you.monthly, you.rate, year, you.monthlyGrowthRate, you, retirementPlan) / 10000,
        other: calculateWealth(other.initial, other.monthly, other.rate, year, other.monthlyGrowthRate, other, retirementPlan) / 10000,
      });
    }
    return data;
  }, [you, other, years, marriagePlan, retirementPlan]);

  // 최종 결과
  const finalYou = chartData[years]?.you || 0;
  const finalYouNoMarriage = chartData[years]?.youNoMarriage || 0;
  const finalOther = chartData[years]?.other || 0;
  const difference = finalYou - finalOther;
  const marriageDifference = finalYou - finalYouNoMarriage;
  const youIncome = finalYou * 10000 * (you.rate / 100);
  const otherIncome = finalOther * 10000 * (other.rate / 100);

  // 실제 은퇴 시점 계산
  const effectiveRetireYear = marriagePlan.enabled
    ? Math.max(you.retireYear, marriagePlan.spouse.retireYear)
    : you.retireYear;

  // 은퇴 시점 자산 계산
  const retireYearAsset =
    retirementPlan.enabled && effectiveRetireYear <= years
      ? chartData[effectiveRetireYear]?.you || 0
      : 0;

  // 교차점 찾기
  const crossoverYear = useMemo(() => {
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].you > chartData[i].other) {
        return i;
      }
    }
    return null;
  }, [chartData]);

  // 저축률 계산
  const youSavingsRate = calculateSavingsRate(you.monthly, you.salary);
  const otherSavingsRate = calculateSavingsRate(other.monthly, other.salary);

  // JEPQ 배당금으로 생활비 충당 가능 시점 계산
  const jepqFinancialIndependenceYear = useMemo(() => {
    if (!retirementPlan.enabled || !retirementPlan.useJEPQ) return null;

    for (let year = 0; year <= years; year++) {
      const assetInManwon = chartData[year]?.you || 0;
      const assetInWon = assetInManwon * 10000;
      const jepqPortion = assetInWon * (retirementPlan.jepqRatio / 100);
      const annualDividend = jepqPortion * (retirementPlan.jepqDividendRate / 100);
      const monthlyDividend = annualDividend / 12;

      // 현재 시점의 인플레이션 반영 생활비
      const yearsFromNow = year >= effectiveRetireYear ? year - effectiveRetireYear : 0;
      const adjustedExpense = retirementPlan.monthlyExpense *
        Math.pow(1 + retirementPlan.inflationRate / 100, yearsFromNow);

      if (monthlyDividend >= adjustedExpense) {
        return year;
      }
    }
    return null;
  }, [chartData, years, retirementPlan, effectiveRetireYear]);

  // 복사 기능
  const [copied, setCopied] = useState(false);

  const copyResults = () => {
    const initialMonthlyPayment = marriagePlan.buyHouse
      ? (() => {
          if (marriagePlan.repaymentType === 'increasing') {
            return marriagePlan.loanAmount * (marriagePlan.loanRate / 100 / 12);
          } else if (marriagePlan.repaymentType === 'equalPrincipal') {
            const monthlyPrincipal = marriagePlan.loanAmount / (marriagePlan.loanYears * 12);
            const interest = marriagePlan.loanAmount * (marriagePlan.loanRate / 100 / 12);
            return monthlyPrincipal + interest;
          } else {
            return calculateMonthlyPaymentEqual(
              marriagePlan.loanAmount,
              marriagePlan.loanRate,
              marriagePlan.loanYears
            );
          }
        })()
      : 0;

    const marriageInfo = marriagePlan.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💒 결혼 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 결혼 시점: ${marriagePlan.yearOfMarriage}년 후

👫 배우자 정보
• 이름: ${marriagePlan.spouse.name}
• 연봉: ${marriagePlan.spouse.salary.toLocaleString()}만원
• 월 투자액: ${marriagePlan.spouse.monthly.toLocaleString()}만원
• 투자액 증가율: ${marriagePlan.spouse.monthlyGrowthRate}%/년
• 저축률: ${((marriagePlan.spouse.monthly / (marriagePlan.spouse.salary / 12)) * 100).toFixed(1)}%
• 은퇴 시점: ${marriagePlan.spouse.retireYear}년 후
${
  marriagePlan.buyHouse
    ? `
🏠 주택 구매 정보
• 집 가격: ${marriagePlan.housePrice.toLocaleString()}만원 (${(marriagePlan.housePrice / 10000).toFixed(1)}억원)
• 자기자본: ${marriagePlan.downPayment.toLocaleString()}만원
• 대출금액: ${marriagePlan.loanAmount.toLocaleString()}만원 (${(marriagePlan.loanAmount / 10000).toFixed(1)}억원)
• 대출 금리: ${marriagePlan.loanRate}%
• 대출 기간: ${marriagePlan.loanYears}년
• 상환방식: ${marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'}
• 초기 월 상환액: ${initialMonthlyPayment.toFixed(0)}만원
• 주택 가격 상승률: ${marriagePlan.houseAppreciationRate}%/년
• 대출 완료: 결혼 ${marriagePlan.loanYears}년 후 (투자 시작 ${marriagePlan.yearOfMarriage + marriagePlan.loanYears}년 후)`
    : `
• 주택 구매: X`
}

💰 결혼 후 재무 현황
• 결혼 후 월 순저축: ${marriagePlan.buyHouse ? Math.max(0, you.monthly + marriagePlan.spouse.monthly - initialMonthlyPayment).toFixed(0) : (you.monthly + marriagePlan.spouse.monthly)}만원
  - 본인 투자: ${you.monthly}만원
  - 배우자 투자: ${marriagePlan.spouse.monthly}만원
${marriagePlan.buyHouse ? `  - 대출 상환: -${initialMonthlyPayment.toFixed(0)}만원` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💍 결혼 효과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 결혼 안했을 때: ${finalYouNoMarriage.toFixed(2)}억원
• 결혼 했을 때: ${finalYou.toFixed(2)}억원
• 차이: ${marriageDifference >= 0 ? '+' : ''}${marriageDifference.toFixed(2)}억원 (${marriageDifference >= 0 ? '+' : ''}${((marriageDifference / finalYouNoMarriage) * 100).toFixed(1)}%)
• ${marriageDifference >= 0 ? '✨ 결혼으로 자산이 더 늘어납니다!' : '⚠️ 대출 부담으로 자산이 줄어듭니다.'}
`
      : '';

    const retirementInfo = retirementPlan.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏖️ 은퇴 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ 은퇴 시점
• 본인 은퇴: ${you.retireYear}년 후
${marriagePlan.enabled ? `• 배우자 은퇴: ${marriagePlan.spouse.retireYear}년 후` : ''}
• 실제 인출 시작: ${effectiveRetireYear}년 후 (둘 다 은퇴 후)
• 은퇴 시 자산: ${retireYearAsset.toFixed(2)}억원

💰 은퇴 후 생활비
• 월 생활비 (현재 기준): ${retirementPlan.monthlyExpense}만원
• 인플레이션: ${retirementPlan.inflationRate}%/년
• ${effectiveRetireYear}년 후 생활비: ${(retirementPlan.monthlyExpense * Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)).toFixed(0)}만원

📊 투자 전략
• 전략: ${retirementPlan.useJEPQ ? `JEPQ ${retirementPlan.jepqRatio}% + VOO ${100 - retirementPlan.jepqRatio}%` : 'VOO 100% (4% 룰)'}
${retirementPlan.useJEPQ ? `• JEPQ 배당률: ${retirementPlan.jepqDividendRate}%/년` : ''}
• VOO 성장률: ${retirementPlan.vooGrowthRate}%/년
${retirementPlan.useJEPQ ? `• JEPQ 성장률: 2%/년 (고정)` : ''}
${jepqFinancialIndependenceYear !== null ? `\n💰 JEPQ 경제적 자유\n• ${jepqFinancialIndependenceYear}년 후부터 JEPQ 배당금만으로 생활비 충당 가능!\n• 이후 배우자는 조기 은퇴 가능` : ''}
`
      : '';

    const text = `
🎯 투자 비교 결과 (${years}년)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${you.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 연봉: ${you.salary.toLocaleString()}만원
• 초기 자산: ${you.initial.toLocaleString()}만원
• 월 투자액: ${you.monthly.toLocaleString()}만원
• 투자액 증가율: ${you.monthlyGrowthRate}%/년
• 연 수익률: ${you.rate}%
• 저축률: ${youSavingsRate}%
• 은퇴 시점: ${you.retireYear}년 후
${marriageInfo}${retirementInfo}
${years}년 후:
• 총 자산: ${finalYou.toFixed(2)}억원
• 연 자산소득: ${youIncome.toFixed(0)}만원 (월 ${(youIncome / 12).toFixed(0)}만원)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${other.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 연봉: ${other.salary.toLocaleString()}만원
• 초기 자산: ${other.initial.toLocaleString()}만원
• 월 투자액: ${other.monthly.toLocaleString()}만원
• 투자액 증가율: ${other.monthlyGrowthRate}%/년
• 연 수익률: ${other.rate}%
• 저축률: ${otherSavingsRate}%

${years}년 후:
• 총 자산: ${finalOther.toFixed(2)}억원
• 연 자산소득: ${otherIncome.toFixed(0)}만원 (월 ${(otherIncome / 12).toFixed(0)}만원)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 비교 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 자산 차이: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}억원 (${((finalYou / finalOther - 1) * 100).toFixed(1)}%)
• 연봉 차이: ${you.salary > other.salary ? you.name : other.name}이 ${Math.abs(you.salary - other.salary).toLocaleString()}만원 더 높음
• 월 저축 차이: ${you.monthly > other.monthly ? you.name : other.name}이 ${Math.abs(you.monthly - other.monthly).toLocaleString()}만원 더 많이 저축
• 수익률 차이: ${you.rate > other.rate ? you.name : other.name}이 ${Math.abs(you.rate - other.rate).toFixed(1)}%p 더 높음
${crossoverYear !== null ? `• 추월 시점: ${crossoverYear}년 후 ${finalYou > finalOther ? you.name : other.name}이 역전` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 핵심 인사이트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ${years}년 후 ${you.name}의 자산만으로도 월 ${(youIncome / 12).toFixed(0)}만원의 소득이 발생합니다.
• 저축률: ${you.name} ${youSavingsRate}% vs ${other.name} ${otherSavingsRate}%
• 수익률의 힘: ${you.rate}%와 ${other.rate}%의 ${years}년 복리 차이는 ${(finalYou / finalOther).toFixed(2)}배입니다.
${marriagePlan.enabled ? `• 결혼 효과: ${marriageDifference >= 0 ? '+' : ''}${marriageDifference.toFixed(2)}억원 (${((finalYou / finalYouNoMarriage - 1) * 100).toFixed(1)}%)` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 연도별 자산 추이 (단위: 억원)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
연도 | ${you.name}${marriagePlan.enabled ? '(결혼)' : ''} ${marriagePlan.enabled ? `| ${you.name}(독신)` : ''} | ${other.name}
${'─'.repeat(60)}
${chartData.map((data, idx) => {
  if (idx % Math.max(1, Math.floor(years / 20)) !== 0 && idx !== years) return ''; // 최대 20개 데이터 포인트
  return `${data.year.toString().padEnd(4)} | ${data.you.toFixed(2).padStart(8)}${marriagePlan.enabled ? ` | ${data.youNoMarriage.toFixed(2).padStart(8)}` : ''}  | ${data.other.toFixed(2).padStart(8)}`;
}).filter(Boolean).join('\n')}

주요 시점:
${marriagePlan.enabled ? `• ${marriagePlan.yearOfMarriage}년: 결혼` : ''}
${marriagePlan.enabled && marriagePlan.buyHouse ? `• ${marriagePlan.yearOfMarriage + marriagePlan.loanYears}년: 대출 완료` : ''}
${retirementPlan.enabled ? `• ${you.retireYear}년: 본인 은퇴` : ''}
${retirementPlan.enabled && marriagePlan.enabled ? `• ${marriagePlan.spouse.retireYear}년: 배우자 은퇴` : ''}
${crossoverYear !== null ? `• ${crossoverYear}년: ${you.name} 역전` : ''}
${jepqFinancialIndependenceYear !== null ? `• ${jepqFinancialIndependenceYear}년: JEPQ 경제적 자유` : ''}
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">💰 투자 비교 계산기</h1>
          <p className="text-gray-600">복리의 마법을 직접 확인해보세요</p>
          <button
            onClick={copyResults}
            className={`mt-4 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              copied ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {copied ? '✓ 복사 완료!' : '📋 결과 복사하기'}
          </button>
        </div>

        {/* 입력 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <PersonCard
            person={you}
            setPerson={setYou}
            color="border-blue-500"
            showRetirement={retirementPlan.enabled}
          />

          <div>
            <PresetButtons onApplyPreset={applyPreset} />
            <PersonCard person={other} setPerson={setOther} color="border-red-500" />
          </div>
        </div>

        {/* 기간 슬라이더 */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <label className="block text-lg font-medium text-gray-700 mb-4">
            투자 기간: {years}년
          </label>
          <input
            type="range"
            min="1"
            max="40"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>1년</span>
            <span>20년</span>
            <span>40년</span>
          </div>
        </div>

        {/* 결혼 계획 섹션 */}
        <MarriagePlanSection
          marriagePlan={marriagePlan}
          setMarriagePlan={setMarriagePlan}
          personMonthly={you.monthly}
        />

        {/* 은퇴 계획 섹션 */}
        <RetirementPlanSection
          retirementPlan={retirementPlan}
          setRetirementPlan={setRetirementPlan}
          personRetireYear={you.retireYear}
          spouseRetireYear={marriagePlan.spouse.retireYear}
          marriageEnabled={marriagePlan.enabled}
          years={years}
          retireYearAsset={retireYearAsset}
        />

        {/* 결과 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={`${you.name} 자산`}
            value={`${finalYou.toFixed(2)}억`}
            subtitle={`연 ${youIncome.toFixed(0)}만원 소득`}
            color="blue"
          />
          <StatCard
            title={`${other.name} 자산`}
            value={`${finalOther.toFixed(2)}억`}
            subtitle={`연 ${otherIncome.toFixed(0)}만원 소득`}
            color="red"
          />
          <StatCard
            title="자산 차이"
            value={difference >= 0 ? `+${difference.toFixed(2)}억` : `${difference.toFixed(2)}억`}
            subtitle={`${((finalYou / finalOther - 1) * 100).toFixed(1)}% ${
              finalYou > finalOther ? '더 많음' : '더 적음'
            }`}
            color={difference >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="추월 시점"
            value={crossoverYear !== null ? `${crossoverYear}년 후` : '추월 못함'}
            subtitle={crossoverYear !== null ? `${crossoverYear}년차에 역전` : ''}
            color="purple"
          />
        </div>

        {/* 결혼 효과 */}
        {marriagePlan.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard
              title="결혼 안했을 때"
              value={`${finalYouNoMarriage.toFixed(2)}억`}
              subtitle={`${you.name} 혼자 투자`}
              color="gray"
            />
            <StatCard
              title="결혼 효과"
              value={
                marriageDifference >= 0
                  ? `+${marriageDifference.toFixed(2)}억`
                  : `${marriageDifference.toFixed(2)}억`
              }
              subtitle={marriageDifference >= 0 ? '결혼이 이득!' : '결혼이 손해...'}
              color={marriageDifference >= 0 ? 'green' : 'orange'}
            />
            <StatCard
              title="결혼 후 배수"
              value={`${(finalYou / finalYouNoMarriage).toFixed(2)}x`}
              subtitle="결혼 안했을 때 대비"
              color="purple"
            />
          </div>
        )}

        {/* 차트 */}
        <WealthChart
          chartData={chartData}
          you={you}
          other={other}
          marriagePlan={marriagePlan}
          retirementPlan={retirementPlan}
          personRetireYear={you.retireYear}
          spouseRetireYear={marriagePlan.spouse.retireYear}
          jepqFinancialIndependenceYear={jepqFinancialIndependenceYear}
        />

        {/* 인사이트 */}
        <InsightsSection
          you={you}
          other={other}
          youSavingsRate={youSavingsRate}
          otherSavingsRate={otherSavingsRate}
          marriagePlan={marriagePlan}
          finalYou={finalYou}
          finalYouNoMarriage={finalYouNoMarriage}
          marriageDifference={marriageDifference}
          crossoverYear={crossoverYear}
          youIncome={youIncome}
          years={years}
          retirementPlan={retirementPlan}
          jepqFinancialIndependenceYear={jepqFinancialIndependenceYear}
        />

        {/* 푸터 */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>복리 수익률은 추정치입니다. 실제 투자 성과는 다를 수 있습니다.</p>
          <p className="mt-2">💡 S&P 500 역사적 평균 수익률: 약 8~10%</p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="font-semibold text-gray-700 mb-2">📊 통계 출처</p>
            <p className="text-xs">
              • 일반인 수익률 3.4%: 신한금융 2023 (적금 67% + 주식 29%)
            </p>
            <p className="text-xs">
              • 개인 투자자 주식 수익률: 3~4% (자본시장연구원, 2020)
            </p>
            <p className="text-xs">
              • 코스피 지수: 6.5% (2013-2023), 개인은 거래비용으로 3~4%로 감소
            </p>
            <p className="text-xs">• 월 평균 저축액: 105만원 (신한금융 2023)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentCalculator;
