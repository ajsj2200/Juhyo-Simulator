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

  // Historical Mode
  const [useHistoricalReturns, setUseHistoricalReturns] = useState(false);
  const [historicalStartYear, setHistoricalStartYear] = useState(1975);

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

  // Active View (for navigation)
  const [activeView, setActiveView] = useState('dashboard');

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
    
    // 기본 자산 예상 수익률
    const baseReturn = getExpectedPortfolioReturn(portfolio.allocations);
    const baseTotal = Object.values(portfolio.allocations).reduce((a, b) => a + b, 0);
    
    // 커스텀 주식 합계
    const customStocks = portfolio.customStocks || [];
    const customTotal = customStocks.reduce((sum, s) => sum + s.allocation, 0);
    
    // 기본 자산 기여분
    const baseContribution = baseReturn * (baseTotal / 100);
    
    // 커스텀 주식 기여분
    const customContribution = customStocks.reduce((sum, stock) => {
      return sum + (stock.expectedReturn || 0) * (stock.allocation / 100);
    }, 0);
    
    return baseContribution + customContribution;
  }, [portfolio.enabled, portfolio.allocations, portfolio.customStocks, you.rate]);

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

    return chartData.map((d, i) => ({
      ...d,
      mc_p10: percentiles.p10?.[i] != null ? percentiles.p10[i] / 10000 : null,
      mc_p25: percentiles.p25?.[i] != null ? percentiles.p25[i] / 10000 : null,
      mc_p50: percentiles.p50?.[i] != null ? percentiles.p50[i] / 10000 : null,
      mc_p75: percentiles.p75?.[i] != null ? percentiles.p75[i] / 10000 : null,
      mc_p90: percentiles.p90?.[i] != null ? percentiles.p90[i] / 10000 : null,
      mc_mean: percentiles.mean?.[i] != null ? percentiles.mean[i] / 10000 : null,
    }));
  }, [chartData, mcResult, useHouseInChart]);

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

  const effectiveRetireYear = marriagePlan.enabled
    ? Math.max(you.retireYear, marriagePlan.spouse.retireYear)
    : you.retireYear;

  const retireYearAsset =
    retirementPlan.enabled && effectiveRetireYear <= years ? chartData[effectiveRetireYear]?.you || 0 : 0;

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
  }, [
    presetName,
    savedPresets,
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
    setOtherUseCompound(cloned.otherUseCompound ?? true);
    setUseLogScale(cloned.useLogScale ?? true);
    setUseRealAsset(cloned.useRealAsset ?? false);
    setUseHouseInChart(cloned.useHouseInChart ?? true);
    setPreviewPreset(null);
  }, []);

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
    mcResult,
    mcChartData,
    mcHistogramTotal,
    runMonteCarlo,

    // Portfolio Monte Carlo
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

    // Constants for reference
    SP500_STATS,
    SP500_YEARS,
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
