import { useEffect, useState } from 'react';
import type { FinancialHealthScore } from '@rates/firebase-client';

interface Props {
  healthScore: FinancialHealthScore;
}

export function HealthScoreWidget({ healthScore }: Props) {
  const { totalScore, status, components } = healthScore;

  // Status Colors
  const getColor = (s: typeof status) => {
    switch (s) {
      case 'excellent':
        return 'text-emerald-400';
      case 'good':
        return 'text-blue-400';
      case 'fair':
        return 'text-yellow-400';
      case 'needs_work':
        return 'text-orange-400';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-white';
    }
  };

  const colorClass = getColor(status);

  // Animated Counter
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const start = 0;
    const end = totalScore;
    if (start === end) return;

    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      setDisplayScore(Math.floor(easeOut * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalScore]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-700/30 bg-neutral-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Financial Health
        </h3>
        <span
          className={`rounded-full bg-white/5 px-2 py-0.5 text-xs font-bold ${colorClass}`}
        >
          {status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex h-32 w-32 items-center justify-center">
          {/* Simple SVG Ring */}
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-neutral-800"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * displayScore) / 100}
              strokeLinecap="round"
              className={`${colorClass} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colorClass}`}>
              {displayScore}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ScoreComponent label="Habits" val={components.paymentHabits.score} />
        <ScoreComponent label="Debt" val={components.debtLevel.score} />
        <ScoreComponent label="Credit" val={components.creditHealth.score} />
        <ScoreComponent
          label="Momentum"
          val={components.progressMomentum.score}
        />
      </div>
    </div>
  );
}

function ScoreComponent({ label, val }: { label: string; val: number }) {
  let color = 'bg-emerald-500';
  if (val < 60) color = 'bg-red-500';
  else if (val < 80) color = 'bg-yellow-500';

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 p-2">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span>{val}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${val}%` }}
        />
      </div>
    </div>
  );
}
