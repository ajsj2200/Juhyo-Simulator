import { useState, useEffect } from 'react';
import InputGroup from './InputGroup';
import {
  ASSET_INFO,
  PORTFOLIO_PRESETS,
  getExpectedPortfolioReturn,
  getPortfolioVolatilityLevel,
  getPortfolioStdDev,
} from '../constants/assetData';

const PortfolioSection = ({ portfolio, setPortfolio }) => {
  const { allocations, rebalanceEnabled, rebalanceFrequency, monteCarloEnabled } = portfolio;
  const [localAllocations, setLocalAllocations] = useState(allocations);

  // 외부에서 portfolio가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalAllocations(allocations);
  }, [allocations]);

  // 슬라이더 변경 시 다른 자산 비율 자동 조정
  const handleAllocationChange = (asset, newValue) => {
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

    // 합계가 100이 되도록 보정
    const total = Object.values(newAllocations).reduce((sum, v) => sum + v, 0);
    if (total !== 100) {
      const diff = 100 - total;
      // 가장 큰 비중의 자산에서 조정
      const maxAsset = Object.entries(newAllocations)
        .filter(([a]) => a !== asset)
        .sort((a, b) => b[1] - a[1])[0];
      if (maxAsset) {
        newAllocations[maxAsset[0]] = Math.max(0, maxAsset[1] + diff);
      }
    }

    setLocalAllocations(newAllocations);
    setPortfolio({
      ...portfolio,
      allocations: newAllocations,
    });
  };

  // 프리셋 적용
  const applyPreset = (presetKey) => {
    const preset = PORTFOLIO_PRESETS[presetKey];
    if (preset) {
      setLocalAllocations(preset.allocations);
      setPortfolio({
        ...portfolio,
        allocations: preset.allocations,
      });
    }
  };

  const expectedReturn = getExpectedPortfolioReturn(localAllocations);
  const stdDev = getPortfolioStdDev(localAllocations);
  const volatilityLevel = getPortfolioVolatilityLevel(localAllocations);

  const volatilityLabels = {
    'very-low': { text: '매우 낮음', color: 'text-green-600', bg: 'bg-green-100' },
    low: { text: '낮음', color: 'text-green-500', bg: 'bg-green-50' },
    medium: { text: '중간', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    high: { text: '높음', color: 'text-red-500', bg: 'bg-red-50' },
  };

  const volLabel = volatilityLabels[volatilityLevel];

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="portfolioEnabled"
            checked={portfolio.enabled}
            onChange={(e) => setPortfolio({ ...portfolio, enabled: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <label htmlFor="portfolioEnabled" className="text-lg font-bold text-gray-800">
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
        <p className="text-sm text-gray-500 mb-4">
          체크하면 VOO 단일 투자 대신 여러 자산을 혼합한 포트폴리오를 구성할 수 있습니다.
        </p>
      )}

      {portfolio.enabled && (
        <>
          {/* 프리셋 버튼 */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">빠른 설정</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PORTFOLIO_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 자산 배분 슬라이더 */}
          <div className="space-y-3 mb-4">
            {Object.entries(ASSET_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <div className="w-16 text-sm font-medium text-gray-700">{info.name}</div>
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
              </div>
            ))}
          </div>

          {/* 합계 표시 */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-4">
            <span className="text-sm text-gray-600">합계</span>
            <span
              className={`text-lg font-bold ${
                Object.values(localAllocations).reduce((a, b) => a + b, 0) === 100
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {Object.values(localAllocations).reduce((a, b) => a + b, 0)}%
            </span>
          </div>

          {/* 예상 수익률 및 표준편차 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-gray-600">예상 수익률</div>
              <div className="text-lg font-bold text-blue-700">{expectedReturn.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-xs text-gray-600">표준편차 (σ)</div>
              <div className="text-lg font-bold text-orange-700">{stdDev.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-gray-600">주식 비중</div>
              <div className="text-lg font-bold text-green-700">
                {localAllocations.voo + localAllocations.schd}%
              </div>
            </div>
          </div>

          {/* 포트폴리오 파이 시각화 */}
          <div className="flex items-center gap-2 mb-4">
            {Object.entries(localAllocations)
              .filter(([, value]) => value > 0)
              .map(([key, value]) => (
                <div
                  key={key}
                  className="h-4 rounded transition-all"
                  style={{
                    width: `${value}%`,
                    backgroundColor: ASSET_INFO[key].color,
                  }}
                  title={`${ASSET_INFO[key].name}: ${value}%`}
                />
              ))}
          </div>

          {/* 자산 설명 */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
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
          </div>

          {/* 옵션들 */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            {/* 리밸런싱 옵션 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rebalanceEnabled"
                checked={rebalanceEnabled}
                onChange={(e) =>
                  setPortfolio({ ...portfolio, rebalanceEnabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="rebalanceEnabled" className="text-sm text-gray-700">
                자동 리밸런싱
              </label>
              {rebalanceEnabled && (
                <select
                  value={rebalanceFrequency}
                  onChange={(e) => setPortfolio({ ...portfolio, rebalanceFrequency: Number(e.target.value) })}
                  className="ml-auto px-2 py-1 text-sm border border-gray-300 rounded"
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
                className="w-4 h-4 text-purple-600 rounded"
              />
              <label htmlFor="monteCarloEnabled" className="text-sm text-gray-700">
                🎲 몬테카를로 시뮬레이션
              </label>
              <span className="text-xs text-gray-500">(변동성 밴드 표시)</span>
            </div>
            {monteCarloEnabled && (
              <div className="pl-7 text-xs text-purple-600 bg-purple-50 p-2 rounded">
                500회 시뮬레이션으로 10%~90% 확률 범위를 표시합니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioSection;

