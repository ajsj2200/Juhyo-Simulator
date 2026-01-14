import { useState, useRef } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import SnowballAnimation from '../SnowballAnimation';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  calculateMonthlyReturns,
  calculateStats,
  projectFutureWealth,
  downloadCSV,
  readCSVFile,
  createRecord,
  getCurrentDate,
} from '../../utils/assetTracking';

const AssetTrackingView = () => {
  const {
    assetRecords,
    setAssetRecords,
  } = useSimulator();

  // 입력 폼 상태
  const [newDate, setNewDate] = useState(getCurrentDate());
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showProjection, setShowProjection] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [monthlyContribution, setMonthlyContribution] = useState(100);

  const fileInputRef = useRef(null);

  // 계산된 데이터
  const recordsWithReturns = calculateMonthlyReturns(assetRecords);
  const stats = calculateStats(assetRecords);
  const projections = showProjection 
    ? projectFutureWealth(assetRecords, projectionMonths, monthlyContribution)
    : [];

  // 차트 데이터
  const chartData = [
    ...recordsWithReturns.map(r => ({
      date: r.date,
      value: r.assetValue / 10000, // 억 단위
      isProjection: false,
    })),
    ...projections.map(p => ({
      date: p.date,
      projectedValue: p.assetValue / 10000,
      isProjection: true,
    })),
  ];

  // 기록 추가/수정
  const handleSaveRecord = () => {
    if (!newDate || !newAssetValue) return;

    const record = createRecord(
      newDate,
      parseFloat(newAssetValue),
      parseFloat(newPrincipal) || 0,
      0, // contribution은 자동 계산
      newMemo
    );

    if (editingId) {
      // 수정
      setAssetRecords(prev => 
        prev.map(r => r.id === editingId ? { ...record, id: editingId } : r)
      );
      setEditingId(null);
    } else {
      // 추가
      setAssetRecords(prev => [...prev, record]);
    }

    // 폼 초기화
    setNewDate(getCurrentDate());
    setNewAssetValue('');
    setNewPrincipal('');
    setNewMemo('');
  };

  // 기록 삭제
  const handleDeleteRecord = (id) => {
    if (window.confirm('이 기록을 삭제하시겠습니까?')) {
      setAssetRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  // 기록 수정 시작
  const handleEditRecord = (record) => {
    setEditingId(record.id);
    setNewDate(record.date);
    setNewAssetValue(String(record.assetValue));
    setNewPrincipal(String(record.principal || ''));
    setNewMemo(record.memo || '');
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const filename = `asset_records_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(assetRecords, filename);
  };

  // CSV 불러오기
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readCSVFile(file);
      if (imported.length === 0) {
        alert('불러올 데이터가 없습니다.');
        return;
      }
      
      const confirm = window.confirm(
        `${imported.length}개의 기록을 불러옵니다. 기존 데이터에 추가하시겠습니까?\n(취소하면 대체합니다)`
      );
      
      if (confirm) {
        setAssetRecords(prev => [...prev, ...imported]);
      } else {
        setAssetRecords(imported);
      }
    } catch (error) {
      alert(`CSV 불러오기 실패: ${error.message}`);
    }
    
    e.target.value = '';
  };

  // 전체 삭제
  const handleClearAll = () => {
    if (window.confirm('모든 기록을 삭제하시겠습니까?')) {
      setAssetRecords([]);
    }
  };

  const formatMoney = (value) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}억`;
    }
    return `${value.toLocaleString()}만`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">📈 자산 추적</h1>
        <p className="text-body">실제 자산 기록을 입력하여 수익률을 확인하세요.</p>
      </div>

      {/* 통계 요약 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="text-xs text-gray-600 mb-1">현재 자산</div>
          <div className="text-xl font-bold text-blue-700">
            {formatMoney(stats.currentValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.recordCount}개 기록 · {stats.periodMonths}개월
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
          <div className="text-xs text-gray-600 mb-1">총 수익률</div>
          <div className={`text-xl font-bold ${stats.totalReturnPercent >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatPercent(stats.totalReturnPercent)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalReturn >= 0 ? '+' : ''}{formatMoney(stats.totalReturn)} 수익
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200">
          <div className="text-xs text-gray-600 mb-1">연환산 수익률</div>
          <div className={`text-xl font-bold ${stats.cagr >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
            {formatPercent(stats.cagr)}
          </div>
          <div className="text-xs text-gray-500 mt-1">CAGR</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="text-xs text-gray-600 mb-1">월평균 수익률</div>
          <div className={`text-xl font-bold ${stats.averageMonthlyReturn >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
            {formatPercent(stats.averageMonthlyReturn)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            변동성 σ {stats.volatility.toFixed(2)}%
          </div>
        </div>
      </section>

      {/* 스노우볼 애니메이션 */}
      {recordsWithReturns.length > 0 && (
        <section>
          <h2 className="text-heading-2 mb-3">❄️ 자산 성장 스노우볼</h2>
          <SnowballAnimation 
            records={recordsWithReturns} 
            stats={stats}
          />
        </section>
      )}

      {/* 차트 */}
      {chartData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-3">자산 추이</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProjection}
                  onChange={(e) => setShowProjection(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600"
                />
                미래 예측
              </label>
              {showProjection && (
                <>
                  <input
                    type="number"
                    value={projectionMonths}
                    onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    min={1}
                    max={120}
                  />
                  <span className="text-sm text-gray-500">개월</span>
                </>
              )}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(1)}억`} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white/95 p-3 shadow-lg text-sm">
                        <div className="font-semibold text-gray-800 mb-1">{label}</div>
                        {data.value && (
                          <div className="text-blue-600">실제: {(data.value * 10000).toLocaleString()}만원</div>
                        )}
                        {data.projectedValue && (
                          <div className="text-purple-600">예측: {(data.projectedValue * 10000).toLocaleString()}만원</div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="url(#assetGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  name="실제 자산"
                />
                {showProjection && (
                  <Line
                    type="monotone"
                    dataKey="projectedValue"
                    stroke="#a855f7"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#a855f7' }}
                    name="예측"
                  />
                )}
                {recordsWithReturns.length > 0 && (
                  <ReferenceLine
                    x={recordsWithReturns[recordsWithReturns.length - 1]?.date}
                    stroke="#6b7280"
                    strokeDasharray="3 3"
                    label={{ value: '현재', position: 'top', fontSize: 10 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 기록 입력/관리 */}
      <Card variant="blue">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-3">📝 기록 관리</h3>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition"
            >
              📂 CSV 불러오기
            </button>
            <button
              onClick={handleExportCSV}
              disabled={assetRecords.length === 0}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-50"
            >
              💾 CSV 저장
            </button>
            {assetRecords.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 transition"
              >
                🗑️ 전체 삭제
              </button>
            )}
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-4 bg-white/50 rounded-lg">
          <div>
            <label className="block text-xs text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">총 자산 (만원)</label>
            <input
              type="number"
              value={newAssetValue}
              onChange={(e) => setNewAssetValue(e.target.value)}
              placeholder="15000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">원금 (만원)</label>
            <input
              type="number"
              value={newPrincipal}
              onChange={(e) => setNewPrincipal(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">메모</label>
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="메모 (선택)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSaveRecord}
              disabled={!newDate || !newAssetValue}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {editingId ? '수정' : '추가'}
            </button>
          </div>
        </div>

        {/* 기록 테이블 */}
        {recordsWithReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">날짜</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">총 자산</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">원금</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">투자금</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">월 수익률</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">누적 수익률</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">메모</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...recordsWithReturns].reverse().map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{record.date}</td>
                    <td className="py-2 px-3 text-right">{record.assetValue.toLocaleString()}만</td>
                    <td className="py-2 px-3 text-right text-blue-600">
                      {record.principal ? `${record.principal.toLocaleString()}만` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500">
                      {record.contribution ? `${record.contribution.toLocaleString()}만` : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${
                      record.monthlyReturn === null ? 'text-gray-400' :
                      record.monthlyReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatPercent(record.monthlyReturn)}
                    </td>
                    <td className={`py-2 px-3 text-right ${
                      record.cumulativeReturn >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatPercent(record.cumulativeReturn)}
                    </td>
                    <td className="py-2 px-3 text-gray-500 max-w-[120px] truncate">
                      {record.memo || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition"
                          title="수정"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>아직 기록이 없습니다.</p>
            <p className="text-sm">위 폼에서 자산 기록을 추가하거나 CSV 파일을 불러오세요.</p>
          </div>
        )}
      </Card>

      {/* 예측 설정 */}
      {showProjection && assetRecords.length >= 2 && (
        <Card>
          <h3 className="text-heading-3 mb-4">🔮 미래 예측 설정</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">예측 기간</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={projectionMonths}
                  onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={1}
                  max={120}
                />
                <span className="text-sm text-gray-600">개월</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">월 투자금 (예측용)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={0}
                />
                <span className="text-sm text-gray-600">만원</span>
              </div>
            </div>
            <div className="col-span-2 bg-purple-50 p-3 rounded-lg">
              <div className="text-xs text-purple-600 mb-1">예측 기준</div>
              <div className="text-sm text-gray-700">
                월평균 수익률 <strong>{formatPercent(stats.averageMonthlyReturn)}</strong>을 기준으로 
                {projectionMonths}개월 후 예상 자산: <strong className="text-purple-700">
                  {projections.length > 0 ? formatMoney(projections[projections.length - 1].assetValue) : '-'}
                </strong>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssetTrackingView;
