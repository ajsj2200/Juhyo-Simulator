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
  getExpectedPortfolioReturn,
  getPortfolioStdDev,
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
  runMonteCarloPlan,
} from './utils/calculations';
import InputGroup from './components/InputGroup';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts';

const LOCAL_PRESET_KEY = 'vooAppCustomPresetsV1';

const createRng = (seed = 1) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomNormalWithRng = (rng) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const runPortfolioPlanMonteCarlo = (
  person,
  years,
  marriage,
  retirement,
  allocations,
  iterations,
  seed
) => {
  const rng = createRng(seed || Math.floor(Math.random() * 2 ** 32));
  const results = [];
  const yearlyWealths = Array.from({ length: years + 1 }, () => []);
  let belowZero = 0;
  let belowZeroFinancial = 0;

  const expected = getExpectedPortfolioReturn(allocations);
  const stdDev = getPortfolioStdDev(allocations);

  for (let i = 0; i < iterations; i++) {
    const seq = [];
    for (let y = 0; y < years; y++) {
      const draw = expected + randomNormalWithRng(rng) * stdDev;
      seq.push(draw);
    }

    const wealthResult = calculateWealthWithMarriageHistorical(
      person,
      years,
      marriage,
      retirement,
      seq,
      true
    );
    const wealth = wealthResult.wealth;
    if (wealth < 0) belowZero += 1;
    results.push(wealth);

    const path = wealthResult.yearlyData?.map((d) => d.wealth) || [];
    const endFinancial = path[years] ?? wealth;
    if (endFinancial < 0) belowZeroFinancial += 1;

    for (let y = 0; y <= years; y++) {
      yearlyWealths[y].push(path[y] ?? wealth);
    }
  }

  const pickFromSorted = (arr, p) => {
    const idx = Math.max(0, Math.min(arr.length - 1, Math.floor(p * (arr.length - 1))));
    return arr[idx];
  };

  const percentilesByYear = {
    p10: [],
    p25: [],
    p50: [],
    p75: [],
    p90: [],
    mean: [],
  };

  for (let y = 0; y <= years; y++) {
    const arr = yearlyWealths[y];
    arr.sort((a, b) => a - b);
    percentilesByYear.p10.push(pickFromSorted(arr, 0.1));
    percentilesByYear.p25.push(pickFromSorted(arr, 0.25));
    percentilesByYear.p50.push(pickFromSorted(arr, 0.5));
    percentilesByYear.p75.push(pickFromSorted(arr, 0.75));
    percentilesByYear.p90.push(pickFromSorted(arr, 0.9));
    percentilesByYear.mean.push(arr.reduce((s, v) => s + v, 0) / arr.length);
  }

  results.sort((a, b) => a - b);
  const pick = (p) => {
    const idx = Math.max(0, Math.min(results.length - 1, Math.floor(p * (results.length - 1))));
    return results[idx];
  };
  const mean = results.reduce((s, v) => s + v, 0) / results.length;

  return {
    iterations,
    seed,
    years,
    p5: pick(0.05),
    p10: pick(0.1),
    p25: pick(0.25),
    median: pick(0.5),
    p75: pick(0.75),
    p90: pick(0.9),
    p95: pick(0.95),
    min: results[0],
    max: results[results.length - 1],
    mean,
    belowZeroProbability: results.length ? belowZero / results.length : 0,
    belowZeroFinancialProbability: results.length ? belowZeroFinancial / results.length : 0,
    percentilesByYear,
    expectedReturn: expected,
    stdDev,
  };
};

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
  const [wealthChartHeight, setWealthChartHeight] = useState(480);
  // 몬테카를로 (과거 수익률 셔플)
  const [mcOptions, setMcOptions] = useState({ iterations: 2000, seed: 1234 });
  const [mcAccumulateEnabled, setMcAccumulateEnabled] = useState(false);
  const [mcAccumulateKey, setMcAccumulateKey] = useState('');
  const [mcResult, setMcResult] = useState(null);
  const [mcChartData, setMcChartData] = useState([]);
  const [mcError, setMcError] = useState('');
  const [mcRunning, setMcRunning] = useState(false);

  const mcHistogramTotal = useMemo(() => mcChartData.reduce((sum, d) => sum + (d.count || 0), 0), [mcChartData]);
  const formatEokFromManwon = (value, fractionDigits = 2) => {
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return (n / 10000).toFixed(fractionDigits);
  };

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

  const portfolioExpectedReturn = useMemo(
    () => getExpectedPortfolioReturn(portfolio.allocations),
    [portfolio.allocations]
  );
  const portfolioStdDev = useMemo(
    () => getPortfolioStdDev(portfolio.allocations),
    [portfolio.allocations]
  );

  const portfolioMcResult = useMemo(() => {
    if (!portfolio.enabled || !portfolio.monteCarloEnabled) return null;
    const simulations = Math.max(100, Math.min(portfolio.monteCarloSimulations || 500, 20000));
    return runPortfolioPlanMonteCarlo(
      you,
      years,
      marriagePlan,
      retirementPlan,
      portfolio.allocations,
      simulations,
      mcOptions.seed
    );
  }, [
    portfolio.enabled,
    portfolio.monteCarloEnabled,
    portfolio.monteCarloSimulations,
    portfolio.allocations,
    marriagePlan,
    retirementPlan,
    you,
    years,
    mcOptions.seed,
  ]);

  const portfolioMcChartData = useMemo(() => {
    const percentiles = portfolioMcResult?.percentilesByYear;
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

  const generateMonteCarloSeed = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0];
      }
    } catch {
      // ignore
    }
    return Math.floor(Math.random() * 2 ** 32);
  };

  const startWealthChartResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = wealthChartHeight;

    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.max(260, Math.min(900, startHeight + delta));
      setWealthChartHeight(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRunMonteCarlo = () => {
    setMcError('');
    const iterInput = Number(mcOptions.iterations);
    const iterToAdd = Math.max(100, Math.min(Number.isFinite(iterInput) ? iterInput : 2000, 20000));

    try {
      setMcRunning(true);
      // 같은 설정에서만 누적 허용 (설정이 달라지면 자동으로 새로 시작)
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
      // calculateWealthWithMarriageHistorical 내부에서 /100 처리하므로 % 단위 그대로 전달
      const returns = SP500_RETURNS_ARRAY;
      const res = runMonteCarloPlan(you, years, marriagePlan, retirementPlan, returns, {
        iterations: totalIterations,
        seed,
        useCompound: true,
        includeSamples: true,
      });
      setMcResult(res);
    } catch (e) {
      console.error(e);
      setMcError('몬테카를로 실행 중 오류가 발생했습니다. 입력값을 확인하세요.');
    } finally {
      setMcRunning(false);
    }
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

  // 몬테카를로 밴드가 포함된 차트 데이터
  // 포트폴리오 모드일 때는 플랜 몬테카를로(mcResult)만 사용 (포트폴리오 MC는 결혼/주택 미반영이라 타이밍 안 맞음)
  const chartDataWithMonteCarlo = useMemo(() => {
    const percentiles = mcResult?.percentilesByYear;
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
  const [copyTimeoutId, setCopyTimeoutId] = useState(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutId) clearTimeout(copyTimeoutId);
    };
  }, [copyTimeoutId]);

  const copyResults = () => {
    const fmtEokFromManwon = (value) => {
      if (value == null) return '-';
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return (n / 10000).toFixed(2);
    };

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

    const netHouseEquity = Math.max(0, houseValueFinal - remainingLoanFinal);
    const finalFinancialAssets = Math.max(0, finalYou - netHouseEquity);

    const marriageInfo = marriagePlan.enabled
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💒 결혼 및 주택 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 결혼 시점: ${marriagePlan.yearOfMarriage}년 후
• 결혼 비용: ${(marriagePlan.weddingCost || 0).toLocaleString()}만원

👫 배우자 정보
• 이름: ${marriagePlan.spouse.name}
• 초기 자산: ${(marriagePlan.spouse.initial || 0).toLocaleString()}만원
• 세후 월급: ${marriagePlan.spouse.salary.toLocaleString()}만원
• 월 생활비: ${marriagePlan.spouse.expense?.toLocaleString?.() || marriagePlan.spouse.expense}만원
• 월 투자액: ${marriagePlan.spouse.monthly.toLocaleString()}만원 (저축률 ${((marriagePlan.spouse.monthly / marriagePlan.spouse.salary) * 100).toFixed(1)}%)
• 투자액 증가율: ${marriagePlan.spouse.monthlyGrowthRate}%/년
• 연 수익률: ${marriagePlan.spouse.rate}%
• 은퇴 시점: ${marriagePlan.spouse.retireYear}년 후
${marriagePlan.spouse.adjustments?.length ? `• 투자액 변경 스케줄: ${marriagePlan.spouse.adjustments.map((a) => `[${a.year}년차: ${a.monthly}만]`).join(', ')}` : ''}

${
  marriagePlan.buyHouse
    ? `🏠 주택 구매 정보
• 집 가격: ${marriagePlan.housePrice.toLocaleString()}만원 (${(marriagePlan.housePrice / 10000).toFixed(1)}억원)
• 구매 시점: ${yearOfHousePurchase}년 후
• 자기자본: ${marriagePlan.downPayment.toLocaleString()}만원
• 대출금액: ${marriagePlan.loanAmount.toLocaleString()}만원 (LTV ${marriagePlan.housePrice > 0 ? ((marriagePlan.loanAmount / marriagePlan.housePrice) * 100).toFixed(1) : '0'}%)
• 대출 조건: 금리 ${marriagePlan.loanRate}%, ${marriagePlan.loanYears}년 만기, ${
        marriagePlan.repaymentType === 'equalPayment' ? '원리금균등' : marriagePlan.repaymentType === 'equalPrincipal' ? '원금균등' : '체증식'
      } 상환
${marriagePlan.prepayEnabled ? `• 중도상환: 결혼 ${marriagePlan.prepayYear}년 후 잔액 일시상환 설정됨` : ''}
• 초기 월 상환액: ${initialMonthlyPayment.toFixed(0)}만원
• 주택 가격 상승률: ${marriagePlan.houseAppreciationRate}%/년
• 대출 완료 예상: 구매 ${effectiveLoanYears}년 후 (투자 시작 ${loanCompletionYear}년 후)

📊 ${years}년 후 부동산 가치
• 집 가치: ${houseValueFinal.toFixed(2)}억원
• 대출 잔액: ${remainingLoanFinal.toFixed(2)}억원
• 순 자산(Equity): ${netHouseEquity.toFixed(2)}억원`
    : `🏠 주택 구매: 없음 (전월세 유지 가정)`
}

💰 결혼 후 현금 흐름
• 합산 월 투자액: ${marriagePlan.buyHouse ? Math.max(0, you.monthly + marriagePlan.spouse.monthly - initialMonthlyPayment).toFixed(0) : (you.monthly + marriagePlan.spouse.monthly)}만원
  (본인 ${you.monthly} + 배우자 ${marriagePlan.spouse.monthly} ${marriagePlan.buyHouse ? `- 대출상환 ${initialMonthlyPayment.toFixed(0)}` : ''})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💍 결혼 효과 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 독신 유지 시 자산: ${finalYouNoMarriage.toFixed(2)}억원
• 결혼 시 총 자산: ${finalYou.toFixed(2)}억원
• 차이: ${marriageDifference >= 0 ? '+' : ''}${marriageDifference.toFixed(2)}억원 (${marriageDifference >= 0 ? '+' : ''}${((marriageDifference / finalYouNoMarriage) * 100).toFixed(1)}%)
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
${marriagePlan.enabled ? `• 배우자 은퇴: ${marriagePlan.spouse.retireYear}년 후` : ''}
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
• VOO 성장률 가정: 연 ${retirementPlan.vooGrowthRate}% 
${jepqFinancialIndependenceYear !== null ? `✓ ${jepqFinancialIndependenceYear}년 후 JEPQ 배당금만으로 생활비 충당 가능 (경제적 자유 달성)` : '⚠️ 시뮬레이션 기간 내 배당금만으로 생활비 충당 불가'}`
    : `• VOO 성장률: 연 ${retirementPlan.vooGrowthRate}% 가정`
}
`
      : '';
    
    const portfolioInfo = portfolio.enabled
  ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 포트폴리오 구성 (자산 배분)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 배분 비율: VOO ${portfolio.allocations.voo}% | SCHD ${portfolio.allocations.schd}% | BND ${portfolio.allocations.bond}% | CASH ${portfolio.allocations.cash}%
• 가중 평균 기대수익률: ${getExpectedPortfolioReturn(portfolio.allocations).toFixed(1)}%
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
• 데이터 소스: S&P 500 역사적 연수익률 배열(또는 포트폴리오 모드에서는 가중합 연수익률 배열)
• 샘플링: "복원추출(with replacement)" 방식
  - 각 시뮬레이션(iteration)마다, 매년(year=0..${years - 1}) 연수익률을 무작위로 1개 선택
  - 선택된 연수익률 시퀀스(길이 ${years})로 해당 인생 플랜을 0~${years}년까지 시뮬레이션

4️⃣ 1회 시뮬레이션(1 path)에서 적용되는 이벤트/계산 순서
※ 메인 차트와 동일한 월 단위 엔진을 사용하며(동일한 규칙), 단지 “매년 수익률이 랜덤”이라는 점만 다릅니다.

연도 루프(각 year)에서:
  A) 연초에 yearlyData[year]를 기록(차트 타이밍과 동기화)
  B) 해당 연도의 연수익률을 월 수익률로 변환
  C) 월 루프(12개월)에서 아래를 순서대로 적용

월 루프(각 month)에서:
  1) 결혼 활성화 여부 판단 및 배우자 초기자산 합류(결혼 시점)
  2) 집 구매 시점이면 다운페이 차감(본인/배우자 자산 비율로 분배)
  3) 집 구매 후에는 집값을 매월 상승률로 업데이트(단, MC 밴드에서는 집값을 별도 표시하지 않음)
  4) 은퇴 여부 판단(본인/배우자 은퇴, JEPQ 경제적 자유 로직 포함)
  5) 수익률 적용(복리/단리 토글에 따라 자산 증가 방식이 달라짐)
  6) 월 투자액 추가(월급-생활비 기반, 투자액 변경 스케줄 반영)
  7) 대출 상환/중도상환 반영(상환액만큼 투자 여력 감소 또는 잔액 일시 상환)
  8) 은퇴 후에는 인플레이션 반영 생활비를 월 단위로 인출

5️⃣ 퍼센타일/밴드 계산 방식(연도별 분포)
• 각 연도 y(0..${years})에 대해, ${mcResult.iterations.toLocaleString()}개의 금융자산 값을 모아 정렬
• p10/p25/p50/p75/p90 = 정렬된 배열에서 해당 분위수 위치 값을 선택
• mean = 해당 연도 값의 산술 평균

6️⃣ 결과(핵심 숫자)
① 금융자산 기준(차트 MC 밴드와 동일, 집 제외)
• p10: ${fmtEokFromManwon(mcResult.percentilesByYear?.p10?.[years])}억
• p25: ${fmtEokFromManwon(mcResult.percentilesByYear?.p25?.[years])}억
• p50: ${fmtEokFromManwon(mcResult.percentilesByYear?.p50?.[years])}억
• p75: ${fmtEokFromManwon(mcResult.percentilesByYear?.p75?.[years])}억
• p90: ${fmtEokFromManwon(mcResult.percentilesByYear?.p90?.[years])}억
• mean: ${fmtEokFromManwon(mcResult.percentilesByYear?.mean?.[years])}억
• 금융자산 0 미만 확률: ${(mcResult.belowZeroFinancialProbability * 100).toFixed(2)}%

② 최종 순자산 기준(집 포함, 대출 차감)
• p5: ${fmtEokFromManwon(mcResult.p5)}억
• p10: ${fmtEokFromManwon(mcResult.p10)}억
• p25: ${fmtEokFromManwon(mcResult.p25)}억
• p50(중앙값): ${fmtEokFromManwon(mcResult.median)}억
• p75: ${fmtEokFromManwon(mcResult.p75)}억
• p90: ${fmtEokFromManwon(mcResult.p90)}억
• p95: ${fmtEokFromManwon(mcResult.p95)}억
• mean: ${fmtEokFromManwon(mcResult.mean)}억
• 순자산 0 미만 확률: ${(mcResult.belowZeroProbability * 100).toFixed(2)}%

7️⃣ 해석/한계(중요)
• 이 MC는 "연도별 수익률이 서로 독립"이라는 단순 가정(복원추출)을 둡니다.
  - 실제 시장의 연속 호황/연속 불황(자기상관)까지 완벽히 모사하진 않습니다.
• 세금/수수료/거래비용/자산군별 상관관계는 단순화되어 있습니다.
• 그럼에도 결혼/주택/대출/은퇴/인플레이션 같은 인생 이벤트의 현금흐름은 월 단위로 매우 정확히 반영합니다.
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
• 연평균 수익률 가정: ${you.rate}%
• 은퇴 목표: ${you.retireYear}년 후
${you.adjustments?.length ? `• 투자액 변경 스케줄: ${you.adjustments.map((a) => `[${a.year}년차: ${a.monthly}만]`).join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 비교 대상(${other.name}) 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 세후 월급: ${other.salary.toLocaleString()}만원
• 투자 방식: ${otherUseCompound ? '복리 투자' : '단리 저축'}
• 월 투자액: ${other.monthly.toLocaleString()}만원 (저축률 ${otherSavingsRate}%)
• 연 수익률: ${other.rate}%
${other.adjustments?.length ? `• 투자액 변경 스케줄: ${other.adjustments.map((a) => `[${a.year}년차: ${a.monthly}만]`).join(', ')}` : ''}

${marriageInfo}${retirementInfo}${crisisInfo}${portfolioInfo}${monteCarloInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 최종 결과 요약 (${years}년 후)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ ${you.name}의 총 자산: ${finalYou.toFixed(2)}억원
   L 금융 자산: ${finalFinancialAssets.toFixed(2)}억원
   L 부동산 순자산: ${netHouseEquity.toFixed(2)}억원 (집값 ${houseValueFinal.toFixed(2)}억 - 대출 ${remainingLoanFinal.toFixed(2)}억)
   • 월 자산 소득(4%룰): ${(finalYou * 10000 * 0.04 / 12).toFixed(0)}만원

2️⃣ ${other.name}의 총 자산: ${finalOther.toFixed(2)}억원
   • 월 자산 소득(4%룰): ${(finalOther * 10000 * 0.04 / 12).toFixed(0)}만원

3️⃣ 결과 비교
   • 차이: ${difference.toFixed(2)}억원 (${you.name}이 ${(finalYou / finalOther).toFixed(2)}배 더 많음)
   ${crossoverYear !== null ? `• ${crossoverYear}년 후부터 ${you.name}의 자산이 ${other.name}을 추월 시작` : '• 시작부터 본인이 우위'}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 연도별 상세 시뮬레이션
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
연도  |  본인(억)  |  비교(억)  | MC p10(억) | MC p50(억) | MC p90(억) |  주요 이벤트
--------------------------------------------------------------------------------
${chartDataWithMonteCarlo.map((data, idx) => {
  const eventLabels = [];
  if (marriagePlan.enabled && idx === marriagePlan.yearOfMarriage) eventLabels.push('결혼/집');
  if (marriagePlan.enabled && marriagePlan.buyHouse && idx === loanCompletionYear) eventLabels.push('대출완료');
  if (retirementPlan.enabled && idx === you.retireYear) eventLabels.push('은퇴');
  if (crossoverYear === idx) eventLabels.push('역전');

  const yearStr = `${data.year}년`.padEnd(5);
  const youStr = data.you.toFixed(2).padStart(9);
  const otherStr = data.other.toFixed(2).padStart(9);
  const p10Str = data.mc_p10 != null ? data.mc_p10.toFixed(2).padStart(9) : '        -';
  const p50Str = data.mc_p50 != null ? data.mc_p50.toFixed(2).padStart(9) : '        -';
  const p90Str = data.mc_p90 != null ? data.mc_p90.toFixed(2).padStart(9) : '        -';
  const eventStr = eventLabels.length > 0 ? `  <-- ${eventLabels.join(', ')}` : '';

  return `${yearStr}|${youStr} |${otherStr} |${p10Str} |${p50Str} |${p90Str} |${eventStr}`;
}).join('\n')}
--------------------------------------------------------------------------------
* MC(몬테카를로) 값은 부동산을 제외한 금융 자산만 표시됩니다.
* 본인/비교 자산은 부동산 포함 총 자산입니다.
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimeoutId) clearTimeout(copyTimeoutId);
      const id = setTimeout(() => setCopied(false), 2000);
      setCopyTimeoutId(id);
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
                {mcAccumulateEnabled && mcResult ? ` (누적 총 ${mcResult.iterations}회)` : ''}
              </p>
              <div className="mt-2 text-xs text-gray-600 leading-relaxed">
                <div>• 샘플링: 매년 과거 수익률 목록에서 1개를 <b>복원추출</b>(with replacement)로 뽑아 {years}년 시퀀스를 만듭니다. (연도 간 독립 가정)</div>
                <div>• 적용: 뽑힌 “연 수익률”을 월 단위로 환산해 복리로 반영하고, 결혼/주택(다운페이·대출상환·중도상환)·은퇴(인출) 같은 현금흐름 이벤트를 <b>월 단위</b>로 동일 엔진에 적용합니다.</div>
                <div>• 결과: 최종 순자산(집 포함·대출 차감) 분포와, 연도별 분위수 밴드(p10/p25/p50/p75/p90)를 계산합니다. (차트 밴드는 설정에 따라 금융자산 기준으로 표시될 수 있음)</div>
                <div>• Seed: 동일 시드/동일 입력이면 결과가 재현됩니다. “이전 결과에 누적”을 켜면 같은 시드로 반복 횟수를 늘려 기존 샘플을 보존한 채 더 많은 샘플을 추가합니다.</div>
              </div>
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
              <label className="flex items-center gap-2 mb-3 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={mcAccumulateEnabled}
                  onChange={(e) => setMcAccumulateEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                이전 결과에 누적
              </label>
              <button
                type="button"
                onClick={handleRunMonteCarlo}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                disabled={mcRunning}
              >
                {mcRunning ? '실행 중...' : '실행'}
              </button>
            </div>
            {mcError && <div className="text-sm text-red-600 mt-2">{mcError}</div>}
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
                        formatter={(v) => {
                          const count = Number(v) || 0;
                          const pct = mcHistogramTotal > 0 ? (count / mcHistogramTotal) * 100 : 0;
                          return [`${count}회 (${pct.toFixed(2)}%)`, '빈도'];
                        }}
                        labelFormatter={(l) => `구간: ${l}`}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {mcChartData.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 leading-relaxed">
                  이 히스토그램은 “최종 순자산(집 포함, 대출 차감)”의 분포입니다. 극단적으로 낮은 값(왼쪽 꼬리)은
                  은퇴 후 인출 구간에 하락장이 겹치거나, 결혼/주택 이벤트 직후 하락장이 겹쳐 현금흐름이 불리해지는
                  일부 시나리오(꼬리 경로)에서 발생할 수 있습니다.
                </div>
              )}
              {mcChartData.length === 0 && (
                <div className="mt-3 text-sm text-gray-500">시뮬레이션을 실행하면 분포 차트가 표시됩니다.</div>
              )}
            </>
          )}
        </div>

        {/* 포트폴리오 변동성 몬테카를로 (자산 배분 전용) */}
        {portfolio.enabled && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border border-purple-100 w-full -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">🎯 포트폴리오 몬테카를로 (별도 차트)</h3>
                <p className="text-sm text-gray-500">
                  VOO/SCHD/BND/현금 비중·변동성 기반 수익률을 연도별로 난수 생성해, 결혼·주택·대출·은퇴 이벤트까지 동일하게 반영한 몬테카를로입니다. (S&P500 기반 플랜 MC와 가정이 다르므로 별도 차트)
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <div className="px-3 py-2 bg-purple-50 border border-purple-100 rounded">
                  <div className="font-semibold text-purple-700">시뮬레이션</div>
                  <div>{portfolioMcResult?.iterations || Math.max(100, Math.min(portfolio.monteCarloSimulations || 500, 20000))}회</div>
                </div>
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                  <div className="font-semibold text-blue-700">기대수익률</div>
                  <div>{portfolioExpectedReturn.toFixed(1)}%</div>
                </div>
                <div className="px-3 py-2 bg-orange-50 border border-orange-100 rounded">
                  <div className="font-semibold text-orange-700">표준편차</div>
                  <div>{portfolioStdDev.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {!portfolio.monteCarloEnabled && (
              <div className="text-sm text-gray-500">
                포트폴리오 섹션에서 &ldquo;몬테카를로 시뮬레이션&rdquo;을 켜면 변동성 밴드 차트가 나타납니다.
              </div>
            )}

            {portfolio.monteCarloEnabled && !portfolioMcResult && (
              <div className="text-sm text-gray-500">
                투자액/기간/배분을 입력하면 포트폴리오 변동성 차트가 표시됩니다.
              </div>
            )}

            {portfolio.monteCarloEnabled && portfolioMcResult && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="text-xs text-gray-600">p10 (보수적)</div>
                    <div className="text-lg font-bold text-purple-700">
                      {formatEokFromManwon(portfolioMcResult.percentilesByYear?.p10?.[years])}억
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-xs text-gray-600">p50 (중앙값)</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatEokFromManwon(portfolioMcResult.percentilesByYear?.p50?.[years])}억
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <div className="text-xs text-gray-600">p90 (낙관적)</div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatEokFromManwon(portfolioMcResult.percentilesByYear?.p90?.[years])}억
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="text-xs text-gray-600">평균</div>
                    <div className="text-lg font-bold text-orange-700">
                      {formatEokFromManwon(portfolioMcResult.percentilesByYear?.mean?.[years])}억
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs text-gray-600">포트폴리오 예상 리턴/리스크</div>
                    <div className="text-sm font-semibold text-blue-700">
                      {portfolioExpectedReturn.toFixed(1)}% / σ {portfolioStdDev.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-96 w-full -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={portfolioMcChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioMc90" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c084fc" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="portfolioMc50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tickFormatter={(v) => `${v}년`} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(1)}억`} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0]?.payload;
                          if (!row) return null;
                          const fmt = (v) => (v === null || v === undefined ? '-' : `${v.toFixed(2)}억`);
                          return (
                            <div className="rounded-xl border border-purple-100 bg-white/95 p-3 shadow-lg text-xs">
                              <div className="font-semibold text-gray-800 mb-1">{label}년 후</div>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>p10</span><span className="font-bold text-purple-700">{fmt(row.p10)}</span></div>
                                <div className="flex justify-between"><span>p25</span><span className="font-bold text-purple-600">{fmt(row.p25)}</span></div>
                                <div className="flex justify-between"><span>p50(중앙)</span><span className="font-bold text-gray-800">{fmt(row.p50)}</span></div>
                                <div className="flex justify-between"><span>p75</span><span className="font-bold text-purple-600">{fmt(row.p75)}</span></div>
                                <div className="flex justify-between"><span>p90</span><span className="font-bold text-emerald-700">{fmt(row.p90)}</span></div>
                              </div>
                            </div>
                          );
                        }}
                      />

                      {/* 10~90% 밴드 */}
                      <Area
                        type="monotone"
                        dataKey="band90Base"
                        stackId="mc90"
                        stroke="none"
                        fillOpacity={0}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="band90"
                        stackId="mc90"
                        stroke="none"
                        fill="url(#portfolioMc90)"
                        fillOpacity={1}
                        isAnimationActive={false}
                        name="10~90%"
                      />

                      {/* 25~75% 밴드 */}
                      <Area
                        type="monotone"
                        dataKey="band50Base"
                        stackId="mc50"
                        stroke="none"
                        fillOpacity={0}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="band50"
                        stackId="mc50"
                        stroke="none"
                        fill="url(#portfolioMc50)"
                        fillOpacity={1}
                        isAnimationActive={false}
                        name="25~75%"
                      />

                      <Line
                        type="monotone"
                        dataKey="p50"
                        stroke="#7c3aed"
                        strokeWidth={2.6}
                        name="중앙값"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                  • 포트폴리오 변동성만 반영한 적립 시뮬레이션으로, 결혼/주택/대출/은퇴/배우자/인출 이벤트는 포함되지 않습니다.
                  <br />
                  • S&P500 기반 플랜 몬테카를로(위 카드)와 별도 계산되며, 결과를 직접 비교할 때 가정이 다름에 유의하세요.
                </p>
              </>
            )}
          </div>
        )}

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
        <div className="mb-8">
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
          height={wealthChartHeight}
          showNoMarriageComparison={false}
        />
          <div
            onPointerDown={startWealthChartResize}
            className="mt-2 h-3 w-full cursor-row-resize rounded bg-gray-100 border border-gray-200"
            title="드래그해서 차트 높이 조절"
            role="separator"
            aria-label="차트 높이 조절"
          />
        </div>

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
