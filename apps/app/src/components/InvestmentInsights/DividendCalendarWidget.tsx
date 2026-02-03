import type { InvestmentIncome, CurrencyCode } from '@rates/firebase-client';
import { InvestmentInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface DividendCalendarWidgetProps {
  investments: InvestmentIncome[];
  currency: CurrencyCode;
}

export function DividendCalendarWidget({
  investments,
  currency,
}: DividendCalendarWidgetProps) {
  const analysis =
    InvestmentInsightsService.generateDividendCalendar(investments);

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>📅</span>
          <span>Income Calendar</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          When does your investment income arrive?
        </p>
      </div>

      <div className="p-6">
        {/* Next 3 Months */}
        <div className="space-y-6">
          {analysis.calendar.map((month, mIdx) => (
            <div key={mIdx} className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-sm font-bold uppercase tracking-wider text-white">
                  {month.month.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-sm font-black text-primary-400">
                  {formatCurrency(month.total, currency)}
                </span>
              </div>
              <div className="space-y-2">
                {month.payments.map((payment, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">
                        {payment.source}
                      </span>
                      <span className="text-[10px] uppercase text-white/40">
                        {payment.sourceType}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white/80">
                      {formatCurrency(payment.amount, currency)}
                    </span>
                  </div>
                ))}
                {month.payments.length === 0 && (
                  <p className="py-2 text-center text-xs italic text-white/20">
                    No payments scheduled
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area (Simplified) */}
        <div className="mt-10">
          <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/40">
            Yearly Income Pattern
          </h4>
          <div className="flex h-32 items-end justify-between gap-1 px-2">
            {analysis.yearlyPattern.map((amount, idx) => {
              const height =
                analysis.maxMonth > 0 ? (amount / analysis.maxMonth) * 100 : 0;
              const isPeak = analysis.peakMonths.includes(idx);
              const isLight = analysis.lightMonths.includes(idx);

              return (
                <div
                  key={idx}
                  className="group relative flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 ${isPeak ? 'bg-primary-500' : isLight ? 'bg-white/10' : 'bg-primary-500/30'} group-hover:bg-primary-400`}
                    style={{ height: `${Math.max(4, height)}%` }}
                  />
                  <span className="text-[10px] text-white/30">
                    {monthNames[idx][0]}
                  </span>

                  {/* Tooltip */}
                  <div className="absolute -top-10 scale-0 rounded bg-white px-2 py-1 text-[10px] font-bold text-black transition-all group-hover:scale-100">
                    {formatCurrency(amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-8 rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-xs font-bold text-white">Variation Insight</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/40">
                Your income varies by{' '}
                {formatCurrency(analysis.variability, currency)} month-to-month.
                {analysis.suggestions[0] ||
                  'Plan your expenses around lighter months.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
