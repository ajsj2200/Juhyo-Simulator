import { useState, useEffect, useMemo } from 'react';
import InputGroup from './InputGroup';
import StockSearchModal from './StockSearchModal';
import {
  ASSET_INFO,
  PORTFOLIO_PRESETS,
  getExpectedPortfolioReturn,
  getPortfolioStdDev,
} from '../constants/assetData';

const PortfolioSection = ({ portfolio, setPortfolio }) => {
  const { 
    allocations, 
    rebalanceEnabled, 
    rebalanceFrequency, 
    monteCarloEnabled, 
    customStocks = [],
    monthlyAmounts = { voo: 0, schd: 0, bond: 0, cash: 0 },
    useAmountMode = false,
  } = portfolio;
  const [localAllocations, setLocalAllocations] = useState(allocations);
  const [localMonthlyAmounts, setLocalMonthlyAmounts] = useState(monthlyAmounts);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // 커스텀 주식 합계 계산
  const customStocksTotal = customStocks.reduce((sum, s) => sum + s.allocation, 0);
  // 기본 자산들이 차지할 수 있는 최대 비율
  const baseAssetsMax = 100 - customStocksTotal;
  const baseWeight = Math.max(0, baseAssetsMax / 100);

  // 기본 자산 비율을 전체 100% 기준으로 정규화 (기대수익률/표준편차 계산용)
  const normalizedBaseAllocations = useMemo(() => {
    const sum = Object.values(localAllocations).reduce((a, b) => a + b, 0);
    if (sum === 0) return localAllocations;
    const factor = 100 / sum;
    const next = {};
    Object.entries(localAllocations).forEach(([k, v]) => {
      next[k] = Math.max(0, v * factor);
    });
    return next;
  }, [localAllocations]);

  // 외부에서 portfolio가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalAllocations(allocations);
  }, [allocations]);

  // 커스텀 주식 비율이 변경되면 기본 자산 비율을 자동 조정
  useEffect(() => {
    const currentBaseTotal = Object.values(localAllocations).reduce((a, b) => a + b, 0);
    if (currentBaseTotal !== baseAssetsMax && baseAssetsMax >= 0) {
      // 기본 자산들의 비율을 baseAssetsMax에 맞게 스케일 조정
      const scale = currentBaseTotal > 0 ? baseAssetsMax / currentBaseTotal : 0;
      const newAllocations = {};
      let total = 0;
      const keys = Object.keys(localAllocations);
      
      keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
          // 마지막 자산은 반올림 오차 보정
          newAllocations[key] = Math.max(0, baseAssetsMax - total);
        } else {
          newAllocations[key] = Math.max(0, Math.round(localAllocations[key] * scale));
          total += newAllocations[key];
        }
      });
      
      setLocalAllocations(newAllocations);
      setPortfolio({
        ...portfolio,
        allocations: newAllocations,
      });
    }
  }, [customStocksTotal]);

  // 슬라이더 변경 시 다른 자산 비율 자동 조정 (기본 자산 내에서만)
  const handleAllocationChange = (asset, newValue) => {
    // 기본 자산 최대값으로 제한
    newValue = Math.min(newValue, baseAssetsMax);
    
    const oldValue = localAllocations[asset];
    const diff = newValue - oldValue;

    // 다른 자산들의 비율을 비례적으로 조정
    const otherAssets = Object.keys(localAllocations).filter((a) => a !== asset);
    const otherTotal = otherAssets.reduce((sum, a) => sum + localAllocations[a], 0);

    const newAllocations = { ...localAllocations, [asset]: newValue };

    if (otherTotal > 0) {
      // 다른 자산들을 비례적으로 줄이거나 늘림
      otherAssets.forEach((a) => {
        const ratio = localAllocations[a] / otherTotal;
        newAllocations[a] = Math.max(0, Math.round(localAllocations[a] - diff * ratio));
      });
    } else if (diff < 0) {
      // 다른 자산이 모두 0인 경우, 첫 번째 자산에 할당
      newAllocations[otherAssets[0]] = Math.max(0, -diff);
    }

    // 합계가 baseAssetsMax가 되도록 보정
    const total = Object.values(newAllocations).reduce((sum, v) => sum + v, 0);
    if (total !== baseAssetsMax) {
      const correction = baseAssetsMax - total;
      // 가장 큰 비중의 자산에서 조정
      const maxAsset = Object.entries(newAllocations)
        .filter(([a]) => a !== asset)
        .sort((a, b) => b[1] - a[1])[0];
      if (maxAsset) {
        newAllocations[maxAsset[0]] = Math.max(0, maxAsset[1] + correction);
      }
    }

    setLocalAllocations(newAllocations);
    setPortfolio({
      ...portfolio,
      allocations: newAllocations,
    });
  };

  // 커스텀 주식 비율 변경
  const handleCustomStockAllocationChange = (ticker, newAllocation) => {
    const updatedCustomStocks = customStocks.map((s) =>
      s.ticker === ticker ? { ...s, allocation: newAllocation } : s
    );
    setPortfolio({
      ...portfolio,
      customStocks: updatedCustomStocks,
    });
  };

  // 프리셋 적용
  const applyPreset = (presetKey) => {
    const preset = PORTFOLIO_PRESETS[presetKey];
    if (preset) {
      // 프리셋 적용 시 커스텀 주식 비율만큼 스케일 조정
      const scale = baseAssetsMax / 100;
      const scaledAllocations = {};
      let total = 0;
      const keys = Object.keys(preset.allocations);
      
      keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
          scaledAllocations[key] = Math.max(0, baseAssetsMax - total);
        } else {
          scaledAllocations[key] = Math.max(0, Math.round(preset.allocations[key] * scale));
          total += scaledAllocations[key];
        }
      });
      
      setLocalAllocations(scaledAllocations);
      setPortfolio({
        ...portfolio,
        allocations: scaledAllocations,
      });
    }
  };

  // 기본 자산 예상 수익률/표준편차 (정규화된 비율로 계산)
  const baseExpectedReturn = getExpectedPortfolioReturn(normalizedBaseAllocations);
  const baseStdDev = getPortfolioStdDev(normalizedBaseAllocations);

  // 커스텀 주식 포함 전체 예상 수익률 계산
  const totalExpectedReturn = useMemo(() => {
    const baseContribution = baseExpectedReturn * baseWeight;
    const customContribution = customStocks.reduce((sum, stock) => {
      return sum + (stock.expectedReturn || 0) * ((stock.allocation || 0) / 100);
    }, 0);
    return baseContribution + customContribution;
  }, [baseExpectedReturn, baseWeight, customStocks]);

  // 커스텀 주식 포함 전체 표준편차 계산 (단순화: 기본자산 블록 vs 커스텀 주식 상관계수 0.5 가정)
  const totalStdDev = useMemo(() => {
    // 기본 자산 블록을 하나의 자산처럼 취급
    const baseVariance = Math.pow(baseStdDev * baseWeight, 2);

    // 커스텀 주식 분산 기여분
    const customVarianceContribution = customStocks.reduce((sum, stock) => {
      const w = (stock.allocation || 0) / 100;
      const sd = stock.stdDev || 0;
      return sum + Math.pow(w * sd, 2);
    }, 0);

    // 기본 자산 블록과 커스텀 주식 간 상관계수 0.5 가정
    const crossVariance = customStocks.reduce((sum, stock) => {
      const w = (stock.allocation || 0) / 100;
      const sd = stock.stdDev || 0;
      return sum + 2 * baseWeight * w * baseStdDev * sd * 0.5;
    }, 0);

    return Math.sqrt(Math.max(0, baseVariance + customVarianceContribution + crossVariance));
  }, [baseStdDev, baseWeight, customStocks]);

  // 변동성 레벨 (커스텀 주식 포함)
  const totalVolatilityLevel = useMemo(() => {
    const stockRatio = (localAllocations.voo + localAllocations.schd + customStocksTotal) / 100;
    if (stockRatio >= 0.8) return 'high';
    if (stockRatio >= 0.5) return 'medium';
    if (stockRatio >= 0.2) return 'low';
    return 'very-low';
  }, [localAllocations, customStocksTotal]);

  const volatilityLabels = {
    'very-low': {
      text: '매우 낮음',
      color: 'text-green-600 dark:text-green-300',
      bg: 'bg-green-100 dark:bg-green-900/40',
    },
    low: {
      text: '낮음',
      color: 'text-green-500 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    medium: {
      text: '중간',
      color: 'text-yellow-600 dark:text-yellow-300',
      bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    },
    high: {
      text: '높음',
      color: 'text-red-500 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-900/30',
    },
  };

  const volLabel = volatilityLabels[totalVolatilityLevel];

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100 dark:bg-slate-900/80 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="portfolioEnabled"
            checked={portfolio.enabled}
            onChange={(e) => setPortfolio({ ...portfolio, enabled: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded dark:bg-slate-900 dark:border-slate-600"
          />
          <label htmlFor="portfolioEnabled" className="text-lg font-bold text-gray-800 dark:text-slate-100">
            📊 포트폴리오 구성
          </label>
        </div>
        {portfolio.enabled && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${volLabel.bg} ${volLabel.color}`}>
            변동성: {volLabel.text}
          </div>
        )}
      </div>

      {!portfolio.enabled && (
        <p className="text-sm text-gray-500 mb-4 dark:text-slate-400">
          체크하면 VOO 단일 투자 대신 여러 자산을 혼합한 포트폴리오를 구성할 수 있습니다.
        </p>
      )}

      {portfolio.enabled && (
        <>
          {/* 투자 방식 토글 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">투자 방식</div>
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 dark:bg-slate-900/70 dark:border-slate-700">
                <button
                  onClick={() => setPortfolio({ ...portfolio, useAmountMode: false })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    !useAmountMode 
                      ? 'bg-blue-500 text-white dark:bg-blue-600' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  비율 %
                </button>
                <button
                  onClick={() => setPortfolio({ ...portfolio, useAmountMode: true })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    useAmountMode 
                      ? 'bg-blue-500 text-white dark:bg-blue-600' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  금액 만원
                </button>
              </div>
            </div>
            {useAmountMode && (
              <div className="text-xs text-gray-500 mt-2 dark:text-slate-400">
                각 종목에 월별로 투자할 금액을 직접 입력하세요. 비율은 자동 계산됩니다.
              </div>
            )}
          </div>

          {/* 프리셋 버튼 */}
          {!useAmountMode && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200">빠른 설정</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PORTFOLIO_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-800"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 자산 배분 */}
          <div className="space-y-3 mb-4">
            {Object.entries(ASSET_INFO).map(([key, info]) => {
              // 금액 모드에서 비율 계산
              const totalAmount = Object.values(localMonthlyAmounts).reduce((a, b) => a + b, 0) + 
                customStocks.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);
              const calculatedPercent = totalAmount > 0 
                ? Math.round((localMonthlyAmounts[key] / totalAmount) * 100) 
                : 0;

              return (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <div className="w-16 text-sm font-medium text-gray-700 dark:text-slate-200">
                    {info.name}
                  </div>
                  
                  {useAmountMode ? (
                    // 금액 모드
                    <>
                      <input
                        type="number"
                        min={0}
                        value={localMonthlyAmounts[key]}
                        onChange={(e) => {
                          const newAmount = Math.max(0, parseInt(e.target.value) || 0);
                          const newAmounts = { ...localMonthlyAmounts, [key]: newAmount };
                          setLocalMonthlyAmounts(newAmounts);
                          setPortfolio({
                            ...portfolio,
                            monthlyAmounts: newAmounts,
                          });
                        }}
                        className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <span className="text-sm text-gray-500 dark:text-slate-400">만원</span>
                      <div className="w-12 text-right text-xs text-gray-400 dark:text-slate-500">
                        ({calculatedPercent}%)
                      </div>
                    </>
                  ) : (
                    // 비율 모드
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={localAllocations[key]}
                        onChange={(e) => handleAllocationChange(key, parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${info.color} 0%, ${info.color} ${localAllocations[key]}%, #e5e7eb ${localAllocations[key]}%, #e5e7eb 100%)`,
                        }}
                      />
                      <div className="w-12 text-right text-sm font-bold" style={{ color: info.color }}>
                        {localAllocations[key]}%
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* 커스텀 주식 */}
            {customStocks.map((stock) => {
              // 금액 모드에서 비율 계산
              const totalAmount = Object.values(localMonthlyAmounts).reduce((a, b) => a + b, 0) + 
                customStocks.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);
              const calculatedPercent = totalAmount > 0 
                ? Math.round(((stock.monthlyAmount || 0) / totalAmount) * 100) 
                : 0;

              return (
                <div
                  key={stock.ticker}
                  className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-transparent p-2 -mx-2 rounded-lg dark:from-slate-900/60 dark:to-slate-900/20"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stock.color }}
                  />
                  <div
                    className="w-16 text-sm font-medium text-gray-700 truncate dark:text-slate-200"
                    title={stock.name}
                  >
                    {stock.ticker}
                  </div>
                  
                  {useAmountMode ? (
                    // 금액 모드
                    <>
                      <input
                        type="number"
                        min={0}
                        value={stock.monthlyAmount || 0}
                        onChange={(e) => {
                          const newAmount = Math.max(0, parseInt(e.target.value) || 0);
                          setPortfolio({
                            ...portfolio,
                            customStocks: customStocks.map((s) =>
                              s.ticker === stock.ticker ? { ...s, monthlyAmount: newAmount } : s
                            ),
                          });
                        }}
                        className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <span className="text-sm text-gray-500 dark:text-slate-400">만원</span>
                      <div className="w-12 text-right text-xs text-gray-400 dark:text-slate-500">
                        ({calculatedPercent}%)
                      </div>
                    </>
                  ) : (
                    // 비율 모드
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={stock.allocation}
                        onChange={(e) => handleCustomStockAllocationChange(stock.ticker, parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${stock.color} 0%, ${stock.color} ${stock.allocation}%, #e5e7eb ${stock.allocation}%, #e5e7eb 100%)`,
                        }}
                      />
                      <div className="w-12 text-right text-sm font-bold" style={{ color: stock.color }}>
                        {stock.allocation}%
                      </div>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setPortfolio({
                        ...portfolio,
                        customStocks: customStocks.filter((s) => s.ticker !== stock.ticker),
                      });
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-slate-800"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* 종목 추가 버튼 */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-300 dark:hover:bg-slate-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              주식 종목 추가
            </button>
          </div>

          {/* 합계 표시 */}
          {useAmountMode ? (
            // 금액 모드 합계
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-4 dark:from-slate-900/70 dark:to-slate-800/50">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">월 총 투자금액</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
                {Object.values(localMonthlyAmounts).reduce((a, b) => a + b, 0) + 
                  customStocks.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0)}만원
              </span>
            </div>
          ) : (
            // 비율 모드 합계
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-4 dark:bg-slate-800/60">
              <span className="text-sm text-gray-600 dark:text-slate-300">합계</span>
              <span
                className={`text-lg font-bold ${
                  Object.values(localAllocations).reduce((a, b) => a + b, 0) + customStocks.reduce((sum, s) => sum + s.allocation, 0) === 100
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {Object.values(localAllocations).reduce((a, b) => a + b, 0) + customStocks.reduce((sum, s) => sum + s.allocation, 0)}%
              </span>
            </div>
          )}

          {/* 예상 수익률 및 표준편차 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg dark:bg-slate-800/70">
              <div className="text-xs text-gray-600 dark:text-slate-300">예상 수익률</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{totalExpectedReturn.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg dark:bg-slate-800/70">
              <div className="text-xs text-gray-600 dark:text-slate-300">표준편차 (σ)</div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{totalStdDev.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg dark:bg-slate-800/70">
              <div className="text-xs text-gray-600 dark:text-slate-300">주식 비중</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {localAllocations.voo + localAllocations.schd + customStocksTotal}%
              </div>
            </div>
          </div>

          {/* 포트폴리오 파이 시각화 */}
          <div className="flex items-center gap-0.5 mb-4">
            {Object.entries(localAllocations)
              .filter(([, value]) => value > 0)
              .map(([key, value]) => (
                <div
                  key={key}
                  className="h-4 rounded-sm transition-all"
                  style={{
                    width: `${value}%`,
                    backgroundColor: ASSET_INFO[key].color,
                  }}
                  title={`${ASSET_INFO[key].name}: ${value}%`}
                />
              ))}
            {/* 커스텀 주식 시각화 */}
            {customStocks
              .filter((stock) => stock.allocation > 0)
              .map((stock) => (
                <div
                  key={stock.ticker}
                  className="h-4 rounded-sm transition-all"
                  style={{
                    width: `${stock.allocation}%`,
                    backgroundColor: stock.color,
                  }}
                  title={`${stock.ticker}: ${stock.allocation}%`}
                />
              ))}
          </div>

          {/* 자산 설명 */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4 dark:text-slate-300">
            {Object.entries(ASSET_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <span className="font-medium">{info.name}:</span>
                <span>{info.description}</span>
              </div>
            ))}
            {/* 커스텀 주식 설명 */}
            {customStocks.map((stock) => (
              <div key={stock.ticker} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stock.color }}
                />
                <span className="font-medium">{stock.ticker}:</span>
                <span className="truncate">{stock.name}</span>
              </div>
            ))}
          </div>

          {/* 커스텀 주식 상세 설정 */}
          {customStocks.length > 0 && (
            <div className="pt-4 border-t border-gray-100 mb-4 dark:border-slate-700">
              <div className="text-sm font-semibold text-gray-700 mb-3 dark:text-slate-200">
                📊 추가 종목 상세 설정
              </div>
              <div className="text-xs text-gray-500 mb-2 dark:text-slate-400">
                보유 금액, 수익률, 변동성을 설정하세요.
              </div>
              <div className="space-y-3">
                {customStocks.map((stock) => (
                  <div key={stock.ticker} className="p-3 bg-gray-50 rounded-lg dark:bg-slate-800/60">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm dark:text-slate-100">
                          {stock.ticker}
                        </div>
                        <div className="text-xs text-gray-500 truncate dark:text-slate-400">
                          {stock.name}
                        </div>
                      </div>
                    </div>
                    
                    {/* 보유금액 & 월 투자금액 */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16 dark:text-slate-400">현재 보유</div>
                        <input
                          type="number"
                          value={stock.initialAmount ?? 0}
                          onChange={(e) => {
                            const newAmount = Math.max(0, parseInt(e.target.value) || 0);
                            setPortfolio({
                              ...portfolio,
                              customStocks: customStocks.map((s) =>
                                s.ticker === stock.ticker ? { ...s, initialAmount: newAmount } : s
                              ),
                            });
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400">만원</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16 dark:text-slate-400">월 투자</div>
                        <input
                          type="number"
                          value={stock.monthlyAmount ?? 0}
                          onChange={(e) => {
                            const newAmount = Math.max(0, parseInt(e.target.value) || 0);
                            setPortfolio({
                              ...portfolio,
                              customStocks: customStocks.map((s) =>
                                s.ticker === stock.ticker ? { ...s, monthlyAmount: newAmount } : s
                              ),
                            });
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400">만원</span>
                      </div>
                    </div>
                    
                    {/* 수익률 & 변동성 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16 dark:text-slate-400">수익률</div>
                        <input
                          type="number"
                          value={stock.expectedReturn ?? 0}
                          onChange={(e) => {
                            const newReturn = parseFloat(e.target.value) || 0;
                            setPortfolio({
                              ...portfolio,
                              customStocks: customStocks.map((s) =>
                                s.ticker === stock.ticker ? { ...s, expectedReturn: newReturn } : s
                              ),
                            });
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          step="0.1"
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 w-16 dark:text-slate-400">변동성</div>
                        <input
                          type="number"
                          value={stock.stdDev ?? 0}
                          onChange={(e) => {
                            const newStdDev = parseFloat(e.target.value) || 0;
                            setPortfolio({
                              ...portfolio,
                              customStocks: customStocks.map((s) =>
                                s.ticker === stock.ticker ? { ...s, stdDev: newStdDev } : s
                              ),
                            });
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          step="0.1"
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 옵션들 */}
          <div className="pt-4 border-t border-gray-100 space-y-3 dark:border-slate-700">
            {/* 리밸런싱 옵션 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rebalanceEnabled"
                checked={rebalanceEnabled}
                onChange={(e) =>
                  setPortfolio({ ...portfolio, rebalanceEnabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded dark:bg-slate-900 dark:border-slate-600"
              />
              <label htmlFor="rebalanceEnabled" className="text-sm text-gray-700 dark:text-slate-300">
                자동 리밸런싱
              </label>
              {rebalanceEnabled && (
                <select
                  value={rebalanceFrequency}
                  onChange={(e) => setPortfolio({ ...portfolio, rebalanceFrequency: Number(e.target.value) })}
                  className="ml-auto px-2 py-1 text-sm border border-gray-300 rounded dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={1}>매월</option>
                  <option value={3}>분기별</option>
                  <option value={6}>반기별</option>
                  <option value={12}>연 1회</option>
                </select>
              )}
            </div>

            {/* 몬테카를로 시뮬레이션 옵션 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="monteCarloEnabled"
                checked={monteCarloEnabled || false}
                onChange={(e) =>
                  setPortfolio({ ...portfolio, monteCarloEnabled: e.target.checked })
                }
                className="w-4 h-4 text-purple-600 rounded dark:bg-slate-900 dark:border-slate-600"
              />
              <label htmlFor="monteCarloEnabled" className="text-sm text-gray-700 dark:text-slate-300">
                🎲 몬테카를로 시뮬레이션
              </label>
              <span className="text-xs text-gray-500 dark:text-slate-400">(변동성 밴드 표시)</span>
            </div>
            {monteCarloEnabled && (
              <>
                <div className="pl-7 text-xs text-purple-600 bg-purple-50 p-2 rounded mb-3 dark:bg-slate-800/60 dark:text-purple-300">
                  500~20,000회 시뮬레이션으로 10~90% 확률 범위를 표시합니다.
                </div>
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputGroup
                    label="시뮬레이션 횟수"
                    value={portfolio.monteCarloSimulations}
                    onChange={(v) =>
                      setPortfolio({
                        ...portfolio,
                        monteCarloSimulations: Math.max(100, Math.min(v, 20000)),
                      })
                    }
                    min={100}
                    max={20000}
                    step={100}
                    unit="회"
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 주식 검색 모달 */}
      <StockSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddStock={(stock) => {
          // 중복 체크
          if (customStocks.some((s) => s.ticker === stock.ticker)) {
            alert(`${stock.ticker}는 이미 포트폴리오에 있습니다.`);
            return;
          }
          setPortfolio({
            ...portfolio,
            customStocks: [...customStocks, stock],
          });
        }}
      />
    </div>
  );
};

export default PortfolioSection;
