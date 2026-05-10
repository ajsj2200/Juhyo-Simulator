// Stock API Service - Yahoo Finance API를 통한 주식 데이터 조회

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const CORS_PROXY_URL_BUILDERS = [
  (url) => url,
  (url) => `${CORS_PROXY}${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];
const STOOQ_DAILY_URL = 'https://stooq.com/q/d/l/';
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_PREFIX = 'voo-app-market-cache:v3:';
const MARKET_CACHE_TTLS = {
  search: 1000 * 60 * 30,
  stockInfo: 1000 * 60 * 20,
  historical: 1000 * 60 * 60 * 6,
  fx: 1000 * 60 * 30,
  annualReturns: 1000 * 60 * 60 * 24,
};
const MARKET_RETRY_MS = 1000 * 90;
const MARKET_REFRESH_MS = 1000 * 60 * 15;
const searchCache = new Map();
const stockInfoCache = new Map();
const historicalCache = new Map();
const fxCache = new Map();
const annualReturnsCache = new Map();
const FINANCE_PROXY_BASE = (import.meta.env.VITE_FINANCE_PROXY_URL || '').trim().replace(/\/$/, '');
const STOOQ_API_KEY = (import.meta.env.VITE_STOOQ_API_KEY || '').trim();

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

const TICKER_ALIASES = {
  SPYM: {
    sourceTicker: 'VOO',
    name: 'SPYM',
    fullName: 'SPYM (VOO 추종 매핑)',
    exchange: 'ALIAS',
    currency: 'USD',
  },
  TIGERSP500: {
    sourceTicker: 'VOO',
    name: 'TIGER 미국S&P500',
    fullName: 'TIGER 미국S&P500 (VOO 추종 매핑)',
    exchange: 'KRX',
    currency: 'KRW',
  },
};

let colorIndex = 0;

const createServiceError = (message, code, cause) => {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
};

const getStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const readCachedEntry = (memoryCache, cacheKey, { allowStale = false } = {}) => {
  const now = Date.now();
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry) {
    if (allowStale || memoryEntry.expiresAt > now) {
      return memoryEntry;
    }
    memoryCache.delete(cacheKey);
  }

  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if (!allowStale && Number(parsed.expiresAt) <= now) {
      return null;
    }

    memoryCache.set(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedEntry = (memoryCache, cacheKey, value, ttlMs) => {
  const entry = {
    value,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  memoryCache.set(cacheKey, entry);

  const storage = getStorage();
  if (!storage) return entry;

  try {
    storage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry));
  } catch {
    // ignore storage quota/cache failures
  }

  return entry;
};

const getCachedValue = (memoryCache, cacheKey, options) => readCachedEntry(memoryCache, cacheKey, options)?.value;

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

const fetchJson = async (url, { signal, timeoutMs = REQUEST_TIMEOUT_MS, method = 'GET', body, headers } = {}) => {
  const { signal: requestSignal, cleanup } = withTimeoutSignal(signal, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      body,
      headers,
      signal: requestSignal,
    });

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

const fetchText = async (url, { signal, timeoutMs = REQUEST_TIMEOUT_MS, method = 'GET', body, headers } = {}) => {
  const { signal: requestSignal, cleanup } = withTimeoutSignal(signal, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      body,
      headers,
      signal: requestSignal,
    });

    if (!response.ok) {
      throw createServiceError(`요청 실패 (${response.status})`, 'HTTP_ERROR');
    }

    return await response.text();
  } catch (error) {
    if (requestSignal.aborted) {
      throw createServiceError('요청이 취소되었거나 시간이 초과되었습니다.', 'ABORTED', error);
    }
    throw error;
  } finally {
    cleanup();
  }
};

const fetchExternalWithFallbacks = async (rawUrl, fetcher, options = {}) => {
  let lastError = null;

  for (const buildUrl of CORS_PROXY_URL_BUILDERS) {
    try {
      return await fetcher(buildUrl(rawUrl), options);
    } catch (error) {
      if (error.code === 'ABORTED') {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError || createServiceError('외부 데이터를 불러오지 못했습니다.', 'FETCH_FAILED');
};

const fetchProxyJson = async (url, { signal, timeoutMs = REQUEST_TIMEOUT_MS, method = 'GET', body, headers } = {}) => {
  return fetchJson(url, { signal, timeoutMs, method, body, headers });
};

const fetchExternalJson = async (rawUrl, options = {}) => {
  if (FINANCE_PROXY_BASE) {
    return fetchProxyJson(rawUrl, options);
  }

  return fetchExternalWithFallbacks(rawUrl, fetchJson, options);
};

const fetchExternalText = async (rawUrl, options = {}) => fetchExternalWithFallbacks(rawUrl, fetchText, options);

const fetchSearchPayload = async (normalizedQuery, options = {}) => {
  if (FINANCE_PROXY_BASE) {
    return fetchProxyJson(`${FINANCE_PROXY_BASE}/api/finance/search`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: normalizedQuery }),
    });
  }

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedQuery)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
  return fetchExternalJson(url, options);
};

const fetchChartPayload = async (symbol, interval, range, options = {}) => {
  if (FINANCE_PROXY_BASE) {
    const url = new URL(`${FINANCE_PROXY_BASE}/api/finance/chart`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('range', range);
    return fetchProxyJson(url.toString(), options);
  }

  const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  return fetchExternalJson(rawUrl, options);
};

const fetchFxPayload = async (options = {}) => {
  if (FINANCE_PROXY_BASE) {
    return fetchProxyJson(`${FINANCE_PROXY_BASE}/api/fx/usdkrw`, options);
  }

  return fetchJson('https://open.er-api.com/v6/latest/USD', options);
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

const normalizeTickerSymbol = (value) => {
  const symbol = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return symbol || null;
};

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toNullablePositiveNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const formatDate = (date) => date.toISOString().split('T')[0];

const getDateYearsAgo = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return formatDate(date).replaceAll('-', '');
};

const getTodayForProvider = () => formatDate(new Date()).replaceAll('-', '');

const isLikelyTicker = (value) => /^[A-Z0-9.^=-]{1,15}$/.test(String(value || '').trim().toUpperCase());

const createDirectTickerResult = (ticker) => {
  const normalizedTicker = normalizeTickerSymbol(ticker);
  if (!normalizedTicker || !isLikelyTicker(normalizedTicker)) return null;

  return {
    ticker: normalizedTicker,
    name: `${normalizedTicker} (티커 직접 조회)`,
    type: 'EQUITY',
    exchange: 'DIRECT',
  };
};

const getRangeYears = (range) => {
  const match = String(range || '1y').match(/^(\d+)y$/);
  if (match) return Math.max(1, Number(match[1]));
  return 1;
};

const getStooqSymbolCandidates = (ticker) => {
  const normalizedTicker = normalizeTickerSymbol(ticker);
  if (!normalizedTicker) return [];

  const lowerTicker = normalizedTicker.toLowerCase();
  const candidates = [lowerTicker];

  if (!lowerTicker.includes('.') && !lowerTicker.includes('=')) {
    candidates.push(`${lowerTicker}.us`);
  }

  return [...new Set(candidates)];
};

const parseStooqCsv = (csv) => {
  if (typeof csv !== 'string' || !csv.trim()) return [];

  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, , , , close] = line.split(',');
      const price = Number(close);
      return { date, price };
    })
    .filter((point) => point.date && Number.isFinite(point.price) && point.price > 0);
};

const fetchStooqDailyHistory = async (ticker, range = '1y', options = {}) => {
  if (!STOOQ_API_KEY) {
    return [];
  }

  const years = getRangeYears(range);
  const from = getDateYearsAgo(years);
  const to = getTodayForProvider();
  let lastError = null;

  for (const symbol of getStooqSymbolCandidates(ticker)) {
    const url = new URL(STOOQ_DAILY_URL);
    url.searchParams.set('s', symbol);
    url.searchParams.set('d1', from);
    url.searchParams.set('d2', to);
    url.searchParams.set('i', 'd');
    url.searchParams.set('apikey', STOOQ_API_KEY);

    try {
      const csv = await fetchExternalText(url.toString(), options);
      const history = parseStooqCsv(csv);
      if (history.length > 0) {
        return history;
      }
    } catch (error) {
      if (error.code === 'ABORTED') {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
};

const buildStockInfoFromHistory = (ticker, history, source = 'STOOQ') => {
  const normalizedTicker = normalizeTickerSymbol(ticker);
  if (!normalizedTicker || !Array.isArray(history) || history.length === 0) return null;

  const dailyReturns = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].price;
    const curr = history[i].price;
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
  const annualStdDev = Math.sqrt(variance) * Math.sqrt(252);
  const annualReturn = avgReturn * 252;

  return normalizeStockInfo({
    ticker: normalizedTicker,
    name: `${normalizedTicker} (${source} fallback)`,
    currency: 'USD',
    exchange: source,
    currentPrice: history[history.length - 1]?.price ?? null,
    previousClose: history[history.length - 2]?.price ?? null,
    expectedReturn: Math.round(annualReturn * 10000) / 100,
    stdDev: Math.round(annualStdDev * 10000) / 100,
    volatilityLevel: getVolatilityLevel(annualStdDev),
    historicalData: history,
    color: getNextColor(),
    source,
  }, normalizedTicker);
};

const normalizeSearchResults = (results) => {
  if (!Array.isArray(results)) return [];

  return results
    .map((result) => {
      if (!result || typeof result !== 'object') return null;

      const ticker = normalizeTickerSymbol(result.ticker ?? result.symbol);
      if (!ticker) return null;

      return {
        ticker,
        name: result.name || result.shortname || result.longname || ticker,
        type: result.type || result.quoteType || 'UNKNOWN',
        exchange: result.exchange || '',
      };
    })
    .filter(Boolean);
};

const normalizeStockInfo = (value, fallbackTicker) => {
  if (!value || typeof value !== 'object') return null;

  const ticker = normalizeTickerSymbol(value.ticker ?? value.symbol) || normalizeTickerSymbol(fallbackTicker);
  if (!ticker) return null;

  const expectedReturn = toFiniteNumber(value.expectedReturn, 0);
  const stdDev = Math.max(0, toFiniteNumber(value.stdDev, 0));
  const historicalData = Array.isArray(value.historicalData)
    ? value.historicalData
        .map((point) => ({
          date: point?.date,
          price: Number(point?.price),
        }))
        .filter((point) => point.date && Number.isFinite(point.price) && point.price > 0)
    : [];
  const currentPrice = toNullablePositiveNumber(value.currentPrice)
    ?? historicalData[historicalData.length - 1]?.price
    ?? null;
  const previousClose = toNullablePositiveNumber(value.previousClose)
    ?? historicalData[historicalData.length - 2]?.price
    ?? null;
  const allowedVolatilityLevels = new Set(['very-low', 'low', 'medium', 'high']);
  const volatilityLevel = allowedVolatilityLevels.has(value.volatilityLevel)
    ? value.volatilityLevel
    : getVolatilityLevel(stdDev / 100);

  return {
    ...value,
    ticker,
    name: value.name || ticker,
    currency: value.currency || 'USD',
    exchange: value.exchange || '',
    currentPrice,
    previousClose,
    expectedReturn,
    stdDev,
    volatilityLevel,
    historicalData,
    color: typeof value.color === 'string' && value.color.trim() ? value.color : getNextColor(),
  };
};

const hasUsableStockInfo = (info) => (
  !!info
  && Number.isFinite(info.currentPrice)
  && info.currentPrice > 0
  && Array.isArray(info.historicalData)
  && info.historicalData.length > 0
);

const resolveTickerAlias = (ticker) => {
  const normalizedTicker = String(ticker || '').trim().toUpperCase();
  return TICKER_ALIASES[normalizedTicker] || null;
};

const scaleHistoryToManualCurrentPrice = (historicalData, manualCurrentPrice) => {
  const targetPrice = Number(manualCurrentPrice);
  const latestHistoricalPrice = historicalData[historicalData.length - 1]?.price;

  if (!Number.isFinite(targetPrice) || targetPrice <= 0 || !Number.isFinite(latestHistoricalPrice) || latestHistoricalPrice <= 0) {
    return historicalData;
  }

  const ratio = targetPrice / latestHistoricalPrice;
  return historicalData.map((point) => ({
    ...point,
    price: point.price * ratio,
  }));
};

// 주식 검색 (티커 또는 이름으로)
export const searchStocks = async (query, options = {}) => {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery || normalizedQuery.length < 1) {
    return [];
  }

  const cacheKey = normalizedQuery.toUpperCase();
  const cachedResults = getCachedValue(searchCache, cacheKey);
  if (cachedResults) {
    const normalizedCachedResults = normalizeSearchResults(cachedResults);
    if (normalizedCachedResults.length > 0) {
      return normalizedCachedResults;
    }
  }

  const aliasResults = Object.entries(TICKER_ALIASES)
    .filter(([ticker, alias]) => {
      const haystack = `${ticker} ${alias.fullName || ''} ${alias.name || ''}`.toUpperCase();
      return haystack.includes(cacheKey);
    })
    .map(([ticker, alias]) => ({
      ticker,
      name: alias.fullName || alias.name || ticker,
      type: 'ETF',
      exchange: alias.exchange || 'ALIAS',
    }));

  try {
    const data = await fetchSearchPayload(normalizedQuery, options);
    
    if (!data.quotes) {
      return [];
    }

    // 주식과 ETF만 필터링
    const results = normalizeSearchResults(
      data.quotes.filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    );

    const mergedResults = normalizeSearchResults([
      ...aliasResults,
      ...results.filter((result) => result.ticker !== 'SPYM'),
    ]);

    writeCachedEntry(searchCache, cacheKey, mergedResults, MARKET_CACHE_TTLS.search);
    return mergedResults;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    }
    const staleResults = getCachedValue(searchCache, cacheKey, { allowStale: true });
    if (staleResults) {
      const normalizedStaleResults = normalizeSearchResults(staleResults);
      if (normalizedStaleResults.length > 0) {
        return normalizedStaleResults;
      }
    }
    if (aliasResults.length > 0) {
      writeCachedEntry(searchCache, cacheKey, aliasResults, MARKET_CACHE_TTLS.search);
      return aliasResults;
    }

    const directTickerResult = createDirectTickerResult(normalizedQuery);
    if (directTickerResult) {
      const fallbackResults = [directTickerResult];
      writeCachedEntry(searchCache, cacheKey, fallbackResults, MARKET_CACHE_TTLS.search);
      return fallbackResults;
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

  const alias = resolveTickerAlias(normalizedTicker);
  const lookupTicker = alias?.sourceTicker || normalizedTicker;
  const cacheVariantKey = options.manualCurrentPrice ? `${normalizedTicker}:manual:${options.manualCurrentPrice}` : normalizedTicker;

    const cachedInfo = getCachedValue(stockInfoCache, cacheVariantKey);
  if (cachedInfo) {
    const normalizedCachedInfo = normalizeStockInfo(cachedInfo, normalizedTicker);
    if (hasUsableStockInfo(normalizedCachedInfo)) {
      return normalizedCachedInfo;
    }
  }

  try {
    const data = await fetchChartPayload(lookupTicker, '1d', '1y', options);
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw createServiceError('해당 종목 데이터를 찾지 못했습니다.', 'NO_DATA');
    }

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const closes = quotes?.close || [];

    const rawHistoricalData = timestamps
      .map((ts, idx) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: Number(closes[idx]),
      }))
      .filter((d) => Number.isFinite(d.price));

    const historicalData = alias && Number(options.manualCurrentPrice) > 0
      ? scaleHistoryToManualCurrentPrice(rawHistoricalData, options.manualCurrentPrice)
      : rawHistoricalData;

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

    const payload = normalizeStockInfo({
      ticker: normalizedTicker,
      name: alias?.fullName || alias?.name || meta.shortName || meta.longName || normalizedTicker,
      currency: alias?.currency || meta.currency,
      exchange: alias?.exchange || meta.exchangeName,
      currentPrice: Number.isFinite(Number(options.manualCurrentPrice)) && Number(options.manualCurrentPrice) > 0
        ? Number(options.manualCurrentPrice)
        : Number.isFinite(meta.regularMarketPrice)
          ? meta.regularMarketPrice
          : historicalData[historicalData.length - 1]?.price ?? null,
      previousClose: historicalData[historicalData.length - 2]?.price ?? (
        Number.isFinite(meta.chartPreviousClose)
          ? meta.chartPreviousClose
          : null
      ),
      expectedReturn: Math.round(annualReturn * 10000) / 100, // 백분율
      stdDev: Math.round(annualStdDev * 10000) / 100, // 백분율
      volatilityLevel: getVolatilityLevel(annualStdDev),
      historicalData,
      color: getNextColor(),
      usesManualCurrentPrice: alias && Number(options.manualCurrentPrice) > 0,
    }, normalizedTicker);

    writeCachedEntry(stockInfoCache, cacheVariantKey, payload, MARKET_CACHE_TTLS.stockInfo);
    return payload;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    }
    const staleInfo = getCachedValue(stockInfoCache, cacheVariantKey, { allowStale: true });
    if (staleInfo) {
      const normalizedStaleInfo = normalizeStockInfo(staleInfo, normalizedTicker);
      if (hasUsableStockInfo(normalizedStaleInfo)) {
        return normalizedStaleInfo;
      }
    }

    try {
      const fallbackHistory = await fetchStooqDailyHistory(lookupTicker, '1y', options);
      const history = alias && Number(options.manualCurrentPrice) > 0
        ? scaleHistoryToManualCurrentPrice(fallbackHistory, options.manualCurrentPrice)
        : fallbackHistory;
      const fallbackInfo = buildStockInfoFromHistory(normalizedTicker, history, 'STOOQ');

      if (hasUsableStockInfo(fallbackInfo)) {
        const payload = normalizeStockInfo({
          ...fallbackInfo,
          name: alias?.fullName || alias?.name || fallbackInfo.name,
          currency: alias?.currency || fallbackInfo.currency,
          exchange: alias?.exchange || fallbackInfo.exchange,
          usesFallbackProvider: true,
          usesManualCurrentPrice: alias && Number(options.manualCurrentPrice) > 0,
        }, normalizedTicker);

        if (hasUsableStockInfo(payload)) {
          writeCachedEntry(stockInfoCache, cacheVariantKey, payload, MARKET_CACHE_TTLS.stockInfo);
          return payload;
        }
      }
    } catch (fallbackError) {
      if (fallbackError.code === 'ABORTED') {
        throw fallbackError;
      }
      console.warn('Stooq fallback failed:', fallbackError);
    }

    console.error('Stock info error:', error);
    throw createServiceError('종목 정보를 안정적으로 불러오지 못했습니다. 잠시 후 다시 시도하거나 티커로 직접 불러와 주세요.', 'INFO_FAILED', error);
  }
};

// 과거 가격 데이터만 조회 (차트용)
export const getHistoricalData = async (ticker, range = '1y', options = {}) => {
  const normalizedTicker = String(ticker).trim().toUpperCase();
  const alias = resolveTickerAlias(normalizedTicker);
  const lookupTicker = alias?.sourceTicker || normalizedTicker;
  const cacheKey = options.manualCurrentPrice ? `${normalizedTicker}:${range}:manual:${options.manualCurrentPrice}` : `${normalizedTicker}:${range}`;
  const cachedHistory = getCachedValue(historicalCache, cacheKey);
  if (cachedHistory) {
    return cachedHistory;
  }

  if (alias) {
    const sourceHistory = await getHistoricalData(lookupTicker, range, {});
    if (sourceHistory.length === 0) {
      const staleHistory = getCachedValue(historicalCache, cacheKey, { allowStale: true });
      if (staleHistory) {
        return staleHistory;
      }
      return [];
    }

    const history = Number(options.manualCurrentPrice) > 0
      ? scaleHistoryToManualCurrentPrice(sourceHistory, options.manualCurrentPrice)
      : sourceHistory;

    writeCachedEntry(historicalCache, cacheKey, history, MARKET_CACHE_TTLS.historical);
    return history;
  }

  try {
    const data = await fetchChartPayload(lookupTicker, '1d', range, options);
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data found');
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close || [];

    const rawHistory = timestamps.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: closes[idx],
    })).filter((d) => d.price != null);

    const history = alias && Number(options.manualCurrentPrice) > 0
      ? scaleHistoryToManualCurrentPrice(rawHistory, options.manualCurrentPrice)
      : rawHistory;

    writeCachedEntry(historicalCache, cacheKey, history, MARKET_CACHE_TTLS.historical);
    return history;
  } catch (error) {
    const staleHistory = getCachedValue(historicalCache, cacheKey, { allowStale: true });
    if (staleHistory) {
      return staleHistory;
    }

    try {
      const fallbackHistory = await fetchStooqDailyHistory(lookupTicker, range, options);
      const history = alias && Number(options.manualCurrentPrice) > 0
        ? scaleHistoryToManualCurrentPrice(fallbackHistory, options.manualCurrentPrice)
        : fallbackHistory;

      if (history.length > 0) {
        writeCachedEntry(historicalCache, cacheKey, history, MARKET_CACHE_TTLS.historical);
        return history;
      }
    } catch (fallbackError) {
      if (fallbackError.code === 'ABORTED') {
        throw fallbackError;
      }
      console.warn('Stooq historical fallback failed:', fallbackError);
    }

    console.error('Historical data error:', error);
    return [];
  }
};

export const getMultipleHistoricalData = async (tickers, range = '1y', options = {}) => {
  const normalizedTickers = [...new Set(
    (Array.isArray(tickers) ? tickers : [])
      .map((ticker) => ticker?.trim()?.toUpperCase())
      .filter(Boolean)
  )];

  if (normalizedTickers.length === 0) {
    return {};
  }

  const results = await Promise.all(
    normalizedTickers.map(async (ticker) => {
      const history = await getHistoricalData(
        ticker,
        range,
        typeof options === 'function' ? options(ticker) : options
      );
      return [ticker, history];
    })
  );

  return Object.fromEntries(results);
};

export const getUsdKrwRate = async (options = {}) => {
  const cacheKey = 'usdkrw';
  const cachedRate = getCachedValue(fxCache, cacheKey);
  if (cachedRate) {
    return cachedRate;
  }

  try {
    const data = await fetchFxPayload(options);
    const rate = Number(data?.rates?.KRW);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw createServiceError('USD/KRW 환율 데이터를 찾지 못했습니다.', 'NO_FX_RATE');
    }

    writeCachedEntry(fxCache, cacheKey, rate, MARKET_CACHE_TTLS.fx);
    return rate;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    }

    const staleRate = getCachedValue(fxCache, cacheKey, { allowStale: true });
    if (staleRate) {
      return staleRate;
    }

    console.error('USD/KRW rate error:', error);
    throw createServiceError('USD/KRW 환율을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'FX_RATE_FAILED', error);
  }
};

// 다중 종목 연간 수익률 계산
export const getAnnualReturns = async (ticker, years = 10) => {
  const normalizedTicker = String(ticker).trim().toUpperCase();
  const alias = resolveTickerAlias(normalizedTicker);
  const lookupTicker = alias?.sourceTicker || normalizedTicker;
  const cacheKey = `${normalizedTicker}:${years}`;
  const cachedReturns = getCachedValue(annualReturnsCache, cacheKey);
  if (cachedReturns) {
    return cachedReturns;
  }

  try {
    const data = await fetchChartPayload(lookupTicker, '1mo', `${years}y`);
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

    writeCachedEntry(annualReturnsCache, cacheKey, annualReturns, MARKET_CACHE_TTLS.annualReturns);
    return annualReturns;
  } catch (error) {
    const staleReturns = getCachedValue(annualReturnsCache, cacheKey, { allowStale: true });
    if (staleReturns) {
      return staleReturns;
    }
    console.error('Annual returns error:', error);
    return {};
  }
};

export { MARKET_CACHE_TTLS, MARKET_RETRY_MS, MARKET_REFRESH_MS };
export const getTickerAlias = (ticker) => resolveTickerAlias(ticker);
