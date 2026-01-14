/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  DEFAULT_PERSON,
  PRESETS,
  DEFAULT_MARRIAGE_PLAN,
  DEFAULT_RETIREMENT_PLAN,
  DEFAULT_CRISIS_SCENARIO,
} from '../constants/defaults';
import {
  SP500_ANNUAL_RETURNS,
  SP500_RETURNS_ARRAY,
  SP500_YEARS,
  SP500_STATS,
} from '../constants/sp500History';
import {
  SCHD_ANNUAL_RETURNS,
  BND_ANNUAL_RETURNS,
  CASH_ANNUAL_RETURN,
  DEFAULT_PORTFOLIO,
  ASSET_INFO,
  getExpectedPortfolioReturn,
  getPortfolioStdDev,
  runMonteCarloSimulation,
} from '../constants/assetData';
import {
  calculateWealthWithMarriage,
  calculateWealth,
  calculateHouseValue,
  getLoanPaymentAtMonth,
  generateLoanSchedule,
  calculateWealthWithHistoricalReturns,
  calculateWealthWithMarriageHistorical,
  runMonteCarloPlan,
} from '../utils/calculations';

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

const SimulatorContext = createContext(null);

export const SimulatorProvider = ({ children }) => {
  // Core State
  const [you, setYou] = useState(DEFAULT_PERSON.you);
  const [other, setOther] = useState(DEFAULT_PERSON.other);
  const [years, setYears] = useState(10);

  // Plan State
  const [marriagePlan, setMarriagePlan] = useState(DEFAULT_MARRIAGE_PLAN);
  const [retirementPlan, setRetirementPlan] = useState(DEFAULT_RETIREMENT_PLAN);
  const [crisis, setCrisis] = useState(DEFAULT_CRISIS_SCENARIO);

  // Portfolio State
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);

  // Monte Carlo State
  const [mcOptions, setMcOptions] = useState({ iterations: 2000, seed: 1234 });
  const [mcAccumulateEnabled, setMcAccumulateEnabled] = useState(false);
  const [mcAccumulateKey, setMcAccumulateKey] = useState('');
  const [mcResult, setMcResult] = useState(null);
  const [mcChartData, setMcChartData] = useState([]);

  // UI Settings
  const [otherUseCompound, setOtherUseCompound] = useState(true);
  const [useLogScale, setUseLogScale] = useState(true);
  const [useRealAsset, setUseRealAsset] = useState(false);
  const [useHouseInChart, setUseHouseInChart] = useState(true);
  const [wealthChartHeight, setWealthChartHeight] = useState(480);
  const [showMCBands, setShowMCBands] = useState(true);
  const [portfolioMcChartHeight, setPortfolioMcChartHeight] = useState(240);

  // Historical Mode
  const [useHistoricalReturns, setUseHistoricalReturns] = useState(false);
  const [historicalStartYear, setHistoricalStartYear] = useState(1975);

  // Asset Tracking (자산 추적)
  const [assetRecords, setAssetRecords] = useState([]);
  const [showActualAssets, setShowActualAssets] = useState(true);

  // Loan Calculator
  const [loanCalc, setLoanCalc] = useState({
    amount: DEFAULT_MARRIAGE_PLAN.loanAmount,
    rate: DEFAULT_MARRIAGE_PLAN.loanRate,
    years: DEFAULT_MARRIAGE_PLAN.loanYears,
    type: DEFAULT_MARRIAGE_PLAN.repaymentType,
    inflation: DEFAULT_RETIREMENT_PLAN.inflationRate,
  });

  // Presets
  const [savedPresets, setSavedPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [previewPreset, setPreviewPreset] = useState(null);
  const [activePresetId, setActivePresetId] = useState(null);

  // Active View (for navigation)
  const [activeView, setActiveView] = useState('dashboard');

  // Load asset records from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voo-app-asset-records');
      if (saved) {
        setAssetRecords(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load asset records:', e);
    }
  }, []);

  // Save asset records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voo-app-asset-records', JSON.stringify(assetRecords));
    } catch (e) {
      console.error('Failed to save asset records:', e);
    }
  }, [assetRecords]);

  // Load presets from localStorage
  useEffect(() => {
    setSavedPresets(loadLocalPresets());
  }, []);

  // Monte Carlo histogram calculation
  const mcHistogramTotal = useMemo(
    () => mcChartData.reduce((sum, d) => sum + (d.count || 0), 0),
    [mcChartData]
  );

  useEffect(() => {
    if (!mcResult?.samples?.length) {
      setMcChartData([]);
      return;
    }
    const samples = mcResult.samples;
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

  // Historical returns array
  const historicalReturns = useMemo(() => {
    if (!useHistoricalReturns) return [];
    const startIndex = SP500_YEARS.indexOf(historicalStartYear);
    if (startIndex === -1) return SP500_RETURNS_ARRAY;
    const result = [];
    for (let i = 0; i < years + 1; i++) {
      const index = (startIndex + i) % SP500_RETURNS_ARRAY.length;
      result.push(SP500_RETURNS_ARRAY[index]);
    }
    return result;
  }, [useHistoricalReturns, historicalStartYear, years]);

  // Portfolio rate calculation (including custom stocks)
  const portfolioRate = useMemo(() => {
    if (!portfolio.enabled) return you.rate;
    
    const customStocks = portfolio.customStocks || [];
    const useAmountMode = portfolio.useAmountMode || false;
    const monthlyAmounts = portfolio.monthlyAmounts || { voo: 0, schd: 0, bond: 0, cash: 0 };
    
    if (useAmountMode) {
      // 금액 모드: 각 자산의 금액 비중으로 수익률 계산
      const baseAmountTotal = Object.values(monthlyAmounts).reduce((a, b) => a + b, 0);
      const customAmountTotal = customStocks.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);
      const totalAmount = baseAmountTotal + customAmountTotal;
      
      if (totalAmount === 0) return you.rate;
      
      // 기본 자산 기여분
      let weightedReturn = 0;
      Object.entries(monthlyAmounts).forEach(([key, amount]) => {
        const assetReturn = ASSET_INFO[key]?.expectedReturn || 0;
        weightedReturn += assetReturn * (amount / totalAmount);
      });
      
      // 커스텀 주식 기여분
      customStocks.forEach((stock) => {
        weightedReturn += (stock.expectedReturn || 0) * ((stock.monthlyAmount || 0) / totalAmount);
      });
      
      return weightedReturn;
    } else {
      // 비율 모드
      const baseReturn = getExpectedPortfolioReturn(portfolio.allocations);
      const baseTotal = Object.values(portfolio.allocations).reduce((a, b) => a + b, 0);
      
      const baseContribution = baseReturn * (baseTotal / 100);
      const customContribution = customStocks.reduce((sum, stock) => {
        return sum + (stock.expectedReturn || 0) * (stock.allocation / 100);
      }, 0);
      
      return baseContribution + customContribution;
    }
  }, [portfolio.enabled, portfolio.allocations, portfolio.customStocks, portfolio.useAmountMode, portfolio.monthlyAmounts, you.rate]);

  // Portfolio standard deviation (including custom stocks)
  const portfolioStdDev = useMemo(() => {
    if (!portfolio.enabled) return 0;
    
    const baseStdDev = getPortfolioStdDev(portfolio.allocations);
    const baseTotal = Object.values(portfolio.allocations).reduce((a, b) => a + b, 0);
    
    const customStocks = portfolio.customStocks || [];
    const customTotal = customStocks.reduce((sum, s) => sum + s.allocation, 0);
    
    // 기본 자산 분산 기여분
    const baseVarianceContribution = Math.pow(baseStdDev, 2) * Math.pow(baseTotal / 100, 2);
    
    // 커스텀 주식 분산 기여분
    const customVarianceContribution = customStocks.reduce((sum, stock) => {
      return sum + Math.pow(stock.stdDev || 0, 2) * Math.pow(stock.allocation / 100, 2);
    }, 0);
    
    // 상관관계 0.5로 가정
    const avgCustomStdDev = customStocks.length > 0 
      ? customStocks.reduce((sum, s) => sum + (s.stdDev || 0), 0) / customStocks.length 
      : 0;
    const correlationFactor = 2 * (baseTotal / 100) * (customTotal / 100) * baseStdDev * avgCustomStdDev * 0.5;
    
    return Math.sqrt(baseVarianceContribution + customVarianceContribution + correlationFactor);
  }, [portfolio.enabled, portfolio.allocations, portfolio.customStocks]);

  // Portfolio Monte Carlo simulation
  const portfolioMcResult = useMemo(() => {
    if (!portfolio.enabled || !portfolio.monteCarloEnabled) return null;
    const simulations = Math.max(100, Math.min(portfolio.monteCarloSimulations || 500, 20000));

    return runMonteCarloSimulation(
      you.initial,
      you.monthly,
      portfolio.allocations,
      years,
      you.monthlyGrowthRate,
      simulations
    );
  }, [
    portfolio.enabled,
    portfolio.monteCarloEnabled,
    portfolio.monteCarloSimulations,
    portfolio.allocations,
    you.initial,
    you.monthly,
    you.monthlyGrowthRate,
    years,
  ]);

  // Portfolio Monte Carlo chart data
  const portfolioMcChartData = useMemo(() => {
    const percentiles = portfolioMcResult?.percentiles;
    if (!percentiles) return [];

    const toEok = (v) => (v === null || v === undefined ? null : v / 10000);

    return (percentiles.p50 || []).map((_, idx) => {
      const p10 = toEok(percentiles.p10?.[idx]);
      const p25 = toEok(percentiles.p25?.[idx]);
      const p50 = toEok(percentiles.p50?.[idx]);
      const p75 = toEok(percentiles.p75?.[idx]);
      const p90 = toEok(percentiles.p90?.[idx]);

      const band90Base = p10;
      const band90 =
        p90 !== null && p90 !== undefined && band90Base !== null && band90Base !== undefined
          ? Math.max(0, p90 - band90Base)
          : null;

      const band50Base = p25;
      const band50 =
        p75 !== null && p75 !== undefined && band50Base !== null && band50Base !== undefined
          ? Math.max(0, p75 - band50Base)
          : null;

      return {
        year: idx,
        p10,
        p25,
        p50,
        p75,
        p90,
        band90Base,
        band90,
        band50Base,
        band50,
      };
    });
  }, [portfolioMcResult]);

  // Weighted historical returns for portfolio
  const weightedHistoricalReturns = useMemo(() => {
    if (!historicalReturns.length) return [];
    const assetReturnsForPortfolio = {
      voo: historicalReturns,
      schd: Object.values(SCHD_ANNUAL_RETURNS),
      bond: Object.values(BND_ANNUAL_RETURNS),
      cash: CASH_ANNUAL_RETURN,
    };
    return historicalReturns.map((_, idx) => {
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
  }, [historicalReturns, portfolio.allocations]);

  // Chart data calculation
  const chartData = useMemo(() => {
    const data = [];

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

      let youWealth, youNoMarriageWealth, otherWealth;
      let yearReturnRate = null;

      if (useHistoricalReturns && historicalReturns.length > 0) {
        yearReturnRate = year > 0 ? historicalReturns[year - 1] : null;

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
          historicalReturns,
          year,
          you.monthlyGrowthRate,
          you,
          retirementPlan,
          true
        );
        youNoMarriageWealth = youNoMarriageResult.wealth / 10000;

        otherWealth =
          calculateWealth(
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
        if (portfolio.enabled) {
          const youWithPortfolio = { ...you, rate: portfolioRate };
          const marriageWithPortfolio = {
            ...marriagePlan,
            spouse: { ...marriagePlan.spouse, rate: portfolioRate },
          };
          youWealth =
            calculateWealthWithMarriage(
              youWithPortfolio,
              year,
              marriageWithPortfolio,
              retirementPlan,
              crisis,
              true
            ) / 10000;
          yearReturnRate = portfolioRate;
        } else {
          youWealth =
            calculateWealthWithMarriage(you, year, marriagePlan, retirementPlan, crisis, true) / 10000;
        }

        youNoMarriageWealth =
          calculateWealth(
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
        otherWealth =
          calculateWealth(
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
  }, [
    you,
    other,
    years,
    marriagePlan,
    retirementPlan,
    crisis,
    otherUseCompound,
    useHistoricalReturns,
    historicalReturns,
    portfolio,
    portfolioRate,
    weightedHistoricalReturns,
  ]);

  // Chart data with Monte Carlo bands
  // useHouseInChart 옵션에 따라 집 포함/제외 MC 데이터 선택
  const chartDataWithMonteCarlo = useMemo(() => {
    // 집 포함 시 percentilesByYearWithHouse 사용, 집 제외 시 percentilesByYear 사용
    const percentiles = useHouseInChart 
      ? mcResult?.percentilesByYearWithHouse 
      : mcResult?.percentilesByYear;
    if (!percentiles) return chartData;

    // 실제 자산 추적 데이터를 연차(year)로 매핑
    const actualAssetMap = new Map();
    if (assetRecords && assetRecords.length > 0) {
      const now = new Date();
      const startYear = now.getFullYear();
      assetRecords.forEach(record => {
        // YYYY-MM-DD 또는 YYYY-MM 형식 처리
        const recordDate = record.date.length === 7 
          ? new Date(record.date + '-01') 
          : new Date(record.date);
        // 연차 계산: (기록 날짜 - 현재) / 365
        const yearsSinceStart = (recordDate.getFullYear() - startYear) + (recordDate.getMonth() / 12);
        const roundedYear = Math.round(yearsSinceStart * 2) / 2; // 0.5년 단위로 반올림
        // 만원 단위에서 억 단위로 변환
        const assetInEok = (record.assetValue || 0) / 10000;
        // 같은 연차에 여러 기록이 있으면 마지막 값 사용
        actualAssetMap.set(roundedYear, assetInEok);
      });
    }

    return chartData.map((d, i) => ({
      ...d,
      mc_p10: percentiles.p10?.[i] != null ? percentiles.p10[i] / 10000 : null,
      mc_p25: percentiles.p25?.[i] != null ? percentiles.p25[i] / 10000 : null,
      mc_p50: percentiles.p50?.[i] != null ? percentiles.p50[i] / 10000 : null,
      mc_p75: percentiles.p75?.[i] != null ? percentiles.p75[i] / 10000 : null,
      mc_p90: percentiles.p90?.[i] != null ? percentiles.p90[i] / 10000 : null,
      mc_mean: percentiles.mean?.[i] != null ? percentiles.mean[i] / 10000 : null,
      // 실제 자산 값 (해당 연차에 기록이 있으면 표시)
      actualAsset: actualAssetMap.get(i) ?? null,
    }));
  }, [chartData, mcResult, useHouseInChart, assetRecords]);

  const hasMonteCarloBand = useMemo(() => {
    return chartDataWithMonteCarlo.some(
      (d) => d.mc_p10 != null || d.mc_p25 != null || d.mc_p50 != null || d.mc_p75 != null || d.mc_p90 != null
    );
  }, [chartDataWithMonteCarlo]);

  // Loan calculator results
  const loanCalcResult = useMemo(() => {
    const { amount, rate, years: loanYears, type } = loanCalc;
    if (amount <= 0 || loanYears <= 0) return null;

    const schedule = generateLoanSchedule(amount, rate, loanYears, type);

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

  // Final statistics
  const finalYou = chartData[years]?.you || 0;
  const finalYouNoMarriage = chartData[years]?.youNoMarriage || 0;
  const finalOther = chartData[years]?.other || 0;
  const difference = finalYou - finalOther;
  const marriageDifference = finalYou - finalYouNoMarriage;

  const youRetireYear = Number.isFinite(Number(you?.retireYear)) ? Number(you.retireYear) : 0;
  const spouseRetireYear = Number.isFinite(Number(marriagePlan?.spouse?.retireYear))
    ? Number(marriagePlan.spouse.retireYear)
    : 0;

  const effectiveRetireYear = marriagePlan.enabled
    ? Math.max(youRetireYear, spouseRetireYear)
    : youRetireYear;

  const retireYearAsset = useMemo(() => {
    if (!retirementPlan.enabled) return 0;
    if (!Number.isFinite(effectiveRetireYear) || effectiveRetireYear < 0) return 0;
    // 차트 범위 내면 그대로 사용
    if (effectiveRetireYear <= years) {
      return chartData[effectiveRetireYear]?.you || 0;
    }
    // 차트 범위 밖이면 동일 엔진으로 추가 계산
    if (useHistoricalReturns && historicalReturns.length > 0) {
      const res = calculateWealthWithMarriageHistorical(
        you,
        effectiveRetireYear,
        marriagePlan,
        retirementPlan,
        historicalReturns,
        true
      );
      return (res?.wealth ?? 0) / 10000;
    }
    const res = calculateWealthWithMarriage(
      you,
      effectiveRetireYear,
      marriagePlan,
      retirementPlan,
      crisis,
      true
    );
    return res / 10000;
  }, [
    retirementPlan.enabled,
    effectiveRetireYear,
    years,
    chartData,
    useHistoricalReturns,
    historicalReturns,
    you,
    marriagePlan,
    retirementPlan,
    crisis,
  ]);

  // Find crossover year
  const crossoverYear = useMemo(() => {
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].you >= chartData[i].other && (i === 0 || chartData[i - 1].you < chartData[i - 1].other)) {
        return i;
      }
    }
    return null;
  }, [chartData]);

  // House equity calculations
  const houseValueFinal = chartData[years]?.house || 0;
  const remainingLoanFinal = chartData[years]?.remainingLoan || 0;
  const netHouseEquity = houseValueFinal - remainingLoanFinal;
  const finalFinancialAssets = finalYou - netHouseEquity;

  const loanCompletionYear = useMemo(() => {
    if (!marriagePlan.buyHouse) return null;
    const purchaseYear = marriagePlan.yearOfHousePurchase ?? marriagePlan.yearOfMarriage;
    return purchaseYear + marriagePlan.loanYears;
  }, [marriagePlan]);

  // Savings rate calculations
  const youSavingsRate = useMemo(() => {
    if (you.salary <= 0) return 0;
    return ((you.monthly / you.salary) * 100).toFixed(1);
  }, [you.salary, you.monthly]);

  const otherSavingsRate = useMemo(() => {
    if (other.salary <= 0) return 0;
    return ((other.monthly / other.salary) * 100).toFixed(1);
  }, [other.salary, other.monthly]);

  // Actions
  const generateMonteCarloSeed = useCallback(() => {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0];
      }
    } catch {
      // ignore
    }
    return Math.floor(Math.random() * 2 ** 32);
  }, []);

  const runMonteCarlo = useCallback(() => {
    const iterToAdd = Math.max(100, Math.min(mcOptions.iterations || 2000, 20000));

    const currentKey = JSON.stringify({ years, you, marriagePlan, retirementPlan });
    const canAccumulate = Boolean(
      mcAccumulateEnabled &&
        mcResult &&
        mcAccumulateKey &&
        mcAccumulateKey === currentKey &&
        Number.isFinite(mcResult.seed)
    );

    const seed = canAccumulate ? mcResult.seed : generateMonteCarloSeed();
    const totalIterations = canAccumulate ? (mcResult.iterations || 0) + iterToAdd : iterToAdd;

    if (!canAccumulate) {
      setMcAccumulateKey(currentKey);
    }

    setMcOptions((prev) => ({ ...prev, seed }));
    const returns = SP500_RETURNS_ARRAY;
    const res = runMonteCarloPlan(you, years, marriagePlan, retirementPlan, returns, {
      iterations: totalIterations,
      seed,
      useCompound: true,
      includeSamples: true,
    });
    setMcResult(res);
  }, [
    mcOptions.iterations,
    years,
    you,
    marriagePlan,
    retirementPlan,
    mcAccumulateEnabled,
    mcResult,
    mcAccumulateKey,
    generateMonteCarloSeed,
  ]);

  const clearSp500MonteCarlo = useCallback(() => {
    setMcResult(null);
    setMcAccumulateKey('');
  }, []);

  const applyPreset = useCallback(
    (presetName) => {
      const preset = PRESETS[presetName];
      if (!preset) return;

      setOther((prev) => ({
        ...prev,
        ...preset,
      }));

      setRetirementPlan((prev) => ({ ...prev, enabled: true }));
      setMarriagePlan((prev) => ({
        ...prev,
        enabled: true,
        buyHouse: true,
        loanAmount:
          prev.housePrice && prev.downPayment
            ? Math.max(0, prev.housePrice - prev.downPayment)
            : prev.loanAmount,
      }));
    },
    []
  );

  const handleSavePreset = useCallback(() => {
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
        portfolio, // 포트폴리오 전체 (커스텀 주식 포함)
        loanCalc, // 대출 계산기 설정
        otherUseCompound,
        useLogScale,
        useRealAsset,
        useHouseInChart,
        useHistoricalReturns,
        historicalStartYear,
      },
    };
    const next = [payload, ...savedPresets];
    setSavedPresets(next);
    persistLocalPresets(next);
    setPresetName('');
    setPreviewPreset(payload);
  }, [
    presetName,
    savedPresets,
    you,
    other,
    years,
    marriagePlan,
    retirementPlan,
    crisis,
    portfolio,
    loanCalc,
    otherUseCompound,
    useLogScale,
    useRealAsset,
    useHouseInChart,
    useHistoricalReturns,
    historicalStartYear,
  ]);

  const handleDeletePreset = useCallback(
    (id) => {
      const next = savedPresets.filter((p) => p.id !== id);
      setSavedPresets(next);
      persistLocalPresets(next);
      if (previewPreset?.id === id) setPreviewPreset(null);
    },
    [savedPresets, previewPreset]
  );

  const handleConfirmLoadPreset = useCallback((preset) => {
    if (!preset?.data) return;
    const cloned = JSON.parse(JSON.stringify(preset.data));
    setYou(cloned.you);
    setOther(cloned.other);
    setYears(cloned.years);
    setMarriagePlan(cloned.marriagePlan);
    setRetirementPlan(cloned.retirementPlan);
    setCrisis(cloned.crisis);
    // 포트폴리오 로드 (기존 프리셋 호환성 유지)
    if (cloned.portfolio) {
      setPortfolio(cloned.portfolio);
    }
    // 대출 계산기 로드
    if (cloned.loanCalc) {
      setLoanCalc(cloned.loanCalc);
    }
    setOtherUseCompound(cloned.otherUseCompound ?? true);
    setUseLogScale(cloned.useLogScale ?? true);
    setUseRealAsset(cloned.useRealAsset ?? false);
    setUseHouseInChart(cloned.useHouseInChart ?? true);
    // 히스토리컬 모드 로드
    if (cloned.useHistoricalReturns !== undefined) {
      setUseHistoricalReturns(cloned.useHistoricalReturns);
    }
    if (cloned.historicalStartYear !== undefined) {
      setHistoricalStartYear(cloned.historicalStartYear);
    }
    setActivePresetId(preset.id);
    setPreviewPreset(null);
  }, []);

  const handleUpdatePreset = useCallback(() => {
    if (!activePresetId) return;
    const next = savedPresets.map((p) => {
      if (p.id === activePresetId) {
        return {
          ...p,
          savedAt: new Date().toISOString(),
          data: {
            you,
            other,
            years,
            marriagePlan,
            retirementPlan,
            crisis,
            portfolio,
            loanCalc,
            otherUseCompound,
            useLogScale,
            useRealAsset,
            useHouseInChart,
            useHistoricalReturns,
            historicalStartYear,
          },
        };
      }
      return p;
    });
    setSavedPresets(next);
    persistLocalPresets(next);
  }, [
    activePresetId,
    savedPresets,
    you,
    other,
    years,
    marriagePlan,
    retirementPlan,
    crisis,
    portfolio,
    loanCalc,
    otherUseCompound,
    useLogScale,
    useRealAsset,
    useHouseInChart,
    useHistoricalReturns,
    historicalStartYear,
  ]);

  const presetDiff = useMemo(() => {
    if (!activePresetId) return [];
    const active = savedPresets.find((p) => p.id === activePresetId);
    if (!active || !active.data) return [];

    const diffs = [];
    const orig = active.data;

    const formatAdjustments = (adjustments) => {
      const arr = Array.isArray(adjustments) ? adjustments : [];
      if (arr.length === 0) return '없음';
      return arr
        .map((a) => {
          const y = Number(a?.year);
          const m = Number(a?.monthly);
          return `[${Number.isFinite(y) ? y : '-'}년차: ${Number.isFinite(m) ? m : '-'}만]`;
        })
        .join(', ');
    };

    const addDiff = (field, oldVal, newVal, unit = '') => {
      if (oldVal !== newVal) {
        diffs.push({ field, old: oldVal, new: newVal, unit });
      }
    };

    // 기간
    addDiff('투자 기간', orig.years, years, '년');

    // 나의 정보
    addDiff('본인 월 투자액', orig.you.monthly, you.monthly, '만원');
    addDiff('본인 수익률', orig.you.rate, you.rate, '%');
    addDiff('본인 초기자산', orig.you.initial, you.initial, '만원');
    if (JSON.stringify(orig.you?.adjustments || []) !== JSON.stringify(you?.adjustments || [])) {
      diffs.push({
        field: '본인 투자 변경 스케줄',
        old: formatAdjustments(orig.you?.adjustments),
        new: formatAdjustments(you?.adjustments),
        unit: '',
      });
    }

    // 상대방 정보
    addDiff('상대방 월 투자액(기본)', orig.other.monthly, other.monthly, '만원');
    addDiff('상대방 수익률(기본)', orig.other.rate, other.rate, '%');
    if (JSON.stringify(orig.other?.adjustments || []) !== JSON.stringify(other?.adjustments || [])) {
      diffs.push({
        field: '상대방 투자 변경 스케줄',
        old: formatAdjustments(orig.other?.adjustments),
        new: formatAdjustments(other?.adjustments),
        unit: '',
      });
    }

    // 결혼/주택
    if (orig.marriagePlan.enabled !== marriagePlan.enabled) {
      addDiff('결혼 계획 활성화', orig.marriagePlan.enabled ? 'O' : 'X', marriagePlan.enabled ? 'O' : 'X');
    }
    
    // 배우자 정보 (결혼 계획)
    addDiff('배우자 이름', orig.marriagePlan.spouse?.name, marriagePlan.spouse?.name, '');
    addDiff('배우자 월급', orig.marriagePlan.spouse?.salary, marriagePlan.spouse?.salary, '만원');
    addDiff('배우자 생활비', orig.marriagePlan.spouse?.expense, marriagePlan.spouse?.expense, '만원');
    addDiff('배우자 월 투자액(결혼)', orig.marriagePlan.spouse?.monthly, marriagePlan.spouse?.monthly, '만원');
    addDiff('배우자 투자액 증가율', orig.marriagePlan.spouse?.monthlyGrowthRate, marriagePlan.spouse?.monthlyGrowthRate, '%');
    addDiff('배우자 수익률(결혼)', orig.marriagePlan.spouse?.rate, marriagePlan.spouse?.rate, '%');
    addDiff('배우자 초기자산(결혼)', orig.marriagePlan.spouse?.initial, marriagePlan.spouse?.initial, '만원');

    if (JSON.stringify(orig.marriagePlan.spouse?.adjustments || []) !== JSON.stringify(marriagePlan.spouse?.adjustments || [])) {
      diffs.push({
        field: '배우자 투자 변경 스케줄',
        old: formatAdjustments(orig.marriagePlan.spouse?.adjustments),
        new: formatAdjustments(marriagePlan.spouse?.adjustments),
        unit: '',
      });
    }
    
    addDiff('집 가격', orig.marriagePlan.housePrice, marriagePlan.housePrice, '만원');
    addDiff('대출 금액', orig.marriagePlan.loanAmount, marriagePlan.loanAmount, '만원');

    // 포트폴리오 (기본)
    Object.keys(ASSET_INFO).forEach(key => {
      const name = ASSET_INFO[key].name;
      if (portfolio.useAmountMode) {
        addDiff(`${name} 투자금`, orig.portfolio.monthlyAmounts?.[key] || 0, portfolio.monthlyAmounts?.[key] || 0, '만원');
      } else {
        addDiff(`${name} 비중`, orig.portfolio.allocations?.[key] || 0, portfolio.allocations?.[key] || 0, '%');
      }
    });

    // 커스텀 주식
    const origCustoms = orig.portfolio.customStocks || [];
    const currCustoms = portfolio.customStocks || [];
    
    // 추가되거나 변경된 종목
    currCustoms.forEach(curr => {
      const orig = origCustoms.find(o => o.ticker === curr.ticker);
      if (!orig) {
        diffs.push({ field: `${curr.ticker} 추가`, old: '-', new: portfolio.useAmountMode ? `${curr.monthlyAmount}만원` : `${curr.allocation}%` });
      } else {
        if (portfolio.useAmountMode) {
          addDiff(`${curr.ticker} 투자금`, orig.monthlyAmount || 0, curr.monthlyAmount || 0, '만원');
        } else {
          addDiff(`${curr.ticker} 비중`, orig.allocation || 0, curr.allocation || 0, '%');
        }
        addDiff(`${curr.ticker} 수익률`, orig.expectedReturn || 0, curr.expectedReturn || 0, '%');
      }
    });

    // 삭제된 종목
    origCustoms.forEach(o => {
      if (!currCustoms.find(c => c.ticker === o.ticker)) {
        diffs.push({ field: `${o.ticker} 삭제`, old: '보유', new: '삭제' });
      }
    });
    // 은퇴 계획
    if (orig.retirementPlan.enabled !== retirementPlan.enabled) {
      addDiff('은퇴 계산 활성화', orig.retirementPlan.enabled ? 'O' : 'X', retirementPlan.enabled ? 'O' : 'X');
    }
    addDiff('은퇴 후 생활비', orig.retirementPlan.monthlyExpense, retirementPlan.monthlyExpense, '만원');

    // 위기 시나리오
    if (orig.crisis.enabled !== crisis.enabled) {
      addDiff('위기 시나리오 활성화', orig.crisis.enabled ? 'O' : 'X', crisis.enabled ? 'O' : 'X');
    }
    addDiff('위기 발생 시점', orig.crisis.startYear, crisis.startYear, '년차');

    return diffs;
  }, [
    activePresetId,
    savedPresets,
    you,
    other,
    years,
    marriagePlan,
    retirementPlan,
    crisis,
    portfolio,
    loanCalc,
    useHistoricalReturns,
  ]);

  const value = {
    // Core state
    you,
    setYou,
    other,
    setOther,
    years,
    setYears,

    // Plan state
    marriagePlan,
    setMarriagePlan,
    retirementPlan,
    setRetirementPlan,
    crisis,
    setCrisis,

    // Portfolio
    portfolio,
    setPortfolio,
    portfolioRate,
    portfolioStdDev,

    // S&P500 Monte Carlo
    mcOptions,
    setMcOptions,
    mcAccumulateEnabled,
    setMcAccumulateEnabled,
    mcAccumulateKey,
    setMcAccumulateKey,
    mcResult,
    mcChartData,
    mcHistogramTotal,
    portfolioMcResult,
    portfolioMcChartData,

    // UI Settings
    otherUseCompound,
    setOtherUseCompound,
    useLogScale,
    setUseLogScale,
    useRealAsset,
    setUseRealAsset,
    useHouseInChart,
    setUseHouseInChart,
    wealthChartHeight,
    setWealthChartHeight,
    showMCBands,
    setShowMCBands,
    portfolioMcChartHeight,
    setPortfolioMcChartHeight,

    // Historical mode
    useHistoricalReturns,
    setUseHistoricalReturns,
    historicalStartYear,
    setHistoricalStartYear,
    historicalReturns,

    // Loan calculator
    loanCalc,
    setLoanCalc,
    loanCalcResult,
    loanChartData,

    // Presets
    savedPresets,
    presetName,
    setPresetName,
    previewPreset,
    setPreviewPreset,
    handleSavePreset,
    handleDeletePreset,
    handleConfirmLoadPreset,
    applyPreset,
    handleUpdatePreset,
    activePresetId,
    setActivePresetId,
    presetDiff,

    // Navigation
    activeView,
    setActiveView,

    // Computed values
    chartData,
    chartDataWithMonteCarlo,
    hasMonteCarloBand,
    finalYou,
    finalYouNoMarriage,
    finalOther,
    difference,
    marriageDifference,
    crossoverYear,
    houseValueFinal,
    remainingLoanFinal,
    netHouseEquity,
    finalFinancialAssets,
    loanCompletionYear,
    retireYearAsset,
    effectiveRetireYear,
    youSavingsRate,
    otherSavingsRate,

    // Asset Tracking
    assetRecords,
    setAssetRecords,
    showActualAssets,
    setShowActualAssets,

    // Constants for reference
    SP500_STATS,
    SP500_YEARS,

    // Actions
    runMonteCarlo,
    clearSp500MonteCarlo,
  };

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
};

export default SimulatorContext;
