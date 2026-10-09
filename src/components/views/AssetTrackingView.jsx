import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSimulator } from '../../contexts/SimulatorContext';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import SnowballAnimation from '../SnowballAnimation';
import { getStockInfo, getMultipleHistoricalData, getUsdKrwRate, getTickerAlias, MARKET_RETRY_MS, MARKET_REFRESH_MS } from '../../services/stockApiService';
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
  calculateMonthlyAverageReturnsByMonth,
  calculateStats,
  projectFutureWealth,
  downloadCSV,
  readCSVFile,
  createRecord,
  getCurrentDate,
  calculateTrendLine,
  dateToYearFraction,
} from '../../utils/assetTracking';

const parseAssetDate = (dateString) => (dateString?.length === 7 ? new Date(`${dateString}-01`) : new Date(dateString));

const AssetTrackingView = () => {
  const {
    assetRecords,
    setAssetRecords,
    trackedStockPortfolio,
    setTrackedStockPortfolio,
    resolvedTheme: theme,
  } = useSimulator();

  // 입력 폼 상태
  const [newDate, setNewDate] = useState(getCurrentDate());
  const [newAssetValue, setNewAssetValue] = useState('');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newContribution, setNewContribution] = useState('');
  const [excludeFromMonthlyAverage, setExcludeFromMonthlyAverage] = useState(false);
  const [newMemo, setNewMemo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [pendingCsvRecords, setPendingCsvRecords] = useState(null);
  const [showProjection, setShowProjection] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [monthlyContribution, setMonthlyContribution] = useState(100);
  const [useManualReturn, setUseManualReturn] = useState(false);
  const [manualReturnRate, setManualReturnRate] = useState('');
  const [trackedTicker, setTrackedTicker] = useState('');
  const [trackedShares, setTrackedShares] = useState('');
  const [trackedAverageBuyPrice, setTrackedAverageBuyPrice] = useState('');
  const [trackedManualCurrentPrice, setTrackedManualCurrentPrice] = useState('');
  const [isAddingTrackedStock, setIsAddingTrackedStock] = useState(false);
  const [trackedPortfolioLoading, setTrackedPortfolioLoading] = useState(false);
  const [trackedPortfolioError, setTrackedPortfolioError] = useState('');
  const [trackedHistoryMap, setTrackedHistoryMap] = useState({});
  const [trackedPositionDrafts, setTrackedPositionDrafts] = useState({});
  const [isFetchingUsdKrwRate, setIsFetchingUsdKrwRate] = useState(false);
  const trackedRefreshTimerRef = useRef(null);
  const fxRefreshTimerRef = useRef(null);

  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';
  const chartColors = {
    grid: theme === 'dark' ? '#3a3733' : '#e6dfd8',
    axis: theme === 'dark' ? '#4a463f' : '#e6dfd8',
    tick: theme === 'dark' ? '#c9c5bd' : '#6c6a64',
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
  const trackedPositions = useMemo(
    () => trackedStockPortfolio?.positions || [],
    [trackedStockPortfolio]
  );
  const usdKrwRate = Number(trackedStockPortfolio?.usdKrwRate) || 1380;
  const sortedAssetRecords = useMemo(
    () => [...assetRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [assetRecords]
  );

  // 계산된 데이터
  const recordsWithReturns = calculateMonthlyAverageReturnsByMonth(assetRecords);
  const stats = calculateStats(assetRecords);
  const projections = useMemo(() => (
    showProjection
      ? projectFutureWealth(
          assetRecords,
          projectionMonths,
          monthlyContribution,
          useManualReturn && manualReturnRate !== '' ? parseFloat(manualReturnRate) : null
        )
      : []
  ), [assetRecords, manualReturnRate, monthlyContribution, projectionMonths, showProjection, useManualReturn]);

  // 회귀 분석 계산
  const { trendLine, regression } = calculateTrendLine(assetRecords);

  useEffect(() => {
    let cancelled = false;

    if (trackedRefreshTimerRef.current) {
      clearTimeout(trackedRefreshTimerRef.current);
      trackedRefreshTimerRef.current = null;
    }

    if (trackedPositions.length === 0) {
      setTrackedHistoryMap({});
      setTrackedPortfolioLoading(false);
      return undefined;
    }

    const loadTrackedHistories = async () => {
      setTrackedPortfolioLoading(true);
      setTrackedPortfolioError('');

      try {
        const nextHistoryMap = await getMultipleHistoricalData(
          trackedPositions.map((position) => position.ticker),
          '1y',
          (ticker) => {
            const position = trackedPositions.find((item) => item.ticker === ticker);
            return position?.manualCurrentPrice
              ? { manualCurrentPrice: position.manualCurrentPrice }
              : {};
          }
        );

        if (cancelled) return;

        setTrackedHistoryMap(nextHistoryMap);

        const missingTickers = trackedPositions
          .map((position) => position.ticker)
          .filter((ticker) => !nextHistoryMap[ticker] || nextHistoryMap[ticker].length === 0);

        if (missingTickers.length > 0) {
          setTrackedPortfolioError(`${missingTickers.join(', ')} 가격 히스토리를 불러오지 못했어요.`);
          trackedRefreshTimerRef.current = window.setTimeout(() => {
            if (!cancelled) {
              loadTrackedHistories();
            }
          }, MARKET_RETRY_MS);
        } else {
          trackedRefreshTimerRef.current = window.setTimeout(() => {
            if (!cancelled) {
              loadTrackedHistories();
            }
          }, MARKET_REFRESH_MS);
        }
      } catch (error) {
        if (cancelled) return;
        setTrackedHistoryMap({});
        setTrackedPortfolioError(error?.message || '자동 추적 포트폴리오 데이터를 불러오지 못했어요.');
        trackedRefreshTimerRef.current = window.setTimeout(() => {
          if (!cancelled) {
            loadTrackedHistories();
          }
        }, MARKET_RETRY_MS);
      } finally {
        if (!cancelled) {
          setTrackedPortfolioLoading(false);
        }
      }
    };

    loadTrackedHistories();

    return () => {
      cancelled = true;
      if (trackedRefreshTimerRef.current) {
        clearTimeout(trackedRefreshTimerRef.current);
        trackedRefreshTimerRef.current = null;
      }
    };
  }, [trackedPositions]);

  useEffect(() => {
    if (fxRefreshTimerRef.current) {
      clearTimeout(fxRefreshTimerRef.current);
      fxRefreshTimerRef.current = null;
    }

    if (trackedPositions.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const scheduleNext = (delay) => {
      fxRefreshTimerRef.current = window.setTimeout(() => {
        if (!cancelled) {
          loadLatestFx();
        }
      }, delay);
    };

    const loadLatestFx = async () => {
      try {
        const latestRate = await getUsdKrwRate();
        if (cancelled) return;
        setTrackedStockPortfolio((prev) => ({
          ...prev,
          usdKrwRate: Math.round(latestRate * 10) / 10,
        }));
        scheduleNext(MARKET_REFRESH_MS);
      } catch {
        if (cancelled) return;
        scheduleNext(MARKET_RETRY_MS);
      }
    };

    loadLatestFx();

    return () => {
      cancelled = true;
      if (fxRefreshTimerRef.current) {
        clearTimeout(fxRefreshTimerRef.current);
        fxRefreshTimerRef.current = null;
      }
    };
  }, [setTrackedStockPortfolio, trackedPositions.length]);

  const trackedPortfolioSeries = useMemo(() => {
    if (trackedPositions.length === 0) return [];

    const dailyTotals = new Map();

    trackedPositions.forEach((position) => {
      const history = trackedHistoryMap[position.ticker] || [];
      const fxRate = position.currency === 'KRW' ? 1 : usdKrwRate;

      history.forEach((point) => {
        const price = Number(point.price);
        if (!Number.isFinite(price)) return;

        const valueManwon = (Number(position.shares) || 0) * price * fxRate / 10000;
        const existing = dailyTotals.get(point.date) || 0;
        dailyTotals.set(point.date, existing + valueManwon);
      });
    });

    return [...dailyTotals.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trackedHistoryMap, trackedPositions, usdKrwRate]);

  const trackedPortfolioSummary = useMemo(() => {
    const positions = trackedPositions.map((position) => {
      const history = trackedHistoryMap[position.ticker] || [];
      const latestPrice = history[history.length - 1]?.price ?? null;
      const fxRate = position.currency === 'KRW' ? 1 : usdKrwRate;
      const invested = (Number(position.shares) || 0) * (Number(position.averageBuyPrice) || 0) * fxRate / 10000;
      const currentValue = latestPrice !== null
        ? (Number(position.shares) || 0) * latestPrice * fxRate / 10000
        : null;
      const profit = currentValue !== null ? currentValue - invested : null;
      const returnPercent = currentValue !== null && invested > 0
        ? (profit / invested) * 100
        : null;

      return {
        ...position,
        manualCurrentPrice: position.manualCurrentPrice || null,
        latestPrice,
        invested,
        currentValue,
        profit,
        returnPercent,
      };
    });

    const invested = positions.reduce((sum, position) => sum + position.invested, 0);
    const currentValue = positions.reduce((sum, position) => sum + (position.currentValue || 0), 0);
    const profit = currentValue - invested;

    return {
      positions,
      invested,
      currentValue,
      profit,
      returnPercent: invested > 0 ? (profit / invested) * 100 : 0,
    };
  }, [trackedHistoryMap, trackedPositions, usdKrwRate]);

  const chartBaseDate = useMemo(() => {
    const candidates = [
      sortedAssetRecords[0]?.date,
      projections[0]?.date,
    ].filter(Boolean);

    if (candidates.length === 0) return null;

    return [...candidates].sort((a, b) => parseAssetDate(a) - parseAssetDate(b))[0];
  }, [sortedAssetRecords, projections]);

  // 차트 데이터 - yearFraction을 X축으로 사용
  const manualChartData = useMemo(() => ([
    ...recordsWithReturns.map(r => {
      const yearFraction = chartBaseDate ? dateToYearFraction(r.date, chartBaseDate) : 0;
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
      const yearFraction = chartBaseDate ? dateToYearFraction(p.date, chartBaseDate) : 0;
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
  ]), [chartBaseDate, projections, recordsWithReturns, regression, trendLine]);

  const chartData = manualChartData;

  const trackedChartBaseDate = trackedPortfolioSeries[0]?.date || null;

  const trackedChartData = useMemo(() => trackedPortfolioSeries.map((point) => ({
    date: point.date,
    yearFraction: trackedChartBaseDate ? dateToYearFraction(point.date, trackedChartBaseDate) : 0,
    trackedPortfolioValue: point.value / 10000,
  })), [trackedChartBaseDate, trackedPortfolioSeries]);

  // 기록 추가/수정
  const handleSaveRecord = () => {
    if (!newDate || !newAssetValue) return;

    const record = createRecord(
      newDate,
      parseFloat(newAssetValue),
      parseFloat(newPrincipal) || 0,
      parseFloat(newContribution) || 0,
      newMemo,
      true,
      excludeFromMonthlyAverage
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
    setNewContribution('');
    setExcludeFromMonthlyAverage(false);
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
    setNewContribution(String(record.contribution || ''));
    setExcludeFromMonthlyAverage(Boolean(record.excludeFromMonthlyAverage));
    setNewMemo(record.memo || '');
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const filename = `asset_records_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(assetRecords, filename);
  };

  // CSV 불러오기 — 추가/교체/취소는 모달에서 명시적으로 선택
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readCSVFile(file);
      if (imported.length === 0) {
        alert('불러올 데이터가 없습니다.');
        return;
      }
      setPendingCsvRecords(imported);
    } catch (error) {
      alert(`CSV 불러오기 실패: ${error.message}`);
    }

    e.target.value = '';
  };

  const applyCsvImport = (mode) => {
    const imported = pendingCsvRecords;
    setPendingCsvRecords(null);
    if (!imported) return;

    if (mode === 'merge') {
      setAssetRecords(prev => [...prev, ...imported]);
    } else {
      setAssetRecords(imported);
    }
  };

  // 전체 삭제
  const handleClearAll = () => {
    if (window.confirm('모든 기록을 삭제하시겠습니까?')) {
      setAssetRecords([]);
    }
  };

  const handleUsdKrwRateChange = useCallback((value) => {
    setTrackedStockPortfolio((prev) => ({
      ...prev,
      usdKrwRate: Number(value) > 0 ? Number(value) : prev.usdKrwRate,
    }));
  }, [setTrackedStockPortfolio]);

  const handleFetchUsdKrwRate = useCallback(async () => {
    setIsFetchingUsdKrwRate(true);
    setTrackedPortfolioError('');

    try {
      const latestRate = await getUsdKrwRate();
      setTrackedStockPortfolio((prev) => ({
        ...prev,
        usdKrwRate: Math.round(latestRate * 10) / 10,
      }));
    } catch (error) {
      setTrackedPortfolioError(error?.message || 'USD/KRW 환율을 불러오지 못했어요.');
    } finally {
      setIsFetchingUsdKrwRate(false);
    }
  }, [setTrackedStockPortfolio]);

  const handleAddTrackedStock = useCallback(async () => {
    const normalizedTicker = trackedTicker.trim().toUpperCase();
    const shares = Number(trackedShares);
    const averageBuyPrice = Number(trackedAverageBuyPrice);
    const manualCurrentPrice = Number(trackedManualCurrentPrice);
    const alias = getTickerAlias(normalizedTicker);

    if (!normalizedTicker || shares <= 0 || averageBuyPrice <= 0) {
      setTrackedPortfolioError('티커, 보유 수량, 평균 매수가를 올바르게 입력해주세요.');
      return;
    }

    if (alias && manualCurrentPrice <= 0) {
      setTrackedPortfolioError(`${normalizedTicker}은(는) 현재가를 직접 입력해주세요.`);
      return;
    }

    if (trackedPositions.some((position) => position.ticker === normalizedTicker)) {
      setTrackedPortfolioError(`${normalizedTicker}는 이미 자동 추적 포트폴리오에 있습니다.`);
      return;
    }

    setIsAddingTrackedStock(true);
    setTrackedPortfolioError('');

    try {
      const stockInfo = await getStockInfo(normalizedTicker, alias && manualCurrentPrice > 0
        ? { manualCurrentPrice }
        : {});

      setTrackedStockPortfolio((prev) => ({
        ...prev,
        positions: [
          ...prev.positions,
          {
            id: `tracked-stock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ticker: stockInfo.ticker,
            name: stockInfo.name,
            shares,
            averageBuyPrice,
            manualCurrentPrice: alias && manualCurrentPrice > 0 ? manualCurrentPrice : null,
            currency: stockInfo.currency || 'USD',
            exchange: stockInfo.exchange || '',
            color: stockInfo.color || '#f59e0b',
          },
        ],
      }));

      setTrackedTicker('');
      setTrackedShares('');
      setTrackedAverageBuyPrice('');
      setTrackedManualCurrentPrice('');
    } catch (error) {
      setTrackedPortfolioError(error?.message || '종목 정보를 불러오지 못했어요.');
    } finally {
      setIsAddingTrackedStock(false);
    }
  }, [trackedAverageBuyPrice, trackedManualCurrentPrice, trackedPositions, trackedShares, trackedTicker, setTrackedStockPortfolio]);

  const clearTrackedPositionDraft = useCallback((positionId, field) => {
    setTrackedPositionDrafts((prev) => {
      const current = prev[positionId];
      if (!current || !(field in current)) return prev;

      const nextForPosition = { ...current };
      delete nextForPosition[field];

      const next = { ...prev };
      if (Object.keys(nextForPosition).length === 0) {
        delete next[positionId];
      } else {
        next[positionId] = nextForPosition;
      }

      return next;
    });
  }, []);

  const handleTrackedPositionDraftChange = useCallback((positionId, field, value) => {
    setTrackedPositionDrafts((prev) => ({
      ...prev,
      [positionId]: {
        ...prev[positionId],
        [field]: value,
      },
    }));
  }, []);

  const commitTrackedPositionDraft = useCallback((positionId, field) => {
    const draftValue = trackedPositionDrafts[positionId]?.[field];
    if (draftValue === undefined) return;

    const nextValue = Number(draftValue);
    const label = field === 'shares' ? '보유 수량' : '평균 매수가';

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setTrackedPortfolioError(`${label}은(는) 0보다 큰 숫자로 입력해주세요.`);
      clearTrackedPositionDraft(positionId, field);
      return;
    }

    setTrackedStockPortfolio((prev) => ({
      ...prev,
      positions: prev.positions.map((position) => (
        position.id === positionId
          ? { ...position, [field]: nextValue }
          : position
      )),
    }));
    setTrackedPortfolioError('');
    clearTrackedPositionDraft(positionId, field);
  }, [clearTrackedPositionDraft, setTrackedStockPortfolio, trackedPositionDrafts]);

  const handleTrackedPositionInputKeyDown = useCallback((event, positionId, field) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }

    if (event.key === 'Escape') {
      event.currentTarget.dataset.cancelEdit = 'true';
      clearTrackedPositionDraft(positionId, field);
      event.currentTarget.blur();
    }
  }, [clearTrackedPositionDraft]);

  const handleRemoveTrackedStock = useCallback((id) => {
    setTrackedPositionDrafts((prev) => {
      if (!prev[id]) return prev;

      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTrackedStockPortfolio((prev) => ({
      ...prev,
      positions: prev.positions.filter((position) => position.id !== id),
    }));
  }, [setTrackedStockPortfolio]);

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

  const formatTrackedPrice = (value, currency = 'USD') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    const prefix = currency === 'KRW' ? '₩' : '$';
    return `${prefix}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const editableNumberInputClass = 'w-28 rounded-lg border border-transparent bg-transparent px-2 py-1 text-right text-sm text-gray-700 transition hover:border-amber-200 hover:bg-amber-50 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:focus:bg-surface-dark-elevated dark:focus:ring-amber-500/20';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">자산 추적</h1>
        <p className="text-body">실제 자산 기록을 입력하여 수익률을 확인하세요.</p>
      </div>

      <Modal
        open={pendingCsvRecords !== null}
        title="CSV 불러오기"
        description={`${pendingCsvRecords?.length ?? 0}개의 기록을 기존 데이터에 추가할까요, 아니면 기존 데이터를 지우고 교체할까요?`}
        onClose={() => setPendingCsvRecords(null)}
      >
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => applyCsvImport('merge')} className="btn btn-primary w-full">
            기존 기록에 추가
          </button>
          <button type="button" onClick={() => applyCsvImport('replace')} className="btn btn-danger w-full">
            기존 기록을 지우고 교체
          </button>
          <button type="button" onClick={() => setPendingCsvRecords(null)} className="btn btn-secondary w-full">
            취소
          </button>
        </div>
      </Modal>

      {/* 통계 요약 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-soft border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
          <div className="text-xs text-gray-600 mb-1 dark:text-slate-400">현재 자산</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {formatMoney(stats.currentValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">
            {stats.recordCount}개 기록 · {stats.periodMonths}개월
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface-soft border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
          <div className="text-xs text-gray-600 mb-1 dark:text-slate-400">총 수익률</div>
          <div className={`text-xl font-bold ${stats.totalReturnPercent >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
            {formatPercent(stats.totalReturnPercent)}
          </div>
          <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">
            {stats.totalReturn >= 0 ? '+' : ''}{formatMoney(stats.totalReturn)} 수익
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface-soft border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
          <div className="text-xs text-gray-600 mb-1 dark:text-slate-400">연환산 수익률</div>
          <div className={`text-xl font-bold ${stats.cagr >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-red-600 dark:text-red-400'}`}>
            {formatPercent(stats.cagr)}
          </div>
          <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">CAGR</div>
        </div>
        <div className="p-4 rounded-xl bg-surface-soft border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
          <div className="text-xs text-gray-600 mb-1 dark:text-slate-400">월평균 수익률</div>
          <div className={`text-xl font-bold ${stats.averageMonthlyReturn >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'}`}>
            {formatPercent(stats.averageMonthlyReturn)}
          </div>
          <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">
            변동성 σ {stats.volatility.toFixed(2)}%
          </div>
        </div>
      </section>

      <Card>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-heading-3">🧾 자동 주식 추적 포트폴리오</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                프리셋과 별개로 저장됩니다. 여러 종목의 일별 평가금액을 불러와 자산 추이 차트에 별도 라인으로 표시합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:bg-amber-500/10 dark:border-amber-500/30">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">USD/KRW</span>
              <input
                type="number"
                min={1}
                step="0.1"
                value={usdKrwRate}
                onChange={(e) => handleUsdKrwRateChange(e.target.value)}
                className="w-24 rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm font-semibold text-amber-900 dark:bg-surface-dark-elevated dark:border-amber-500/30 dark:text-amber-200"
              />
              <span className="text-xs text-amber-700 dark:text-amber-300">원</span>
              <button
                type="button"
                onClick={handleFetchUsdKrwRate}
                disabled={isFetchingUsdKrwRate}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:bg-surface-dark-elevated dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                {isFetchingUsdKrwRate ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]">
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-slate-400">티커</label>
              <input
                type="text"
                value={trackedTicker}
                onChange={(e) => setTrackedTicker(e.target.value.toUpperCase())}
                placeholder="VOO / AAPL / TSLA"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-slate-400">보유 수량</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={trackedShares}
                onChange={(e) => setTrackedShares(e.target.value)}
                placeholder="12.3456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-slate-400">평균 매수가</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={trackedAverageBuyPrice}
                onChange={(e) => setTrackedAverageBuyPrice(e.target.value)}
                placeholder="420.15"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-slate-400">현재가 (SPYM/TIGERSP500 전용)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={trackedManualCurrentPrice}
                onChange={(e) => setTrackedManualCurrentPrice(e.target.value)}
                placeholder="별칭 ETF 현재가"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddTrackedStock}
                disabled={isAddingTrackedStock}
                className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 md:w-auto"
              >
                {isAddingTrackedStock ? '추가 중...' : '종목 추가'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-hairline bg-surface-card p-4 dark:bg-surface-dark-elevated dark:border-slate-700">
              <div className="text-xs text-amber-700 dark:text-amber-300">자동 추적 현재 평가금액</div>
              <div className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">{formatMoney(trackedPortfolioSummary.currentValue)}</div>
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{trackedPositions.length}개 종목</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-soft p-4 dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">자동 추적 원금</div>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{formatMoney(trackedPortfolioSummary.invested)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">평균 매수가 기준</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-soft p-4 dark:bg-surface-dark-soft dark:border-slate-700">
              <div className="text-xs text-emerald-700 dark:text-emerald-300">자동 추적 손익</div>
              <div className={`mt-1 text-2xl font-black ${trackedPortfolioSummary.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                {trackedPortfolioSummary.profit >= 0 ? '+' : ''}{formatMoney(trackedPortfolioSummary.profit)}
              </div>
              <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{formatPercent(trackedPortfolioSummary.returnPercent)}</div>
            </div>
          </div>

          {trackedPortfolioLoading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300">
              자동 추적 포트폴리오 가격 데이터를 불러오는 중입니다...
            </div>
          )}

          {trackedPortfolioError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">
              {trackedPortfolioError}
            </div>
          )}

          {trackedPositions.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300">종목</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">보유 수량</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">평균 매수가</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">수동 현재가</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">현재가</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">평가금액</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-300">손익률</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {trackedPortfolioSummary.positions.map((position) => (
                    <tr key={position.id} className="border-t border-gray-100 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{position.ticker}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{position.name}{position.exchange ? ` · ${position.exchange}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">
                        <input
                          type="number"
                          min={0}
                          step="0.0001"
                          aria-label={`${position.ticker} 보유 수량 수정`}
                          value={trackedPositionDrafts[position.id]?.shares ?? position.shares}
                          onChange={(e) => handleTrackedPositionDraftChange(position.id, 'shares', e.target.value)}
                          onBlur={(e) => {
                            if (e.currentTarget.dataset.cancelEdit === 'true') {
                              delete e.currentTarget.dataset.cancelEdit;
                              return;
                            }
                            commitTrackedPositionDraft(position.id, 'shares');
                          }}
                          onKeyDown={(e) => handleTrackedPositionInputKeyDown(e, position.id, 'shares')}
                          className={editableNumberInputClass}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">{position.currency === 'KRW' ? '₩' : '$'}</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            aria-label={`${position.ticker} 평균 매수가 수정`}
                            value={trackedPositionDrafts[position.id]?.averageBuyPrice ?? position.averageBuyPrice}
                            onChange={(e) => handleTrackedPositionDraftChange(position.id, 'averageBuyPrice', e.target.value)}
                            onBlur={(e) => {
                              if (e.currentTarget.dataset.cancelEdit === 'true') {
                                delete e.currentTarget.dataset.cancelEdit;
                                return;
                              }
                              commitTrackedPositionDraft(position.id, 'averageBuyPrice');
                            }}
                            onKeyDown={(e) => handleTrackedPositionInputKeyDown(e, position.id, 'averageBuyPrice')}
                            className={editableNumberInputClass}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{position.manualCurrentPrice ? formatTrackedPrice(position.manualCurrentPrice, position.currency) : '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{formatTrackedPrice(position.latestPrice, position.currency)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">{position.currentValue !== null ? formatMoney(position.currentValue) : '-'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${position.returnPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatPercent(position.returnPercent)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveTrackedStock(position.id)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
              아직 자동 추적 종목이 없습니다. 티커, 수량, 평균 매수가를 입력해 추가하세요.
            </div>
          )}
        </div>
      </Card>

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
                <div className="flex flex-wrap items-center gap-4 bg-surface-soft p-3 rounded-xl border border-hairline dark:bg-surface-dark-soft dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">기간:</span>
                    <input
                      type="number"
                      value={projectionMonths}
                      onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
                      className="w-16 px-2 py-1 text-sm border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      min={1}
                      max={120}
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400">개월</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">월 투자액:</span>
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                      min={0}
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400">만원</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useManualReturn}
                        onChange={(e) => setUseManualReturn(e.target.checked)}
                        className="w-3.5 h-3.5 text-purple-600 rounded"
                      />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">수익률 설정:</span>
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
                    <stop offset="5%" stopColor="#cc785c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#cc785c" stopOpacity={0.05} />
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
                  stroke="#cc785c"
                  fill="url(#assetGradient)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#cc785c' }}
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

      {trackedChartData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-heading-3">📊 자동 추적 포트폴리오 추이</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">수동 자산 기록/예측과 분리된 별도 차트입니다.</p>
            </div>
            <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              기준 환율 {usdKrwRate.toLocaleString()}원
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trackedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trackedPortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
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
                        {data.trackedPortfolioValue != null && (
                          <div className="text-amber-700">자동 추적 포트폴리오: {(data.trackedPortfolioValue * 10000).toLocaleString()}만원</div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trackedPortfolioValue"
                  stroke="#f59e0b"
                  fill="url(#trackedPortfolioGradient)"
                  strokeWidth={2.5}
                  dot={false}
                  name="자동 추적 포트폴리오"
                />
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
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              📂 CSV 불러오기
            </button>
            <button
              onClick={handleExportCSV}
              disabled={assetRecords.length === 0}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-50 dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              💾 CSV 저장
            </button>
            {assetRecords.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 transition dark:bg-transparent dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                🗑️ 전체 삭제
              </button>
            )}
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4 p-4 bg-white/50 rounded-lg dark:bg-slate-800/40">
          <div>
            <label className="block text-xs text-gray-600 mb-1 dark:text-slate-400">날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1 dark:text-slate-400">총 자산 (만원)</label>
            <input
              type="number"
              value={newAssetValue}
              onChange={(e) => setNewAssetValue(e.target.value)}
              placeholder="15000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1 dark:text-slate-400">원금 (만원)</label>
            <input
              type="number"
              value={newPrincipal}
              onChange={(e) => setNewPrincipal(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1 dark:text-slate-400">입출금 (만원)</label>
            <input
              type="number"
              value={newContribution}
              onChange={(e) => setNewContribution(e.target.value)}
              placeholder="100 / -50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1 dark:text-slate-400">메모</label>
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="메모 (선택)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-surface-dark-elevated dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeFromMonthlyAverage}
              onChange={(e) => setExcludeFromMonthlyAverage(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600"
            />
            <span className="text-xs font-medium text-amber-700">월 평균 제외</span>
          </label>
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

        <div className="mb-3 space-y-1 text-xs text-gray-500 dark:text-slate-400">
          <div>
            월 수익률 = (현재 총자산 - 이전 총자산 - 입출금) ÷ 이전 총자산. 입출금은 이번 기록에 직접 넣은 순현금흐름(입금 +, 출금 -)입니다.
          </div>
          <div>
            월 평균 수익률 = 같은 달에 입력된 월 수익률들의 평균값입니다. 입력일이 들쭉날쭉해도 월 기준 흐름을 보기 쉽게 보여줍니다.
          </div>
          <div>
            `월 평균 제외`를 체크하면 해당 행의 월 수익률은 그대로 보이지만, 월 평균 수익률과 상단 월평균 통계에서는 제외됩니다.
          </div>
          <div>
            기존 기록 중 직접 입력 전 데이터는 호환성을 위해 이전 방식(원금 증가분)으로 계산될 수 있습니다. 새로 수정/입력한 기록부터는 입출금 값이 우선 적용됩니다.
          </div>
        </div>

        {/* 기록 테이블 */}
        {recordsWithReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">날짜</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">총 자산</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">원금</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">입출금</th>
                   <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">월 수익률</th>
                   <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">월 평균 수익률</th>
                   <th className="text-center py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">평균 제외</th>
                   <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">누적 수익률</th>
                   <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">메모</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...recordsWithReturns].reverse().map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-3 font-medium">{record.date}</td>
                    <td className="py-2 px-3 text-right">{record.assetValue.toLocaleString()}만</td>
                    <td className="py-2 px-3 text-right text-blue-600">
                      {record.principal ? `${record.principal.toLocaleString()}만` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500 dark:text-slate-400">
                      {record.contribution ? `${record.contribution.toLocaleString()}만` : '-'}
                    </td>
                     <td className={`py-2 px-3 text-right font-medium ${
                       record.monthlyReturn === null ? 'text-gray-400' :
                       record.monthlyReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                     }`}>
                       {formatPercent(record.monthlyReturn)}
                     </td>
                      <td className={`py-2 px-3 text-right font-medium ${
                        record.monthlyAverageReturn === null ? 'text-gray-400' :
                        record.monthlyAverageReturn >= 0 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {formatPercent(record.monthlyAverageReturn)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {record.excludeFromMonthlyAverage ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            제외
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className={`py-2 px-3 text-right ${
                        record.cumulativeReturn >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                      {formatPercent(record.cumulativeReturn)}
                    </td>
                    <td className="py-2 px-3 text-gray-500 max-w-[120px] truncate dark:text-slate-400">
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
