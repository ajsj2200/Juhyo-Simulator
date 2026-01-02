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
  const remainingPrincipal = principal - (monthlyPrincipal * currentMonth);
  const interest = Math.max(0, remainingPrincipal) * monthlyRate;

  return monthlyPrincipal + interest;
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
    } else {
      // 체증식 (increasing) - 초기 이자만, 점차 증가
      interest = remainingPrincipal * monthlyRate;
      // 원금 상환은 시간이 지날수록 증가 (간단한 선형 증가 모델)
      const progressRatio = month / months;
      principal = (loanAmount / months) * progressRatio * 2; // 평균적으로 전체 원금 상환
      payment = principal + interest;
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
    // 체증식 (increasing) - 남은 원금 계산
    let remainingPrincipal = loanAmount;
    for (let i = 0; i < monthsSinceLoanStart; i++) {
      const progressRatio = i / totalMonths;
      const principal = (loanAmount / totalMonths) * progressRatio * 2;
      remainingPrincipal -= principal;
    }
    remainingPrincipal = Math.max(0, remainingPrincipal);

    const interest = remainingPrincipal * monthlyRate;
    const progressRatio = monthsSinceLoanStart / totalMonths;
    const principal = (loanAmount / totalMonths) * progressRatio * 2;
    const payment = principal + interest;

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
  retirement
) => {
  let wealth = person.initial;
  const monthlyRate = person.rate / 100 / 12;
  
  // 월 투자액 (매년 증가)
  let personMonthly = person.monthly;
  let spouseMonthly = marriage.spouse.monthly;
  const personGrowthRate = (person.monthlyGrowthRate || 0) / 100;
  const spouseGrowthRate = (marriage.spouse.monthlyGrowthRate || 0) / 100;
  
  // 주택 가치 (구매 시점의 가격으로 시작)
  let houseValue = marriage.buyHouse && marriage.enabled ? marriage.housePrice : 0;
  const houseAppreciationMonthlyRate = marriage.buyHouse && marriage.enabled 
    ? marriage.houseAppreciationRate / 100 / 12 
    : 0;

  // JEPQ 경제적 자유 달성 여부
  let jepqFinancialIndependence = false;

  for (let year = 0; year < targetYear; year++) {
    // 매년 1월에 투자금 증가
    if (year > 0) {
      personMonthly = personMonthly * (1 + personGrowthRate);
      spouseMonthly = spouseMonthly * (1 + spouseGrowthRate);
    }
    
    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;
      const currentMonth = year * 12 + month;

      // JEPQ 경제적 자유 달성 체크
      if (!jepqFinancialIndependence && retirement.enabled && retirement.useJEPQ && marriage.enabled) {
        const jepqPortion = wealth * (retirement.jepqRatio / 100);
        const annualDividend = jepqPortion * (retirement.jepqDividendRate / 100);
        const monthlyDividend = annualDividend / 12;
        
        const yearsFromNow = currentYear >= person.retireYear ? currentYear - person.retireYear : 0;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsFromNow));
        
        if (monthlyDividend >= adjustedExpense) {
          jepqFinancialIndependence = true;
        }
      }

      // 주택 가치 상승 (결혼 이후)
      if (marriage.enabled && currentYear >= marriage.yearOfMarriage && marriage.buyHouse) {
        houseValue = houseValue * (1 + houseAppreciationMonthlyRate);
      }

      // 본인 은퇴 여부 확인
      const personRetired = retirement.enabled && currentYear >= person.retireYear;

      // 배우자 은퇴 여부 확인 (결혼 후에만)
      // JEPQ로 경제적 자유를 달성했다면 배우자도 은퇴 가능
      const spouseRetired = marriage.enabled &&
        retirement.enabled &&
        currentYear >= marriage.yearOfMarriage &&
        (currentYear >= marriage.spouse.retireYear || jepqFinancialIndependence);

      // 은퇴 전 (적어도 한 명이 일하고 있음)
      if (!personRetired || (marriage.enabled && currentYear >= marriage.yearOfMarriage && !spouseRetired)) {
        // 복리 적용
        wealth = wealth * (1 + monthlyRate);

        // 월 투자액 계산
        let monthlyInvestment = 0;

        // 본인 투자 (은퇴 전일 때만)
        if (!personRetired) {
          monthlyInvestment += personMonthly;
        }

        // 결혼 이후라면
        if (marriage.enabled && currentYear >= marriage.yearOfMarriage) {
          // 배우자 저축 추가 (배우자가 은퇴 전일 때만)
          if (!spouseRetired) {
            monthlyInvestment += spouseMonthly;
          }

          // 주택 구매했다면 대출 상환
          if (marriage.buyHouse) {
            const monthsSinceLoanStart = Math.floor((currentYear - marriage.yearOfMarriage) * 12);
            const loanInfo = getLoanPaymentAtMonth(
              marriage.loanAmount,
              marriage.loanRate,
              marriage.loanYears,
              marriage.repaymentType,
              monthsSinceLoanStart
            );

            if (!loanInfo.isComplete) {
              monthlyInvestment -= loanInfo.payment;
            }
          }
        }

        // 음수 방지
        monthlyInvestment = Math.max(0, monthlyInvestment);
        wealth += monthlyInvestment;
      }
      // 둘 다 은퇴 후
      else if (personRetired && (!marriage.enabled || spouseRetired || currentYear < marriage.yearOfMarriage)) {
        // 은퇴 기준 시점 (둘 중 늦은 은퇴 시점)
        const effectiveRetireYear = marriage.enabled
          ? Math.max(person.retireYear, marriage.spouse.retireYear)
          : person.retireYear;

        const yearsAfterRetirement = currentYear - effectiveRetireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));

        if (retirement.useJEPQ) {
          // JEPQ/VOO 혼합 전략: 각각 성장
          const jepqPortion = wealth * (retirement.jepqRatio / 100);
          const vooPortion = wealth * (1 - retirement.jepqRatio / 100);

          const jepqGrowthRate = 0.02 / 12;
          const jepqAfterGrowth = jepqPortion * (1 + jepqGrowthRate);

          const vooGrowthRate = retirement.vooGrowthRate / 100 / 12;
          const vooAfterGrowth = vooPortion * (1 + vooGrowthRate);

          wealth = jepqAfterGrowth + vooAfterGrowth;
        } else {
          // VOO만: 성장
          const vooGrowthRate = retirement.vooGrowthRate / 100 / 12;
          wealth = wealth * (1 + vooGrowthRate);
        }

        // 생활비만 인출
        wealth -= adjustedExpense;
        wealth = Math.max(0, wealth);
      }
    }
  }

  // 최종 자산 = 금융자산 + 주택가치 - 남은 대출금
  let finalWealth = wealth;
  
  if (marriage.enabled && marriage.buyHouse && targetYear >= marriage.yearOfMarriage) {
    finalWealth += houseValue; // 주택 가치 추가
    
    // 남은 대출금 차감
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

  return finalWealth;
};

/**
 * 기본 복리 계산 (은퇴 계획 반영)
 */
export const calculateWealth = (initial, monthly, annualRate, years, monthlyGrowthRate = 0, person = null, retirement = null) => {
  let wealth = initial;
  const monthlyRate = annualRate / 100 / 12;
  let currentMonthly = monthly;
  const growthRate = monthlyGrowthRate / 100;

  for (let year = 0; year < years; year++) {
    // 매년 1월(첫 달)에 투자금 증가
    if (year > 0) {
      currentMonthly = currentMonthly * (1 + growthRate);
    }

    for (let month = 0; month < 12; month++) {
      const currentYear = year + month / 12;

      // 은퇴 여부 확인
      const isRetired = retirement && retirement.enabled && person && currentYear >= person.retireYear;

      if (!isRetired) {
        // 은퇴 전: 투자 지속
        wealth = wealth * (1 + monthlyRate) + currentMonthly;
      } else {
        // 은퇴 후: 자산 성장 후 생활비 인출
        const yearsAfterRetirement = currentYear - person.retireYear;
        const adjustedExpense = retirement.monthlyExpense *
          Math.pow(1 + retirement.inflationRate / 100, Math.max(0, yearsAfterRetirement));

        if (retirement.useJEPQ) {
          // JEPQ/VOO 혼합 전략: 각각 성장
          const jepqPortion = wealth * (retirement.jepqRatio / 100);
          const vooPortion = wealth * (1 - retirement.jepqRatio / 100);

          const jepqGrowthRate = 0.02 / 12;
          const jepqAfterGrowth = jepqPortion * (1 + jepqGrowthRate);

          const vooGrowthRate = retirement.vooGrowthRate / 100 / 12;
          const vooAfterGrowth = vooPortion * (1 + vooGrowthRate);

          wealth = jepqAfterGrowth + vooAfterGrowth;
        } else {
          // VOO만: 성장
          const vooGrowthRate = retirement.vooGrowthRate / 100 / 12;
          wealth = wealth * (1 + vooGrowthRate);
        }

        // 생활비만 인출
        wealth -= adjustedExpense;
        wealth = Math.max(0, wealth);
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
  return ((monthly / (salary / 12)) * 100).toFixed(1);
};
