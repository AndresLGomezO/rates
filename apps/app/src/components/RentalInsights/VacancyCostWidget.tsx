import type { RentalIncome } from '@rates/firebase-client';
import { RentalInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface VacancyCostWidgetProps {
  rental: RentalIncome;
}

export function VacancyCostWidget({ rental }: VacancyCostWidgetProps) {
  const analysis = RentalInsightsService.calculateVacancyCost(rental);

  return (
    <div className="ds-card-light overflow-hidden border-danger-500/30">
      <div className="border-b border-danger-500/20 bg-danger-500/10 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🚨</span>
          <span>The Real Cost of Vacancy</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Carrying costs stop for no one. Here's what this vacancy is costing
          you.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Days Vacant
            </div>
            <div className="text-3xl font-black text-white">
              {analysis.daysVacant} Days
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Total Cost so far
            </div>
            <div className="text-3xl font-black text-danger-400">
              {formatCurrency(analysis.totalCostSoFar, analysis.currency)}
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Daily Impact
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">
                {formatCurrency(analysis.totalDailyCost, analysis.currency)}
              </span>
              <span className="text-xs text-white/40">/ day</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Profit Wipeout
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-danger-400">
                {analysis.monthsOfProfitLost.toFixed(1)} months
              </span>
              <span className="text-xs text-white/40">of profit lost</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Cost Projection
          </h4>
          <div className="space-y-2">
            {analysis.weeklyProjection.map((proj) => (
              <div key={proj.week} className="flex items-center gap-4">
                <span className="w-16 text-xs font-bold text-white/60">
                  Week {proj.week}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-2 bg-danger-500/40"
                    style={{
                      width: `${(proj.cost / analysis.weeklyProjection[analysis.weeklyProjection.length - 1].cost) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-24 text-right text-xs font-bold text-white/80">
                  {formatCurrency(proj.cost, analysis.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-bold text-primary-400">
                Strategy Insight
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                A {formatCurrency(100, analysis.currency)}/month rent reduction
                costs you{' '}
                {formatCurrency(
                  analysis.rentReductionAnalysis.annualCost,
                  analysis.currency
                )}{' '}
                per year, but it avoids the total loss of 1 month vacancy which
                costs you{' '}
                <span className="font-bold text-white">
                  {formatCurrency(
                    analysis.totalDailyCost * 30,
                    analysis.currency
                  )}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
