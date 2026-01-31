import React from 'react';
import { VariableBillTrend } from '@rates/firebase-client';

interface VariableBillTrackerWidgetProps {
  trends: VariableBillTrend[];
}

export const VariableBillTrackerWidget: React.FC<
  VariableBillTrackerWidgetProps
> = ({ trends }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="ds-card-light p-6">
      <h3 className="m-0 mb-6 text-sm font-semibold uppercase tracking-wide text-white/70">
        Variable Bill Trends
      </h3>

      {trends.length === 0 ? (
        <div className="py-8 text-center italic text-white/40">
          No variable bills tracked.
        </div>
      ) : (
        <div className="space-y-4">
          {trends.map((trend) => (
            <div
              key={trend.accountId}
              className="rounded-lg border border-white/5 bg-white/5 p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-bold text-white">{trend.name}</div>
                  <div className="text-xs text-white/50">vs 12-mo avg</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">
                    {formatCurrency(trend.currentAmount)}
                  </div>
                  <div
                    className={`flex items-center justify-end gap-1 text-xs font-medium ${
                      trend.trendDirection === 'up'
                        ? 'text-red-400'
                        : trend.trendDirection === 'down'
                          ? 'text-green-400'
                          : 'text-white/50'
                    }`}
                  >
                    {trend.trendDirection === 'up'
                      ? '↗'
                      : trend.trendDirection === 'down'
                        ? '↘'
                        : '→'}
                    {Math.abs(trend.trendPercentage).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Simple Bar Visualization of Current vs Avg */}
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-2 text-[0.65rem] text-white/40">
                  <span>AVG: {formatCurrency(trend.averageAmount)}</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-700/50">
                  {/* Marker for Average */}
                  <div
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-white/30"
                    style={{ left: '50%' }}
                  />

                  {/* Bar for Current - Scaled simply relative to max(current, avg) * 1.5 for visuals */}
                  {/* Simplified approach: Just show % diff bar from center logic is complex for mini-chart. 
                                Let's just do a simple bar representing magnitude relative to a max container? 
                                No, let's keep it simple. */}
                  <div
                    className={`h-full ${
                      trend.trendDirection === 'up'
                        ? 'bg-red-500/60'
                        : trend.trendDirection === 'down'
                          ? 'bg-green-500/60'
                          : 'bg-blue-500/60'
                    }`}
                    style={{ width: '100%' }} // Placeholder for real sparkline later
                  />
                </div>
                {trend.anomaly === 'high' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-300">
                    ⚠️ Unusually high (+
                    {Math.abs(trend.trendPercentage).toFixed(0)}%)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
