import { PRESETS } from '../constants/defaults';

const PresetButtons = ({ onApplyPreset, useCompound, onToggleCompound }) => (
  <div className="bg-white p-4 rounded-lg shadow mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700">📊 비교 대상 프리셋 (통계 기반)</h3>
      <label className="inline-flex items-center gap-2 text-xs">
        <span className="text-gray-600">수익 계산</span>
        <button
          onClick={() => onToggleCompound(!useCompound)}
          className={`px-2 py-1 rounded border text-xs ${
            useCompound
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-amber-100 border-amber-300 text-amber-700'
          }`}
          type="button"
        >
          {useCompound ? '복리' : '단리'}
        </button>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onApplyPreset('average')}
        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
      >
        👥 일반인
        <br />
        <span className="text-xs text-gray-600">월 105만원, 3.4%</span>
      </button>
      <button
        onClick={() => onApplyPreset('corporate')}
        className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors border border-blue-300"
      >
        🏢 대기업
        <br />
        <span className="text-xs text-gray-600">월 100만원, 3.4%</span>
      </button>
      <button
        onClick={() => onApplyPreset('savingsOnly')}
        className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 rounded-lg transition-colors border border-green-300"
      >
        🏦 적금러
        <br />
        <span className="text-xs text-gray-600">월 150만원, 3.5%</span>
      </button>
      <button
        onClick={() => onApplyPreset('indexInvestor')}
        className="px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors border border-purple-300"
      >
        📈 VOO 투자자
        <br />
        <span className="text-xs text-gray-600">월 200만원, 8%</span>
      </button>
    </div>
    <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-gray-600">
      💡 일반인/대기업: 실제 통계 기반 (적금 67% + 주식 단타 29% = 3.4%)
    </div>
  </div>
);

export default PresetButtons;
