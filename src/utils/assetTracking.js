/**
 * 자산 추적 유틸리티 함수
 * - 월별 수익률 계산
 * - 통계 계산 (CAGR, 변동성 등)
 * - CSV 저장/불러오기
 */

/**
 * 월별 수익률 계산
 * @param {Array} records - 자산 기록 배열 (날짜 오름차순 정렬 필요)
 * @returns {Array} - 수익률이 추가된 기록 배열
 */
export const calculateMonthlyReturns = (records) => {
  if (!records || records.length === 0) return [];
  
  // 날짜 기준 오름차순 정렬
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  
  return sorted.map((record, index) => {
    if (index === 0) {
      return {
        ...record,
        monthlyReturn: null,
        cumulativeReturn: 0,
      };
    }
    
    const prevRecord = sorted[index - 1];
    const prevValue = prevRecord.assetValue || 0;
    const currValue = record.assetValue || 0;
    const currPrincipal = record.principal || 0;
    const prevPrincipal = prevRecord.principal || 0;
    
    // 투자금 = 원금 증가분 (자동 계산)
    const contribution = currPrincipal > 0 && prevPrincipal > 0 
      ? currPrincipal - prevPrincipal 
      : record.contribution || 0;
    
    // 월 수익률 = (현재총자산 - 이전총자산 - 투자금) / 이전총자산
    let monthlyReturn = null;
    if (prevValue > 0) {
      monthlyReturn = ((currValue - prevValue - contribution) / prevValue) * 100;
    }
    
    // 누적 수익률 = (현재총자산 - 원금) / 원금
    let cumulativeReturn = 0;
    if (currPrincipal > 0) {
      cumulativeReturn = ((currValue - currPrincipal) / currPrincipal) * 100;
    }
    
    return {
      ...record,
      contribution, // 자동 계산된 투자금 (원금 증가분)
      monthlyReturn,
      cumulativeReturn,
    };
  });
};

/**
 * CAGR (연환산 복합 성장률) 계산
 * @param {Array} records - 자산 기록 배열
 * @returns {number} - 연환산 수익률 (%)
 */
export const calculateCAGR = (records) => {
  if (!records || records.length < 2) return 0;
  
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const firstRecord = sorted[0];
  const lastRecord = sorted[sorted.length - 1];
  
  const startValue = firstRecord.assetValue || 0;
  const endValue = lastRecord.assetValue || 0;
  
  // 총 투자금 계산 (첫 번째 이후)
  const totalContributions = sorted
    .slice(1)
    .reduce((sum, r) => sum + (r.contribution || 0), 0);
  
  // 기간 계산 (월 단위) - YYYY-MM 또는 YYYY-MM-DD 형식 지원
  const parseDate = (d) => d.length === 7 ? new Date(d + '-01') : new Date(d);
  const startDate = parseDate(firstRecord.date);
  const endDate = parseDate(lastRecord.date);
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  if (monthsDiff <= 0 || startValue + totalContributions <= 0) return 0;
  
  const years = monthsDiff / 12;
  const totalInvested = startValue + totalContributions;
  
  // CAGR = (최종가치 / 총투자금)^(1/년수) - 1
  const cagr = (Math.pow(endValue / totalInvested, 1 / years) - 1) * 100;
  
  return isFinite(cagr) ? cagr : 0;
};

/**
 * 변동성 (월별 수익률의 표준편차) 계산
 * @param {Array} records - 자산 기록 배열
 * @returns {number} - 월 변동성 (%)
 */
export const calculateVolatility = (records) => {
  const withReturns = calculateMonthlyReturns(records);
  const returns = withReturns
    .filter(r => r.monthlyReturn !== null)
    .map(r => r.monthlyReturn);
  
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;
  
  return Math.sqrt(variance);
};

/**
 * 월평균 수익률 계산
 * @param {Array} records - 자산 기록 배열
 * @returns {number} - 월평균 수익률 (%)
 */
export const calculateAverageMonthlyReturn = (records) => {
  const withReturns = calculateMonthlyReturns(records);
  const returns = withReturns
    .filter(r => r.monthlyReturn !== null)
    .map(r => r.monthlyReturn);
  
  if (returns.length === 0) return 0;
  
  return returns.reduce((sum, r) => sum + r, 0) / returns.length;
};

/**
 * 통계 요약 계산
 * @param {Array} records - 자산 기록 배열
 * @returns {Object} - 통계 요약
 */
export const calculateStats = (records) => {
  if (!records || records.length === 0) {
    return {
      currentValue: 0,
      totalContributions: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      cagr: 0,
      averageMonthlyReturn: 0,
      volatility: 0,
      recordCount: 0,
      periodMonths: 0,
    };
  }
  
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const firstRecord = sorted[0];
  const lastRecord = sorted[sorted.length - 1];
  
  const currentValue = lastRecord.assetValue || 0;
  const initialValue = firstRecord.assetValue || 0;
  const totalContributions = sorted
    .slice(1)
    .reduce((sum, r) => sum + (r.contribution || 0), 0);
  
  const totalInvested = initialValue + totalContributions;
  const totalReturn = currentValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 
    ? (totalReturn / totalInvested) * 100 
    : 0;
  
  // 기간 계산 - YYYY-MM 또는 YYYY-MM-DD 형식 지원
  const parseDate = (d) => d.length === 7 ? new Date(d + '-01') : new Date(d);
  const startDate = parseDate(firstRecord.date);
  const endDate = parseDate(lastRecord.date);
  const periodMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  return {
    currentValue,
    totalContributions,
    totalInvested,
    totalReturn,
    totalReturnPercent,
    cagr: calculateCAGR(records),
    averageMonthlyReturn: calculateAverageMonthlyReturn(records),
    volatility: calculateVolatility(records),
    recordCount: records.length,
    periodMonths: Math.max(0, periodMonths),
  };
};

/**
 * 미래 자산 예측
 * @param {Array} records - 자산 기록 배열
 * @param {number} futureMonths - 예측할 개월 수
 * @param {number} monthlyContribution - 월 투자금
 * @param {number|null} manualReturnRate - 수동 설정 월 수익률 (%)
 * @returns {Array} - 예측 데이터
 */
export const projectFutureWealth = (records, futureMonths = 12, monthlyContribution = 0, manualReturnRate = null) => {
  if (!records || records.length < 2) return [];
  
  const stats = calculateStats(records);
  const monthlyReturnRate = (manualReturnRate !== null ? manualReturnRate : stats.averageMonthlyReturn) / 100;
  
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const lastRecord = sorted[sorted.length - 1];
  let currentValue = lastRecord.assetValue || 0;
  
  const projections = [];
  const lastDate = lastRecord.date.length === 7 ? new Date(lastRecord.date + '-01') : new Date(lastRecord.date);
  
  for (let i = 1; i <= futureMonths; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + i);
    
    // 복리 성장 + 투자금
    currentValue = currentValue * (1 + monthlyReturnRate) + monthlyContribution;
    
    projections.push({
      date: futureDate.toISOString().slice(0, 7),
      assetValue: Math.round(currentValue),
      isProjection: true,
    });
  }
  
  return projections;
};

/**
 * CSV로 내보내기
 * @param {Array} records - 자산 기록 배열
 * @returns {string} - CSV 문자열
 */
export const exportToCSV = (records) => {
  if (!records || records.length === 0) return '';
  
  const headers = ['date', 'assetValue', 'principal', 'contribution', 'memo'];
  const rows = records.map(r => [
    r.date,
    r.assetValue || 0,
    r.principal || 0,
    r.contribution || 0,
    (r.memo || '').replace(/,/g, ';').replace(/\n/g, ' '),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  return csv;
};

/**
 * CSV 파일 다운로드
 * @param {Array} records - 자산 기록 배열
 * @param {string} filename - 파일명
 */
export const downloadCSV = (records, filename = 'asset_records.csv') => {
  const csv = exportToCSV(records);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * CSV에서 불러오기
 * @param {string} csvContent - CSV 문자열
 * @returns {Array} - 자산 기록 배열
 */
export const importFromCSV = (csvContent) => {
  if (!csvContent) return [];
  
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  // 헤더 확인
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const valueIdx = headers.indexOf('assetvalue');
  const principalIdx = headers.indexOf('principal');
  const contribIdx = headers.indexOf('contribution');
  const memoIdx = headers.indexOf('memo');
  
  if (dateIdx === -1 || valueIdx === -1) {
    throw new Error('CSV 형식이 올바르지 않습니다. date, assetValue 컨럼이 필요합니다.');
  }
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 2) continue;
    
    const date = values[dateIdx]?.trim();
    const assetValue = parseFloat(values[valueIdx]) || 0;
    const principal = principalIdx >= 0 ? (parseFloat(values[principalIdx]) || 0) : 0;
    const contribution = contribIdx >= 0 ? (parseFloat(values[contribIdx]) || 0) : 0;
    const memo = memoIdx >= 0 ? values[memoIdx]?.trim() || '' : '';
    
    if (date && (/^\d{4}-\d{2}$/.test(date) || /^\d{4}-\d{2}-\d{2}$/.test(date))) {
      records.push({
        id: `import-${Date.now()}-${i}`,
        date,
        assetValue,
        principal,
        contribution,
        memo,
      });
    }
  }
  
  return records;
};

/**
 * 파일에서 CSV 읽기
 * @param {File} file - 파일 객체
 * @returns {Promise<Array>} - 자산 기록 배열
 */
export const readCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const records = importFromCSV(content);
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * 새 기록 생성
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @param {number} assetValue - 자산 금액 (총 자산)
 * @param {number} principal - 원금 (누적 투자금)
 * @param {number} contribution - 이번 투자금
 * @param {string} memo - 메모
 * @returns {Object} - 새 기록 객체
 */
export const createRecord = (date, assetValue, principal = 0, contribution = 0, memo = '') => {
  return {
    id: `record-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date,
    assetValue: Number(assetValue) || 0,
    principal: Number(principal) || 0,
    contribution: Number(contribution) || 0,
    memo: memo || '',
  };
};

/**
 * 현재 날짜 가져오기 (YYYY-MM-DD 형식)
 * @returns {string}
 */
export const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

/**
 * 현재 월 가져오기 (YYYY-MM 형식) - 호환성 유지용
 * @returns {string}
 */
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
