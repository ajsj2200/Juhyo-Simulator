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
  SP500_MODERN_RETURNS_ARRAY,
  SP500_YEARS,
  SP500_STATS,
} from '../constants/sp500History';
import { HISTORICAL_EXCHANGE_RATES } from '../constants/exchangeHistory';
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
  calculateMonthlyPaymentEqual,
  calculateWealthWithHistoricalReturns,
  calculateWealthWithMarriageHistorical,
  runMonteCarloPlan,
} from '../utils/calculations';
import { linearRegression } from '../utils/assetTracking';
import { getInitialTheme, getNextTheme, THEME_STORAGE_KEY } from '../utils/theme';

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

const getBrowserStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getBrowserMatchMedia = () => {
  if (typeof window === 'undefined') return null;
  return window.matchMedia;
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

  // Copy results feedback
  const [copied, setCopied] = useState(false);
  const [copyTimeoutId, setCopyTimeoutId] = useState(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutId) clearTimeout(copyTimeoutId);
    };
  }, [copyTimeoutId]);

  // UI Settings
  const [otherUseCompound, setOtherUseCompound] = useState(true);
  const [useLogScale, setUseLogScale] = useState(true);
  const [useRealAsset, setUseRealAsset] = useState(false);
  const [useHouseInChart, setUseHouseInChart] = useState(true);
  const [wealthChartHeight, setWealthChartHeight] = useState(480);
  const [showMCBands, setShowMCBands] = useState(true);
  const [portfolioMcChartHeight, setPortfolioMcChartHeight] = useState(240);
  const [theme, setTheme] = useState(() =>
    getInitialTheme({
      storage: getBrowserStorage(),
      matchMedia: getBrowserMatchMedia(),
    })
  );

  // Historical Mode
  const [useHistoricalReturns, setUseHistoricalReturns] = useState(false);
  const [historicalStartYear, setHistoricalStartYear] = useState(1975);
  const [useExchangeRate, setUseExchangeRate] = useState(false);

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

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = getNextTheme(currentTheme);
      console.log('Theme toggle:', currentTheme, '→', nextTheme);
      const storage = getBrowserStorage();
      if (storage?.setItem) {
        try {
          storage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
          // ignore
        }
      }
      return nextTheme;
    });
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
      const sp500Return = SP500_RETURNS_ARRAY[index];
      const currentYear = SP500_YEARS[(startIndex + i) % SP500_YEARS.length];

      let adjustedReturn = sp500Return;

      if (useExchangeRate) {
        // 환율 반영: (1 + r_usd) * (rate_end / rate_start) - 1
        const rateStart = HISTORICAL_EXCHANGE_RATES[currentYear];
        const rateEnd = HISTORICAL_EXCHANGE_RATES[currentYear + 1] || rateStart; // 다음 해 데이터 없으면 변동 없음 가정

        if (rateStart && rateEnd) {
          const fxEffect = rateEnd / rateStart;
          adjustedReturn = (1 + sp500Return) * fxEffect - 1;
        }
      }

      result.push(adjustedReturn);
    }
    return result;
  }, [useHistoricalReturns, historicalStartYear, years, useExchangeRate]);

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

    // 기본 차트 데이터에 MC 퍼센타일 추가
    let baseData = chartData.map((d, i) => ({
      ...d,
      mc_p10: percentiles?.p10?.[i] != null ? percentiles.p10[i] / 10000 : null,
      mc_p25: percentiles?.p25?.[i] != null ? percentiles.p25[i] / 10000 : null,
      mc_p50: percentiles?.p50?.[i] != null ? percentiles.p50[i] / 10000 : null,
      mc_p75: percentiles?.p75?.[i] != null ? percentiles.p75[i] / 10000 : null,
      mc_p90: percentiles?.p90?.[i] != null ? percentiles.p90[i] / 10000 : null,
      mc_mean: percentiles?.mean?.[i] != null ? percentiles.mean[i] / 10000 : null,
      actualAsset: null,
      actualTrendValue: null,
    }));

    // 자산 추적 데이터가 없으면 기본 데이터 반환
    if (!assetRecords || assetRecords.length === 0) {
      return baseData;
    }

    // 현재 날짜 기준으로 연차 계산
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 자산 추적 데이터를 소수점 year로 변환
    const actualAssetPoints = assetRecords
      .map(record => {
        const recordDate = record.date.length === 7
          ? new Date(record.date + '-01')
          : new Date(record.date);
        // 월 단위 정확한 연차 계산
        const yearFraction = (recordDate.getFullYear() - currentYear) +
                            (recordDate.getMonth() - currentMonth) / 12;
        const assetInEok = (record.assetValue || 0) / 10000;
        return {
          year: yearFraction,
          actualAsset: assetInEok,
          date: record.date,
        };
      })
      .filter(p => p.year >= 0) // 미래 데이터만 (시뮬레이션 범위 내)
      .sort((a, b) => a.year - b.year);

    // 회귀 분석 계산 (2개 이상일 때만)
    let regression = null;
    if (actualAssetPoints.length >= 2) {
      const regressionPoints = actualAssetPoints.map(p => ({
        x: p.year,
        y: p.actualAsset,
      }));
      regression = linearRegression(regressionPoints);
    }

    // 자산 추적 포인트를 기본 데이터에 병합
    const mergedData = [...baseData];

    // 추세선 범위: 첫 기록부터 마지막 기록까지 + 미래 연장
    const minYear = actualAssetPoints.length > 0 ? actualAssetPoints[0].year : 0;
    const maxYear = actualAssetPoints.length > 0
      ? Math.max(actualAssetPoints[actualAssetPoints.length - 1].year + 5, years)
      : years;

    // 기존 연 단위 데이터에 추세선 값 추가
    mergedData.forEach(d => {
      if (regression && d.year >= minYear && d.year <= maxYear) {
        d.actualTrendValue = regression.slope * d.year + regression.intercept;
      }
    });

    // 자산 추적 포인트 추가 (새로운 소수점 year 포인트)
    actualAssetPoints.forEach(point => {
      // 이미 존재하는 year와 충분히 가까우면 해당 데이터에 추가
      const existingIdx = mergedData.findIndex(d => Math.abs(d.year - point.year) < 0.01);
      if (existingIdx >= 0) {
        mergedData[existingIdx].actualAsset = point.actualAsset;
        mergedData[existingIdx].actualAssetDate = point.date;
        if (regression) {
          mergedData[existingIdx].actualTrendValue = regression.slope * point.year + regression.intercept;
        }
      } else {
        // 새 포인트 추가
        const trendValue = regression ? regression.slope * point.year + regression.intercept : null;
        mergedData.push({
          year: point.year,
          actualAsset: point.actualAsset,
          actualAssetDate: point.date,
          actualTrendValue: trendValue,
          // 다른 필드는 null
          you: null,
          youNoMarriage: null,
          other: null,
          house: null,
          remainingLoan: null,
          spouseWealth: null,
          mc_p10: null,
          mc_p25: null,
          mc_p50: null,
          mc_p75: null,
          mc_p90: null,
          mc_mean: null,
        });
      }
    });

    // year 기준 정렬
    mergedData.sort((a, b) => a.year - b.year);

    return mergedData;
  }, [chartData, mcResult, useHouseInChart, assetRecords, years]);

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
    
    // 데이터 범위 선택 (portfolio 내부 설정 사용)
    const returns = portfolio.mcHistoricalRange === 'full' ? SP500_RETURNS_ARRAY : SP500_MODERN_RETURNS_ARRAY;
    
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

  const copyResults = useCallback(() => {
    const fmtEokFromManwon = (value) => {
      if (value == null) return '-';
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return (n / 10000).toFixed(2);
    };

    const initialMonthlyPayment = marriagePlan.buyHouse
      ? (() => {
          if (marriagePlan.repaymentType === 'increasing') {
            return (marriagePlan.loanAmount || 0) * ((marriagePlan.loanRate || 0) / 100 / 12);
          } else if (marriagePlan.repaymentType === 'equalPrincipal') {
            const monthlyPrincipal = (marriagePlan.loanAmount || 0) / ((marriagePlan.loanYears || 1) * 12);
            const interest = (marriagePlan.loanAmount || 0) * ((marriagePlan.loanRate || 0) / 100 / 12);
            return monthlyPrincipal + interest;
          } else {
            return calculateMonthlyPaymentEqual(
              marriagePlan.loanAmount || 0,
              marriagePlan.loanRate || 0,
              marriagePlan.loanYears || 1
            );
          }
        })()
      : 0;

    const yearOfHousePurchase = (marriagePlan.yearOfMarriage || 0) + (marriagePlan.housePurchaseYearAfterMarriage || 0);

    const marriageInfo = marriagePlan.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💒 결혼 및 주택 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 결혼 시점: ${marriagePlan.yearOfMarriage}년 후
• 결혼 비용: ${(marriagePlan.weddingCost || 0).toLocaleString()}만원

👫 배우자 정보
• 이름: ${marriagePlan.spouse?.name || '배우자'}
• 초기 자산: ${(marriagePlan.spouse?.initial || 0).toLocaleString()}만원
• 세후 월급: ${(marriagePlan.spouse?.salary || 0).toLocaleString()}만원
• 월 생활비: ${(marriagePlan.spouse?.expense || 0).toLocaleString()}만원
• 월 투자액: ${(marriagePlan.spouse?.monthly || 0).toLocaleString()}만원 (저축률 ${((marriagePlan.spouse?.salary > 0 ? (marriagePlan.spouse.monthly / marriagePlan.spouse.salary) : 0) * 100).toFixed(1)}%)
• 투자액 증가율: ${marriagePlan.spouse?.monthlyGrowthRate || 0}%/년
• 연 수익률: ${marriagePlan.spouse?.rate || 0}%
• 은퇴 시점: ${marriagePlan.spouse?.retireYear || 0}년 후

${
  marriagePlan.buyHouse
    ? `🏠 주택 구매 정보
• 집 가격: ${(marriagePlan.housePrice || 0).toLocaleString()}만원 (${((marriagePlan.housePrice || 0) / 10000).toFixed(1)}억원)
• 구매 시점: ${yearOfHousePurchase}년 후
• 자기자본: ${(marriagePlan.downPayment || 0).toLocaleString()}만원
• 대출금액: ${(marriagePlan.loanAmount || 0).toLocaleString()}만원 (LTV ${marriagePlan.housePrice > 0 ? (((marriagePlan.loanAmount || 0) / marriagePlan.housePrice) * 100).toFixed(1) : '0'}%)
• 대출 조건: 금리 ${marriagePlan.loanRate}%, ${marriagePlan.loanYears}년 만기, ${
        marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'
      } 상환
• 초기 월 상환액: ${initialMonthlyPayment.toFixed(0)}만원
• 주택 가격 상승률: ${marriagePlan.houseAppreciationRate}%/년
• 대출 완료 예상: 투자 시작 ${loanCompletionYear}년 후

📊 ${years}년 후 부동산 가치
• 집 가치: ${houseValueFinal.toFixed(2)}억원
• 대출 잔액: ${remainingLoanFinal.toFixed(2)}억원
• 순 자산(Equity): ${netHouseEquity.toFixed(2)}억원`
    : `🏠 주택 구매: 없음 (전월세 유지 가정)`
}

💰 결혼 후 현금 흐름
• 합산 월 투자액: ${marriagePlan.buyHouse ? Math.max(0, you.monthly + (marriagePlan.spouse?.monthly || 0) - initialMonthlyPayment).toFixed(0) : (you.monthly + (marriagePlan.spouse?.monthly || 0))}만원
  (본인 ${you.monthly} + 배우자 ${marriagePlan.spouse?.monthly || 0} ${marriagePlan.buyHouse ? `- 대출상환 ${initialMonthlyPayment.toFixed(0)}` : ''})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💍 결혼 효과 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 독신 유지 시 자산: ${finalYouNoMarriage.toFixed(2)}억원
• 결혼 시 총 자산: ${finalYou.toFixed(2)}억원
• 차이: ${marriageDifference >= 0 ? '+' : ''}${marriageDifference.toFixed(2)}억원 (${((finalYouNoMarriage > 0 ? marriageDifference / finalYouNoMarriage : 0) * 100).toFixed(1)}%)
• 결과: ${marriageDifference >= 0 ? '✨ 결혼으로 자산 증대 효과 발생' : '⚠️ 결혼 및 주택 비용으로 자산 감소'}
`
      : '';

    const retirementInfo = retirementPlan.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏖️ 은퇴 계획 및 인출 전략
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ 은퇴 타임라인
• 본인 은퇴: ${you.retireYear}년 후
${marriagePlan.enabled ? `• 배우자 은퇴: ${marriagePlan.spouse?.retireYear || 0}년 후` : ''}
• 완전 은퇴(소득 중단): ${effectiveRetireYear}년 후
• 은퇴 시점 자산: ${retireYearAsset.toFixed(2)}억원

💰 은퇴 후 생활비
• 현재 가치: 월 ${retirementPlan.monthlyExpense}만원
• 물가 상승률: ${retirementPlan.inflationRate}%/년
• ${effectiveRetireYear}년 후 필요 생활비: 월 ${(retirementPlan.monthlyExpense * Math.pow(1 + retirementPlan.inflationRate / 100, effectiveRetireYear)).toFixed(0)}만원

📊 자산 운용 전략
• 전략: ${retirementPlan.useJEPQ ? `JEPQ 배당형 포트폴리오` : 'S&P500 4% 룰 인출'}
${
  retirementPlan.useJEPQ
    ? `• 배분: JEPQ ${retirementPlan.jepqRatio}% / VOO ${100 - retirementPlan.jepqRatio}%
• JEPQ 배당률: 연 ${retirementPlan.jepqDividendRate}% (월배당)
• JEPQ 성장률 가정: 연 2%
• VOO 성장률 가정: 연 ${retirementPlan.vooGrowthRate}% `
    : `• VOO 성장률: 연 ${retirementPlan.vooGrowthRate}% 가정`
}
`
      : '';
    
    const portfolioInfo = portfolio.enabled
  ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 포트폴리오 구성 (자산 배분)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 배분 비율: VOO ${portfolio.allocations?.voo || 0}% | SCHD ${portfolio.allocations?.schd || 0}% | BND ${portfolio.allocations?.bond || 0}% | CASH ${portfolio.allocations?.cash || 0}%
• 가중 평균 기대수익률: ${portfolioRate.toFixed(1)}%
${portfolio.rebalanceEnabled ? `• 리밸런싱: 매 ${portfolio.rebalanceFrequency}개월 마다` : '• 리밸런싱: 없음 (Buy & Hold)'}
${portfolio.monteCarloEnabled ? '• 몬테카를로 적용: 예 (포트폴리오 변동성 반영)' : '• 몬테카를로 적용: 아니오'}
`
  : '';

    const monteCarloInfo = mcResult
  ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 몬테카를로 시뮬레이션 상세 분석 (프로그램 동작 문서)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0️⃣ 핵심 결론(숫자 해석 요약)
• 차트의 MC 밴드(p10~p90)는 '금융자산(집 가치 제외)' 분포입니다.
• MC 요약(p5/p50/p95 등)은 '최종 순자산(집 포함, 대출 차감)' 분포도 함께 제공합니다.
  → 즉, "MC는 집 제외"는 차트 밴드 기준이며, 최종 순자산 분포는 참고로 같이 나옵니다.

1️⃣ 입력/단위/시간축 정의
• 금액 단위(내부 계산): 만원
• 리포트/차트 단위(표시): 억원 (= 만원 ÷ 10,000)
• 시간축: 1년 = 12개월, 월 단위로 복리/인출/대출 상환을 반영
• 수익률 입력: 연 % (예: 8 = 연 8%)
• 월 수익률 환산(기하평균): monthlyRate = (1 + annualPct/100)^(1/12) - 1

2️⃣ 난수/재현성(Seed)
• PRNG: mulberry32
• 시드: ${mcResult.seed}
• 동일한 시드/입력값이면 동일한 MC 결과가 재현됩니다.

3️⃣ 데이터(연수익률)와 샘플링 방식
• 데이터 소스: ${portfolio.mcHistoricalRange === 'full' ? 'S&P 500 전체 역사 (1928~2024)' : 'S&P 500 현대 금융 시스템 (1970~2024)'} (또는 포트폴리오 모드에서는 가중합 연수익률 배열)
• 샘플링: "복원추출(with replacement)" 방식
  - 각 시뮬레이션(iteration)마다, 매년(year=0..${years - 1}) 연수익률을 무작위로 1개 선택
  - 선택된 연수익률 시퀀스(길이 ${years})로 해당 인생 플랜을 0~${years}년까지 시뮬레이션

4️⃣ 1회 시뮬레이션(1 path)에서 적용되는 이벤트/계산 순서
※ 메인 차트와 동일한 월 단위 엔진을 사용하며, 단지 “매년 수익률이 랜덤”이라는 점만 다릅니다.

연도 루프(각 year)에서:
  A) 해당 연도의 연수익률을 월 수익률로 변환
  B) 월 루프(12개월)에서 아래를 순서대로 적용

월 루프(각 month)에서:
  1) 결혼 활성화 여부 판단 및 배우자 초기자산 합류(결혼 시점)
  2) 집 구매 시점이면 다운페이 차감(본인/배우자 자산 비율로 분배)
  3) 은퇴 여부 판단(본인/배우자 은퇴, JEPQ 경제적 자유 로직 포함)
  4) 수익률 적용(자산 증가 적용)
  5) 월 투자액 추가(월급-생활비 기반, 투자액 변경 스케줄 반영)
  6) 대출 상환/중도상환 반영(상환액만큼 투자 여력 감소)
  7) 은퇴 후에는 인플레이션 반영 생활비를 월 단위로 인출

5️⃣ 퍼센타일/밴드 계산 방식(연도별 분포)
• 각 연도 y(0..${years})에 대해, ${mcResult.iterations.toLocaleString()}개의 금융자산 값을 모아 정렬
• p10/p50/p90 = 정렬된 배열에서 해당 분위수 위치 값을 선택

6️⃣ 결과(핵심 숫자)
① 금융자산 기준(차트 MC 밴드와 동일, 집 제외)
• p10: ${fmtEokFromManwon(mcResult.percentilesByYear?.p10?.[years])}억
• p50: ${fmtEokFromManwon(mcResult.percentilesByYear?.p50?.[years])}억
• p90: ${fmtEokFromManwon(mcResult.percentilesByYear?.p90?.[years])}억
• 금융자산 0 미만 확률: ${(mcResult.belowZeroFinancialProbability * 100).toFixed(2)}%

② 최종 순자산 기준(집 포함, 대출 차감)
• p5: ${fmtEokFromManwon(mcResult.p5)}억
• p50(중앙값): ${fmtEokFromManwon(mcResult.median)}억
• p95: ${fmtEokFromManwon(mcResult.p95)}억
• 평균: ${fmtEokFromManwon(mcResult.mean)}억
• 순자산 0 미만 확률: ${(mcResult.belowZeroProbability * 100).toFixed(2)}%

7️⃣ 해석/한계(중요)
• 이 MC는 "연도별 수익률이 서로 독립"이라는 단순 가정(복원추출)을 둡니다.
• 실제 시장의 연속 호황/연속 불황(자기상관)까지 완벽히 모사하진 않습니다.
• 그럼에도 결혼/주택/대출/은퇴/인플레이션 같은 인생 이벤트의 현금흐름은 월 단위로 매우 정확히 반영합니다.
`
  : '';

    const historicalInfo = useHistoricalReturns
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 S&P 500 과거 데이터 시뮬레이션 (Deterministic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 방식: 특정 과거 시점부터의 실제 수익률을 연도별로 순차 대입
• 시작 연도: ${historicalStartYear}년
• 데이터: S&P 500 실제 연간 수익률 (배당 재투자 포함)
• 환율 반영: ${useExchangeRate ? '✅ 예 (원/달러 환율 변동 적용)' : '❌ 아니오 (달러 기준 수익률만 적용)'}
• 설명: 난수를 섞는 몬테카를로와 달리, 정해진 역사의 흐름을 그대로 인생 플랜에 대입하여 "그 당시에 투자했다면 어땠을까?"를 시뮬레이션합니다.
${useExchangeRate ? '  → IMF(1997)나 금융위기(2008) 등 환율 급등 시기의 자산 방어/증가 효과가 반영됩니다.' : ''}
`
      : '';

    const crisisInfo = crisis.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 위기 시나리오 (Stress Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 가정: 대공황급 경제 위기 발생
• 발생 시점: ${crisis.startYear}년 후
• 지속 기간: ${crisis.duration}년 동안
• 하락폭: 매년 -${crisis.drawdownRate}% 하락
`
      : '';

    const text = `
📜 [주효 인생 시뮬레이터] 투자 분석 리포트
생성일: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 본인(${you.name}) 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${you.salary.toLocaleString()}만원
• 월 생활비: ${you.expense?.toLocaleString?.() || you.expense}만원
• 월 투자 가능액: ${you.monthly.toLocaleString()}만원 (저축률 ${youSavingsRate}%)
• 초기 자산: ${you.initial.toLocaleString()}만원
• 투자액 증가율: ${you.monthlyGrowthRate}%/년
• 연평균 수익률 가정: ${useHistoricalReturns ? `S&P 500 역사적 수익률 (${historicalStartYear}년~)` : `${you.rate}%`}
• 은퇴 목표: ${you.retireYear}년 후

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 비교 대상(${other.name}) 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${other.salary.toLocaleString()}만원
• 투자 방식: ${otherUseCompound ? '복리 투자' : '단리 저축'}
• 월 투자액: ${other.monthly.toLocaleString()}만원 (저축률 ${otherSavingsRate}%)
• 연 수익률: ${other.rate}%

${marriageInfo}${retirementInfo}${crisisInfo}${portfolioInfo}${monteCarloInfo}${historicalInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 최종 결과 요약 (${years}년 후)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ ${you.name}의 총 자산: ${finalYou.toFixed(2)}억원
   L 금융 자산: ${finalFinancialAssets.toFixed(2)}억원
   L 부동산 순자산: ${netHouseEquity.toFixed(2)}억원 (집값 ${houseValueFinal.toFixed(2)}억 - 대출 ${remainingLoanFinal.toFixed(2)}억)
   • 월 자산 소득(4%룰): ${((finalYou * 10000 * 0.04) / 12).toFixed(0)}만원

2️⃣ ${other.name}의 총 자산: ${finalOther.toFixed(2)}억원
   • 월 자산 소득(4%룰): ${((finalOther * 10000 * 0.04) / 12).toFixed(0)}만원

3️⃣ 결과 비교
   • 차이: ${difference.toFixed(2)}억원 (${finalOther > 0 ? (finalYou / finalOther).toFixed(2) : '-'}배 더 많음)
   ${crossoverYear !== null ? `• ${crossoverYear}년 후부터 ${you.name}의 자산이 ${other.name}을 추월 시작` : '• 시작부터 본인이 우위'}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 연도별 상세 시뮬레이션
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
연도  |  본인(억)  |  비교(억)  | MC p50(억) |  주요 이벤트
------------------------------------------------------------
${chartDataWithMonteCarlo.map((data, idx) => {
  const eventLabels = [];
  if (marriagePlan.enabled && idx === marriagePlan.yearOfMarriage) eventLabels.push('결혼/집');
  if (marriagePlan.enabled && marriagePlan.buyHouse && idx === loanCompletionYear) eventLabels.push('대출완료');
  if (retirementPlan.enabled && idx === you.retireYear) eventLabels.push('은퇴');
  if (crossoverYear === idx) eventLabels.push('역전');

  const yearStr = `${data.year}년`.padEnd(5);
  const youVal = data.you?.toFixed(2).padStart(9);
  const otherVal = data.other?.toFixed(2).padStart(9);
  const mcVal = data.mc_p50 != null ? data.mc_p50.toFixed(2).padStart(9) : '        -';
  const eventStr = eventLabels.length > 0 ? `  <-- ${eventLabels.join(', ')}` : '';

  return `${yearStr}|${youVal} |${otherVal} |${mcVal} |${eventStr}`;
}).join('\n')}
------------------------------------------------------------
* MC(몬테카를로) 값은 부동산을 제외한 금융 자산만 표시됩니다.
* 본인/비교 자산은 부동산 포함 총 자산입니다.
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimeoutId) clearTimeout(copyTimeoutId);
      const id = setTimeout(() => setCopied(false), 2000);
      setCopyTimeoutId(id);
    });
  }, [
    you,
    other,
    years,
    marriagePlan,
    retirementPlan,
    crisis,
    portfolio,
    mcResult,
    chartDataWithMonteCarlo,
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
    portfolioRate,
    otherUseCompound,
    copyTimeoutId,
    useHistoricalReturns,
    historicalStartYear,
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
        portfolio, // 포트폴리오 전체 (커스텀 주식 포함)
        loanCalc, // 대출 계산기 설정
        otherUseCompound,
        useLogScale,
        useRealAsset,
        useHouseInChart,
        useHistoricalReturns,
        historicalStartYear,
        useExchangeRate,
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
    
    // 개별 상태 로드 (오래된 데이터 대응을 위해 기존 값 or 기본값 fallback)
    if (cloned.you) setYou(cloned.you);
    if (cloned.other) setOther(cloned.other);
    if (cloned.years !== undefined) setYears(cloned.years);
    if (cloned.marriagePlan) setMarriagePlan(cloned.marriagePlan);
    if (cloned.retirementPlan) setRetirementPlan(cloned.retirementPlan);
    if (cloned.crisis) setCrisis(cloned.crisis);
    
    // 포트폴리오 로드 (기존 프리셋 호환성 유지)
    if (cloned.portfolio) {
      setPortfolio(cloned.portfolio);
    }
    // 대출 계산기 로드
    if (cloned.loanCalc) {
      setLoanCalc(cloned.loanCalc);
    }
    
    if (cloned.otherUseCompound !== undefined) setOtherUseCompound(cloned.otherUseCompound);
    if (cloned.useLogScale !== undefined) setUseLogScale(cloned.useLogScale);
    if (cloned.useRealAsset !== undefined) setUseRealAsset(cloned.useRealAsset);
    if (cloned.useHouseInChart !== undefined) setUseHouseInChart(cloned.useHouseInChart);
    
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
        addDiff(`${name} 투자금`, orig.portfolio?.monthlyAmounts?.[key] || 0, portfolio.monthlyAmounts?.[key] || 0, '만원');
      } else {
        addDiff(`${name} 비중`, orig.portfolio?.allocations?.[key] || 0, portfolio.allocations?.[key] || 0, '%');
      }
    });

    // 커스텀 주식
    const origCustoms = orig.portfolio?.customStocks || [];
    const currCustoms = portfolio.customStocks || [];
    
    // 추가되거나 변경된 종목
    currCustoms.forEach(curr => {
      const oCustom = origCustoms.find(o => o.ticker === curr.ticker);
      if (!oCustom) {
        diffs.push({ field: `${curr.ticker} 추가`, old: '-', new: portfolio.useAmountMode ? `${curr.monthlyAmount}만원` : `${curr.allocation}%` });
      } else {
        if (portfolio.useAmountMode) {
          addDiff(`${curr.ticker} 투자금`, oCustom.monthlyAmount || 0, curr.monthlyAmount || 0, '만원');
        } else {
          addDiff(`${curr.ticker} 비중`, oCustom.allocation || 0, curr.allocation || 0, '%');
        }
        addDiff(`${curr.ticker} 수익률`, oCustom.expectedReturn || 0, curr.expectedReturn || 0, '%');
      }
    });

    // 삭제된 종목
    origCustoms.forEach(o => {
      if (!currCustoms.find(c => c.ticker === o.ticker)) {
        diffs.push({ field: `${o.ticker} 삭제`, old: '보유', new: '삭제' });
      }
    });
    // 은퇴 계획
    if (orig.retirementPlan?.enabled !== retirementPlan.enabled) {
      addDiff('은퇴 계산 활성화', orig.retirementPlan?.enabled ? 'O' : 'X', retirementPlan.enabled ? 'O' : 'X');
    }
    addDiff('은퇴 후 생활비', orig.retirementPlan?.monthlyExpense, retirementPlan.monthlyExpense, '만원');

    // 위기 시나리오
    if (orig.crisis?.enabled !== crisis.enabled) {
      addDiff('위기 시나리오 활성화', orig.crisis?.enabled ? 'O' : 'X', crisis.enabled ? 'O' : 'X');
    }
    addDiff('위기 발생 시점', orig.crisis?.startYear, crisis.startYear, '년차');

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
    theme,
    toggleTheme,

    // Historical mode
    useHistoricalReturns,
    setUseHistoricalReturns,
    historicalStartYear,
    setHistoricalStartYear,
    useExchangeRate,
    setUseExchangeRate,

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
    copyResults,
    copied,
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
