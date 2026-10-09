const DEFAULT_TTLS = {
  search: 60,
  chart: 300,
  fx: 3600,
};

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const FX_BASE = 'https://open.er-api.com';
const VALID_INTERVALS = new Set(['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo']);
const VALID_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']);

const jsonResponse = (payload, status = 200, origin = '*', extraHeaders = {}) => {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...extraHeaders,
  });

  return new Response(JSON.stringify(payload), { status, headers });
};

const forwardJson = async (targetUrl, { origin, cacheTtl, headers = {} }) => {
  const response = await fetch(targetUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://finance.yahoo.com/',
      Origin: 'https://finance.yahoo.com',
      ...headers,
    },
    cf: {
      cacheTtl,
      cacheEverything: true,
      cacheTtlByStatus: {
        '200-299': cacheTtl,
        '404': 15,
        '500-599': 0,
      },
    },
  });

  const text = await response.text();
  const outgoingHeaders = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Cache-Control': `public, max-age=${Math.min(cacheTtl, 300)}`,
  });

  return new Response(text, {
    status: response.status,
    headers: outgoingHeaders,
  });
};

const getOrigin = (request) => request.headers.get('Origin') || '*';

const isValidSymbol = (symbol) => /^[A-Z0-9.=\-^]{1,20}$/.test(String(symbol || '').trim().toUpperCase());
const isValidSearchQuery = (query) => {
  const trimmed = String(query || '').trim();
  return trimmed.length >= 1 && trimmed.length <= 100 && !/[<>{};]/.test(trimmed);
};

const handleOptions = (request) => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': getOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  },
});

const handleSearch = async (request) => {
  const origin = getOrigin(request);
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, origin);
  }

  const body = await request.json().catch(() => null);
  const query = body?.q;

  if (!isValidSearchQuery(query)) {
    return jsonResponse({ error: 'Invalid search query' }, 400, origin);
  }

  const yahooUrl = new URL('/v1/finance/search', YAHOO_BASE);
  yahooUrl.searchParams.set('q', String(query).trim());
  yahooUrl.searchParams.set('quotesCount', '10');
  yahooUrl.searchParams.set('newsCount', '0');
  yahooUrl.searchParams.set('enableFuzzyQuery', 'false');
  yahooUrl.searchParams.set('quotesQueryId', 'tss_match_phrase_query');

  return forwardJson(yahooUrl.toString(), { origin, cacheTtl: DEFAULT_TTLS.search });
};

const handleChart = async (request) => {
  const origin = getOrigin(request);
  const url = new URL(request.url);
  const symbol = String(url.searchParams.get('symbol') || '').trim().toUpperCase();
  const interval = String(url.searchParams.get('interval') || '1d').trim();
  const range = String(url.searchParams.get('range') || '1y').trim();

  if (!isValidSymbol(symbol)) {
    return jsonResponse({ error: 'Invalid symbol' }, 400, origin);
  }

  if (!VALID_INTERVALS.has(interval) || !VALID_RANGES.has(range)) {
    return jsonResponse({ error: 'Invalid chart parameters' }, 400, origin);
  }

  const yahooUrl = new URL(`/v8/finance/chart/${encodeURIComponent(symbol)}`, YAHOO_BASE);
  yahooUrl.searchParams.set('interval', interval);
  yahooUrl.searchParams.set('range', range);

  return forwardJson(yahooUrl.toString(), { origin, cacheTtl: DEFAULT_TTLS.chart });
};

const handleUsdKrw = async (request) => {
  const origin = getOrigin(request);
  const fxUrl = new URL('/v6/latest/USD', FX_BASE);
  return forwardJson(fxUrl.toString(), {
    origin,
    cacheTtl: DEFAULT_TTLS.fx,
    headers: {
      Referer: 'https://www.exchangerate-api.com/',
      Origin: 'https://www.exchangerate-api.com',
    },
  });
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    if (url.pathname === '/api/finance/search') {
      return handleSearch(request);
    }

    if (url.pathname === '/api/finance/chart') {
      return handleChart(request);
    }

    if (url.pathname === '/api/fx/usdkrw') {
      return handleUsdKrw(request);
    }

    return jsonResponse({ error: 'Not Found' }, 404, getOrigin(request));
  },
};
