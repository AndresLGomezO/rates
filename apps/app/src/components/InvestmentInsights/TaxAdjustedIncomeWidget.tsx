import type { InvestmentIncome, CurrencyCode } from '@rates/firebase-client';
import { InvestmentInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface TaxAdjustedIncomeWidgetProps {
  investments: InvestmentIncome[];
  currency: CurrencyCode;
}

export function TaxAdjustedIncomeWidget({
  investments,
  currency,
}: TaxAdjustedIncomeWidgetProps) {
  const analysis =
    InvestmentInsightsService.calculateTaxAdjustedIncome(investments);

  if (analysis.totalGross === 0) return null;

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>💰</span>
          <span>What You Actually Keep</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Estimated after-tax reality of your investments.
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Main Stats */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Gross Monthly
                </span>
                <span className="text-2xl font-black text-white">
                  {formatCurrency(analysis.totalGross, currency)}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1 border-t border-white/5 pt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-danger-400 text-white/40">
                  Est. Monthly Tax
                </span>
                <span className="text-xl font-bold text-danger-400">
                  −{formatCurrency(analysis.totalTax, currency)}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-400">
                  Net Take-Home
                </span>
                <span className="text-3xl font-black text-primary-400">
                  {formatCurrency(analysis.afterTax, currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="text-xs text-white/60">Effective Tax Rate</span>
              <span className="text-sm font-bold text-white">
                {analysis.effectiveRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Breakdown / Comparison */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
                Tax Treatment Efficiency
              </h4>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">
                      Your Effective Reality
                    </span>
                    <span className="font-bold text-white">
                      {analysis.keepRate.toFixed(1)}% kept
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${analysis.keepRate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">
                      If all was Salary (Reg. Income)
                    </span>
                    <span className="font-bold text-white/40">
                      {(
                        100 -
                        (analysis.comparisonToOrdinary.ordinaryTax /
                          analysis.totalGross) *
                          100
                      ).toFixed(1)}
                      % kept
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-white/20"
                      style={{
                        width: `${100 - (analysis.comparisonToOrdinary.ordinaryTax / analysis.totalGross) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
              <p className="text-xs text-white/80">
                <span className="font-bold text-primary-400">
                  Tax Benefit:{' '}
                </span>
                You save{' '}
                <span className="font-bold text-white">
                  {formatCurrency(
                    analysis.comparisonToOrdinary.savings,
                    currency
                  )}
                  /mo
                </span>{' '}
                by earning through investments vs. regular salary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
