import type { InvestmentIncome, CurrencyCode } from '@rates/firebase-client';
import { InvestmentInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface FinancialIndependenceWidgetProps {
  investments: InvestmentIncome[];
  currency: CurrencyCode;
}

export function FinancialIndependenceWidget({
  investments,
  currency,
}: FinancialIndependenceWidgetProps) {
  // We'll use a placeholder for expenses or estimate from existing data if available
  // For now, let's assume a baseline expense profile
  const estimatedEssentialExpenses = 3000;

  const taxAnalysis =
    InvestmentInsightsService.calculateTaxAdjustedIncome(investments);
  const analysis = InvestmentInsightsService.calculateFinancialIndependence(
    taxAnalysis.afterTax,
    estimatedEssentialExpenses
  );

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🎯</span>
          <span>Path to Financial Independence</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          How much of your life is funded by investments?
        </p>
      </div>

      <div className="p-6">
        <div className="mb-10 text-center">
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            <svg className="h-full w-full" viewBox="0 0 36 36">
              <path
                className="stroke-white/5"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-primary-500 transition-all duration-1000 ease-out"
                strokeWidth="3"
                strokeDasharray={`${analysis.coveragePercentage}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white">
                {analysis.coveragePercentage.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase text-white/40">
                Covered
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Your investments pay for about{' '}
            <span className="font-bold text-white">
              {analysis.daysCovered.toFixed(1)} days
            </span>{' '}
            of each month.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Milestones */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
              FI Milestones
            </h4>
            <div className="space-y-3">
              {analysis.milestones.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${m.isAchieved ? 'border-primary-500/20 bg-primary-500/5' : 'bg-white/2 border-white/5'}`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${m.isAchieved ? 'bg-primary-500 text-black' : 'bg-white/10 text-white/20'}`}
                  >
                    {m.isAchieved ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`text-xs font-bold ${m.isAchieved ? 'text-white' : 'text-white/40'}`}
                    >
                      {m.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white/60">
                    {formatCurrency(m.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage Categories */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
              What's Covered
            </h4>
            <div className="space-y-4">
              {analysis.coveredCategories.map((c, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={
                        c.isFullyCovered
                          ? 'font-bold text-primary-400'
                          : 'text-white/60'
                      }
                    >
                      {c.isFullyCovered ? '✅' : '◐'} {c.label}
                    </span>
                    <span className="text-white/40">
                      {formatCurrency(c.amount, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full ${c.isFullyCovered ? 'bg-primary-500' : 'bg-primary-500/30'}`}
                      style={{ width: `${c.coveragePercentage}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                <p className="text-[10px] italic leading-relaxed text-white/40">
                  Expense baseline estimated at{' '}
                  {formatCurrency(estimatedEssentialExpenses, currency)} /
                  month. Connect your accounts to use actual expense data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
