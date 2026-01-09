// 자산별 연도별 수익률 데이터 (배당 재투자 기준, Total Return)

// SCHD (Schwab U.S. Dividend Equity ETF) 연도별 수익률
// 2012년 10월 출시, 2012년 데이터는 부분 연도
export const SCHD_ANNUAL_RETURNS = {
  2012: 4.83,   // 부분 연도 (10월~12월)
  2013: 28.87,
  2014: 15.09,
  2015: -1.98,
  2016: 16.42,
  2017: 15.46,
  2018: -5.56,
  2019: 27.18,
  2020: 13.94,
  2021: 29.14,
  2022: -3.23,
  2023: 3.90,
  2024: 12.45,
};

// SCHD 통계
export const SCHD_RETURNS_ARRAY = Object.values(SCHD_ANNUAL_RETURNS);
export const SCHD_YEARS = Object.keys(SCHD_ANNUAL_RETURNS).map(Number);
export const SCHD_STATS = {
  avgDividendYield: 3.5, // 평균 배당률 (%)
  dividendGrowthRate: 12.0, // 배당 성장률 (%/년)
  avgTotalReturn: SCHD_RETURNS_ARRAY.reduce((a, b) => a + b, 0) / SCHD_RETURNS_ARRAY.length,
};

// BND (Vanguard Total Bond Market ETF) 연도별 수익률
export const BND_ANNUAL_RETURNS = {
  2008: 5.05,
  2009: 5.93,
  2010: 6.54,
  2011: 7.84,
  2012: 4.21,
  2013: -2.02,
  2014: 5.97,
  2015: 0.55,
  2016: 2.65,
  2017: 3.54,
  2018: -0.05,
  2019: 8.72,
  2020: 7.72,
  2021: -1.67,
  2022: -13.10,
  2023: 5.60,
  2024: 1.25,
};

// BND 통계
export const BND_RETURNS_ARRAY = Object.values(BND_ANNUAL_RETURNS);
export const BND_YEARS = Object.keys(BND_ANNUAL_RETURNS).map(Number);
export const BND_STATS = {
  avgYield: 4.5, // 평균 수익률 (%)
  avgTotalReturn: BND_RETURNS_ARRAY.reduce((a, b) => a + b, 0) / BND_RETURNS_ARRAY.length,
};

// 현금/예금 수익률 (한국 기준)
export const CASH_ANNUAL_RETURN = 3.0; // 예금 평균 금리 (%)

// 자산 정보
export const ASSET_INFO = {
  voo: {
    name: 'VOO',
    fullName: 'Vanguard S&P 500 ETF',
    type: 'stock',
    description: 'S&P 500 추종, 성장형',
    expectedReturn: 10.0,
    stdDev: 16.5, // 연간 표준편차 (%)
    volatility: 'high',
    dividendYield: 1.5,
    color: '#2563eb', // blue-600
  },
  schd: {
    name: 'SCHD',
    fullName: 'Schwab U.S. Dividend Equity ETF',
    type: 'dividend',
    description: '배당 성장형, 안정적',
    expectedReturn: 8.0,
    stdDev: 14.0, // 연간 표준편차 (%)
    volatility: 'medium',
    dividendYield: 3.5,
    color: '#16a34a', // green-600
  },
  bond: {
    name: 'BND',
    fullName: 'Vanguard Total Bond Market ETF',
    type: 'bond',
    description: '채권, 안정형',
    expectedReturn: 4.0,
    stdDev: 5.5, // 연간 표준편차 (%)
    volatility: 'low',
    dividendYield: 4.5,
    color: '#ca8a04', // yellow-600
  },
  cash: {
    name: '현금',
    fullName: '예금/현금',
    type: 'cash',
    description: '예금, 초안정형',
    expectedReturn: 3.0,
    stdDev: 0.5, // 거의 변동 없음
    volatility: 'none',
    dividendYield: 3.0,
    color: '#6b7280', // gray-500
  },
};

// 자산 간 상관계수 (대략적인 historical correlation)
export const ASSET_CORRELATIONS = {
  'voo-schd': 0.90,   // VOO와 SCHD는 높은 상관관계
  'voo-bond': -0.20,  // 주식과 채권은 약한 음의 상관관계
  'voo-cash': 0.00,   // 현금은 무상관
  'schd-bond': -0.15, // SCHD와 채권도 약한 음의 상관관계
  'schd-cash': 0.00,
  'bond-cash': 0.10,
};

// 기본 포트폴리오 설정
export const DEFAULT_PORTFOLIO = {
  enabled: false,
  allocations: {
    voo: 100,
    schd: 0,
    bond: 0,
    cash: 0,
  },
  rebalanceEnabled: true,
  rebalanceFrequency: 12, // 월 단위 (12 = 연 1회)
  monteCarloEnabled: false,
  monteCarloSimulations: 500,
};

// 사전 정의 포트폴리오 (프리셋)
export const PORTFOLIO_PRESETS = {
  aggressive: {
    name: '공격형 (100% 주식)',
    allocations: { voo: 100, schd: 0, bond: 0, cash: 0 },
    description: '최대 성장 추구, 변동성 높음',
  },
  growth: {
    name: '성장형 (80/20)',
    allocations: { voo: 60, schd: 20, bond: 15, cash: 5 },
    description: '성장 중심, 일부 안정자산',
  },
  balanced: {
    name: '균형형 (60/40)',
    allocations: { voo: 40, schd: 20, bond: 30, cash: 10 },
    description: '성장과 안정의 균형',
  },
  conservative: {
    name: '안정형 (40/60)',
    allocations: { voo: 20, schd: 20, bond: 40, cash: 20 },
    description: '안정 중심, 변동성 최소화',
  },
  dividend: {
    name: '배당형',
    allocations: { voo: 30, schd: 50, bond: 15, cash: 5 },
    description: 'SCHD 중심 배당 수익',
  },
};

// 포트폴리오 가중 수익률 계산 (특정 연도)
export const getPortfolioReturnForYear = (year, allocations, sp500Returns, useSCHDData = true) => {
  const vooReturn = sp500Returns[year] ?? 10.0;
  const schdReturn = useSCHDData && SCHD_ANNUAL_RETURNS[year] !== undefined
    ? SCHD_ANNUAL_RETURNS[year]
    : SCHD_STATS.avgTotalReturn;
  const bondReturn = BND_ANNUAL_RETURNS[year] ?? BND_STATS.avgTotalReturn;
  const cashReturn = CASH_ANNUAL_RETURN;

  const weightedReturn =
    (allocations.voo / 100) * vooReturn +
    (allocations.schd / 100) * schdReturn +
    (allocations.bond / 100) * bondReturn +
    (allocations.cash / 100) * cashReturn;

  return weightedReturn;
};

// 포트폴리오 예상 수익률 계산 (평균)
export const getExpectedPortfolioReturn = (allocations) => {
  const { voo, schd, bond, cash } = allocations;
  return (
    (voo / 100) * ASSET_INFO.voo.expectedReturn +
    (schd / 100) * ASSET_INFO.schd.expectedReturn +
    (bond / 100) * ASSET_INFO.bond.expectedReturn +
    (cash / 100) * ASSET_INFO.cash.expectedReturn
  );
};

// 포트폴리오 변동성 레벨 계산
export const getPortfolioVolatilityLevel = (allocations) => {
  const stockRatio = (allocations.voo + allocations.schd) / 100;
  if (stockRatio >= 0.8) return 'high';
  if (stockRatio >= 0.5) return 'medium';
  if (stockRatio >= 0.2) return 'low';
  return 'very-low';
};

// 포트폴리오 표준편차 계산 (단순화: 상관관계 무시한 가중 평균)
export const getPortfolioStdDev = (allocations) => {
  const { voo, schd, bond, cash } = allocations;
  // 단순화된 포트폴리오 분산 계산 (상관관계 고려 시 더 복잡)
  // 실제로는 상관관계를 고려해야 하지만, 단순화를 위해 가중 평균 사용
  const variance = 
    Math.pow(voo / 100, 2) * Math.pow(ASSET_INFO.voo.stdDev, 2) +
    Math.pow(schd / 100, 2) * Math.pow(ASSET_INFO.schd.stdDev, 2) +
    Math.pow(bond / 100, 2) * Math.pow(ASSET_INFO.bond.stdDev, 2) +
    Math.pow(cash / 100, 2) * Math.pow(ASSET_INFO.cash.stdDev, 2) +
    // 상관관계 항
    2 * (voo / 100) * (schd / 100) * ASSET_INFO.voo.stdDev * ASSET_INFO.schd.stdDev * ASSET_CORRELATIONS['voo-schd'] +
    2 * (voo / 100) * (bond / 100) * ASSET_INFO.voo.stdDev * ASSET_INFO.bond.stdDev * ASSET_CORRELATIONS['voo-bond'] +
    2 * (schd / 100) * (bond / 100) * ASSET_INFO.schd.stdDev * ASSET_INFO.bond.stdDev * ASSET_CORRELATIONS['schd-bond'];
  
  return Math.sqrt(Math.max(0, variance));
};

// Box-Muller 변환으로 정규분포 난수 생성
const randomNormal = (mean = 0, stdDev = 1) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
};

// 단일 시뮬레이션 실행
const runSingleSimulation = (initial, monthly, allocations, years, monthlyGrowthRate = 0) => {
  const expectedReturn = getExpectedPortfolioReturn(allocations);
  const stdDev = getPortfolioStdDev(allocations);
  
  let wealth = initial;
  let currentMonthly = monthly;
  const growthRate = monthlyGrowthRate / 100;
  const yearlyWealth = [initial];

  for (let year = 0; year < years; year++) {
    // 해당 연도의 랜덤 수익률 생성 (정규분포)
    const yearReturn = randomNormal(expectedReturn, stdDev);
    const monthlyRate = yearReturn / 100 / 12;

    // 매년 투자금 증가
    if (year > 0) {
      currentMonthly = currentMonthly * (1 + growthRate);
    }

    for (let month = 0; month < 12; month++) {
      wealth = wealth * (1 + monthlyRate) + currentMonthly;
    }

    yearlyWealth.push(wealth);
  }

  return yearlyWealth;
};

// 몬테카를로 시뮬레이션 실행
export const runMonteCarloSimulation = (
  initial,
  monthly,
  allocations,
  years,
  monthlyGrowthRate = 0,
  numSimulations = 500
) => {
  const allSimulations = [];

  for (let i = 0; i < numSimulations; i++) {
    const simulation = runSingleSimulation(initial, monthly, allocations, years, monthlyGrowthRate);
    allSimulations.push(simulation);
  }

  // 각 연도별 백분위수 계산
  const percentiles = {
    p10: [], // 하위 10%
    p25: [], // 하위 25%
    p50: [], // 중간값 (median)
    p75: [], // 상위 25%
    p90: [], // 상위 10%
    mean: [], // 평균
  };

  for (let year = 0; year <= years; year++) {
    const wealthsAtYear = allSimulations.map((sim) => sim[year]).sort((a, b) => a - b);
    const n = wealthsAtYear.length;

    percentiles.p10.push(wealthsAtYear[Math.floor(n * 0.1)]);
    percentiles.p25.push(wealthsAtYear[Math.floor(n * 0.25)]);
    percentiles.p50.push(wealthsAtYear[Math.floor(n * 0.5)]);
    percentiles.p75.push(wealthsAtYear[Math.floor(n * 0.75)]);
    percentiles.p90.push(wealthsAtYear[Math.floor(n * 0.9)]);
    percentiles.mean.push(wealthsAtYear.reduce((a, b) => a + b, 0) / n);
  }

  return {
    percentiles,
    numSimulations,
    expectedReturn: getExpectedPortfolioReturn(allocations),
    stdDev: getPortfolioStdDev(allocations),
  };
};

