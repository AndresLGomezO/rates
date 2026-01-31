import {
  FinancialAccount,
  getRevolvingPayoffAcceleratorInsight,
  isRevolvingCredit,
} from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RevolvingPayoffAcceleratorWidgetProps {
  account: FinancialAccount;
}

export function RevolvingPayoffAcceleratorWidget({
  account,
}: RevolvingPayoffAcceleratorWidgetProps) {
  if (!isRevolvingCredit(account)) return null;
  const insight = getRevolvingPayoffAcceleratorInsight(account);
  if (!insight) return null;

  const { minPayoffPath, scenarios } = insight;

  // If no scenarios (e.g. balance is 0 or error), show nothing or message.
  if (scenarios.length === 0) return null;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="mb-6">
        <h3 className="mb-2 text-xl font-bold text-white">
          Payoff Accelerator
        </h3>
        <p className="text-sm text-white/70">
          Switching to a higher, fixed monthly payment can save you thousands in
          interest and shave years off your debt.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
              <th className="pb-3 font-semibold">Strategy</th>
              <th className="pb-3 font-semibold">Monthly Pay</th>
              <th className="pb-3 font-semibold">Payoff Date</th>
              <th className="pb-3 text-right font-semibold">Interest Saved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* Baseline Row */}
            <tr className="group">
              <td className="py-4 pr-4">
                <div className="font-bold text-white/60">Minimum Payment</div>
                <div className="text-xs text-danger-400">The "Trap" Path</div>
              </td>
              <td className="py-4 pr-4 text-white/60">
                Starts at{' '}
                {account.currentMinimumPayment
                  ? formatCurrency(
                      account.currentMinimumPayment.amount,
                      account.currency
                    )
                  : '2%'}
                <div className="text-xs">Declines over time</div>
              </td>
              <td className="py-4 pr-4 text-white/60">
                {minPayoffPath.willPayoff
                  ? minPayoffPath.projectedPayoffDate
                    ? formatDate(minPayoffPath.projectedPayoffDate)
                    : 'Unknown'
                  : '> 100 Years'}
                <div className="text-xs">
                  {(minPayoffPath.monthsToPayoff / 12).toFixed(1)} Years
                </div>
              </td>
              <td className="py-4 text-right text-white/60">-</td>
            </tr>

            {/* Scenarios */}
            {scenarios.map((scenario, index) => (
              <tr
                key={index}
                className="group transition-colors hover:bg-white/5"
              >
                <td className="py-4 pr-4">
                  <div className="font-bold text-success-css">
                    Fixed Payment
                  </div>
                  <div className="text-xs text-white/50">
                    {(scenario.monthsToPayoff / 12).toFixed(1)} Year Plan
                  </div>
                </td>
                <td className="py-4 pr-4 text-lg font-bold text-white">
                  {formatCurrency(scenario.paymentAmount, account.currency)}
                </td>
                <td className="py-4 pr-4 text-white">
                  {formatDate(scenario.payoffDate)}
                  <div className="text-xs font-bold text-success-css">
                    {Math.round(scenario.monthsFaster / 12)} Years faster
                  </div>
                </td>
                <td className="py-4 text-right">
                  <span className="inline-block rounded-full border border-success-css/20 bg-success-css/10 px-2 py-1 text-xs font-bold text-success-css">
                    Save{' '}
                    {formatCurrency(
                      scenario.savingsVsMinimum,
                      account.currency
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-xl border border-primary-500/20 bg-primary-900/20 p-4">
        <div className="text-2xl">💡</div>
        <div>
          <p className="mb-1 font-bold text-primary-200">Recommendation</p>
          <p className="text-sm text-white/80">
            Pick a fixed amount you can afford (e.g., the 3-year plan) and set
            up an automatic payment. Treat it like a fixed bill, not a credit
            card minimum.
          </p>
        </div>
      </div>
    </div>
  );
}
