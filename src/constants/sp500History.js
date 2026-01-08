// S&P 500 연도별 수익률 (배당 재투자 기준, Total Return)
// 1975년 ~ 2024년 (50년간)
export const SP500_ANNUAL_RETURNS = {
  1975: 37.20,
  1976: 23.84,
  1977: -7.18,
  1978: 6.56,
  1979: 18.44,
  1980: 32.42,
  1981: -4.91,
  1982: 21.55,
  1983: 22.56,
  1984: 6.27,
  1985: 31.73,
  1986: 18.67,
  1987: 5.25,
  1988: 16.61,
  1989: 31.69,
  1990: -3.10,
  1991: 30.47,
  1992: 7.62,
  1993: 10.08,
  1994: 1.32,
  1995: 37.58,
  1996: 22.96,
  1997: 33.36,
  1998: 28.58,
  1999: 21.04,
  2000: -9.10,
  2001: -11.89,
  2002: -22.10,
  2003: 28.68,
  2004: 10.88,
  2005: 4.91,
  2006: 15.79,
  2007: 5.49,
  2008: -37.00,
  2009: 26.46,
  2010: 15.06,
  2011: 2.11,
  2012: 16.00,
  2013: 32.39,
  2014: 13.69,
  2015: 1.38,
  2016: 11.96,
  2017: 21.83,
  2018: -4.38,
  2019: 31.49,
  2020: 18.40,
  2021: 28.71,
  2022: -18.11,
  2023: 26.29,
  2024: 25.02,
};

// 수익률 배열 (1975년부터 순서대로)
export const SP500_RETURNS_ARRAY = Object.values(SP500_ANNUAL_RETURNS);

// 수익률 연도 배열
export const SP500_YEARS = Object.keys(SP500_ANNUAL_RETURNS).map(Number);

// 통계
export const SP500_STATS = {
  years: SP500_YEARS.length,
  startYear: SP500_YEARS[0],
  endYear: SP500_YEARS[SP500_YEARS.length - 1],
  average: SP500_RETURNS_ARRAY.reduce((a, b) => a + b, 0) / SP500_RETURNS_ARRAY.length,
  max: Math.max(...SP500_RETURNS_ARRAY),
  min: Math.min(...SP500_RETURNS_ARRAY),
  maxYear: SP500_YEARS[SP500_RETURNS_ARRAY.indexOf(Math.max(...SP500_RETURNS_ARRAY))],
  minYear: SP500_YEARS[SP500_RETURNS_ARRAY.indexOf(Math.min(...SP500_RETURNS_ARRAY))],
  positiveYears: SP500_RETURNS_ARRAY.filter(r => r > 0).length,
  negativeYears: SP500_RETURNS_ARRAY.filter(r => r < 0).length,
};

// 특정 시작 연도부터 N년간 수익률 가져오기
export const getReturnsFromYear = (startYear, years) => {
  const startIndex = SP500_YEARS.indexOf(startYear);
  if (startIndex === -1) return [];
  return SP500_RETURNS_ARRAY.slice(startIndex, startIndex + years);
};

// 랜덤 시작점에서 N년간 수익률 가져오기 (순환)
export const getRandomReturnsSequence = (years, seed = null) => {
  const maxStart = SP500_RETURNS_ARRAY.length;
  const startIndex = seed !== null
    ? seed % maxStart
    : Math.floor(Math.random() * maxStart);

  const result = [];
  for (let i = 0; i < years; i++) {
    const index = (startIndex + i) % SP500_RETURNS_ARRAY.length;
    result.push(SP500_RETURNS_ARRAY[index]);
  }
  return result;
};

// 시작 연도 옵션 목록 (UI용)
export const HISTORICAL_START_OPTIONS = SP500_YEARS.filter(year => year <= 2024 - 10).map(year => ({
  value: year,
  label: `${year}년 시작`,
  description: `${year}년부터 실제 수익률 적용`,
}));
