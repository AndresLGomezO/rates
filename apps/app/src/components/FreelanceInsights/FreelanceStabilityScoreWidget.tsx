import type { FreelanceGigIncome } from '@rates/firebase-client';
import { FreelanceInsightsService } from '@rates/firebase-client';

interface FreelanceStabilityScoreWidgetProps {
  income: FreelanceGigIncome;
}

export function FreelanceStabilityScoreWidget({
  income,
}: FreelanceStabilityScoreWidgetProps) {
  const insights = FreelanceInsightsService.calculateInsights(income);
  const { stability } = insights;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-400';
      case 'fair':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-white/50';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-400';
      case 'fair':
        return 'text-yellow-500';
      case 'needs_work':
        return 'text-orange-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="ds-card-light p-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <h3 className="mb-2 text-lg font-bold uppercase tracking-widest text-white text-white/40">
          Freelance Stability Score
        </h3>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg
            viewBox="0 0 128 128"
            className="h-32 w-32 origin-center rotate-[-90deg]"
          >
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="white"
              strokeOpacity="0.1"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={364}
              strokeDashoffset={364 - (364 * stability.score) / 100}
              className={`${getRatingColor(stability.rating)} transition-all duration-1000 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white">
              {stability.score}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${getRatingColor(stability.rating)}`}
            >
              {stability.rating.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {stability.components.map((comp, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/50">
              <span>{comp.category}</span>
              <span className={getStatusColor(comp.status)}>
                {comp.message}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`delay- h-full transition-all duration-700${idx * 100} ${
                  comp.score / comp.maxScore > 0.8
                    ? 'bg-green-500'
                    : comp.score / comp.maxScore > 0.5
                      ? 'bg-blue-500'
                      : 'bg-orange-500'
                }`}
                style={{ width: `${(comp.score / comp.maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4 text-center">
        <p className="text-xs italic leading-relaxed text-white/40">
          "Your biggest risk currently is{' '}
          {stability.components.find((c) => c.score / c.maxScore < 0.6)
            ?.category || 'nothing specific'}
          . Improving this could boost your score by 10+ points."
        </p>
      </div>
    </div>
  );
}
