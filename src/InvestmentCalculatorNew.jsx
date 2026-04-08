import { useEffect } from 'react';
import { SimulatorProvider, useSimulator } from './contexts/SimulatorContext';
import { AppLayout } from './components/layout';
import {
  DashboardView,
  ResultsView,
  ProfileView,
  ComparisonView,
  MarriageView,
  RetirementView,
  PortfolioView,
  MonteCarloView,
  CrisisView,
  LoanView,
  PresetsView,
  AssetTrackingView,
  AssetSalaryView,
} from './components/views';
import { resolveTheme } from './utils/theme';

const ViewRouter = () => {
  const { activeView } = useSimulator();

  const views = {
    dashboard: DashboardView,
    results: ResultsView,
    profile: ProfileView,
    comparison: ComparisonView,
    marriage: MarriageView,
    retirement: RetirementView,
    portfolio: PortfolioView,
    montecarlo: MonteCarloView,
    crisis: CrisisView,
    loan: LoanView,
    presets: PresetsView,
    assetTracking: AssetTrackingView,
    assetSalary: AssetSalaryView,
  };

  const ViewComponent = views[activeView] || DashboardView;

  return <ViewComponent />;
};

const CopyResultsButton = () => {
  const {
    you,
    other,
    years,
    finalYou,
    finalOther,
    marriagePlan,
    retirementPlan,
    crossoverYear,
    mcResult,
    netHouseEquity,
    finalFinancialAssets,
    youSavingsRate,
    portfolio,
  } = useSimulator();

  const copyResults = async () => {
    const difference = finalYou - finalOther;

    let marriageInfo = '';
    if (marriagePlan.enabled) {
      marriageInfo = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💒 결혼/배우자 시나리오
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 결혼 시점: ${marriagePlan.yearOfMarriage}년 후
• 배우자 세후 월급: ${marriagePlan.spouse.salary.toLocaleString()}만원
• 배우자 월 투자: ${marriagePlan.spouse.monthly.toLocaleString()}만원
`;
      if (marriagePlan.buyHouse) {
        marriageInfo += `
🏠 주택 구매 정보
• 집 가격: ${marriagePlan.housePrice.toLocaleString()}만원
• 다운페이먼트: ${marriagePlan.downPayment.toLocaleString()}만원
• 대출액: ${marriagePlan.loanAmount.toLocaleString()}만원
• 대출 금리: ${marriagePlan.loanRate}%
• 상환 기간: ${marriagePlan.loanYears}년
• 상환 방식: ${marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'}
`;
      }
    }

    let retirementInfo = '';
    if (retirementPlan.enabled) {
      retirementInfo = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏖️ 은퇴 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 은퇴 목표: ${you.retireYear}년 후
• 은퇴 후 월 생활비: ${retirementPlan.monthlyExpense.toLocaleString()}만원
• 물가상승률: ${retirementPlan.inflationRate}%
`;
    }

    let portfolioInfo = '';
    if (portfolio?.enabled) {
      portfolioInfo = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 포트폴리오
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VOO: ${portfolio.allocations.voo}%
• SCHD: ${portfolio.allocations.schd}%
• BND: ${portfolio.allocations.bond}%
• CASH: ${portfolio.allocations.cash}%
`;
    }

    let monteCarloInfo = '';
    if (mcResult) {
      monteCarloInfo = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 몬테카를로 시뮬레이션 (${mcResult.iterations}회)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• p5 (워스트): ${(mcResult.p5 / 10000).toFixed(2)}억원
• p50 (중앙값): ${(mcResult.median / 10000).toFixed(2)}억원
• p95 (베스트): ${(mcResult.p95 / 10000).toFixed(2)}억원
• 평균: ${(mcResult.mean / 10000).toFixed(2)}억원
• 파산 확률: ${(mcResult.belowZeroProbability * 100).toFixed(2)}%
`;
    }

    const text = `
📊 주효 인생 시뮬레이터 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 시뮬레이션 기간: ${years}년

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 ${you.name}(본인) 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${you.salary.toLocaleString()}만원
• 월 생활비: ${you.expense.toLocaleString()}만원
• 월 투자액: ${you.monthly.toLocaleString()}만원 (저축률 ${youSavingsRate}%)
• 초기 자산: ${you.initial.toLocaleString()}만원
• 연평균 수익률 가정: ${you.rate}%
${marriageInfo}${retirementInfo}${portfolioInfo}${monteCarloInfo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 최종 결과 요약 (${years}년 후)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ ${you.name}의 총 자산: ${finalYou.toFixed(2)}억원
   • 금융 자산: ${finalFinancialAssets.toFixed(2)}억원
   • 부동산 순자산: ${netHouseEquity.toFixed(2)}억원

2️⃣ ${other.name}의 총 자산: ${finalOther.toFixed(2)}억원

3️⃣ 결과 비교
   • 차이: ${difference.toFixed(2)}억원
   ${crossoverYear !== null ? `• ${crossoverYear}년 후부터 ${you.name}의 자산이 추월` : '• 시작부터 본인이 우위'}
`;

    await navigator.clipboard.writeText(text);
    return true;
  };

  return copyResults;
};

const MainContent = () => {
  const { theme } = useSimulator();
  const copyResults = CopyResultsButton();

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const matchMedia = typeof window === 'undefined' ? null : window.matchMedia;

    const applyTheme = () => {
      const resolvedTheme = resolveTheme(theme, matchMedia);
      console.log('Applying theme:', theme, '→', resolvedTheme);
      root.classList.toggle('dark', resolvedTheme === 'dark');
    };

    applyTheme();

    if (theme !== 'system' || !matchMedia) return undefined;
    const mediaQuery = matchMedia('(prefers-color-scheme: dark)');
    if (!mediaQuery) return undefined;

    const handleChange = () => applyTheme();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }

    return undefined;
  }, [theme]);

  return (
    <AppLayout onCopyResults={copyResults}>
      <ViewRouter />
    </AppLayout>
  );
};

const InvestmentCalculatorNew = () => {
  return (
    <SimulatorProvider>
      <MainContent />
    </SimulatorProvider>
  );
};

export default InvestmentCalculatorNew;
