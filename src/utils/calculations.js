/**
 * 대출 상환 계산 유틸리티
 */

// 월 대출 상환액 계산 (원리금균등)
export const calculateMonthlyPaymentEqual = (principal, annualRate, years) => {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) return principal / months;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
};

// 원금균등 상환 시 특정 월의 상환액 계산
export const calculateMonthlyPaymentPrincipal = (principal, annualRate, years, currentMonth) => {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const monthlyPrincipal = principal / months;

  // 남은 원금에 대한 이자
  const remainingPrincipal = principal - monthlyPrincipal * currentMonth;
  const interest = Math.max(0, remainingPrincipal) * monthlyRate;

  return monthlyPrincipal + interest;
};

// 미국/글로벌 주식 시장을 가정한 실질 연 수익률 샘플(과거 급락/급등 포함, % 단위가 아니라 소수로 표현)
// 출처가 정확한 시계열은 아니며, 몬테카를로 데모용으로 폭락/상승을 섞은 약 50년치 샘플입니다.
export const HISTORICAL_ANNUAL_RETURNS = [
  0.21, -0.09, 0.26, 0.15, -0.43, 0.35, 0.22, -0.17, 0.05, 0.32,
  0.28, -0.12, 0.18, 0.11, -0.27, 0.04, 0.14, 0.07, 0.02, 0.19,
  0.23, -0.09, 0.1, 0.06, 0.27, -0.15, 0.08, 0.13, -0.04, 0.25,
  0.16, 0.09, 0.05, -0.2, 0.12, 0.18, 0.03, 0.21, -0.37, 0.31,
  0.26, -0.08, 0.29, 0.17, 0.01, -0.22, 0.24, 0.19, -0.1, 0.15,
];

// 간단한 시드 기반 PRNG
const mulberry32 = (a) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// 연 수익률(%) → 월 수익률(소수) 변환: (1+r)^(1/12)-1
const annualPctToMonthlyRate = (annualPct) => {
  const r = (annualPct || 0) / 100;
  const base = 1 + r;
  if (base <= 0) return -1;
  return Math.pow(base, 1 / 12) - 1;
};

// 몬테카를로: 연 수익률을 부트스트랩/셔플해 누적 자산 분포 계산 (인출·결혼·대출 미포함, 적립 구간만)
export const runMonteCarloAccumulation = (person, years, options = {}) => {
  const {
    iterations = 2000,
    annualReturns = HISTORICAL_ANNUAL_RETURNS,
    seed = Date.now(),
  } = options;

  const rng = mulberry32(seed >>> 0);
  const results = [];
  let belowZero = 0;

  for (let i = 0; i < iterations; i++) {
    const seq = [];
    for (let y = 0; y < years; y++) {
      const idx = Math.floor(rng() * annualReturns.length);
      seq.push(annualReturns[idx]);
    }

    let wealth = person.initial;
    let monthly = person.monthly;
    for (let y = 0; y < years; y++) {
      if (y > 0) {
        monthly = monthly * (1 + (person.monthlyGrowthRate || 0) / 100);
      }
      monthly = applyContributionAdjustment(y, monthly, person.adjustments);
      const monthlyRate = Math.pow(1 + seq[y], 1 / 12) - 1;
      for (let m = 0; m < 12; m++) {
        wealth = wealth * (1 + monthlyRate) + monthly;
      }
    }
    if (wealth < 0) belowZero += 1;
    results.push(wealth);
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
    median: pick(0.5),
    p95: pick(0.95),
    min: results[0],
    max: results[results.length - 1],
    mean,
    belowZeroProbability: results.length ? belowZero / results.length : 0,
    samples: results,
  };
};

// 몬테카를로: 결혼/주택/은퇴 계획을 포함한 전체 플랜 시뮬레이션
export const runMonteCarloPlan = (person, years, marriage, retirement, annualReturns, options = {}) => {
  const {
    iterations = 2000,
    seed = Date.now(),
    useCompound = true,
  } = options;

  const rng = mulberry32(seed >>> 0);
  const results = [];
  const yearlyWealths = Array.from({ length: years + 1 }, () => []);
  let belowZero = 0;

  for (let i = 0; i < iterations; i++) {
    const seq = [];
    for (let y = 0; y < years; y++) {
      const idx = Math.floor(rng() * annualReturns.length);
      seq.push(annualReturns[idx]);
    }
    const wealthResult = calculateWealthWithMarriageHistorical(
      person,
      years,
      marriage,
      retirement,
      seq,
      useCompound
    );
    const wealth = wealthResult.wealth;
    if (wealth < 0) belowZero += 1;
    results.push(wealth);

    const path = wealthResult.yearlyData?.map((d) => d.wealth) || [];
    for (let y = 0; y <= years; y++) {
      yearlyWealths[y].push(path[y] ?? wealth);
    }
  }

  results.sort((a, b) => a - b);
  const pick = (p) => {
    const idx = Math.max(0, Math.min(results.length - 1, Math.floor(p * (results.length - 1))));
    return results[idx];
  };
  const mean = results.reduce((s, v) => s + v, 0) / results.length;

  const percentilesByYear = {
    p10: [],
    p25: [],
    p50: [],
    p75: [],
    p90: [],
    mean: [],
  };

  const pickFromSorted = (arr, p) => {
    const idx = Math.max(0, Math.min(arr.length - 1, Math.floor(p * (arr.length - 1))));
    return arr[idx];
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

  return {
    iterations,
    seed,
    years,
    p5: pick(0.05),
    median: pick(0.5),
    p95: pick(0.95),
    min: results[0],
    max: results[results.length - 1],
    mean,
    belowZeroProbability: results.length ? belowZero / results.length : 0,
    samples: results,
    percentilesByYear,
  };
};

// 체증식(매월 납입액 증가) 스케줄 생성: 첫 달 이자 수준에서 시작해 월 성장률을 이진탐색으로 찾아 만기에 원금이 0이 되도록 함
const buildIncreasingSchedule = (loanAmount, annualRate, loanYears) => {
  const months = loanYears * 12;
  if (loanAmount <= 0 || months <= 0) return [];
  const monthlyRate = annualRate / 100 / 12;
  const initialPayment = loanAmount * monthlyRate; // 첫 달은 이자 수준

  const simulate = (growth) => {
    let remaining = loanAmount;
    const schedule = [];
    for (let m = 0; m < months; m++) {
      const payment = initialPayment * Math.pow(1 + growth, m);
      const interest = remaining * monthlyRate;
      const principal = Math.min(Math.max(0, payment - interest), remaining);
      remaining -= principal;
      schedule.push({
        month: m,
        payment,
        principal,
        interest,
        remainingPrincipal: remaining,
      });
    }
    return { remaining, schedule };
  };

  let low = 0;
  let high = 0.02; // 월 0~2% 성장 (연 약 0~27%)
  let bestSchedule = simulate(high).schedule;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const { remaining, schedule } = simulate(mid);
    if (remaining > 0) {
      // 덜 갚았음 -> 성장률을 높인다
      low = mid;
    } else {
      // 초과 상환 -> 성장률을 낮춘다
      bestSchedule = schedule;
      high = mid;
    }
  }

  return bestSchedule;
};

// 대출 상환 스케줄 생성
export const generateLoanSchedule = (loanAmount, annualRate, loanYears, repaymentType) => {
  const schedule = [];
  const months = loanYears * 12;
  let remainingPrincipal = loanAmount;
  const monthlyRate = annualRate / 100 / 12;

  for (let month = 0; month < months; month++) {
    let payment, principal, interest;

    if (repaymentType === 'equalPayment') {
      // 원리금균등
      payment = calculateMonthlyPaymentEqual(loanAmount, annualRate, loanYears);
      interest = remainingPrincipal * monthlyRate;
      principal = payment - interest;
    } else if (repaymentType === 'equalPrincipal') {
      // 원금균등
      principal = loanAmount / months;
      interest = remainingPrincipal * monthlyRate;
      payment = principal + interest;
    } else if (repaymentType === 'increasing') {
      return buildIncreasingSchedule(loanAmount, annualRate, loanYears);
    }

    remainingPrincipal = Math.max(0, remainingPrincipal - principal);

    schedule.push({
      month,
      payment,
      principal,
      interest,
      remainingPrincipal,
    });
  }

  return schedule;
};

// 특정 시점의 대출 상환액 계산
export const getLoanPaymentAtMonth = (
  loanAmount,
  annualRate,
  loanYears,
  repaymentType,
  monthsSinceLoanStart
) => {
  const totalMonths = loanYears * 12;

  // 대출 상환 완료
  if (monthsSinceLoanStart >= totalMonths) {
    return { payment: 0, remainingPrincipal: 0, isComplete: true };
  }

  const monthlyRate = annualRate / 100 / 12;

  if (repaymentType === 'equalPayment') {
    // 원리금균등
    const monthlyPayment = calculateMonthlyPaymentEqual(loanAmount, annualRate, loanYears);

    // 남은 원금 계산
    let remainingPrincipal = loanAmount;
    for (let i = 0; i < monthsSinceLoanStart; i++) {
      const interest = remainingPrincipal * monthlyRate;
      const principal = monthlyPayment - interest;
      remainingPrincipal -= principal;
    }

    return {
      payment: monthlyPayment,
      remainingPrincipal: Math.max(0, remainingPrincipal),
      isComplete: false,
    };
  } else if (repaymentType === 'equalPrincipal') {
    // 원금균등
    const monthlyPrincipal = loanAmount / totalMonths;
    let remainingPrincipal = loanAmount - (monthlyPrincipal * monthsSinceLoanStart);
    remainingPrincipal = Math.max(0, remainingPrincipal);

    const interest = remainingPrincipal * monthlyRate;
    const payment = monthlyPrincipal + interest;

    return {
      payment,
      remainingPrincipal,
      isComplete: false,
    };
  } else {
    // 체증식 (increasing) - 사전 계산된 스케줄 사용
    const schedule = buildIncreasingSchedule(loanAmount, annualRate, loanYears);
    const row = schedule[Math.min(monthsSinceLoanStart, schedule.length - 1)];
    const remainingPrincipal = row ? row.remainingPrincipal : 0;
    const payment = row ? row.payment : 0;

    return {
      payment,
      remainingPrincipal,
      isComplete: false,
    };
  }
};

/**
 * 복리 계산 함수 (결혼 + 은퇴 계획 반영, 개인별 은퇴 시점)
 */
export const calculateWealthWithMarriage = (
  person,
  targetYear,
  marriage,
  retirement,
  crisis,
  useCompound = true
) => {
  let youWealth = person.initial;
  let spouseWealth = 0;
  let principalYou = youWealth;
  let principalSpouse = 0;
  const youRateMonthly = person.rate / 100 / 12;
  const spouseRateMonthly = (marriage.spouse.rate ?? person.rate) / 100 / 12;
  const crisisActive = (currentYear) =>
    crisis?.enabled &&
    currentYear >= crisis.startYear &&
    currentYear < crisis.startYear + crisis.duration;
  const prepayMonths = Math.floor((marriage.prepayYear || marriage.loanYears) * 12);
  let loanPaidOff = false;
  let spouseInitialMerged = false;
  // 집 구매 시점 (기본값: 결혼 시점)
  const yearOfHousePurchase = marriage.yearOfHousePurchase ?? marriage.yearOfMarriage;
  let houseValue = marriage.buyHouse ? marriage.housePrice : 0;
  const houseAppreciationMonthlyRate = marriage.buyHouse
    ? marriage.houseAppreciationRate / 100 / 12
    : 0;
  let downPaymentDeducted = !marriage.buyHouse;

  // 월 투자액 (매년 증가)
  let personMonthly = person.monthly;
  let spouseMonthly = marriage.spouse.monthly;
  const personGrowthRate = (person.monthlyGrowthRate || 0) / 100;
  const spouseGrowthRate = (marriage.spouse.monthlyGrowthRate || 0) / 100;

  let jepqFinancialIndependence = false;

  for (let year = 0; year < targetYear; year++) {
    if (year > 0) {
      personMonthly = personMonthly * (1 + personGrowthRate);
      spouseMonthly = spouseMonthly * (1 + spouseGrowthRate);
    }
    personMonthly = applyContributionAdjustment(year, personMonthly, person.adjustments);
    spouseMonthly = applyContributionAdjustment(year, spouseMonthly, marriage.spouse.adjustments);

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;
      const spouseActive = marriage.enabled && currentYear >= marriage.yearOfMarriage;

      if (spouseActive && !spouseInitialMerged) {
        const initialAdd = marriage.spouse.initial || 0;
        spouseWealth += initialAdd;
        principalSpouse += initialAdd;
        spouseInitialMerged = true;
      }

      // 집 구매 시점에 자기자본(다운페이)을 현금에서 차감
      const housePurchaseActive = marriage.buyHouse && currentYear >= yearOfHousePurchase;
      if (housePurchaseActive && !downPaymentDeducted) {
        const totalBefore = youWealth + spouseWealth;
        const youRatio = totalBefore > 0 ? youWealth / totalBefore : (spouseActive ? 0.5 : 1);
        const spouseRatio = spouseActive ? 1 - youRatio : 0;
        const payYou = marriage.downPayment * youRatio;
        const paySpouse = marriage.downPayment * spouseRatio;
        youWealth = Math.max(0, youWealth - payYou);
        spouseWealth = Math.max(0, spouseWealth - paySpouse);
        principalYou = Math.max(0, principalYou - payYou);
        principalSpouse = Math.max(0, principalSpouse - paySpouse);
        downPaymentDeducted = true;
      }

      if (!jepqFinancialIndependence && retirement.enabled && retirement.useJEPQ && marriage.enabled) {
        const totalWealth = youWealth + spouseWealth;
        const jepqPortion = totalWealth * (retirement.jepqRatio / 100);
        const annualDividend = jepqPortion * (retirement.jepqDividendRate / 100);
        const monthlyDividend = annualDividend / 12;
        const yearsFromNow = currentYear >= person.retireYear ? currentYear - person.retireYear : 0;
        const adjustedExpense = retirement.monthlyExpense * Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsFromNow));
        if (monthlyDividend >= adjustedExpense) {
          jepqFinancialIndependence = true;
        }
      }

      // 집 구매 후 집값 상승
      if (housePurchaseActive) {
        houseValue = houseValue * (1 + houseAppreciationMonthlyRate);
      }

      const personRetired = retirement.enabled && currentYear >= person.retireYear;
      const spouseRetired = marriage.enabled && retirement.enabled && currentYear >= marriage.yearOfMarriage && (currentYear >= marriage.spouse.retireYear || jepqFinancialIndependence);

      if (!personRetired || (marriage.enabled && currentYear >= marriage.yearOfMarriage && !spouseRetired)) {
        const crisisMonthlyRate = crisisActive(currentYear) ? crisis.drawdownRate / 100 / 12 : 0;
        if (useCompound) {
          youWealth = youWealth * (1 + youRateMonthly + crisisMonthlyRate);
          if (spouseActive) {
            spouseWealth = spouseWealth * (1 + spouseRateMonthly + crisisMonthlyRate);
          }
        } else {
          const youInterest = principalYou * (youRateMonthly + crisisMonthlyRate);
          youWealth += youInterest;
          principalYou += youInterest;
          if (spouseActive) {
            const spouseInterest = principalSpouse * (spouseRateMonthly + crisisMonthlyRate);
            spouseWealth += spouseInterest;
            principalSpouse += spouseInterest;
          }
        }

        let monthlyInvestment = 0;
        let youContr = 0;
        let spouseContr = 0;

        if (!personRetired) {
          monthlyInvestment += personMonthly;
          youContr += personMonthly;
        }
        if (spouseActive) {
          if (!spouseRetired) {
            monthlyInvestment += spouseMonthly;
            spouseContr += spouseMonthly;
          }
        }
        // 집 구매 후 대출 상환 (결혼과 무관)
        if (housePurchaseActive && !loanPaidOff) {
          const monthsSinceLoanStart = Math.floor((currentYear - yearOfHousePurchase) * 12);
          if (marriage.prepayEnabled && monthsSinceLoanStart >= prepayMonths) {
            const payoffInfo = getLoanPaymentAtMonth(
              marriage.loanAmount,
              marriage.loanRate,
              marriage.loanYears,
              marriage.repaymentType,
              monthsSinceLoanStart
            );
            if (payoffInfo.remainingPrincipal > 0) {
              const totalBefore = youWealth + spouseWealth;
              const youRatio = totalBefore > 0 ? youWealth / totalBefore : (spouseActive ? 0.5 : 1);
              const spouseRatio = spouseActive ? 1 - youRatio : 0;
              const pay = payoffInfo.remainingPrincipal;
              youWealth = Math.max(0, youWealth - pay * youRatio);
              spouseWealth = Math.max(0, spouseWealth - pay * spouseRatio);
              principalYou = Math.max(0, principalYou - pay * youRatio);
              principalSpouse = Math.max(0, principalSpouse - pay * spouseRatio);
            }
            loanPaidOff = true;
          } else {
            const loanInfo = getLoanPaymentAtMonth(
              marriage.loanAmount,
              marriage.loanRate,
              marriage.loanYears,
              marriage.repaymentType,
              monthsSinceLoanStart
            );
            if (loanInfo.isComplete) {
              loanPaidOff = true;
            } else {
              monthlyInvestment -= loanInfo.payment;
            }
          }
        }

        // 대출 상환 등으로 투자 여력이 음수일 수 있으므로 클램프하지 않음
        if (monthlyInvestment !== 0) {
          const totalContr = youContr + spouseContr;
          const youShare = totalContr > 0 ? youContr / totalContr : 1;
          const spouseShare = totalContr > 0 ? spouseContr / totalContr : 0;
          youWealth += monthlyInvestment * youShare;
          spouseWealth += monthlyInvestment * spouseShare;
          if (!useCompound) {
            principalYou += monthlyInvestment * youShare;
            principalSpouse += monthlyInvestment * spouseShare;
          }
        }
      } else if (personRetired && (!marriage.enabled || spouseRetired || currentYear < marriage.yearOfMarriage)) {
        const effectiveRetireYear = marriage.enabled
          ? Math.max(person.retireYear, marriage.spouse.retireYear)
          : person.retireYear;
        const yearsAfterRetirement = currentYear - effectiveRetireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));
        const crisisMonthlyRate = crisisActive(currentYear) ? crisis.drawdownRate / 100 / 12 : 0;

        if (retirement.useJEPQ) {
          if (useCompound) {
            const total = youWealth + spouseWealth;
            const jepqPortion = total * (retirement.jepqRatio / 100);
            const vooPortion = total * (1 - retirement.jepqRatio / 100);
            const jepqGrowthRate = 0.02 / 12 + crisisMonthlyRate;
            const jepqAfterGrowth = jepqPortion * (1 + jepqGrowthRate);
            const vooGrowthRate = retirement.vooGrowthRate / 100 / 12 + crisisMonthlyRate;
            const vooAfterGrowth = vooPortion * (1 + vooGrowthRate);
            const afterGrowth = jepqAfterGrowth + vooAfterGrowth;
            const beforeTotal = youWealth + spouseWealth;
            const youRatio = beforeTotal > 0 ? youWealth / beforeTotal : 0.5;
            youWealth = afterGrowth * youRatio;
            spouseWealth = afterGrowth * (1 - youRatio);
          } else {
            const effectiveRate =
              (retirement.jepqRatio / 100) * (0.02 / 12 + crisisMonthlyRate) +
              (1 - retirement.jepqRatio / 100) * (retirement.vooGrowthRate / 100 / 12 + crisisMonthlyRate);
            const totalPrincipal = principalYou + principalSpouse;
            const interest = totalPrincipal * effectiveRate;
            const totalBefore = youWealth + spouseWealth + interest;
            const youRatio = totalBefore > 0 ? youWealth / totalBefore : 0.5;
            youWealth += interest * youRatio;
            spouseWealth += interest * (1 - youRatio);
            principalYou = Math.max(0, principalYou - adjustedExpense * youRatio + interest * youRatio);
            principalSpouse = Math.max(0, principalSpouse - adjustedExpense * (1 - youRatio) + interest * (1 - youRatio));
          }
        } else {
          const baseVooGrowth = retirement.vooGrowthRate / 100 / 12;
          if (useCompound) {
            youWealth = youWealth * (1 + baseVooGrowth + crisisMonthlyRate);
            spouseWealth = spouseWealth * (1 + baseVooGrowth + crisisMonthlyRate);
          } else {
            const youInterest = principalYou * (baseVooGrowth + crisisMonthlyRate);
            const spouseInterest = principalSpouse * (baseVooGrowth + crisisMonthlyRate);
            youWealth += youInterest;
            spouseWealth += spouseInterest;
            const total = youWealth + spouseWealth;
            const youRatio = total > 0 ? youWealth / total : 0.5;
            principalYou = Math.max(0, principalYou - adjustedExpense * youRatio + youInterest);
            principalSpouse = Math.max(0, principalSpouse - adjustedExpense * (1 - youRatio) + spouseInterest);
          }
        }

        const totalAfterGrowth = youWealth + spouseWealth;
        const youRatio = totalAfterGrowth > 0 ? youWealth / totalAfterGrowth : 0.5;
        const youExpense = adjustedExpense * youRatio;
        const spouseExpense = adjustedExpense * (1 - youRatio);
        youWealth = youWealth - youExpense;
        spouseWealth = spouseWealth - spouseExpense;
        if (!useCompound) {
          principalYou = principalYou - youExpense;
          principalSpouse = principalSpouse - spouseExpense;
        }
      }
    }
  }

  let finalWealth = youWealth + spouseWealth;
  if (marriage.buyHouse && targetYear >= yearOfHousePurchase) {
    finalWealth += houseValue;
    if (!loanPaidOff) {
      const yearsSinceLoan = targetYear - yearOfHousePurchase;
      if (yearsSinceLoan < marriage.loanYears) {
        const monthsSinceLoan = yearsSinceLoan * 12;
        const loanInfo = getLoanPaymentAtMonth(
          marriage.loanAmount,
          marriage.loanRate,
          marriage.loanYears,
          marriage.repaymentType,
          monthsSinceLoan
        );
        finalWealth -= loanInfo.remainingPrincipal;
      }
    }
  }
  return finalWealth;
};

/**
 * 기본 복리 계산 (은퇴 계획 반영)
 */
export const calculateWealth = (initial, monthly, annualRate, years, monthlyGrowthRate = 0, person = null, retirement = null, crisis = null, useCompound = true) => {
  let wealth = initial;
  let principalBase = wealth; // 단리 시 이자 계산용 원금 누적
  const monthlyRate = annualRate / 100 / 12;
  let currentMonthly = monthly;
  const growthRate = monthlyGrowthRate / 100;
  const crisisActive = (currentYear) =>
    crisis?.enabled &&
    currentYear >= crisis.startYear &&
    currentYear < crisis.startYear + crisis.duration;

  for (let year = 0; year < years; year++) {
    // 매년 1월(첫 달)에 투자금 증가
    if (year > 0) {
      currentMonthly = currentMonthly * (1 + growthRate);
    }
    currentMonthly = applyContributionAdjustment(year, currentMonthly, person?.adjustments);

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;

      // 은퇴 여부 확인
      const isRetired = retirement && retirement.enabled && person && currentYear >= person.retireYear;

      if (!isRetired) {
        // 은퇴 전: 투자 지속
        const crisisMonthlyRate = crisisActive(currentYear) ? crisis.drawdownRate / 100 / 12 : 0;
        if (useCompound) {
          wealth = wealth * (1 + monthlyRate + crisisMonthlyRate) + currentMonthly;
        } else {
          const interest = principalBase * (monthlyRate + crisisMonthlyRate);
          wealth += interest + currentMonthly;
          principalBase += currentMonthly;
        }
      } else {
        // 은퇴 후: 자산 성장 후 생활비 인출
        const yearsAfterRetirement = currentYear - person.retireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));
        const crisisMonthlyRate = crisisActive(currentYear) ? crisis.drawdownRate / 100 / 12 : 0;

        if (retirement.useJEPQ) {
          if (useCompound) {
            // JEPQ/VOO 혼합 전략: 각각 성장
            const jepqPortion = wealth * (retirement.jepqRatio / 100);
            const vooPortion = wealth * (1 - retirement.jepqRatio / 100);

            const jepqGrowthRate = 0.02 / 12 + crisisMonthlyRate;
            const jepqAfterGrowth = jepqPortion * (1 + jepqGrowthRate);

            const vooGrowthRate = retirement.vooGrowthRate / 100 / 12 + crisisMonthlyRate;
            const vooAfterGrowth = vooPortion * (1 + vooGrowthRate);

            wealth = jepqAfterGrowth + vooAfterGrowth;
          } else {
            const effectiveRate =
              (retirement.jepqRatio / 100) * (0.02 / 12 + crisisMonthlyRate) +
              (1 - retirement.jepqRatio / 100) * (retirement.vooGrowthRate / 100 / 12 + crisisMonthlyRate);
            const interest = principalBase * effectiveRate;
            wealth += interest;
            principalBase = Math.max(0, principalBase - adjustedExpense + interest);
          }
        } else {
          // VOO만: 성장
          const baseVooGrowth = retirement.vooGrowthRate / 100 / 12;
          const crisisMonthlyRate = crisisActive(currentYear) ? crisis.drawdownRate / 100 / 12 : 0;
          if (useCompound) {
            wealth = wealth * (1 + baseVooGrowth + crisisMonthlyRate);
          } else {
            const interest = principalBase * (baseVooGrowth + crisisMonthlyRate);
            wealth += interest;
            principalBase = Math.max(0, principalBase - adjustedExpense + interest);
          }
        }

        // 생활비만 인출
        wealth -= adjustedExpense;
        if (!useCompound) {
          principalBase = principalBase - adjustedExpense;
        }
      }
    }
  }

  return wealth;
};

/**
 * 저축률 계산
 */
export const calculateSavingsRate = (monthly, salary) => {
  if (salary === 0) return 0;
  return ((monthly / salary) * 100).toFixed(1);
};

const applyContributionAdjustment = (currentYear, currentMonthly, adjustments = []) => {
  let next = currentMonthly;
  for (const adj of adjustments) {
    if (currentYear >= adj.year) {
      next = adj.monthly;
    }
  }
  return next;
};

/**
 * 특정 시점의 주택 가치 계산 (집 구매 이후, 월 복리 상승)
 */
export const calculateHouseValue = (marriage, targetYear) => {
  const yearOfHousePurchase = marriage.yearOfHousePurchase ?? marriage.yearOfMarriage;
  if (!marriage.buyHouse || targetYear < yearOfHousePurchase) return 0;

  const months = Math.floor((targetYear - yearOfHousePurchase) * 12);
  let value = marriage.housePrice;
  const monthlyRate = marriage.houseAppreciationRate / 100 / 12;

  for (let i = 0; i < months; i++) {
    value = value * (1 + monthlyRate);
  }

  return value;
};

/**
 * 과거 S&P 500 수익률을 사용한 자산 계산
 * @param {number} initial - 초기 자산
 * @param {number} monthly - 월 투자액
 * @param {number[]} annualReturns - 연도별 수익률 배열 (예: [37.2, 23.84, -7.18, ...])
 * @param {number} years - 투자 기간
 * @param {number} monthlyGrowthRate - 월 투자액 연간 증가율
 * @param {object} person - 개인 정보 (adjustments 포함)
 * @param {object} retirement - 은퇴 계획
 * @param {boolean} useCompound - 복리 여부
 * @returns {object} { wealth, yearlyData }
 */
export const calculateWealthWithHistoricalReturns = (
  initial,
  monthly,
  annualReturns,
  years,
  monthlyGrowthRate = 0,
  person = null,
  retirement = null,
  useCompound = true
) => {
  let wealth = initial;
  let principalBase = wealth;
  let currentMonthly = monthly;
  const growthRate = monthlyGrowthRate / 100;
  const yearlyData = [{ year: 0, wealth: initial, returnRate: null }];

  for (let year = 0; year < years; year++) {
    // 해당 연도의 수익률 (배열 순환)
    const yearReturn = annualReturns[year % annualReturns.length] || 0;
    const monthlyRate = annualPctToMonthlyRate(yearReturn);

    // 매년 1월(첫 달)에 투자금 증가
    if (year > 0) {
      currentMonthly = currentMonthly * (1 + growthRate);
    }
    currentMonthly = applyContributionAdjustment(year, currentMonthly, person?.adjustments);

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;

      // 은퇴 여부 확인
      const isRetired = retirement && retirement.enabled && person && currentYear >= person.retireYear;

      if (!isRetired) {
        // 은퇴 전: 투자 지속
        if (useCompound) {
          wealth = wealth * (1 + monthlyRate) + currentMonthly;
        } else {
          const interest = principalBase * monthlyRate;
          wealth += interest + currentMonthly;
          principalBase += currentMonthly;
        }
      } else {
        // 은퇴 후: 생활비 인출
        const yearsAfterRetirement = currentYear - person.retireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));

        if (useCompound) {
          wealth = wealth * (1 + monthlyRate);
        } else {
          const interest = principalBase * monthlyRate;
          wealth += interest;
          principalBase = Math.max(0, principalBase - adjustedExpense + interest);
        }

        wealth -= adjustedExpense;
      }
    }

    yearlyData.push({
      year: year + 1,
      wealth,
      returnRate: yearReturn,
    });
  }

  return { wealth, yearlyData };
};

/**
 * 과거 S&P 500 수익률을 사용한 자산 계산 (결혼 포함)
 */
export const calculateWealthWithMarriageHistorical = (
  person,
  targetYear,
  marriage,
  retirement,
  annualReturns,
  useCompound = true
) => {
  let youWealth = person.initial;
  let spouseWealth = 0;
  let principalYou = youWealth;
  let principalSpouse = 0;
  let spouseInitialMerged = false;
  const yearOfHousePurchase = marriage.yearOfHousePurchase ?? marriage.yearOfMarriage;
  let houseValue = marriage.buyHouse ? marriage.housePrice : 0;
  const houseAppreciationMonthlyRate = marriage.buyHouse
    ? marriage.houseAppreciationRate / 100 / 12
    : 0;
  let downPaymentDeducted = !marriage.buyHouse;
  const prepayMonths = Math.floor((marriage.prepayYear || marriage.loanYears) * 12);
  let loanPaidOff = false;

  let personMonthly = person.monthly;
  let spouseMonthly = marriage.spouse.monthly;
  const personGrowthRate = (person.monthlyGrowthRate || 0) / 100;
  const spouseGrowthRate = (marriage.spouse.monthlyGrowthRate || 0) / 100;

  // yearlyData[y] = y년 시뮬레이션 결과 (y년 동안 진행 후의 자산)
  // 메인 차트의 calculateWealthWithMarriage(you, y, ...)와 동일한 시점
  const yearlyData = [];

  for (let year = 0; year <= targetYear; year++) {
    // year년 시뮬레이션 결과를 저장 (year년 동안 진행 후)
    yearlyData.push({
      year,
      wealth: youWealth + spouseWealth,
      returnRate: year > 0 ? (annualReturns[(year - 1) % annualReturns.length] || 0) : null,
    });

    // targetYear까지 도달했으면 더 이상 시뮬 안함
    if (year >= targetYear) break;

    const yearReturn = annualReturns[year % annualReturns.length] || 0;
    const youRateMonthly = annualPctToMonthlyRate(yearReturn);
    const spouseRateMonthly = annualPctToMonthlyRate(yearReturn);

    if (year > 0) {
      personMonthly = personMonthly * (1 + personGrowthRate);
      spouseMonthly = spouseMonthly * (1 + spouseGrowthRate);
    }
    personMonthly = applyContributionAdjustment(year, personMonthly, person.adjustments);
    spouseMonthly = applyContributionAdjustment(year, spouseMonthly, marriage.spouse.adjustments);

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;
      const spouseActive = marriage.enabled && currentYear >= marriage.yearOfMarriage;
      const housePurchaseActive = marriage.buyHouse && currentYear >= yearOfHousePurchase;

      if (spouseActive && !spouseInitialMerged) {
        const initialAdd = marriage.spouse.initial || 0;
        spouseWealth += initialAdd;
        principalSpouse += initialAdd;
        spouseInitialMerged = true;
      }

      // 집 구매 시점에 다운페이 차감
      if (housePurchaseActive && !downPaymentDeducted) {
        const totalBefore = youWealth + spouseWealth;
        const youRatio = totalBefore > 0 ? youWealth / totalBefore : (spouseActive ? 0.5 : 1);
        const spouseRatio = spouseActive ? 1 - youRatio : 0;
        const payYou = marriage.downPayment * youRatio;
        const paySpouse = marriage.downPayment * spouseRatio;
        youWealth = Math.max(0, youWealth - payYou);
        spouseWealth = Math.max(0, spouseWealth - paySpouse);
        principalYou = Math.max(0, principalYou - payYou);
        principalSpouse = Math.max(0, principalSpouse - paySpouse);
        downPaymentDeducted = true;
      }

      // 집 구매 후 집값 상승
      if (housePurchaseActive) {
        houseValue = houseValue * (1 + houseAppreciationMonthlyRate);
      }

      const personRetired = retirement?.enabled && currentYear >= person.retireYear;
      const spouseRetired = marriage.enabled && retirement?.enabled && currentYear >= marriage.yearOfMarriage && currentYear >= marriage.spouse.retireYear;

      if (!personRetired || (marriage.enabled && currentYear >= marriage.yearOfMarriage && !spouseRetired)) {
        if (useCompound) {
          youWealth = youWealth * (1 + youRateMonthly);
          if (spouseActive) {
            spouseWealth = spouseWealth * (1 + spouseRateMonthly);
          }
        } else {
          const youInterest = principalYou * youRateMonthly;
          youWealth += youInterest;
          if (spouseActive) {
            const spouseInterest = principalSpouse * spouseRateMonthly;
            spouseWealth += spouseInterest;
          }
        }

        let monthlyInvestment = 0;
        let youContr = 0;
        let spouseContr = 0;

        if (!personRetired) {
          monthlyInvestment += personMonthly;
          youContr += personMonthly;
        }
        if (spouseActive) {
          if (!spouseRetired) {
            monthlyInvestment += spouseMonthly;
            spouseContr += spouseMonthly;
          }
        }
        // 집 구매 후 대출 상환
        if (housePurchaseActive && !loanPaidOff) {
          const monthsSinceLoanStart = Math.floor((currentYear - yearOfHousePurchase) * 12);
          if (marriage.prepayEnabled && monthsSinceLoanStart >= prepayMonths) {
            const payoffInfo = getLoanPaymentAtMonth(
              marriage.loanAmount,
              marriage.loanRate,
              marriage.loanYears,
              marriage.repaymentType,
              monthsSinceLoanStart
            );
            if (payoffInfo.remainingPrincipal > 0) {
              const totalBefore = youWealth + spouseWealth;
              const youRatio = totalBefore > 0 ? youWealth / totalBefore : (spouseActive ? 0.5 : 1);
              const pay = payoffInfo.remainingPrincipal;
              youWealth = Math.max(0, youWealth - pay * youRatio);
              spouseWealth = Math.max(0, spouseWealth - pay * (1 - youRatio));
            }
            loanPaidOff = true;
          } else {
            const loanInfo = getLoanPaymentAtMonth(
              marriage.loanAmount,
              marriage.loanRate,
              marriage.loanYears,
              marriage.repaymentType,
              monthsSinceLoanStart
            );
            if (loanInfo.isComplete) {
              loanPaidOff = true;
            } else {
              monthlyInvestment -= loanInfo.payment;
            }
          }
        }

        if (monthlyInvestment !== 0) {
          const totalContr = youContr + spouseContr;
          const youShare = totalContr > 0 ? youContr / totalContr : 1;
          const spouseShare = totalContr > 0 ? spouseContr / totalContr : 0;
          youWealth += monthlyInvestment * youShare;
          spouseWealth += monthlyInvestment * spouseShare;
          if (!useCompound) {
            principalYou += monthlyInvestment * youShare;
            principalSpouse += monthlyInvestment * spouseShare;
          }
        }
      } else if (personRetired && (!marriage.enabled || spouseRetired || currentYear < marriage.yearOfMarriage)) {
        const effectiveRetireYear = marriage.enabled
          ? Math.max(person.retireYear, marriage.spouse.retireYear)
          : person.retireYear;
        const yearsAfterRetirement = currentYear - effectiveRetireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));

        if (useCompound) {
          youWealth = youWealth * (1 + youRateMonthly);
          spouseWealth = spouseWealth * (1 + spouseRateMonthly);
        }

        const totalAfterGrowth = youWealth + spouseWealth;
        const youRatio = totalAfterGrowth > 0 ? youWealth / totalAfterGrowth : 0.5;
        youWealth = youWealth - adjustedExpense * youRatio;
        spouseWealth = spouseWealth - adjustedExpense * (1 - youRatio);
      }
    }
    // yearlyData는 루프 시작 시 이미 push됨
  }

  let finalWealth = youWealth + spouseWealth;
  if (marriage.buyHouse && targetYear >= yearOfHousePurchase) {
    finalWealth += houseValue;
    if (!loanPaidOff) {
      const yearsSinceLoan = targetYear - yearOfHousePurchase;
      if (yearsSinceLoan < marriage.loanYears) {
        const monthsSinceLoan = yearsSinceLoan * 12;
        const loanInfo = getLoanPaymentAtMonth(
          marriage.loanAmount,
          marriage.loanRate,
          marriage.loanYears,
          marriage.repaymentType,
          monthsSinceLoan
        );
        finalWealth -= loanInfo.remainingPrincipal;
      }
    }
  }

  return { wealth: finalWealth, yearlyData };
};

/**
 * 포트폴리오 기반 자산 계산 (히스토리컬 수익률 + 자산 배분)
 * @param {number} initial - 초기 자산
 * @param {number} monthly - 월 투자액
 * @param {object} portfolio - 포트폴리오 설정 { allocations, rebalanceEnabled, rebalanceFrequency }
 * @param {object} assetReturns - 자산별 연도별 수익률 { voo, schd, bond, cash }
 * @param {number} years - 투자 기간
 * @param {number} monthlyGrowthRate - 월 투자액 연간 증가율
 * @param {object} person - 개인 정보
 * @param {object} retirement - 은퇴 계획
 * @param {boolean} useCompound - 복리 여부
 * @returns {object} { wealth, yearlyData }
 */
export const calculateWealthWithPortfolio = (
  initial,
  monthly,
  portfolio,
  assetReturns,
  years,
  monthlyGrowthRate = 0,
  person = null,
  retirement = null,
  useCompound = true
) => {
  const { allocations, rebalanceEnabled, rebalanceFrequency } = portfolio;
  
  // 각 자산별 보유액
  let holdings = {
    voo: initial * (allocations.voo / 100),
    schd: initial * (allocations.schd / 100),
    bond: initial * (allocations.bond / 100),
    cash: initial * (allocations.cash / 100),
  };
  
  let currentMonthly = monthly;
  const growthRate = monthlyGrowthRate / 100;
  const yearlyData = [{ year: 0, wealth: initial, returnRate: null, holdings: { ...holdings } }];
  
  let monthsSinceRebalance = 0;

  for (let year = 0; year < years; year++) {
    // 해당 연도의 각 자산별 수익률
    const vooReturn = assetReturns.voo[year] ?? 10.0;
    const schdReturn = assetReturns.schd[year] ?? 8.0;
    const bondReturn = assetReturns.bond[year] ?? 4.0;
    const cashReturn = assetReturns.cash ?? 3.0;
    
    const monthlyRates = {
      voo: annualPctToMonthlyRate(vooReturn),
      schd: annualPctToMonthlyRate(schdReturn),
      bond: annualPctToMonthlyRate(bondReturn),
      cash: annualPctToMonthlyRate(cashReturn),
    };

    // 매년 1월(첫 달)에 투자금 증가
    if (year > 0) {
      currentMonthly = currentMonthly * (1 + growthRate);
    }
    currentMonthly = applyContributionAdjustment(year, currentMonthly, person?.adjustments);

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;
      const isRetired = retirement && retirement.enabled && person && currentYear >= person.retireYear;

      if (!isRetired) {
        // 은퇴 전: 각 자산에 수익률 적용
        if (useCompound) {
          holdings.voo = holdings.voo * (1 + monthlyRates.voo);
          holdings.schd = holdings.schd * (1 + monthlyRates.schd);
          holdings.bond = holdings.bond * (1 + monthlyRates.bond);
          holdings.cash = holdings.cash * (1 + monthlyRates.cash);
        }

        // 월 투자액을 배분 비율대로 추가
        holdings.voo += currentMonthly * (allocations.voo / 100);
        holdings.schd += currentMonthly * (allocations.schd / 100);
        holdings.bond += currentMonthly * (allocations.bond / 100);
        holdings.cash += currentMonthly * (allocations.cash / 100);

        // 리밸런싱
        monthsSinceRebalance++;
        if (rebalanceEnabled && monthsSinceRebalance >= rebalanceFrequency) {
          const totalWealth = holdings.voo + holdings.schd + holdings.bond + holdings.cash;
          holdings.voo = totalWealth * (allocations.voo / 100);
          holdings.schd = totalWealth * (allocations.schd / 100);
          holdings.bond = totalWealth * (allocations.bond / 100);
          holdings.cash = totalWealth * (allocations.cash / 100);
          monthsSinceRebalance = 0;
        }
      } else {
        // 은퇴 후: 생활비 인출 (각 자산에서 비례 인출)
        const yearsAfterRetirement = currentYear - person.retireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));

        // 자산 성장
        if (useCompound) {
          holdings.voo = holdings.voo * (1 + monthlyRates.voo);
          holdings.schd = holdings.schd * (1 + monthlyRates.schd);
          holdings.bond = holdings.bond * (1 + monthlyRates.bond);
          holdings.cash = holdings.cash * (1 + monthlyRates.cash);
        }

        // 비례 인출
        const totalWealth = holdings.voo + holdings.schd + holdings.bond + holdings.cash;
        if (totalWealth > 0) {
          holdings.voo -= adjustedExpense * (holdings.voo / totalWealth);
          holdings.schd -= adjustedExpense * (holdings.schd / totalWealth);
          holdings.bond -= adjustedExpense * (holdings.bond / totalWealth);
          holdings.cash -= adjustedExpense * (holdings.cash / totalWealth);
        }
      }
    }

    // 가중 평균 수익률 계산
    const weightedReturn =
      (allocations.voo / 100) * vooReturn +
      (allocations.schd / 100) * schdReturn +
      (allocations.bond / 100) * bondReturn +
      (allocations.cash / 100) * cashReturn;

    const totalWealth = holdings.voo + holdings.schd + holdings.bond + holdings.cash;
    yearlyData.push({
      year: year + 1,
      wealth: totalWealth,
      returnRate: weightedReturn,
      holdings: { ...holdings },
    });
  }

  const finalWealth = holdings.voo + holdings.schd + holdings.bond + holdings.cash;
  return { wealth: finalWealth, yearlyData };
};
