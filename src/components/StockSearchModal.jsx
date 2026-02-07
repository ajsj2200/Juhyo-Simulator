import { useState, useCallback } from 'react';
import { searchStocks, getStockInfo } from '../services/stockApiService';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSimulator } from '../contexts/SimulatorContext';

const StockSearchModal = ({ isOpen, onClose, onAddStock }) => {
  const { theme } = useSimulator();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [allocation, setAllocation] = useState(10);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const chartColors = {
    axis: theme === 'dark' ? '#475569' : '#e5e7eb',
    tick: theme === 'dark' ? '#cbd5e1' : '#6b7280',
    tooltipBg: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: theme === 'dark' ? '#334155' : '#e5e7eb',
    tooltipText: theme === 'dark' ? '#e2e8f0' : '#374151',
  };

  // 검색 실행 함수
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const results = await searchStocks(searchQuery);
      setSearchResults(results);
    } catch {
      setError('검색 중 오류가 발생했습니다');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Enter 키로 검색
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // 종목 선택 시 상세 정보 로드
  const handleSelectStock = useCallback(async (stock) => {
    setSelectedStock(stock);
    setIsLoadingInfo(true);
    setError(null);
    setStockInfo(null);

    try {
      const info = await getStockInfo(stock.ticker);
      setStockInfo(info);
    } catch {
      setError('종목 정보를 불러오는 중 오류가 발생했습니다');
    } finally {
      setIsLoadingInfo(false);
    }
  }, []);

  // 포트폴리오에 추가
  const handleAddToPortfolio = useCallback(() => {
    if (!stockInfo) return;

    const stockToAdd = {
      ticker: stockInfo.ticker,
      name: stockInfo.name,
      allocation: allocation,
      expectedReturn: stockInfo.expectedReturn,
      stdDev: stockInfo.stdDev,
      volatilityLevel: stockInfo.volatilityLevel,
      color: stockInfo.color,
    };

    onAddStock(stockToAdd);
    handleClose();
  }, [stockInfo, allocation, onAddStock]);

  // 모달 닫기
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStock(null);
    setStockInfo(null);
    setAllocation(10);
    setError(null);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  // 변동성 레벨 표시
  const volatilityLabels = {
    'very-low': { text: '매우 낮음', color: 'text-green-600', bg: 'bg-green-100' },
    'low': { text: '낮음', color: 'text-green-500', bg: 'bg-green-50' },
    'medium': { text: '중간', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'high': { text: '높음', color: 'text-red-500', bg: 'bg-red-50' },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">📈 주식 종목 추가</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 검색 입력 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="티커 또는 종목명 검색 (예: AAPL, Apple)"
                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              검색
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 검색 결과 */}
          {!selectedStock && searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-500 mb-2">검색 결과</div>
              {searchResults.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectStock(stock)}
                  className="w-full p-3 flex items-center gap-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition text-left"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {stock.ticker.slice(0, 3)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{stock.ticker}</div>
                    <div className="text-sm text-gray-500">{stock.name}</div>
                  </div>
                  <div className="text-xs text-gray-400 px-2 py-1 bg-gray-200 rounded">
                    {stock.type}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 선택된 종목 상세 정보 */}
          {selectedStock && (
            <div className="space-y-4">
              {/* 뒤로가기 */}
              <button
                onClick={() => {
                  setSelectedStock(null);
                  setStockInfo(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                검색 결과로 돌아가기
              </button>

              {isLoadingInfo ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-500">종목 정보 로딩 중...</span>
                </div>
              ) : stockInfo ? (
                <>
                  {/* 종목 기본 정보 */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: stockInfo.color }}
                      >
                        {stockInfo.ticker.slice(0, 3)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900">{stockInfo.ticker}</div>
                        <div className="text-sm text-gray-600">{stockInfo.name}</div>
                        <div className="text-xs text-gray-400">{stockInfo.exchange}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          ${stockInfo.currentPrice?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">{stockInfo.currency}</div>
                      </div>
                    </div>
                  </div>

                  {/* 변동성 및 수익률 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">예상 연간 수익률</div>
                      <div className={`text-2xl font-bold ${stockInfo.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stockInfo.expectedReturn >= 0 ? '+' : ''}{stockInfo.expectedReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400 mt-1">최근 1년 기준</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">변동성 (표준편차)</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {stockInfo.stdDev.toFixed(1)}%
                      </div>
                      {stockInfo.volatilityLevel && (
                        <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${volatilityLabels[stockInfo.volatilityLevel].bg} ${volatilityLabels[stockInfo.volatilityLevel].color}`}>
                          {volatilityLabels[stockInfo.volatilityLevel].text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 과거 차트 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">📊 최근 1년 가격 추이</div>
                    {stockInfo.historicalData && stockInfo.historicalData.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stockInfo.historicalData}>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: chartColors.tick }}
                              axisLine={{ stroke: chartColors.axis }}
                              tickLine={{ stroke: chartColors.axis }}
                              tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getMonth() + 1}월`;
                              }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              domain={['auto', 'auto']}
                              tick={{ fontSize: 10, fill: chartColors.tick }}
                              axisLine={{ stroke: chartColors.axis }}
                              tickLine={{ stroke: chartColors.axis }}
                              tickFormatter={(val) => `$${val.toFixed(0)}`}
                              width={50}
                            />
                            <Tooltip
                              formatter={(value) => [`$${value.toFixed(2)}`, '가격']}
                              labelFormatter={(label) => new Date(label).toLocaleDateString('ko-KR')}
                              contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                              labelStyle={{ color: chartColors.tooltipText }}
                              itemStyle={{ color: chartColors.tooltipText }}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={stockInfo.color}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">차트 데이터 없음</div>
                    )}
                  </div>

                  {/* 비율 설정 */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">포트폴리오 비율 설정</div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={allocation}
                        onChange={(e) => setAllocation(parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${stockInfo.color} 0%, ${stockInfo.color} ${allocation}%, #e5e7eb ${allocation}%, #e5e7eb 100%)`,
                        }}
                      />
                      <div className="w-20 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={allocation}
                          onChange={(e) => setAllocation(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* 빈 상태 */}
          {!selectedStock && searchResults.length === 0 && hasSearched && !isSearching && (
            <div className="text-center py-12 text-gray-500">
              검색 결과가 없습니다
            </div>
          )}

          {!selectedStock && !hasSearched && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-gray-500">티커나 종목명을 입력하고 검색 버튼을 눌러주세요</div>
              <div className="text-sm text-gray-400 mt-2">예: AAPL, GOOGL, TSLA, MSFT</div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        {stockInfo && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleAddToPortfolio}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
            >
              포트폴리오에 추가 ({stockInfo.ticker} {allocation}%)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockSearchModal;
