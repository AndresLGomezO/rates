import type { InvestmentIncome } from '@rates/firebase-client';
import { InvestmentInsightsService } from '@rates/firebase-client';

interface InvestmentReliabilityWidgetProps {
  investments: InvestmentIncome[];
}

export function InvestmentReliabilityWidget({
  investments,
}: InvestmentReliabilityWidgetProps) {
  const analysis =
    InvestmentInsightsService.calculateReliabilityScore(investments);

  if (investments.length === 0) return null;

  const getStatusColor = (category: string) => {
    switch (category) {
      case 'very_high':
        return 'text-primary-400';
      case 'high':
        return 'text-primary-500';
      case 'moderate':
        return 'text-warning-400';
      case 'low':
      case 'very_low':
        return 'text-danger-400';
      default:
        return 'text-white/40';
    }
  };

  const getProgressColor = (category: string) => {
    switch (category) {
      case 'very_high':
      case 'high':
        return 'bg-primary-500';
      case 'moderate':
        return 'bg-warning-500';
      case 'low':
      case 'very_low':
        return 'bg-danger-500';
      default:
        return 'bg-white/10';
    }
  };

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🛡️</span>
          <span>Investment Reliability</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          How stable is your investment income?
        </p>
      </div>

      <div className="p-6">
        <div className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-8 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-white/40">
            Reliability Score
          </div>
          <div
            className={`mt-2 text-6xl font-black ${getStatusColor(analysis.scoreCategory)}`}
          >
            {analysis.overallScore}
            <span className="text-2xl text-white/20">/100</span>
          </div>
          <div
            className={`mt-2 text-sm font-bold uppercase tracking-wider ${getStatusColor(analysis.scoreCategory)}`}
          >
            {analysis.scoreCategory.replace('_', ' ')}
          </div>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-white/40">
            Your investment income is{' '}
            {analysis.scoreCategory === 'very_high'
              ? 'extremely stable'
              : analysis.scoreCategory === 'high'
                ? 'reasonably stable'
                : 'vulnerable to market conditions'}
            .
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
            Reliability by Source
          </h4>
          <div className="space-y-4">
            {analysis.bySource.map((source, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">
                      {source.name}
                    </span>
                    <span className="ml-2 text-[10px] uppercase text-white/30">
                      {source.type}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white/60">
                    {source.reliabilityScore}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full ${getProgressColor(source.reliabilityScore >= 80 ? 'high' : source.reliabilityScore >= 60 ? 'moderate' : 'low')}`}
                    style={{ width: `${source.reliabilityScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {analysis.concerns.length > 0 && (
          <div className="mt-8 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
              Reliability Concerns
            </h4>
            <div className="space-y-2">
              {analysis.concerns.map((concern, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-xl border border-danger-500/10 bg-danger-500/5 p-4"
                >
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="text-xs font-bold uppercase text-danger-400">
                      {concern.type.replace('_', ' ')}
                    </div>
                    <p className="mt-0.5 text-xs text-white/60">
                      {concern.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
