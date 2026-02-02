import type { SalaryIncome } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface ExtraPaycheckMonthWidgetProps {
  salary: SalaryIncome;
}

export function ExtraPaycheckMonthWidget({
  salary,
}: ExtraPaycheckMonthWidgetProps) {
  const currentYear = new Date().getFullYear();
  const extraMonths = SalaryInsightsService.getExtraPaycheckMonths(
    salary,
    currentYear
  );

  if (
    salary.paymentFrequency !== 'weekly' &&
    salary.paymentFrequency !== 'biweekly'
  ) {
    return null;
  }

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>📅</span>
          <span>Extra Paycheck Months ({currentYear})</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Months where you receive{' '}
          {salary.paymentFrequency === 'weekly' ? '5' : '3'} paychecks instead
          of the usual {salary.paymentFrequency === 'weekly' ? '4' : '2'}.
        </p>
      </div>

      <div className="p-6">
        {extraMonths.length === 0 ? (
          <p className="py-4 text-center text-white/40">
            No extra paycheck months identified for this year.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {extraMonths.map((m) => (
              <div
                key={m.month}
                className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4 transition-all hover:border-primary-500/40 hover:bg-primary-500/10"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-white">
                    {new Date(m.month + '-01T12:00:00Z').toLocaleString(
                      'default',
                      { month: 'long' }
                    )}
                  </span>
                  <span className="rounded-full bg-primary-500/20 px-3 py-1 text-xs font-bold text-primary-400">
                    {m.paycheckCount} Paychecks
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {m.dates.map((d, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70"
                    >
                      {d.getDate()}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-sm text-white/40">Total Extra</span>
                  <span className="text-lg font-bold text-success-400">
                    +{formatCurrency(m.extraAmount, salary.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-primary-900/20 px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-primary-400/60">
        Pro Tip: Use these extra paychecks to accelerate debt payoff or boost
        savings.
      </div>
    </div>
  );
}
