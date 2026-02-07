import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';

const PresetsView = () => {
  const {
    savedPresets,
    presetName,
    setPresetName,
    previewPreset,
    setPreviewPreset,
    handleSavePreset,
    handleDeletePreset,
    handleConfirmLoadPreset,
    handleUpdatePreset,
    activePresetId,
    setActivePresetId,
    presetDiff,
  } = useSimulator();

  const formatSavedAt = (iso) => {
    try {
      return new Date(iso).toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2 dark:text-slate-100">프리셋 관리</h1>
        <p className="text-body dark:text-slate-300">현재 설정을 저장하고 불러올 수 있습니다.</p>
      </div>

      {/* Save or Update Preset */}
      <Card variant={activePresetId ? 'default' : 'blue'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-3">
            {activePresetId ? '현재 프리셋 수정' : '새 프리셋 저장'}
          </h3>
          {activePresetId && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              편집 중
            </span>
          )}
        </div>

        {activePresetId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <div className="font-bold text-gray-800">
                  {savedPresets.find((p) => p.id === activePresetId)?.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  이 프리셋에 현재 변경사항을 덮어씁니다.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdatePreset();
                    // 피드백을 위해 잠시후에 알림을 띄우거나 상태를 업데이트 할 수 있습니다.
                  }}
                  className="btn btn-primary"
                  disabled={presetDiff.length === 0}
                >
                  기존 프리셋 업데이트
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePresetId(null);
                    setPresetName('');
                  }}
                  className="btn btn-secondary"
                >
                  새로 만들기
                </button>
              </div>
            </div>

            {presetDiff.length > 0 ? (
              <div className="overflow-hidden border border-gray-200 rounded-lg dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900/70">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider dark:text-slate-300">항목</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider dark:text-slate-300">기존</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider dark:text-slate-300">변경</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900/50 dark:divide-slate-800">
                    {presetDiff.map((diff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                        <td className="px-3 py-2 font-medium text-gray-700 dark:text-slate-200">{diff.field}</td>
                        <td className="px-3 py-2 text-red-600 bg-red-50/50 dark:text-rose-300 dark:bg-rose-500/10">
                          <span className="line-through">{diff.old}{diff.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-green-700 bg-green-50/50 font-bold dark:text-emerald-300 dark:bg-emerald-500/10">
                          {typeof diff.new === 'number' ? `+${diff.new}` : diff.new}{diff.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-gray-500">
                변경사항이 없습니다.
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="프리셋 이름 (예: 2035 결혼 플랜)"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="btn btn-primary whitespace-nowrap"
            >
              저장
            </button>
          </div>
        )}
      </Card>

      {/* Saved Presets */}
      <Card>
        <h3 className="text-heading-3 mb-4">저장된 프리셋</h3>

        {savedPresets.length === 0 ? (
          <p className="text-gray-500 text-sm">저장된 프리셋이 없습니다. 이름을 입력하고 저장해 보세요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreviewPreset(preset)}
                className={`
                  px-3 py-2 rounded-lg border text-sm transition
                  ${
                    previewPreset?.id === preset.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200'
                  }
                `}
                title={`저장일: ${formatSavedAt(preset.savedAt)}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Preview Selected Preset */}
      {previewPreset && (
        <Card variant="default" className="border-2 border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <div className="font-semibold text-gray-800 text-lg">{previewPreset.name}</div>
              <div className="text-xs text-gray-500">저장: {formatSavedAt(previewPreset.savedAt)}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleConfirmLoadPreset(previewPreset)}
                className="btn btn-primary"
              >
                불러오기
              </button>
              <button type="button" onClick={() => setPreviewPreset(null)} className="btn btn-secondary">
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDeletePreset(previewPreset.id)}
                className="btn btn-danger"
              >
                삭제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">투자 기간</div>
              <div>{previewPreset.data.years}년</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">{previewPreset.data.you.name}</div>
              <div className="text-gray-600 space-y-0.5">
                <div>세후 {previewPreset.data.you.salary.toLocaleString()}만원</div>
                <div>연 {previewPreset.data.you.rate}% · 월 저축 {previewPreset.data.you.monthly}만원</div>
                <div>초기 자산 {previewPreset.data.you.initial.toLocaleString()}만원</div>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">{previewPreset.data.other.name}</div>
              <div className="text-gray-600 space-y-0.5">
                <div>세후 {previewPreset.data.other.salary.toLocaleString()}만원</div>
                <div>연 {previewPreset.data.other.rate}% · 월 저축 {previewPreset.data.other.monthly}만원</div>
                <div>초기 자산 {previewPreset.data.other.initial.toLocaleString()}만원</div>
              </div>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">결혼/주택</div>
              <div className="text-gray-600">
                {previewPreset.data.marriagePlan.enabled ? '결혼 O' : '결혼 X'} /{' '}
                {previewPreset.data.marriagePlan.buyHouse ? '집 구매 O' : '집 구매 X'}
              </div>
              {previewPreset.data.marriagePlan.buyHouse && (
                <div className="text-gray-500 text-xs mt-1">
                  집 {previewPreset.data.marriagePlan.housePrice.toLocaleString()}만원 · 대출{' '}
                  {previewPreset.data.marriagePlan.loanAmount.toLocaleString()}만원
                </div>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">은퇴</div>
              <div className="text-gray-600">
                {previewPreset.data.retirementPlan.enabled ? '은퇴 계산 O' : '은퇴 계산 X'}
              </div>
              <div className="text-gray-500 text-xs">
                생활비 {previewPreset.data.retirementPlan.monthlyExpense}만원
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">위기 시나리오</div>
              <div className="text-gray-600">
                {previewPreset.data.crisis.enabled
                  ? `${previewPreset.data.crisis.startYear}년차 ~ ${previewPreset.data.crisis.duration}년`
                  : '적용 안 함'}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PresetsView;
