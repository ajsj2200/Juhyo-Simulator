import { useState, useMemo, useEffect } from 'react';
import {
  PersonCard,
  StatCard,
  PresetButtons,
  MarriagePlanSection,
  RetirementPlanSection,
  WealthChart,
  InsightsSection,
  PortfolioSection,
} from './components';
import {
  DEFAULT_PERSON,
  PRESETS,
  DEFAULT_MARRIAGE_PLAN,
  DEFAULT_RETIREMENT_PLAN,
  DEFAULT_CRISIS_SCENARIO,
} from './constants/defaults';
import {
  SP500_ANNUAL_RETURNS,
  SP500_RETURNS_ARRAY,
  SP500_YEARS,
  SP500_STATS,
} from './constants/sp500History';
import {
  SCHD_ANNUAL_RETURNS,
  BND_ANNUAL_RETURNS,
  CASH_ANNUAL_RETURN,
  DEFAULT_PORTFOLIO,
  ASSET_INFO,
  getExpectedPortfolioReturn,
  runMonteCarloSimulation,
} from './constants/assetData';
import {
  calculateWealthWithMarriage,
  calculateWealth,
  calculateSavingsRate,
  calculateMonthlyPaymentEqual,
  calculateHouseValue,
  getLoanPaymentAtMonth,
  generateLoanSchedule,
  calculateWealthWithHistoricalReturns,
  calculateWealthWithMarriageHistorical,
  calculateWealthWithPortfolio,
  runMonteCarloPlan,
} from './utils/calculations';
import InputGroup from './components/InputGroup';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const LOCAL_PRESET_KEY = 'vooAppCustomPresetsV1';

const loadLocalPresets = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistLocalPresets = (presets) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PRESET_KEY, JSON.stringify(presets));
  } catch {
    // ignore
  }
};

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

  // 위기 시나리오 (대공황 가정)
  const [crisis, setCrisis] = useState(DEFAULT_CRISIS_SCENARIO);
  // 비교 대상 복리/단리 (본인은 복리 고정)
  const [otherUseCompound, setOtherUseCompound] = useState(true);
  // 차트 로그 스케일
  const [useLogScale, setUseLogScale] = useState(true);
  // 단독 대출 계산기 입력
  const [loanCalc, setLoanCalc] = useState({
    amount: marriagePlan.loanAmount,
    rate: marriagePlan.loanRate,
    years: marriagePlan.loanYears,
    type: marriagePlan.repaymentType,
    inflation: retirementPlan.inflationRate,
  });
  // 자산 차트 실질가치 모드
  const [useRealAsset, setUseRealAsset] = useState(false);
  // 자산 차트에 주택 포함 여부
  const [useHouseInChart, setUseHouseInChart] = useState(true);
  // 몬테카를로 (과거 수익률 셔플)
  const [mcOptions, setMcOptions] = useState({ iterations: 2000, seed: 1234 });
  const [mcResult, setMcResult] = useState(null);
  const [mcChartData, setMcChartData] = useState([]);

  useEffect(() => {
    if (!mcResult?.samples?.length) {
      setMcChartData([]);
      return;
    }
    const samples = mcResult.samples;
    // 음수나 0 이하 값 필터링 (로그 스케일용)
    const positiveSamples = samples.filter((v) => v > 0);
    if (positiveSamples.length === 0) {
      setMcChartData([]);
      return;
    }
    const min = positiveSamples[0];
    const max = positiveSamples[positiveSamples.length - 1];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0) {
      setMcChartData([]);
      return;
    }
    
    // 로그 스케일 빈: 작은 값은 세밀하게, 큰 값은 넓게
    const bins = 18;
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logWidth = logMax === logMin ? 1 : (logMax - logMin) / bins;
    const histogram = new Array(bins).fill(0);
    
    positiveSamples.forEach((v) => {
      const logV = Math.log10(v);
      const idx = logMax === logMin ? 0 : Math.min(bins - 1, Math.floor((logV - logMin) / logWidth));
      histogram[idx] += 1;
    });
    
    const data = histogram.map((count, i) => {
      const start = Math.pow(10, logMin + i * logWidth);
      const end = Math.pow(10, logMin + (i + 1) * logWidth);
      return {
        label: `${(start / 10000).toFixed(1)}~${(end / 10000).toFixed(1)}억`,
        count,
      };
    });
    setMcChartData(data);
  }, [mcResult]);
  // 로컬 프리셋
  const [savedPresets, setSavedPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [previewPreset, setPreviewPreset] = useState(null);

  // 히스토리컬 수익률 모드
  const [useHistoricalReturns, setUseHistoricalReturns] = useState(false);
  const [historicalStartYear, setHistoricalStartYear] = useState(1975);

  // 포트폴리오 구성
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);

  useEffect(() => {
    setSavedPresets(loadLocalPresets());
  }, []);

  const handleSavePreset = () => {
    const name = (presetName || '').trim() || `내 프리셋 ${savedPresets.length + 1}`;
    const payload = {
      id: Date.now(),
      name,
      savedAt: new Date().toISOString(),
      data: {
        you,
        other,
        years,
        marriagePlan,
        retirementPlan,
        crisis,
        otherUseCompound,
        useLogScale,
        useRealAsset,
        useHouseInChart,
      },
    };
    const next = [payload, ...savedPresets];
    setSavedPresets(next);
    persistLocalPresets(next);
    setPresetName('');
    setPreviewPreset(payload);
  };

  const handleDeletePreset = (id) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    persistLocalPresets(next);
    if (previewPreset?.id === id) setPreviewPreset(null);
  };

  const handleConfirmLoadPreset = (preset) => {
    if (!preset?.data) return;
    const cloned = JSON.parse(JSON.stringify(preset.data));
    setYou(cloned.you);
    setOther(cloned.other);
    setYears(cloned.years);
    setMarriagePlan(cloned.marriagePlan);
    setRetirementPlan(cloned.retirementPlan);
    setCrisis(cloned.crisis);
    setOtherUseCompound(cloned.otherUseCompound ?? true);
    setUseLogScale(cloned.useLogScale ?? true);
    setUseRealAsset(cloned.useRealAsset ?? false);
    setUseHouseInChart(cloned.useHouseInChart ?? true);
    setPreviewPreset(null);
  };

  const formatSavedAt = (iso) => {
    try {
      return new Date(iso).toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleRunMonteCarlo = () => {
    const iter = Math.max(100, Math.min(mcOptions.iterations || 2000, 20000));
    const seed = mcOptions.seed || Date.now();
    // calculateWealthWithMarriageHistorical 내부에서 /100 처리하므로 % 단위 그대로 전달
    const returns = SP500_RETURNS_ARRAY;
    const res = runMonteCarloPlan(you, years, marriagePlan, retirementPlan, returns, {
      iterations: iter,
      seed,
      useCompound: true,
    });
    setMcResult(res);
  };

  // 프리셋 적용
  const applyPreset = (presetName) => {
    const preset = PRESETS[presetName];
    if (!preset) return;

    setOther((prev) => ({
      ...prev,
      ...preset,
    }));

    // 프리셋 적용 시 은퇴/주택 구매 시나리오도 자동 활성화
    setRetirementPlan((prev) => ({ ...prev, enabled: true }));
    setMarriagePlan((prev) => ({
      ...prev,
      enabled: true,
      buyHouse: true,
      loanAmount: prev.housePrice && prev.downPayment
        ? Math.max(0, prev.housePrice - prev.downPayment)
        : prev.loanAmount,
    }));
  };

  // 히스토리컬 수익률 배열 생성 (선택된 시작 연도부터)
  const historicalReturns = useMemo(() => {
    if (!useHistoricalReturns) return [];
    const startIndex = SP500_YEARS.indexOf(historicalStartYear);
    if (startIndex === -1) return SP500_RETURNS_ARRAY;
    // 시작 연도부터 끝까지 + 부족하면 처음부터 순환
    const result = [];
    for (let i = 0; i < years + 1; i++) {
      const index = (startIndex + i) % SP500_RETURNS_ARRAY.length;
      result.push(SP500_RETURNS_ARRAY[index]);
    }
    return result;
  }, [useHistoricalReturns, historicalStartYear, years]);

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    const data = [];
    
    // 포트폴리오 활성화 시 예상 수익률 계산
    const portfolioRate = portfolio.enabled 
      ? getExpectedPortfolioReturn(portfolio.allocations) 
      : you.rate;
    
    // 포트폴리오용 자산 수익률 배열 생성 (히스토리컬 모드용)
    const assetReturnsForPortfolio = {
      voo: historicalReturns,
      schd: Object.values(SCHD_ANNUAL_RETURNS),
      bond: Object.values(BND_ANNUAL_RETURNS),
      cash: CASH_ANNUAL_RETURN,
    };

    // 포트폴리오 가중 히스토리컬 연수익률 (allocations 가중 평균)
    const weightedHistoricalReturns = historicalReturns.map((_, idx) => {
      const vooReturn = assetReturnsForPortfolio.voo[idx] ?? 10;
      const schdReturn = assetReturnsForPortfolio.schd[idx % assetReturnsForPortfolio.schd.length] ?? 8;
      const bondReturn = assetReturnsForPortfolio.bond[idx % assetReturnsForPortfolio.bond.length] ?? 4;
      const cashReturn = assetReturnsForPortfolio.cash ?? 3;
      return (
        (portfolio.allocations.voo / 100) * vooReturn +
        (portfolio.allocations.schd / 100) * schdReturn +
        (portfolio.allocations.bond / 100) * bondReturn +
        (portfolio.allocations.cash / 100) * cashReturn
      );
    });
    
    for (let year = 0; year <= years; year++) {
      const houseValue =
        marriagePlan.buyHouse && marriagePlan.enabled
          ? calculateHouseValue(marriagePlan, year) / 10000
          : 0;
      const spouseOnlyWealth =
        marriagePlan.enabled && year < marriagePlan.yearOfMarriage
          ? calculateWealth(
              marriagePlan.spouse.initial || 0,
              marriagePlan.spouse.monthly,
              marriagePlan.spouse.rate || you.rate,
              year,
              marriagePlan.spouse.monthlyGrowthRate,
              { retireYear: marriagePlan.spouse.retireYear },
              null,
              crisis,
              otherUseCompound
        ) / 10000
          : null;
      const chartYearOfHousePurchase = marriagePlan.yearOfHousePurchase ?? marriagePlan.yearOfMarriage;
      const remainingLoan =
        marriagePlan.buyHouse && year >= chartYearOfHousePurchase
          ? (() => {
              const monthsSinceLoan = Math.max(0, Math.floor((year - chartYearOfHousePurchase) * 12));
              if (monthsSinceLoan >= marriagePlan.loanYears * 12) return 0;
              const info = getLoanPaymentAtMonth(
                marriagePlan.loanAmount,
                marriagePlan.loanRate,
                marriagePlan.loanYears,
                marriagePlan.repaymentType,
                monthsSinceLoan
              );
              return Math.max(0, info.remainingPrincipal) / 10000;
            })()
          : 0;

      // 히스토리컬 모드일 때
      let youWealth, youNoMarriageWealth, otherWealth;
      let yearReturnRate = null;

      if (useHistoricalReturns && historicalReturns.length > 0) {
        yearReturnRate = year > 0 ? historicalReturns[year - 1] : null;

        // 포트폴리오 모드일 때도 결혼/다운페이 타이밍을 맞추기 위해 marriage-aware 계산으로 통일
        if (portfolio.enabled) {
          const youWithPortfolio = { ...you, rate: portfolioRate };
          const marriageWithPortfolio = {
            ...marriagePlan,
            spouse: { ...marriagePlan.spouse, rate: portfolioRate },
          };
          const youResult = calculateWealthWithMarriageHistorical(
            youWithPortfolio,
            year,
            marriageWithPortfolio,
            retirementPlan,
            weightedHistoricalReturns,
            true
          );
          youWealth = youResult.wealth / 10000;
          if (year > 0) {
            yearReturnRate = weightedHistoricalReturns[year - 1] ?? yearReturnRate;
          }
        } else {
          // 히스토리컬 수익률로 계산
          const youResult = calculateWealthWithMarriageHistorical(
            you,
            year,
            marriagePlan,
            retirementPlan,
            historicalReturns,
            true
          );
          youWealth = youResult.wealth / 10000;
        }

        const youNoMarriageResult = calculateWealthWithHistoricalReturns(
          you.initial,
          you.monthly,
          portfolio.enabled ? historicalReturns : historicalReturns, // 둘 다 같지만 명시
          year,
          you.monthlyGrowthRate,
          you,
          retirementPlan,
          true
        );
        youNoMarriageWealth = youNoMarriageResult.wealth / 10000;

        // 비교 대상은 항상 자기 고정 수익률 사용
        otherWealth = calculateWealth(
          other.initial,
          other.monthly,
          other.rate,
          year,
          other.monthlyGrowthRate,
          other,
          retirementPlan,
          crisis,
          otherUseCompound
        ) / 10000;
      } else {
        // 고정 수익률 모드
        if (portfolio.enabled) {
          // 포트폴리오 활성화 시에도 결혼/다운페이 타이밍을 반영하기 위해 marriage-aware 계산으로 통일
          const youWithPortfolio = { ...you, rate: portfolioRate };
          const marriageWithPortfolio = {
            ...marriagePlan,
            spouse: { ...marriagePlan.spouse, rate: portfolioRate },
          };
          youWealth = calculateWealthWithMarriage(
            youWithPortfolio,
            year,
            marriageWithPortfolio,
            retirementPlan,
            crisis,
            true
          ) / 10000;
          yearReturnRate = portfolioRate;
        } else {
          youWealth = calculateWealthWithMarriage(you, year, marriagePlan, retirementPlan, crisis, true) / 10000;
        }
        
        youNoMarriageWealth = calculateWealth(
          you.initial,
          you.monthly,
          portfolio.enabled ? portfolioRate : you.rate,
          year,
          you.monthlyGrowthRate,
          you,
          retirementPlan,
          crisis,
          true
        ) / 10000;
        otherWealth = calculateWealth(
          other.initial,
          other.monthly,
          other.rate,
          year,
          other.monthlyGrowthRate,
          other,
          retirementPlan,
          crisis,
          otherUseCompound
        ) / 10000;
      }

      data.push({
        year,
        you: youWealth,
        youNoMarriage: youNoMarriageWealth,
        other: otherWealth,
        house: houseValue,
        remainingLoan,
        spouseWealth: spouseOnlyWealth,
        returnRate: yearReturnRate,
      });
    }
    return data;
  }, [you, other, years, marriagePlan, retirementPlan, crisis, otherUseCompound, useHistoricalReturns, historicalReturns, portfolio]);

  // 몬테카를로 시뮬레이션 결과
  const monteCarloData = useMemo(() => {
    if (!portfolio.enabled || !portfolio.monteCarloEnabled) return null;
    
    const result = runMonteCarloSimulation(
      you.initial,
      you.monthly,
      portfolio.allocations,
      years,
      you.monthlyGrowthRate,
      500
    );
    
    return result;
  }, [you.initial, you.monthly, portfolio.allocations, portfolio.enabled, portfolio.monteCarloEnabled, years, you.monthlyGrowthRate]);

  // 몬테카를로 밴드가 포함된 차트 데이터
  // 포트폴리오 모드일 때는 플랜 몬테카를로(mcResult)만 사용 (포트폴리오 MC는 결혼/주택 미반영이라 타이밍 안 맞음)
  const chartDataWithMonteCarlo = useMemo(() => {
    const percentiles = mcResult?.percentilesByYear;
    console.log('[MC Debug] percentiles:', percentiles, 'mcResult:', mcResult);
    if (!percentiles) return chartData;

    return chartData.map((d, i) => ({
      ...d,
      mc_p10: (percentiles.p10?.[i] ?? null) !== null ? (percentiles.p10[i] / 10000) : null,
      mc_p25: (percentiles.p25?.[i] ?? null) !== null ? (percentiles.p25[i] / 10000) : null,
      mc_p50: (percentiles.p50?.[i] ?? null) !== null ? (percentiles.p50[i] / 10000) : null,
      mc_p75: (percentiles.p75?.[i] ?? null) !== null ? (percentiles.p75[i] / 10000) : null,
      mc_p90: (percentiles.p90?.[i] ?? null) !== null ? (percentiles.p90[i] / 10000) : null,
      mc_mean: (percentiles.mean?.[i] ?? null) !== null ? (percentiles.mean[i] / 10000) : null,
    }));
  }, [chartData, mcResult]);

  const hasMonteCarloBand = useMemo(() => {
    const result = chartDataWithMonteCarlo.some((d) =>
      d.mc_p10 != null || d.mc_p25 != null || d.mc_p50 != null || d.mc_p75 != null || d.mc_p90 != null
    );
    console.log('[MC Debug] hasMonteCarloBand:', result, 'chartDataWithMonteCarlo[0]:', chartDataWithMonteCarlo[0]);
    return result;
  }, [chartDataWithMonteCarlo]);

  const loanCalcResult = useMemo(() => {
    const { amount, rate, years, type } = loanCalc;
    if (amount <= 0 || years <= 0) return null;

    const schedule =
      type === 'equalPayment'
        ? generateLoanSchedule(amount, rate, years, type)
        : generateLoanSchedule(amount, rate, years, type);

    const monthly = schedule[0]?.payment || 0;
    const after1Year = schedule[12]?.payment || monthly;
    const after5Year = schedule[60]?.payment || after1Year;
    return { monthly, after1Year, after5Year, schedule };
  }, [loanCalc]);

  const loanChartData = useMemo(() => {
    if (!loanCalcResult?.schedule) return [];
    const inflMonthly = (loanCalc.inflation || 0) / 100 / 12;
    return loanCalcResult.schedule.map((row) => {
      const month = row.month + 1;
      const realPayment = row.payment / Math.pow(1 + inflMonthly, row.month);
      return {
        month,
        payment: row.payment,
        realPayment,
      };
    });
  }, [loanCalcResult, loanCalc.inflation]);

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

  const effectiveLoanYears = marriagePlan.prepayEnabled
    ? Math.min(marriagePlan.prepayYear, marriagePlan.loanYears)
    : marriagePlan.loanYears;
  const yearOfHousePurchase = marriagePlan.yearOfHousePurchase ?? marriagePlan.yearOfMarriage;
  const loanCompletionYear = yearOfHousePurchase + effectiveLoanYears;
  const houseValueFinal =
    marriagePlan.buyHouse ? calculateHouseValue(marriagePlan, years) / 10000 : 0;
  const remainingLoanFinal =
    marriagePlan.buyHouse && years >= yearOfHousePurchase
      ? (() => {
          if (years >= loanCompletionYear) return 0;
          const monthsSinceLoan = Math.floor((years - yearOfHousePurchase) * 12);
          const info = getLoanPaymentAtMonth(
            marriagePlan.loanAmount,
            marriagePlan.loanRate,
            marriagePlan.loanYears,
            marriagePlan.repaymentType,
            monthsSinceLoan
          );
          return Math.max(0, info.remainingPrincipal) / 10000; // 억 단위
        })()
      : 0;

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
• 세후 월급: ${marriagePlan.spouse.salary.toLocaleString()}만원
• 월 생활비: ${marriagePlan.spouse.expense?.toLocaleString?.() || marriagePlan.spouse.expense}만원
• 월 투자액: ${marriagePlan.spouse.monthly.toLocaleString()}만원
• 투자액 증가율: ${marriagePlan.spouse.monthlyGrowthRate}%/년
• 연 수익률: ${marriagePlan.spouse.rate}% 
• 저축률: ${((marriagePlan.spouse.monthly / marriagePlan.spouse.salary) * 100).toFixed(1)}%
• 은퇴 시점: ${marriagePlan.spouse.retireYear}년 후
${marriagePlan.spouse.adjustments?.length ? `• 투자액 변경: ${marriagePlan.spouse.adjustments.map((a) => `${a.year}년→${a.monthly}만원`).join(', ')}` : ''}
${
  marriagePlan.buyHouse
    ? `
🏠 주택 구매 정보
• 집 가격: ${marriagePlan.housePrice.toLocaleString()}만원 (${(marriagePlan.housePrice / 10000).toFixed(1)}억원)
• 자기자본: ${marriagePlan.downPayment.toLocaleString()}만원
• 대출금액: ${marriagePlan.loanAmount.toLocaleString()}만원 (${(marriagePlan.loanAmount / 10000).toFixed(1)}억원, LTV ${marriagePlan.housePrice > 0 ? ((marriagePlan.loanAmount / marriagePlan.housePrice) * 100).toFixed(1) : '0'}%)
• 대출 금리: ${marriagePlan.loanRate}%
• 대출 기간: ${marriagePlan.loanYears}년${marriagePlan.prepayEnabled ? ` (중도상환: 결혼 ${marriagePlan.prepayYear}년 후 일시상환)` : ''}
• 상환방식: ${marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'}
• 초기 월 상환액: ${initialMonthlyPayment.toFixed(0)}만원
• 주택 가격 상승률: ${marriagePlan.houseAppreciationRate}%/년
• 대출 완료: 집 구매 ${effectiveLoanYears}년 후 (투자 시작 ${loanCompletionYear}년 후)
• 현재 집 가치: ${houseValueFinal.toFixed(2)}억
• 대출 잔액: ${remainingLoanFinal.toFixed(2)}억`
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
    
    const portfolioInfo = portfolio.enabled
  ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 포트폴리오 구성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VOO ${portfolio.allocations.voo}% | SCHD ${portfolio.allocations.schd}% | BND ${portfolio.allocations.bond}% | CASH ${portfolio.allocations.cash}%
• 기대 수익률(가중): ${portfolio.enabled ? getExpectedPortfolioReturn(portfolio.allocations).toFixed(1) : you.rate}%
${portfolio.rebalanceEnabled ? `• 리밸런싱: ${portfolio.rebalanceFrequency}개월 주기` : '• 리밸런싱: 없음'}
${portfolio.monteCarloEnabled ? '• 포트폴리오 MC: 사용' : '• 포트폴리오 MC: 사용 안 함'}
`
  : '';

    const monteCarloInfo = mcResult
  ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 몬테카를로 (S&P 500 셔플)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 시뮬레이션: ${mcResult.iterations}회 (seed: ${mcResult.seed})
• 5% (워스트): ${(mcResult.p5 / 10000).toFixed(2)}억
• 50% (중앙값): ${(mcResult.median / 10000).toFixed(2)}억
• 95% (베스트): ${(mcResult.p95 / 10000).toFixed(2)}억
• 평균: ${(mcResult.mean / 10000).toFixed(2)}억
• 파산 확률: ${(mcResult.belowZeroProbability * 100).toFixed(2)}%
`
  : '';

    const crisisInfo = crisis.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 위기 시나리오 (대공황 가정)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 시작: ${crisis.startYear}년 후
• 지속: ${crisis.duration}년
• 연간 하락률: ${crisis.drawdownRate}%`
      : '';

    const text = `
🎯 투자 비교 결과 (${years}년)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${you.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${you.salary.toLocaleString()}만원
• 월 생활비: ${you.expense?.toLocaleString?.() || you.expense}만원
• 초기 자산: ${you.initial.toLocaleString()}만원
• 월 투자액: ${you.monthly.toLocaleString()}만원
• 투자액 증가율: ${you.monthlyGrowthRate}%/년
• 연 수익률: ${you.rate}%
• 저축률: ${youSavingsRate}%
• 은퇴 시점: ${you.retireYear}년 후
${you.adjustments?.length ? `• 투자액 변경: ${you.adjustments.map((a) => `${a.year}년→${a.monthly}만원`).join(', ')}` : ''}
${marriageInfo}${retirementInfo}
${crisisInfo}
${portfolioInfo}
${monteCarloInfo}
${years}년 후:
• 총 자산: ${finalYou.toFixed(2)}억원
• 연 자산소득: ${youIncome.toFixed(0)}만원 (월 ${(youIncome / 12).toFixed(0)}만원)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${other.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${other.salary.toLocaleString()}만원
• 월 생활비: ${other.expense?.toLocaleString?.() || other.expense}만원
• 초기 자산: ${other.initial.toLocaleString()}만원
• 월 투자액: ${other.monthly.toLocaleString()}만원
• 투자액 증가율: ${other.monthlyGrowthRate}%/년
• 연 수익률: ${other.rate}%
• 저축률: ${otherSavingsRate}%
${other.adjustments?.length ? `• 투자액 변경: ${other.adjustments.map((a) => `${a.year}년→${a.monthly}만원`).join(', ')}` : ''}

${years}년 후:
• 총 자산: ${finalOther.toFixed(2)}억원
• 연 자산소득: ${otherIncome.toFixed(0)}만원 (월 ${(otherIncome / 12).toFixed(0)}만원)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 비교 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 자산 차이: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}억원 (${((finalYou / finalOther - 1) * 100).toFixed(1)}%)
• 세후 월급 차이: ${you.salary > other.salary ? you.name : other.name}이 ${Math.abs(you.salary - other.salary).toLocaleString()}만원 더 높음
• 월 투자액 차이: ${you.monthly > other.monthly ? you.name : other.name}이 ${Math.abs(you.monthly - other.monthly).toLocaleString()}만원 더 많이 투자
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
${chartDataWithMonteCarlo.map((data, idx) => {
  if (idx % Math.max(1, Math.floor(years / 20)) !== 0 && idx !== years) return ''; // 최대 20개 데이터 포인트
  const baseRow = `${data.year.toString().padEnd(4)} | ${data.you.toFixed(2).padStart(8)}${marriagePlan.enabled ? ` | ${data.youNoMarriage.toFixed(2).padStart(8)}` : ''}  | ${data.other.toFixed(2).padStart(8)}`;
  if (data.mc_p50 != null) {
    return `${baseRow}  | MC p50 ${data.mc_p50.toFixed(2)} / p10 ${data.mc_p10?.toFixed(2) ?? '-'} / p90 ${data.mc_p90?.toFixed(2) ?? '-'}`;
  }
  return baseRow;
}).filter(Boolean).join('\n')}

주요 시점:
${marriagePlan.enabled ? `• ${marriagePlan.yearOfMarriage}년: 결혼` : ''}
${marriagePlan.enabled && marriagePlan.buyHouse ? `• ${loanCompletionYear}년: 대출 완료` : ''}
${retirementPlan.enabled ? `• ${you.retireYear}년: 본인 은퇴` : ''}
${retirementPlan.enabled && marriagePlan.enabled ? `• ${marriagePlan.spouse.retireYear}년: 배우자 은퇴` : ''}
${crossoverYear !== null ? `• ${crossoverYear}년: ${you.name} 역전` : ''}
${jepqFinancialIndependenceYear !== null ? `• ${jepqFinancialIndependenceYear}년: JEPQ 경제적 자유` : ''}
${marriagePlan.spouse.adjustments?.length ? `• 배우자 투자액 변경: ${marriagePlan.spouse.adjustments.map((a) => `${a.year}년→${a.monthly}만원`).join(', ')}` : ''}
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">💰 주효 인생 시뮬레이터</h1>
          <p className="text-gray-600">세후 월급/생활비, 단리·복리, 대공황까지 한 번에 비교하세요</p>
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
            showRetirement
          />

          <div>
            <PresetButtons
              onApplyPreset={applyPreset}
              useCompound={otherUseCompound}
              onToggleCompound={setOtherUseCompound}
            />
            <PersonCard person={other} setPerson={setOther} color="border-red-500" />
          </div>
        </div>

        {/* 내 프리셋 저장/불러오기 */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">💾 내 프리셋 저장/불러오기</h3>
              <p className="text-sm text-gray-500">현재 입력값을 저장하고, 나중에 불러올 수 있습니다.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="프리셋 이름 (예: 2035 결혼 플랜)"
                className="px-3 py-2 border border-gray-300 rounded-lg w-56 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                저장
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {savedPresets.length === 0 && (
              <div className="text-sm text-gray-500">저장된 프리셋이 없습니다. 이름을 입력하고 저장해 보세요.</div>
            )}
            {savedPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreviewPreset(preset)}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  previewPreset?.id === preset.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200'
                }`}
                title={`저장일: ${formatSavedAt(preset.savedAt)}`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {previewPreset && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-800">{previewPreset.name}</div>
                  <div className="text-xs text-gray-500">저장: {formatSavedAt(previewPreset.savedAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmLoadPreset(previewPreset)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    불러오기
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPreset(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(previewPreset.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-700 mt-3">
                <div>
                  <div className="font-semibold text-gray-900">투자 기간</div>
                  <div>{previewPreset.data.years}년</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{previewPreset.data.you.name}</div>
                  <div>세후 {previewPreset.data.you.salary.toLocaleString()}만원 · 생활비 {previewPreset.data.you.expense.toLocaleString()}만원</div>
                  <div>연 {previewPreset.data.you.rate}% · 월 저축 {previewPreset.data.you.monthly}만원</div>
                  <div>초기 자산 {previewPreset.data.you.initial.toLocaleString()}만원</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{previewPreset.data.other.name}</div>
                  <div>세후 {previewPreset.data.other.salary.toLocaleString()}만원 · 생활비 {previewPreset.data.other.expense.toLocaleString()}만원</div>
                  <div>연 {previewPreset.data.other.rate}% · 월 저축 {previewPreset.data.other.monthly}만원</div>
                  <div>초기 자산 {previewPreset.data.other.initial.toLocaleString()}만원</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">결혼/주택</div>
                  <div>
                    {previewPreset.data.marriagePlan.enabled ? '결혼 O' : '결혼 X'} /{' '}
                    {previewPreset.data.marriagePlan.buyHouse ? '집 구매 O' : '집 구매 X'}
                  </div>
                  {previewPreset.data.marriagePlan.buyHouse && (
                    <div className="text-gray-600">
                      집 {previewPreset.data.marriagePlan.housePrice.toLocaleString()}만원 · 대출{' '}
                      {previewPreset.data.marriagePlan.loanAmount.toLocaleString()}만원 · 금리 {previewPreset.data.marriagePlan.loanRate}%
                    </div>
                  )}
                  <div className="text-gray-600">
                    상환방식 {previewPreset.data.marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : previewPreset.data.marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'}
                    {previewPreset.data.marriagePlan.prepayEnabled ? ` · ${previewPreset.data.marriagePlan.prepayYear}년 후 중도상환` : ''}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">은퇴</div>
                  <div>{previewPreset.data.retirementPlan.enabled ? '은퇴 계산 O' : '은퇴 계산 X'}</div>
                  <div className="text-gray-600">생활비 {previewPreset.data.retirementPlan.monthlyExpense}만원</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">위기 시나리오</div>
                  <div>
                    {previewPreset.data.crisis.enabled
                      ? `${previewPreset.data.crisis.startYear}년차 ~ ${previewPreset.data.crisis.duration}년, ${previewPreset.data.crisis.drawdownRate}%`
                      : '적용 안 함'}
                  </div>
                </div>
                {previewPreset.data.marriagePlan.enabled && (
                  <div>
                    <div className="font-semibold text-gray-900">배우자</div>
                    <div>세후 {previewPreset.data.marriagePlan.spouse.salary.toLocaleString()}만원 · 생활비 {previewPreset.data.marriagePlan.spouse.expense.toLocaleString()}만원</div>
                    <div>연 {previewPreset.data.marriagePlan.spouse.rate}% · 월 저축 {previewPreset.data.marriagePlan.spouse.monthly}만원</div>
                    <div>초기 자산 {previewPreset.data.marriagePlan.spouse.initial?.toLocaleString?.() || previewPreset.data.marriagePlan.spouse.initial}만원</div>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">차트 옵션</div>
                  <div className="text-gray-600">
                    로그 {previewPreset.data.useLogScale ? 'ON' : 'OFF'} / 실질 {previewPreset.data.useRealAsset ? 'ON' : 'OFF'} / 집포함 {previewPreset.data.useHouseInChart ? 'ON' : 'OFF'}
                  </div>
                  <div className="text-gray-600">단리/복리(비교대상): {previewPreset.data.otherUseCompound ? '복리' : '단리'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 몬테카를로 (과거 수익률 셔플) */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">🎲 몬테카를로 (S&P500 과거 수익률 셔플)</h3>
              <p className="text-sm text-gray-500">
                {SP500_STATS.startYear}~{SP500_STATS.endYear} 연도별 수익률을 무작위 순서로 섞어 {years}년간 현재 시나리오(결혼/주택/은퇴 포함)를 {mcOptions.iterations}회 시뮬레이션합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
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
                max={1_000_000_000}
                step={1}
                unit=""
              />
              <button
                type="button"
                onClick={handleRunMonteCarlo}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                실행
              </button>
            </div>
          </div>
          {mcResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="text-xs text-gray-600">5% (워스트)</div>
                  <div className="text-lg font-bold text-blue-700">{(mcResult.p5 / 10000).toFixed(2)}억</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-600">50% (중앙값)</div>
                  <div className="text-lg font-bold text-gray-800">{(mcResult.median / 10000).toFixed(2)}억</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="text-xs text-gray-600">95% (베스트)</div>
                  <div className="text-lg font-bold text-emerald-700">{(mcResult.p95 / 10000).toFixed(2)}억</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="text-xs text-gray-600">평균</div>
                  <div className="text-lg font-bold text-orange-700">{(mcResult.mean / 10000).toFixed(2)}억</div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-xs text-gray-600">파산 확률</div>
                  <div className="text-lg font-bold text-red-700">{(mcResult.belowZeroProbability * 100).toFixed(2)}%</div>
                </div>
              </div>
              {mcChartData.length > 0 && (
                <div className="mt-4 h-64">
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
                        formatter={(v) => [`${v}회`, '빈도']}
                        labelFormatter={(l) => `구간: ${l}`}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {mcChartData.length === 0 && (
                <div className="mt-3 text-sm text-gray-500">시뮬레이션을 실행하면 분포 차트가 표시됩니다.</div>
              )}
            </>
          )}
        </div>

        {/* 대출 계산기 */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">🧮 대출 상환 계산기</h3>
              <p className="text-sm text-gray-500">대출액/금리/기간/방식을 넣고 월 상환액을 확인하세요.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="equalPayment">원리금균등</option>
                <option value="equalPrincipal">원금균등</option>
                <option value="increasing">체증식</option>
              </select>
            </div>
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
          {loanCalcResult && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                <div className="text-xs text-gray-600">초기 월 상환액</div>
                <div className="text-xl font-bold text-blue-700">
                  {loanCalcResult.monthly.toFixed(0).toLocaleString()}만원
                </div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded">
                <div className="text-xs text-gray-600">1년차 월 상환액</div>
                <div className="text-xl font-bold text-gray-800">
                  {loanCalcResult.after1Year.toFixed(0).toLocaleString()}만원
                </div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded">
                <div className="text-xs text-gray-600">5년차 월 상환액</div>
                <div className="text-xl font-bold text-gray-800">
                  {loanCalcResult.after5Year.toFixed(0).toLocaleString()}만원
                </div>
              </div>
            </div>
          )}
          {loanChartData.length > 0 && (
            <div className="mt-4 h-56">
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
                  <Line type="monotone" dataKey="payment" stroke="#2563eb" strokeWidth={2} name="명목 상환액" dot={false} />
                  <Line type="monotone" dataKey="realPayment" stroke="#f97316" strokeWidth={2} name="실질 상환액" dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 기간 슬라이더 + 히스토리컬 모드 + 위기 시나리오 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <label className="block text-lg font-medium text-gray-700 mb-4">
              투자 기간: {years}년
            </label>
            <input
              type="range"
              min="1"
              max="70"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>1년</span>
              <span>35년</span>
              <span>70년</span>
            </div>
          </div>

          {/* 히스토리컬 수익률 모드 */}
          <div className="bg-white p-6 rounded-lg shadow border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">S&P 500 과거 수익률</p>
                <p className="text-xs text-gray-500">실제 역사적 수익률로 시뮬레이션</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={useHistoricalReturns}
                  onChange={(e) => setUseHistoricalReturns(e.target.checked)}
                />
                <div
                  className={`w-11 h-6 rounded-full transition-all ${
                    useHistoricalReturns ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      useHistoricalReturns ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </label>
            </div>
            <div className={`${useHistoricalReturns ? 'opacity-100' : 'opacity-60'} space-y-2`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작 연도</label>
                <select
                  value={historicalStartYear}
                  onChange={(e) => setHistoricalStartYear(Number(e.target.value))}
                  disabled={!useHistoricalReturns}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {SP500_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}년 ({SP500_ANNUAL_RETURNS[year] >= 0 ? '+' : ''}{SP500_ANNUAL_RETURNS[year].toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                <p className="font-semibold mb-1">선택 기간 수익률:</p>
                {useHistoricalReturns && historicalReturns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {historicalReturns.slice(0, Math.min(10, years)).map((r, i) => (
                      <span
                        key={i}
                        className={`px-1 py-0.5 rounded text-[10px] ${
                          r >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {r >= 0 ? '+' : ''}{r.toFixed(0)}%
                      </span>
                    ))}
                    {years > 10 && <span className="text-gray-400">...</span>}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                평균: {SP500_STATS.average.toFixed(1)}% | 최고: +{SP500_STATS.max.toFixed(1)}% ({SP500_STATS.maxYear}) | 최저: {SP500_STATS.min.toFixed(1)}% ({SP500_STATS.minYear})
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">위기 시나리오 (대공황)</p>
                <p className="text-xs text-gray-500">특정 기간 동안 큰 하락률을 적용합니다.</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={crisis.enabled}
                  onChange={(e) => setCrisis((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                <div
                  className={`w-11 h-6 rounded-full transition-all ${
                    crisis.enabled ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      crisis.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </label>
            </div>
            <div className={`${crisis.enabled ? 'opacity-100' : 'opacity-60'} space-y-2`}>
              <InputGroup
                label="충격 시작 시점"
                value={crisis.startYear}
                onChange={(val) =>
                  setCrisis((prev) => ({ ...prev, startYear: Math.max(0, val) }))
                }
                min={0}
                max={40}
                step={1}
                unit="년 후"
              />
              <InputGroup
                label="충격 지속 기간"
                value={crisis.duration}
                onChange={(val) =>
                  setCrisis((prev) => ({ ...prev, duration: Math.max(1, val) }))
                }
                min={1}
                max={40}
                step={1}
                unit="년"
              />
              <InputGroup
                label="연간 하락률"
                value={crisis.drawdownRate}
                onChange={(val) =>
                  setCrisis((prev) => ({ ...prev, drawdownRate: Math.min(-1, val) }))
                }
                min={-90}
                max={0}
                step={1}
                unit="%"
              />
              <p className="text-[11px] text-gray-500">
                예시) 1년차 시작, 3년 동안 -30%면 1929년 대공황 비슷한 궤적을 가정합니다.
              </p>
            </div>
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

        {/* 포트폴리오 구성 섹션 */}
        <div className="mb-8">
          <PortfolioSection
            portfolio={portfolio}
            setPortfolio={setPortfolio}
          />
        </div>

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
          chartData={chartDataWithMonteCarlo}
          you={you}
          other={other}
          marriagePlan={marriagePlan}
          retirementPlan={retirementPlan}
          personRetireYear={you.retireYear}
          spouseRetireYear={marriagePlan.spouse.retireYear}
          jepqFinancialIndependenceYear={jepqFinancialIndependenceYear}
          crisis={crisis}
          useLogScale={useLogScale}
          onToggleLogScale={setUseLogScale}
          useCompound={otherUseCompound}
          useRealAsset={useRealAsset}
          onToggleRealAsset={setUseRealAsset}
          useHouseInChart={useHouseInChart}
          onToggleHouseInChart={setUseHouseInChart}
          inflationRate={retirementPlan.inflationRate}
          monteCarloEnabled={hasMonteCarloBand}
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
          loanCompletionYear={loanCompletionYear}
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
