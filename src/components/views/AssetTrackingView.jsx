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
  calculateTrendLine,
  dateToYearFraction,
} from '../../utils/assetTracking';

const AssetTrackingView = () => {
  const {
    assetRecords,
    setAssetRecords,
    theme,
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
  const [useManualReturn, setUseManualReturn] = useState(false);
  const [manualReturnRate, setManualReturnRate] = useState('');

  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';
  const chartColors = {
    grid: theme === 'dark' ? '#334155' : '#e5e7eb',
    axis: theme === 'dark' ? '#475569' : '#e5e7eb',
    tick: theme === 'dark' ? '#cbd5e1' : '#6b7280',
    tooltipBg: theme === 'dark' ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white/95 border-gray-200 text-gray-800',
    tooltipText: theme === 'dark' ? 'text-slate-300' : 'text-gray-800',
    tooltipSubtle: theme === 'dark' ? 'text-slate-300' : 'text-gray-700',
  };
  const tooltipContainerClass = `rounded-lg border p-3 shadow-lg text-sm ${chartColors.tooltipBg}`;
  const tooltipTitleClass = `font-semibold mb-1 ${chartColors.tooltipText}`;
  const tooltipActualClass = isDark ? 'text-blue-300' : 'text-blue-600';
  const tooltipTrendClass = isDark ? 'text-emerald-300' : 'text-emerald-600';
  const tooltipProjectionClass = isDark ? 'text-purple-300' : 'text-purple-600';
  const tooltipExtendedClass = isDark ? 'text-emerald-200' : 'text-emerald-400';

  // 계산된 데이터
  const recordsWithReturns = calculateMonthlyReturns(assetRecords);
  const stats = calculateStats(assetRecords);
  const projections = showProjection
    ? projectFutureWealth(
        assetRecords,
        projectionMonths,
        monthlyContribution,
        useManualReturn && manualReturnRate !== '' ? parseFloat(manualReturnRate) : null
      )
    : [];

  // 회귀 분석 계산
  const { trendLine, regression, baseDate } = calculateTrendLine(assetRecords);

  // 차트 데이터 - yearFraction을 X축으로 사용
  const chartData = [
    ...recordsWithReturns.map(r => {
      const yearFraction = baseDate ? dateToYearFraction(r.date, baseDate) : 0;
      const trend = trendLine.find(t => t.date === r.date);
      return {
        date: r.date,
        yearFraction,
        value: r.assetValue / 10000, // 억 단위
        trendValue: trend ? trend.trendValue / 10000 : null,
        isProjection: false,
      };
    }),
    ...projections.map(p => {
      const yearFraction = baseDate ? dateToYearFraction(p.date, baseDate) : 0;
      // 예측 구간의 추세선 연장
      const extendedTrendValue = regression
        ? (regression.slope * yearFraction + regression.intercept) / 10000
        : null;
      return {
        date: p.date,
        yearFraction,
        projectedValue: p.assetValue / 10000,
        extendedTrendValue,
        isProjection: true,
      };
    }),
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
                <div className="flex flex-wrap items-center gap-4 bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-700">기간:</span>
                    <input
                      type="number"
                      value={projectionMonths}
                      onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
                      className="w-16 px-2 py-1 text-sm border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      min={1}
                      max={120}
                    />
                    <span className="text-sm text-gray-500">개월</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-700">월 투자액:</span>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      min={0}
                    />
                    <span className="text-sm text-gray-500">만원</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useManualReturn}
                        onChange={(e) => setUseManualReturn(e.target.checked)}
                        className="w-3.5 h-3.5 text-purple-600 rounded"
                      />
                      <span className="text-sm font-medium text-purple-700">수익률 설정:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={useManualReturn ? manualReturnRate : stats.averageMonthlyReturn.toFixed(2)}
                        disabled={!useManualReturn}
                        onChange={(e) => setManualReturnRate(e.target.value)}
                        className={`w-20 px-2 py-1 text-sm border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 ${!useManualReturn ? 'bg-gray-100 text-gray-400' : 'bg-white'}`}
                        step="0.01"
                        placeholder={stats.averageMonthlyReturn.toFixed(2)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
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
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="yearFraction"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: chartColors.tick, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.axis }}
                  tickFormatter={(val) => {
                    const years = Math.floor(val);
                    const months = Math.round((val - years) * 12);
                    if (val === 0) return '시작';
                    if (months === 0) return `${years}년`;
                    return `${years}년${months}월`;
                  }}
                />
                <YAxis
                  tickFormatter={(v) => `${v.toFixed(1)}억`}
                  tick={{ fontSize: 11, fill: chartColors.tick }}
                  axisLine={{ stroke: chartColors.axis }}
                  tickLine={{ stroke: chartColors.axis }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className={tooltipContainerClass}>
                        <div className={tooltipTitleClass}>{data.date}</div>
                        {data.value != null && (
                          <div className={tooltipActualClass}>실제: {(data.value * 10000).toLocaleString()}만원</div>
                        )}
                        {data.trendValue != null && (
                          <div className={tooltipTrendClass}>추세: {(data.trendValue * 10000).toLocaleString()}만원</div>
                        )}
                        {data.projectedValue != null && (
                          <div className={tooltipProjectionClass}>예측: {(data.projectedValue * 10000).toLocaleString()}만원</div>
                        )}
                        {data.extendedTrendValue != null && (
                          <div className={tooltipExtendedClass}>추세(연장): {(data.extendedTrendValue * 10000).toLocaleString()}만원</div>
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
                  dot={{ r: 4, fill: '#3b82f6' }}
                  name="실제 자산"
                />
                {/* 추세선 (선형 회귀) */}
                {regression && (
                  <Line
                    type="linear"
                    dataKey="trendValue"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    name="추세선"
                    connectNulls={true}
                  />
                )}
                {/* 예측 구간 연장 추세선 */}
                {showProjection && regression && (
                  <Line
                    type="linear"
                    dataKey="extendedTrendValue"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    opacity={0.5}
                    name="추세선(연장)"
                    connectNulls={true}
                  />
                )}
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
                    x={chartData.find(d => !d.isProjection && d.date === recordsWithReturns[recordsWithReturns.length - 1]?.date)?.yearFraction || 0}
                    stroke={chartColors.tick}
                    strokeDasharray="3 3"
                    label={{ value: '현재', position: 'top', fontSize: 10, fill: chartColors.tick }}
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

        <div className="mb-3 text-xs text-gray-500">
          월 수익률 = (현재 총자산 - 이전 총자산 - 투자금) ÷ 이전 총자산. 투자금은 원금 증가분(없으면 입력값) 기준입니다.
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

    </div>
  );
};

export default AssetTrackingView;
