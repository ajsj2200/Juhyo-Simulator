import { useMemo, useEffect, useState } from 'react';

/**
 * 스노우볼 애니메이션 컴포넌트
 * 자산이 눈덩이처럼 불어나는 효과를 시각화
 */
const SnowballAnimation = ({ 
  records = [], 
  stats = {},
  isPlaying = true 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const [displayPrincipal, setDisplayPrincipal] = useState(0);

  // 정렬된 기록
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  // 애니메이션 진행
  useEffect(() => {
    if (!isPlaying || sortedRecords.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= sortedRecords.length) {
          return 0; // 다시 시작
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [isPlaying, sortedRecords.length]);

  // 값 애니메이션
  useEffect(() => {
    if (sortedRecords.length === 0) return;
    
    const targetRecord = sortedRecords[currentIndex];
    if (!targetRecord) return;

    const targetValue = targetRecord.assetValue || 0;
    const targetPrincipal = targetRecord.principal || 0;

    setIsAnimating(true);
    
    // 부드러운 카운트업 애니메이션
    const startValue = displayValue;
    const startPrincipal = displayPrincipal;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setDisplayValue(startValue + (targetValue - startValue) * eased);
      setDisplayPrincipal(startPrincipal + (targetPrincipal - startPrincipal) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [currentIndex, sortedRecords]);

  if (sortedRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>자산 기록을 추가하면 스노우볼 애니메이션이 시작됩니다 ❄️</p>
      </div>
    );
  }

  const currentRecord = sortedRecords[currentIndex] || sortedRecords[0];
  const profit = displayValue - displayPrincipal;
  const profitPercent = displayPrincipal > 0 ? (profit / displayPrincipal) * 100 : 0;
  
  // 스노우볼 크기 (원금 대비 자산 비율)
  const growthRatio = displayPrincipal > 0 ? displayValue / displayPrincipal : 1;
  const ballSize = Math.min(45 + (growthRatio - 1) * 30, 90); // 45% ~ 90%
  
  // 파티클 생성
  const particles = useMemo(() => {
    if (!isAnimating) return [];
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 0.1,
      angle: (i / 12) * 360,
      distance: 60 + Math.random() * 40,
    }));
  }, [isAnimating, currentIndex]);

  const formatMoney = (value) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}억`;
    }
    return `${Math.round(value).toLocaleString()}만`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-6 text-white">
      {/* 배경 별 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 타임라인 진행률 */}
      <div className="relative mb-4">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>{sortedRecords[0]?.date}</span>
          <span>{currentRecord?.date}</span>
          <span>{sortedRecords[sortedRecords.length - 1]?.date}</span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / sortedRecords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 메인 스노우볼 */}
      <div className="relative flex flex-col items-center justify-center py-8">
        {/* 외곽 글로우 */}
        <div 
          className="absolute rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30 blur-2xl transition-all duration-700"
          style={{
            width: `${ballSize + 15}%`,
            height: `${ballSize + 15}%`,
          }}
        />
        
        {/* 파티클 효과 */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-cyan-300 to-white"
            style={{
              animation: `snowfall 0.8s ease-out forwards`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.angle}deg) translateY(-${p.distance}px)`,
              opacity: 0,
            }}
          />
        ))}
        
        {/* 스노우볼 본체 */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-white via-cyan-100 to-blue-200 shadow-2xl flex items-center justify-center transition-all duration-700 ease-out"
          style={{
            width: `${ballSize}%`,
            maxWidth: '280px',
            aspectRatio: '1',
            boxShadow: `
              0 0 60px rgba(56, 189, 248, 0.4),
              inset 0 -20px 40px rgba(0, 0, 0, 0.1),
              inset 0 20px 40px rgba(255, 255, 255, 0.5)
            `,
          }}
        >
          {/* 원금 코어 */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 transition-all duration-700"
            style={{
              width: `${(displayPrincipal / displayValue) * 85}%`,
              height: `${(displayPrincipal / displayValue) * 85}%`,
              opacity: 0.7,
            }}
          />
          
          {/* 중앙 텍스트 */}
          <div className="relative z-10 text-center">
            <div className="text-3xl md:text-4xl font-bold text-indigo-900 drop-shadow-sm">
              {formatMoney(displayValue)}
            </div>
            <div className={`text-sm font-semibold mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {profit >= 0 ? '+' : ''}{formatMoney(profit)} ({profitPercent.toFixed(1)}%)
            </div>
          </div>

          {/* 하이라이트 */}
          <div 
            className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/60 blur-md"
          />
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="relative grid grid-cols-3 gap-4 mt-4 text-center">
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-white/60">원금</div>
          <div className="text-lg font-bold text-cyan-300">{formatMoney(displayPrincipal)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-white/60">수익</div>
          <div className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}{formatMoney(profit)}
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-xs text-white/60">수익률</div>
          <div className={`text-lg font-bold ${profitPercent >= 0 ? 'text-purple-300' : 'text-red-400'}`}>
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 레코드 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-4">
        {sortedRecords.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex 
                ? 'bg-cyan-400 w-6' 
                : idx < currentIndex 
                  ? 'bg-white/60' 
                  : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes snowfall {
          0% { opacity: 0; transform: rotate(var(--angle)) translateY(0) scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle)) translateY(-80px) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SnowballAnimation;
