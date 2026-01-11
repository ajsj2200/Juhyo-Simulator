// Stock API Service - Yahoo Finance API를 통한 주식 데이터 조회

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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

const getNextColor = () => {
  const color = STOCK_COLORS[colorIndex % STOCK_COLORS.length];
  colorIndex++;
  return color;
};

// 주식 검색 (티커 또는 이름으로)
export const searchStocks = async (query) => {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    
    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    
    if (!data.quotes) {
      return [];
    }

    // 주식과 ETF만 필터링
    return data.quotes
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchange,
      }));
  } catch (error) {
    console.error('Stock search error:', error);
    return [];
  }
};

// 주식 상세 정보 조회
export const getStockInfo = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    
    if (!response.ok) {
      throw new Error('Failed to fetch stock info');
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data found');
    }

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const closes = quotes?.close || [];

    // 변동성 계산 (연간 표준편차)
    const dailyReturns = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] && closes[i - 1]) {
        dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
      }
    }

    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const dailyStdDev = Math.sqrt(variance);
    const annualStdDev = dailyStdDev * Math.sqrt(252); // 연간화 (252 거래일)
    const annualReturn = avgReturn * 252;

    // 변동성 레벨 결정
    let volatilityLevel;
    if (annualStdDev * 100 < 10) volatilityLevel = 'very-low';
    else if (annualStdDev * 100 < 20) volatilityLevel = 'low';
    else if (annualStdDev * 100 < 30) volatilityLevel = 'medium';
    else volatilityLevel = 'high';

    // 과거 가격 데이터
    const historicalData = timestamps.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: closes[idx],
    })).filter((d) => d.price != null);

    return {
      ticker: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      currency: meta.currency,
      exchange: meta.exchangeName,
      currentPrice: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      expectedReturn: Math.round(annualReturn * 10000) / 100, // 백분율
      stdDev: Math.round(annualStdDev * 10000) / 100, // 백분율
      volatilityLevel,
      historicalData,
      color: getNextColor(),
    };
  } catch (error) {
    console.error('Stock info error:', error);
    throw error;
  }
};

// 과거 가격 데이터만 조회 (차트용)
export const getHistoricalData = async (ticker, range = '1y') => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    
    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }

    const data = await response.json();
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
    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    
    if (!response.ok) {
      throw new Error('Failed to fetch annual returns');
    }

    const data = await response.json();
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
