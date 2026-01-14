// S&P 500 연도별 수익률 (배당 재투자 기준, Total Return)
// 1928년 ~ 2024년 (97년)
// 데이터는 공개된 연간 수익률(팩트 데이터)을 기반으로 합니다.
export const SP500_ANNUAL_RETURNS = {
  1928: 43.81,
  1929: -8.3,
  1930: -25.12,
  1931: -43.84,
  1932: -8.64,
  1933: 49.98,
  1934: -1.19,
  1935: 46.74,
  1936: 31.94,
  1937: -35.34,
  1938: 29.28,
  1939: -1.1,
  1940: -10.67,
  1941: -12.77,
  1942: 19.17,
  1943: 25.06,
  1944: 19.03,
  1945: 35.82,
  1946: -8.43,
  1947: 5.2,
  1948: 5.7,
  1949: 18.3,
  1950: 30.81,
  1951: 23.68,
  1952: 18.15,
  1953: -1.21,
  1954: 52.56,
  1955: 32.6,
  1956: 7.44,
  1957: -10.46,
  1958: 43.72,
  1959: 12.06,
  1960: 0.34,
  1961: 26.64,
  1962: -8.81,
  1963: 22.61,
  1964: 16.42,
  1965: 12.4,
  1966: -9.97,
  1967: 23.8,
  1968: 10.81,
  1969: -8.24,
  1970: 3.56,
  1971: 14.22,
  1972: 18.76,
  1973: -14.31,
  1974: -25.9,
  1975: 37,
  1976: 23.83,
  1977: -6.98,
  1978: 6.51,
  1979: 18.52,
  1980: 31.74,
  1981: -4.7,
  1982: 20.42,
  1983: 22.34,
  1984: 6.15,
  1985: 31.24,
  1986: 18.49,
  1987: 5.81,
  1988: 16.54,
  1989: 31.48,
  1990: -3.06,
  1991: 30.23,
  1992: 7.49,
  1993: 9.97,
  1994: 1.33,
  1995: 37.2,
  1996: 22.68,
  1997: 33.1,
  1998: 28.34,
  1999: 20.89,
  2000: -9.03,
  2001: -11.85,
  2002: -21.97,
  2003: 28.36,
  2004: 10.74,
  2005: 4.83,
  2006: 15.61,
  2007: 5.48,
  2008: -36.55,
  2009: 25.94,
  2010: 14.82,
  2011: 2.1,
  2012: 15.89,
  2013: 32.15,
  2014: 13.52,
  2015: 1.38,
  2016: 11.77,
  2017: 21.61,
  2018: -4.23,
  2019: 31.21,
  2020: 18.02,
  2021: 28.47,
  2022: -18.04,
  2023: 26.06,
  2024: 24.88,
};

// 현대 금융 시스템 시작 연도 (금본위제 폐지 및 현대적 시장 형성 시기)
export const SP500_MODERN_START_YEAR = 1970;

// 수익률 배열 (연도 오름차순)
export const SP500_RETURNS_ARRAY = Object.values(SP500_ANNUAL_RETURNS);

// 현대 금융 시스템 이후 수익률 배열
export const SP500_MODERN_RETURNS_ARRAY = Object.entries(SP500_ANNUAL_RETURNS)
  .filter(([year]) => Number(year) >= SP500_MODERN_START_YEAR)
  .map(([, value]) => value);

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
export const HISTORICAL_START_OPTIONS = SP500_YEARS.filter((year) => year <= SP500_STATS.endYear - 10).map((year) => ({
  value: year,
  label: `${year}년 시작`,
  description: `${year}년부터 실제 수익률 적용`,
}));
