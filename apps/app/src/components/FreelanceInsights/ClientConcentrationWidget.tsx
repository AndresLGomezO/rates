import type { FreelanceGigIncome } from '@rates/firebase-client';
import { FreelanceInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface ClientConcentrationWidgetProps {
  income: FreelanceGigIncome;
}

export function ClientConcentrationWidget({
  income,
}: ClientConcentrationWidgetProps) {
  const insights = FreelanceInsightsService.calculateInsights(income);
  const { concentration } = insights;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-white/20';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low':
        return 'Low Risk';
      case 'moderate':
        return 'Moderate Risk';
      case 'high':
        return 'High Risk';
      default:
        return 'Unknown';
    }
  };

  if (concentration.clientBreakdown.length === 0) {
    return (
      <div className="ds-card-light p-6 text-center">
        <h3 className="mb-4 text-lg font-bold uppercase tracking-widest text-white text-white/40">
          Client Diversification
        </h3>
        <p className="text-sm italic text-white/50">
          Start logging payments for individual clients to see your
          diversification risk.
        </p>
      </div>
    );
  }

  return (
    <div className="ds-card-light p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-lg font-bold text-white">
            Income Diversification
          </h3>
          <p className="text-xs text-white/50">
            Risk of relying on too few sources
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white ${getRiskColor(concentration.riskLevel)}`}
          >
            {getRiskLabel(concentration.riskLevel)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>Client Breakdown</span>
            <span>% of Income</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
            {concentration.clientBreakdown.map((client, idx) => (
              <div
                key={idx}
                className={`h-full border-r border-black/20 transition-all duration-1000 last:border-0 ${
                  idx === 0
                    ? 'bg-primary-500'
                    : idx === 1
                      ? 'bg-primary-700'
                      : idx === 2
                        ? 'bg-blue-600'
                        : 'bg-neutral-600'
                }`}
                style={{ width: `${client.percentage}%` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {concentration.clientBreakdown.slice(0, 4).map((client, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    idx === 0
                      ? 'bg-primary-500'
                      : idx === 1
                        ? 'bg-primary-700'
                        : idx === 2
                          ? 'bg-blue-600'
                          : 'bg-neutral-600'
                  }`}
                />
                <span className="line-clamp-1 font-medium text-white/80">
                  {client.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="line-clamp-1 text-white/40">
                  {formatCurrency(client.amount, income.currency)}
                </span>
                <span className="w-10 text-right font-bold text-white">
                  {Math.round(client.percentage)}%
                </span>
              </div>
            </div>
          ))}
          {concentration.clientBreakdown.length > 4 && (
            <div className="pt-1 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
              + {concentration.clientBreakdown.length - 4} more sources
            </div>
          )}
        </div>

        {concentration.riskLevel === 'high' && (
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="text-[10px] font-medium leading-relaxed text-red-200/70">
              ⚠️ <strong>Concentration Risk:</strong>{' '}
              {concentration.topClientName} accounts for{' '}
              {Math.round(concentration.topClientPercentage)}% of your income.
              Losing this client would have a major impact.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
