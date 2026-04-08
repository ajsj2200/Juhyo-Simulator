// Stock API Service - Yahoo Finance API를 통한 주식 데이터 조회

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const REQUEST_TIMEOUT_MS = 12000;
const searchCache = new Map();
const stockInfoCache = new Map();

// 색상 팔레트 (커스텀 주식용)
const STOCK_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
];

let colorIndex = 0;

const createServiceError = (message, code, cause) => {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
};

const withTimeoutSignal = (signal, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', abortFromParent);
      }
    },
  };
};

const fetchYahooJson = async (url, { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) => {
  const { signal: requestSignal, cleanup } = withTimeoutSignal(signal, timeoutMs);

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), { signal: requestSignal });

    if (!response.ok) {
      throw createServiceError(`요청 실패 (${response.status})`, 'HTTP_ERROR');
    }

    return await response.json();
  } catch (error) {
    if (requestSignal.aborted) {
      throw createServiceError('요청이 취소되었거나 시간이 초과되었습니다.', 'ABORTED', error);
    }
    throw error;
  } finally {
    cleanup();
  }
};

const getVolatilityLevel = (annualStdDev) => {
  if (annualStdDev * 100 < 10) return 'very-low';
  if (annualStdDev * 100 < 20) return 'low';
  if (annualStdDev * 100 < 30) return 'medium';
  return 'high';
};

const getNextColor = () => {
  const color = STOCK_COLORS[colorIndex % STOCK_COLORS.length];
  colorIndex++;
  return color;
};

// 주식 검색 (티커 또는 이름으로)
export const searchStocks = async (query, options = {}) => {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery || normalizedQuery.length < 1) {
    return [];
  }

  const cacheKey = normalizedQuery.toUpperCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedQuery)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const data = await fetchYahooJson(url, options);
    
    if (!data.quotes) {
      return [];
    }

    // 주식과 ETF만 필터링
    const results = data.quotes
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchange,
      }));

    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    }
    console.error('Stock search error:', error);
    throw createServiceError('주식 검색이 불안정합니다. 잠시 후 다시 시도하거나 티커로 직접 불러와 주세요.', 'SEARCH_FAILED', error);
  }
};

// 주식 상세 정보 조회
export const getStockInfo = async (ticker, options = {}) => {
  const normalizedTicker = ticker?.trim().toUpperCase();
  if (!normalizedTicker) {
    throw createServiceError('유효한 티커가 필요합니다.', 'INVALID_TICKER');
  }

  if (stockInfoCache.has(normalizedTicker)) {
    return stockInfoCache.get(normalizedTicker);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedTicker)}?interval=1d&range=1y`;
    const data = await fetchYahooJson(url, options);
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw createServiceError('해당 종목 데이터를 찾지 못했습니다.', 'NO_DATA');
    }

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const closes = quotes?.close || [];

    const historicalData = timestamps
      .map((ts, idx) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: Number(closes[idx]),
      }))
      .filter((d) => Number.isFinite(d.price));

    if (historicalData.length === 0) {
      throw createServiceError('가격 히스토리를 불러오지 못했습니다.', 'NO_PRICE_HISTORY');
    }

    // 변동성 계산 (연간 표준편차)
    const dailyReturns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const prev = historicalData[i - 1].price;
      const curr = historicalData[i].price;
      if (Number.isFinite(prev) && Number.isFinite(curr) && prev > 0) {
        dailyReturns.push((curr - prev) / prev);
      }
    }

    const avgReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
    const variance = dailyReturns.length > 0
      ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
      : 0;
    const dailyStdDev = Math.sqrt(variance);
    const annualStdDev = Number.isFinite(dailyStdDev) ? dailyStdDev * Math.sqrt(252) : 0;
    const annualReturn = Number.isFinite(avgReturn) ? avgReturn * 252 : 0;

    const payload = {
      ticker: meta.symbol || normalizedTicker,
      name: meta.shortName || meta.longName || normalizedTicker,
      currency: meta.currency,
      exchange: meta.exchangeName,
      currentPrice: Number.isFinite(meta.regularMarketPrice)
        ? meta.regularMarketPrice
        : historicalData[historicalData.length - 1]?.price ?? null,
      previousClose: Number.isFinite(meta.chartPreviousClose)
        ? meta.chartPreviousClose
        : historicalData[historicalData.length - 2]?.price ?? null,
      expectedReturn: Math.round(annualReturn * 10000) / 100, // 백분율
      stdDev: Math.round(annualStdDev * 10000) / 100, // 백분율
      volatilityLevel: getVolatilityLevel(annualStdDev),
      historicalData,
      color: getNextColor(),
    };

    stockInfoCache.set(normalizedTicker, payload);
    return payload;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    }
    console.error('Stock info error:', error);
    throw createServiceError('종목 정보를 안정적으로 불러오지 못했습니다. 잠시 후 다시 시도하거나 티커로 직접 불러와 주세요.', 'INFO_FAILED', error);
  }
};

// 과거 가격 데이터만 조회 (차트용)
export const getHistoricalData = async (ticker, range = '1y') => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
    const data = await fetchYahooJson(url);
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data found');
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close || [];

    return timestamps.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: closes[idx],
    })).filter((d) => d.price != null);
  } catch (error) {
    console.error('Historical data error:', error);
    return [];
  }
};

// 다중 종목 연간 수익률 계산
export const getAnnualReturns = async (ticker, years = 10) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=${years}y`;
    const data = await fetchYahooJson(url);
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data found');
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close || [];

    // 연도별 수익률 계산
    const yearlyPrices = {};
    timestamps.forEach((ts, idx) => {
      const year = new Date(ts * 1000).getFullYear();
      if (!yearlyPrices[year]) {
        yearlyPrices[year] = { first: closes[idx], last: closes[idx] };
      } else {
        yearlyPrices[year].last = closes[idx];
      }
    });

    const annualReturns = {};
    const yearList = Object.keys(yearlyPrices).map(Number).sort();
    
    for (let i = 1; i < yearList.length; i++) {
      const year = yearList[i];
      const prevYear = yearList[i - 1];
      const startPrice = yearlyPrices[prevYear].last;
      const endPrice = yearlyPrices[year].last;
      
      if (startPrice && endPrice) {
        annualReturns[year] = ((endPrice - startPrice) / startPrice) * 100;
      }
    }

    return annualReturns;
  } catch (error) {
    console.error('Annual returns error:', error);
    return {};
  }
};
