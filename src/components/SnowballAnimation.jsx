import { useMemo, useEffect, useState, useRef, useCallback } from 'react';

const formatMoney = (value, showSign = true) => {
  const numeric = Number(value) || 0;
  const sign = numeric > 0 && showSign ? '+' : numeric < 0 && showSign ? '-' : '';
  const absValue = Math.abs(numeric);

  if (absValue >= 10000) {
    return `${sign}${(absValue / 10000).toFixed(2)}억`;
  }

  return `${sign}${Math.round(absValue).toLocaleString()}만`;
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return '-';
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
};

// 값이 바뀔 때 부드럽게 카운트업하는 숫자
const useAnimatedNumber = (target, duration = 700) => {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      fromRef.current = next;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};

const controlButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral/40';

const SnowballAnimation = ({
  records = [],
  stats = {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef(null);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  const maxAsset = useMemo(() => {
    if (sortedRecords.length === 0) return 1;
    return Math.max(...sortedRecords.map((record) => record.assetValue || 0), 1);
  }, [sortedRecords]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= sortedRecords.length - 1) return 0;
      return prev + 1;
    });
  }, [sortedRecords.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return sortedRecords.length - 1;
      return prev - 1;
    });
  }, [sortedRecords.length]);

  useEffect(() => {
    if (sortedRecords.length === 0 || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }

    timerRef.current = setInterval(goToNext, 2400);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sortedRecords.length, isPlaying, goToNext]);

  const currentRecord = sortedRecords[currentIndex] || sortedRecords[0] || {};
  const currentAsset = currentRecord.assetValue || 0;
  const currentPrincipal = currentRecord.principal || 0;
  const profit = currentAsset - currentPrincipal;
  const hasPrincipal = currentPrincipal > 0;
  const cumulativeReturn =
    currentRecord.cumulativeReturn ?? (hasPrincipal ? (profit / currentPrincipal) * 100 : null);
  const monthlyReturn = currentRecord.monthlyReturn ?? null;
  const cashflow = currentRecord.contribution || 0;

  const animatedAsset = useAnimatedNumber(currentAsset);
  const animatedProfit = useAnimatedNumber(hasPrincipal ? profit : 0);

  if (sortedRecords.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-surface-dark text-slate-400">
        <p className="text-sm font-medium tracking-wide">자산 기록이 없습니다. 데이터를 추가해주세요.</p>
      </div>
    );
  }

  // 눈덩이 크기: 면적이 자산액에 비례하도록 sqrt 스케일
  const maxDiameter = 220;
  const minDiameter = 68;
  const diameter = Math.max(minDiameter, Math.sqrt(Math.max(0, currentAsset) / maxAsset) * maxDiameter);

  // 코어(원금) 크기: 눈덩이 안에서 원금이 차지하는 면적 비율.
  // 수익이 있으면 링이 최소 4px는 보이도록 클램프.
  const coreDiameter =
    hasPrincipal && currentAsset > currentPrincipal
      ? Math.min(diameter * Math.sqrt(currentPrincipal / currentAsset), diameter - 8)
      : diameter;

  const isLoss = hasPrincipal && profit < 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-dark text-on-dark">
      {/* 은은한 도트 그리드 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(250,249,245,0.07)_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      {/* 헤더: 현재 시점 + 재생 컨트롤 */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-on-dark-soft">
            Snowball Growth
          </div>
          <div className="mt-1.5 font-display text-3xl font-medium tracking-tight text-on-dark">
            {currentRecord.date}
          </div>
          <div className="mt-1 text-sm text-on-dark-soft">
            {currentIndex + 1}번째 기록 · 총 {sortedRecords.length}개
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={goToPrev} aria-label="이전 기록" className={controlButtonClass}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? '일시정지' : '재생'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white transition hover:bg-coral-active focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 4h4v16H7zM13 4h4v16h-4z" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button type="button" onClick={goToNext} aria-label="다음 기록" className={controlButtonClass}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 스테이지: 자라나는 눈덩이 */}
      <div className="relative z-10 flex h-[300px] items-center justify-center sm:h-[340px]">
        {/* 최대 크기 가이드 링 */}
        <div
          className="absolute rounded-full border border-dashed border-white/10"
          style={{ width: maxDiameter + 28, height: maxDiameter + 28 }}
          aria-hidden="true"
        />

        {/* 바닥 그림자 */}
        <div
          className="absolute rounded-full bg-black/40 blur-2xl transition-all duration-700"
          style={{
            width: diameter * 0.9,
            height: diameter * 0.22,
            transform: `translateY(${diameter / 2 + 18}px)`,
          }}
          aria-hidden="true"
        />

        {/* 눈덩이: 수익 링(코랄) + 원금 코어(크림) */}
        <div
          className="relative flex items-center justify-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
          style={{
            width: diameter,
            height: diameter,
            background: isLoss
              ? 'radial-gradient(circle at 32% 30%, #f0d5cd, #c98d8d 70%, #a96a5f 100%)'
              : 'radial-gradient(circle at 32% 30%, #e8a55a, #cc785c 62%, #a9583e 100%)',
            boxShadow: `0 0 ${Math.round(diameter * 0.4)}px rgba(204, 120, 92, 0.28), 0 18px 40px rgba(0, 0, 0, 0.35)`,
          }}
        >
          <div
            className="rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
            style={{
              width: coreDiameter,
              height: coreDiameter,
              background: 'radial-gradient(circle at 34% 28%, #ffffff, #faf9f5 46%, #e8e0d2 100%)',
              boxShadow: 'inset 0 -6px 18px rgba(20, 20, 19, 0.12)',
            }}
          />
          {/* 하이라이트 */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.55), rgba(255,255,255,0) 42%)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* 이번 기록 배지 */}
        <div className="absolute right-5 top-4 flex max-w-[280px] flex-wrap justify-end gap-2 sm:right-7">
          {monthlyReturn !== null && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                monthlyReturn >= 0
                  ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-rose-300/20 bg-rose-400/10 text-rose-300'
              }`}
            >
              월 {formatPercent(monthlyReturn)}
            </span>
          )}
          {cashflow !== 0 && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {cashflow > 0 ? '입금' : '출금'} {formatMoney(cashflow)}
            </span>
          )}
          {currentRecord.excludeFromMonthlyAverage && (
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              월 평균 제외
            </span>
          )}
        </div>
      </div>

      {/* 값 블록 */}
      <div className="relative z-10 px-6 text-center sm:px-8">
        <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-on-dark-soft">현재 자산</div>
        <div className="mt-1 font-display text-4xl font-medium tracking-tight text-on-dark sm:text-5xl">
          {formatMoney(animatedAsset, false)}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
          <span className="text-slate-300">
            원금 <span className="font-semibold text-on-dark">{hasPrincipal ? formatMoney(currentPrincipal, false) : '-'}</span>
          </span>
          <span className="text-slate-300">
            수익{' '}
            <span className={`font-semibold ${isLoss ? 'text-rose-300' : 'text-[#e8a55a]'}`}>
              {hasPrincipal ? formatMoney(animatedProfit) : '-'}
              {cumulativeReturn !== null && ` (${formatPercent(cumulativeReturn)})`}
            </span>
          </span>
          {stats.cagr !== undefined && stats.cagr !== null && (
            <span className="text-slate-300">
              CAGR <span className="font-semibold text-on-dark">{formatPercent(stats.cagr)}</span>
            </span>
          )}
        </div>
      </div>

      {/* 타임라인 슬라이더 */}
      <div className="relative z-10 px-6 pb-6 pt-5 sm:px-8 sm:pb-7">
        <input
          type="range"
          min={0}
          max={Math.max(0, sortedRecords.length - 1)}
          value={currentIndex}
          onChange={(e) => {
            setCurrentIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          aria-label="기록 타임라인"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-coral"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-on-dark-soft">
          <span>{sortedRecords[0]?.date}</span>
          <span>{sortedRecords[sortedRecords.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
};

export default SnowballAnimation;
