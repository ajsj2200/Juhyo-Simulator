// 기본값 상수
export const DEFAULT_PERSON = {
  you: {
    name: '나',
    initial: 4500,
    salary: 430, // 세후 월급(만원)
    expense: 220, // 월 생활비(만원)
    monthly: 210, // 세후 월급 - 생활비
    rate: 8,
    retireYear: 20, // 개인 은퇴 시점
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
    adjustments: [], // { year: n, monthly: m }
  },
  other: {
    name: '대기업 직원',
    initial: 6000,
    salary: 350, // 세후 월급(만원)
    expense: 250, // 월 생활비(만원)
    monthly: 100,
    rate: 3.4,
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
    adjustments: [],
  },
};

export const PRESETS = {
  average: {
    name: '일반인 (통계)',
    initial: 3000,
    salary: 320,
    expense: 215,
    monthly: 105,
    rate: 3.4,
    monthlyGrowthRate: 3.0,
    adjustments: [],
  },
  corporate: {
    name: '대기업 직원',
    initial: 6000,
    salary: 350,
    expense: 250,
    monthly: 100,
    rate: 3.4,
    monthlyGrowthRate: 3.0,
    adjustments: [],
  },
  savingsOnly: {
    name: '적금러',
    initial: 2000,
    salary: 320,
    expense: 170,
    monthly: 150,
    rate: 3.5,
    monthlyGrowthRate: 3.0,
    adjustments: [],
  },
  indexInvestor: {
    name: 'VOO 투자자',
    initial: 5000,
    salary: 380,
    expense: 180,
    monthly: 200,
    rate: 8.0,
    monthlyGrowthRate: 3.0,
    adjustments: [],
  },
};

export const DEFAULT_MARRIAGE_PLAN = {
  enabled: true,
  yearOfMarriage: 2,
  spouse: {
    name: '배우자',
    salary: 300, // 세후 월급(만원)
    expense: 150, // 월 생활비(만원)
    monthly: 150, // 세후 월급 - 생활비
    initial: 0,
    rate: 8.0,
    retireYear: 20, // 배우자 은퇴 시점
    monthlyGrowthRate: 3.0, // 월 투자액 연간 증가율 (%)
    adjustments: [],
  },
  buyHouse: true,
  yearOfHousePurchase: 2, // 집 구매 시점 (0 = 시뮬레이션 시작, 결혼과 별개)
  housePrice: 45000, // 만원
  downPayment: 10000, // 초기 자기자본 (만원)
  loanAmount: 35000, // 대출금 (자동 계산: housePrice - downPayment)
  loanRate: 3.6,
  loanYears: 30,
  repaymentType: 'equalPrincipal', // 'equalPrincipal' (원금균등), 'equalPayment' (원리금균등)
  houseAppreciationRate: 2.0, // 주택 가격 연간 상승률 (%)
  prepayEnabled: false,
  prepayYear: 5, // 집 구매 후 몇 년 뒤 일시 상환
};

export const DEFAULT_RETIREMENT_PLAN = {
  enabled: true,
  withdrawalRate: 4.0,
  monthlyExpense: 300,
  inflationRate: 2.0,
  useJEPQ: false,
  jepqRatio: 70,
  jepqDividendRate: 8.0,
  vooGrowthRate: 8.0,
};

export const DEFAULT_CRISIS_SCENARIO = {
  enabled: false,
  startYear: 1, // 몇 년 후부터 충격 시작
  duration: 3, // 충격 지속 연도
  drawdownRate: -30, // 충격 기간 연간 수익률(%)
};
