import { useRef, useState } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

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
    handleExportPresets,
    handleImportPresets,
    activePresetId,
    setActivePresetId,
    presetDiff,
  } = useSimulator();
  const importFileInputRef = useRef(null);
  const [pendingImportText, setPendingImportText] = useState(null);

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

  const importPresetText = (text) => {
    if (!text?.trim()) {
      alert('가져올 JSON 내용이 없습니다.');
      return;
    }
    // 병합/교체/취소는 모달에서 명시적으로 선택 (confirm 취소가 데이터 삭제로 이어지지 않도록)
    setPendingImportText(text);
  };

  const runImport = (mode) => {
    const text = pendingImportText;
    setPendingImportText(null);
    if (!text) return;

    try {
      const result = handleImportPresets(text, mode);
      alert(`${result.importedCount}개의 프리셋을 가져왔습니다. 총 ${result.totalCount}개입니다.`);
    } catch (error) {
      alert(`프리셋 가져오기 실패: ${error.message}`);
    }
  };

  const handleImportFromFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      importPresetText(text);
    } catch (error) {
      alert(`파일 읽기 실패: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      importPresetText(text);
    } catch (error) {
      alert(`클립보드 읽기 실패: ${error.message}`);
    }
  };

  // 외부에서 가져온 프리셋은 필드가 비어 있을 수 있어 안전한 기본값으로 미리보기
  const previewData = previewPreset?.data || {};
  const previewYou = previewData.you || {};
  const previewOther = previewData.other || {};
  const previewMarriage = previewData.marriagePlan || {};
  const previewRetirement = previewData.retirementPlan || {};
  const previewCrisis = previewData.crisis || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">프리셋 관리</h1>
        <p className="text-body">현재 설정을 저장하고 불러오거나 JSON으로 백업할 수 있습니다.</p>
      </div>

      <Modal
        open={pendingImportText !== null}
        title="프리셋 가져오기"
        description="가져온 프리셋을 기존 목록에 추가할까요, 아니면 기존 목록을 지우고 교체할까요?"
        onClose={() => setPendingImportText(null)}
      >
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => runImport('merge')} className="btn btn-primary w-full">
            기존 프리셋에 추가
          </button>
          <button type="button" onClick={() => runImport('replace')} className="btn btn-danger w-full">
            기존 프리셋을 지우고 교체
          </button>
          <button type="button" onClick={() => setPendingImportText(null)} className="btn btn-secondary w-full">
            취소
          </button>
        </div>
      </Modal>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-heading-3 mb-1">백업 및 복원</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              프리셋은 브라우저 주소별로 따로 저장됩니다. Docker 주소에서는 기존 프리셋이 자동으로 보이지 않을 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFromFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleImportFromClipboard}
              className="btn btn-secondary"
            >
              클립보드 가져오기
            </button>
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className="btn btn-secondary"
            >
              JSON 파일 가져오기
            </button>
            <button
              type="button"
              onClick={handleExportPresets}
              className="btn btn-primary"
              disabled={savedPresets.length === 0}
            >
              JSON 내보내기
            </button>
          </div>
        </div>
      </Card>

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
            <div className="flex items-center justify-between p-4 bg-surface-soft rounded-xl border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div>
                <div className="font-bold text-gray-800 dark:text-slate-100">
                  {savedPresets.find((p) => p.id === activePresetId)?.name}
                </div>
                <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">
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
                      ? 'border-coral bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-hairline bg-surface-soft text-gray-700 hover:border-coral/40 dark:bg-surface-dark-soft dark:text-slate-300 dark:border-slate-700'
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
        <Card variant="default" className="border-2 border-coral/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <div className="font-semibold text-gray-800 text-lg dark:text-slate-100">{previewPreset.name}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">저장: {formatSavedAt(previewPreset.savedAt)}</div>
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
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">투자 기간</div>
              <div className="dark:text-slate-300">{previewData.years ?? '-'}년</div>
            </div>
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">{previewYou.name || '본인'}</div>
              <div className="text-gray-600 space-y-0.5 dark:text-slate-300">
                <div>세후 {(previewYou.salary ?? 0).toLocaleString()}만원</div>
                <div>연 {previewYou.rate ?? 0}% · 월 저축 {previewYou.monthly ?? 0}만원</div>
                <div>초기 자산 {(previewYou.initial ?? 0).toLocaleString()}만원</div>
              </div>
            </div>
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">{previewOther.name || '비교 대상'}</div>
              <div className="text-gray-600 space-y-0.5 dark:text-slate-300">
                <div>세후 {(previewOther.salary ?? 0).toLocaleString()}만원</div>
                <div>연 {previewOther.rate ?? 0}% · 월 저축 {previewOther.monthly ?? 0}만원</div>
                <div>초기 자산 {(previewOther.initial ?? 0).toLocaleString()}만원</div>
              </div>
            </div>
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">결혼/주택</div>
              <div className="text-gray-600 dark:text-slate-300">
                {previewMarriage.enabled ? '결혼 O' : '결혼 X'} /{' '}
                {previewMarriage.buyHouse ? '집 구매 O' : '집 구매 X'}
              </div>
              {previewMarriage.buyHouse && (
                <div className="text-gray-500 text-xs mt-1 dark:text-slate-400">
                  집 {(previewMarriage.housePrice ?? 0).toLocaleString()}만원 · 대출{' '}
                  {(previewMarriage.loanAmount ?? 0).toLocaleString()}만원
                </div>
              )}
            </div>
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">은퇴</div>
              <div className="text-gray-600 dark:text-slate-300">
                {previewRetirement.enabled ? '은퇴 계산 O' : '은퇴 계산 X'}
              </div>
              <div className="text-gray-500 text-xs dark:text-slate-400">
                생활비 {previewRetirement.monthlyExpense ?? 0}만원
              </div>
            </div>
            <div className="p-3 bg-surface-soft rounded-lg border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="font-semibold text-gray-900 mb-1 dark:text-slate-100">위기 시나리오</div>
              <div className="text-gray-600 dark:text-slate-300">
                {previewCrisis.enabled
                  ? `${previewCrisis.startYear}년차 ~ ${previewCrisis.duration}년`
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
