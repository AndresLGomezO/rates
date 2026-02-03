import type { FreelanceGigIncome } from '@rates/firebase-client';
import { FreelanceInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface TaxSetAsideWidgetProps {
  income: FreelanceGigIncome;
}

export function TaxSetAsideWidget({ income }: TaxSetAsideWidgetProps) {
  const insights = FreelanceInsightsService.calculateInsights(income);
  const { tax } = insights;

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600/20 to-orange-400/10 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Tax Preparedness</h3>
            <p className="text-xs text-white/50">Suggested monthly set-aside</p>
          </div>
        </div>
      </div>

      <div className="p-6 pt-2">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">
            {formatCurrency(tax.estimatedMonthlyTax, income.currency)}
          </span>
          <span className="text-lg font-bold text-orange-400">/ mo</span>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Recommended Percentage
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white">
                {tax.suggestedPercentage}%
              </span>
              <span className="max-w-[140px] text-right text-xs italic text-white/40">
                Based on your average monthly income
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 p-3">
              <div className="mb-1 text-[8px] font-bold uppercase tracking-widest text-white/30">
                YTD Required
              </div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(tax.ytdTaxSetAsideRequired, income.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-white/5 p-3">
              <div className="mb-1 text-[8px] font-bold uppercase tracking-widest text-white/30">
                Yearly Projection
              </div>
              <div className="text-sm font-bold text-white/70">
                {formatCurrency(tax.totalYearlyTaxProjection, income.currency)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg bg-blue-500/10 p-3 italic">
            <svg
              className="mt-0.5 shrink-0 text-blue-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[10px] text-blue-200/70">
              Pro tip: Moving this to a separate, high-yield savings account as
              soon as you're paid ensures you're never caught off guard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
