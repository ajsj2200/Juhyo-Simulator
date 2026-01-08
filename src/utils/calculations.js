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
  let houseValue = marriage.buyHouse && marriage.enabled ? marriage.housePrice : 0;
  const houseAppreciationMonthlyRate = marriage.buyHouse && marriage.enabled 
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

      if (
        marriage.enabled &&
        marriage.buyHouse &&
        spouseActive &&
        !downPaymentDeducted
      ) {
        // 결혼 시점에 자기자본(다운페이)을 현금에서 차감
        const totalBefore = youWealth + spouseWealth;
        const youRatio = totalBefore > 0 ? youWealth / totalBefore : 0.5;
        const spouseRatio = 1 - youRatio;
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

      if (marriage.enabled && currentYear >= marriage.yearOfMarriage && marriage.buyHouse) {
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
          if (marriage.buyHouse && !loanPaidOff) {
            const monthsSinceLoanStart = Math.floor((currentYear - marriage.yearOfMarriage) * 12);
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
                const youRatio = totalBefore > 0 ? youWealth / totalBefore : 0.5;
                const spouseRatio = 1 - youRatio;
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
  if (marriage.enabled && marriage.buyHouse && targetYear >= marriage.yearOfMarriage) {
    finalWealth += houseValue;
    if (!loanPaidOff) {
      const yearsSinceLoan = targetYear - marriage.yearOfMarriage;
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
 * 특정 시점의 주택 가치 계산 (결혼 이후, 월 복리 상승)
 */
export const calculateHouseValue = (marriage, targetYear) => {
  if (!marriage.enabled || !marriage.buyHouse || targetYear < marriage.yearOfMarriage) return 0;

  const months = Math.floor((targetYear - marriage.yearOfMarriage) * 12);
  let value = marriage.housePrice;
  const monthlyRate = marriage.houseAppreciationRate / 100 / 12;

  for (let i = 0; i < months; i++) {
    value = value * (1 + monthlyRate);
  }

  return value;
};
