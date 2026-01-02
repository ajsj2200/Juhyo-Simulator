// 기본값 상수
export const DEFAULT_PERSON = {
  you: {
    name: '나',
    initial: 4500,
    monthly: 210,
    rate: 8,
    salary: 4300,
    retireYear: 20, // 개인 은퇴 시점
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
  },
  other: {
    name: '대기업 직원',
    initial: 6000,
    monthly: 100,
    rate: 3.4,
    salary: 5500,
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
  },
};

export const PRESETS = {
  average: {
    name: '일반인 (통계)',
    initial: 3000,
    monthly: 105,
    rate: 3.4,
    salary: 5440,
    monthlyGrowthRate: 3.0,
  },
  corporate: {
    name: '대기업 직원',
    initial: 6000,
    monthly: 100,
    rate: 3.4,
    salary: 5500,
    monthlyGrowthRate: 3.0,
  },
  savingsOnly: {
    name: '적금러',
    initial: 2000,
    monthly: 150,
    rate: 3.5,
    salary: 4500,
    monthlyGrowthRate: 3.0,
  },
  indexInvestor: {
    name: 'VOO 투자자',
    initial: 5000,
    monthly: 200,
    rate: 8.0,
    salary: 6000,
    monthlyGrowthRate: 3.0,
  },
};

export const DEFAULT_MARRIAGE_PLAN = {
  enabled: false,
  yearOfMarriage: 2,
  spouse: {
    name: '배우자',
    monthly: 150,
    salary: 4000,
    retireYear: 20, // 배우자 은퇴 시점
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
  },
  buyHouse: false,
  housePrice: 45000, // 만원
  downPayment: 10000, // 초기 자기자본 (만원)
  loanAmount: 35000, // 대출금 (자동 계산: housePrice - downPayment)
  loanRate: 3.6,
  loanYears: 30,
  repaymentType: 'equalPrincipal', // 'equalPrincipal' (원금균등), 'equalPayment' (원리금균등)
  houseAppreciationRate: 2.0, // 주택 가격 연간 상승률 (%)
};

export const DEFAULT_RETIREMENT_PLAN = {
  enabled: false,
  withdrawalRate: 4.0,
  monthlyExpense: 300,
  inflationRate: 2.0,
  useJEPQ: false,
  jepqRatio: 70,
  jepqDividendRate: 8.0,
  vooGrowthRate: 8.0,
};
