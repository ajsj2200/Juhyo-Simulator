import { useMemo, useEffect, useState, useRef, useCallback } from 'react';

/**
 * 스노우볼 애니메이션 v3
 * 왼쪽 위 → 오른쪽 아래 경사를 굴러내려오며 커지는 눈덩이
 * + 재생 컨트롤 버튼
 */
const SnowballAnimation = ({ 
  records = [], 
  stats = {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flyingNumbers, setFlyingNumbers] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // 정렬된 기록
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  // 레코드별 X 위치 계산 (10% ~ 90%)
  const getPositionX = (index) => {
    if (sortedRecords.length <= 1) return 50;
    return 10 + (index / (sortedRecords.length - 1)) * 80;
  };

  // 레코드별 볼 크기 계산
  const getBallSize = (record) => {
    if (!record || sortedRecords.length === 0) return 50;
    
    // 전체 기록 중 최대/최소 자산액 찾기
    const values = sortedRecords.map(r => r.assetValue);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    if (maxVal === minVal) return 80;
    
    // 최소 50px에서 최대 160px 사이로 맵핑
    const normalized = (record.assetValue - minVal) / (maxVal - minVal);
    return 50 + normalized * 110;
  };

  // 다음 인덱스로 이동
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev >= sortedRecords.length - 1) return 0;
      return prev + 1;
    });
    setIsRolling(true);
  }, [sortedRecords.length]);

  // 이전 인덱스로 이동
  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev <= 0) return sortedRecords.length - 1;
      return prev - 1;
    });
    setIsRolling(true);
  }, [sortedRecords.length]);

  // 자동 재생
  useEffect(() => {
    if (sortedRecords.length === 0 || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(goToNext, 2500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sortedRecords.length, isPlaying, goToNext]);

  // 인덱스 변경 시 수익 금액 날리기
  useEffect(() => {
    if (currentIndex === 0 || sortedRecords.length === 0) {
      setFlyingNumbers([]);
      return;
    }

    const prevRecord = sortedRecords[currentIndex - 1];
    const currRecord = sortedRecords[currentIndex];
    if (!prevRecord || !currRecord) return;

    const gain = currRecord.assetValue - prevRecord.assetValue;
    const contribution = (currRecord.principal || 0) - (prevRecord.principal || 0);
    const pureGain = gain - contribution;

    // 날아가는 숫자들 생성
    const numbers = [];
    if (contribution > 0) {
      numbers.push({
        id: `contrib-${Date.now()}`,
        value: contribution,
        type: 'contribution',
        startX: Math.random() * 30,
        startY: 30 + Math.random() * 20,
      });
    }
    if (Math.abs(pureGain) > 0) {
      numbers.push({
        id: `gain-${Date.now()}`,
        value: pureGain,
        type: pureGain >= 0 ? 'gain' : 'loss',
        startX: 10 + Math.random() * 30,
        startY: 10 + Math.random() * 20,
      });
    }

    setFlyingNumbers(numbers);
    setTimeout(() => setFlyingNumbers([]), 1500);
  }, [currentIndex, sortedRecords]);

  // 롤링 애니메이션 종료
  useEffect(() => {
    if (isRolling) {
      const timer = setTimeout(() => setIsRolling(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isRolling]);

  if (sortedRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-sky-100 to-blue-200 rounded-2xl text-gray-500 dark:from-slate-900 dark:to-slate-800 dark:text-slate-200">
        <p>자산 기록을 추가하면 스노우볼 애니메이션이 시작됩니다 ❄️</p>
      </div>
    );
  }

  const currentRecord = sortedRecords[currentIndex] || sortedRecords[0];
  const ballSize = getBallSize(currentRecord);
  const positionX = getPositionX(currentIndex);
  // Y 위치: 왼쪽(위) → 오른쪽(아래) - 경사를 따라 내려감
  const positionY = 35 + (positionX / 100) * 30; 
  const profit = currentRecord.assetValue - (currentRecord.principal || currentRecord.assetValue);
  const profitPercent = currentRecord.principal > 0 
    ? (profit / currentRecord.principal) * 100 
    : 0;

  const formatMoney = (value) => {
    const sign = value >= 0 ? '+' : '';
    if (Math.abs(value) >= 10000) {
      return `${sign}${(value / 10000).toFixed(2)}억`;
    }
    return `${sign}${Math.round(value).toLocaleString()}만`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-200 border border-blue-300 dark:from-slate-900 dark:via-slate-800/90 dark:to-slate-800 dark:border-slate-700"
      style={{ height: '420px' }}
    >
      {/* 하늘 배경 */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-transparent dark:from-slate-900 dark:via-slate-800/70"
        style={{ height: '50%' }}
      />
      
      {/* 눈 내리는 효과 */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-white rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            animation: `fall ${4 + Math.random() * 4}s linear infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      {/* 경사면 (왼쪽 위 → 오른쪽 아래) */}
      <svg 
        className="absolute bottom-0 left-0 w-full" 
        viewBox="0 0 400 220" 
        preserveAspectRatio="none"
        style={{ height: '75%' }}
      >
        <defs>
          <linearGradient id="snowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="50%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <filter id="snowShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="-4" stdDeviation="6" floodOpacity="0.1" />
          </filter>
        </defs>
        {/* 경사면 - 왼쪽 위에서 오른쪽 아래로 */}
        <path
          d="M0,30 Q100,60 200,110 Q300,160 400,180 L400,220 L0,220 Z"
          fill="url(#snowGradient)"
          filter="url(#snowShadow)"
        />
        {/* 경사면 표면 하이라이트 */}
        <path
          d="M0,30 Q100,60 200,110 Q300,160 400,180"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="4"
        />
      </svg>

      {/* 경로 표시 (점선) */}
      <div className="absolute bottom-0 left-0 w-full" style={{ height: '75%' }}>
        <svg className="w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="none">
          <path
            d="M40,45 Q100,75 200,120 Q300,165 370,185"
            fill="none"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="3"
            strokeDasharray="10 6"
          />
        </svg>
      </div>

      {/* 스노우볼 */}
      <div
        className="absolute transition-all ease-out"
        style={{
          left: `${positionX}%`,
          top: `${positionY}%`,
          transform: `translate(-50%, -50%)`,
          transitionDuration: '800ms',
          zIndex: 10,
        }}
      >
        {/* 그림자 */}
        <div
          className="absolute rounded-full bg-black/15 blur-lg"
          style={{
            width: ballSize * 0.9,
            height: ballSize * 0.25,
            bottom: -ballSize * 0.1,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        
        {/* 눈덩이 본체 */}
        <div
          className={`relative rounded-full bg-gradient-to-br from-white via-gray-50 to-blue-100 transition-all duration-700 ${isRolling ? 'animate-roll' : ''}`}
          style={{
            width: ballSize,
            height: ballSize,
            boxShadow: `
              inset -${ballSize * 0.12}px -${ballSize * 0.12}px ${ballSize * 0.25}px rgba(100,150,180,0.15),
              inset ${ballSize * 0.1}px ${ballSize * 0.1}px ${ballSize * 0.2}px rgba(255,255,255,0.9),
              0 ${ballSize * 0.08}px ${ballSize * 0.25}px rgba(0,0,0,0.15),
              0 0 ${ballSize * 0.3}px rgba(255,255,255,0.5)
            `,
          }}
        >
          {/* 눈 질감 */}
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/70"
              style={{
                width: 4 + Math.random() * 6,
                height: 4 + Math.random() * 6,
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
              }}
            />
          ))}
          
          {/* 중앙 금액 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-2">
              <div 
                className="font-bold text-indigo-900 drop-shadow-sm whitespace-nowrap"
                style={{ fontSize: Math.max(14, ballSize / 5.5) }}
              >
                {currentRecord.assetValue >= 10000 
                  ? `${(currentRecord.assetValue / 10000).toFixed(1)}억` 
                  : `${Math.round(currentRecord.assetValue).toLocaleString()}만`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 날아오는 금액들 */}
      {flyingNumbers.map((num) => (
        <div
          key={num.id}
          className="absolute font-bold text-sm md:text-base drop-shadow-lg pointer-events-none z-20"
          style={{
            left: `${num.startX}%`,
            top: `${num.startY}%`,
            color: num.type === 'gain' ? '#10b981' : num.type === 'loss' ? '#ef4444' : '#3b82f6',
            animation: `fly-to-ball-${num.type} 1.3s ease-out forwards`,
            '--target-x': `${positionX}%`,
            '--target-y': `${positionY}%`,
          }}
        >
          <div className="flex items-center gap-1 bg-white/95 px-2.5 py-1.5 rounded-full shadow-xl border border-white">
            <span className="text-lg">{num.type === 'contribution' ? '💰' : num.type === 'gain' ? '📈' : '📉'}</span>
            <span className="font-extrabold">{formatMoney(num.value)}</span>
          </div>
        </div>
      ))}

      {/* 상단 정보 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-white/50">
          <div className="text-xs text-gray-500 font-medium">현재 시점</div>
          <div className="text-xl font-bold text-gray-800">{currentRecord.date}</div>
        </div>
        <div className={`rounded-xl px-4 py-2.5 shadow-lg border ${profit >= 0 ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'}`}>
          <div className="text-xs text-white/90 font-medium">총 수익</div>
          <div className="text-xl font-bold text-white">
            {formatMoney(profit)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg z-20">
        <button
          onClick={goToPrev}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
          title="이전"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${
            isPlaying 
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
          title={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={goToNext}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
          title="다음"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="h-6 w-px bg-gray-300 mx-1" />
        <button
          onClick={() => setCurrentIndex(0)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          title="처음으로"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 하단 타임라인 */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="flex justify-between text-xs text-indigo-800 font-medium mb-1">
          <span>{sortedRecords[0]?.date}</span>
          <span className="text-indigo-600">{currentIndex + 1} / {sortedRecords.length}</span>
          <span>{sortedRecords[sortedRecords.length - 1]?.date}</span>
        </div>
        <div className="h-2.5 bg-white/60 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${((currentIndex + 1) / sortedRecords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { transform: translateY(450px) rotate(720deg); opacity: 0; }
        }
        @keyframes roll {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-roll {
          animation: roll 0.8s ease-out;
        }
        @keyframes fly-to-ball-gain {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          20% { transform: translate(0, 0) scale(1.1); opacity: 1; }
          80% { opacity: 1; }
          100% { 
            transform: translate(
              calc(var(--target-x) - 20%), 
              calc(var(--target-y) - 20%)
            ) scale(0.3); 
            opacity: 0; 
          }
        }
        @keyframes fly-to-ball-loss {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          20% { transform: translate(0, 0) scale(1.1); opacity: 1; }
          80% { opacity: 1; }
          100% { 
            transform: translate(
              calc(var(--target-x) - 10%), 
              calc(var(--target-y) - 10%)
            ) scale(0.3); 
            opacity: 0; 
          }
        }
        @keyframes fly-to-ball-contribution {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          20% { transform: translate(0, 0) scale(1.1); opacity: 1; }
          80% { opacity: 1; }
          100% { 
            transform: translate(
              calc(var(--target-x) - 5%), 
              calc(var(--target-y) - 30%)
            ) scale(0.3); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>
  );
};

export default SnowballAnimation;
