import {
  FinancialAccount,
  getPayoffAcceleratorInsight,
} from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PayoffAcceleratorWidgetProps {
  account: FinancialAccount;
}

export function PayoffAcceleratorWidget({
  account,
}: PayoffAcceleratorWidgetProps) {
  const insight = getPayoffAcceleratorInsight(account);

  if (!insight || insight.scenarios.length === 0) return null;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="text-xl font-bold text-white">Payoff Accelerator</h3>
        <p className="text-sm text-white/60">
          See how extra monthly payments can save you money
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {insight.scenarios.map((scenario) => (
          <div
            key={scenario.extraPaymentAmount}
            className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/30 hover:bg-white/10 hover:shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-primary-500/20 px-3 py-1 text-xs font-bold text-primary-400">
                +{formatCurrency(scenario.extraPaymentAmount, account.currency)}
                /mo
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs text-white/50">Interest Saved</div>
              <div className="text-2xl font-bold text-success-css">
                {formatCurrency(scenario.interestSaved, account.currency)}
              </div>
            </div>

            <div className="mb-4 space-y-1">
              <div className="text-xs text-white/50">Time Saved</div>
              <div className="font-semibold text-white">
                {Math.floor(scenario.monthsSaved / 12)}y{' '}
                {scenario.monthsSaved % 12}m earlier
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 text-xs text-white/50">
              New Payoff:{' '}
              <span className="text-white/80">
                {formatDate(scenario.payoffDate)}
              </span>
            </div>

            {/* Hover Gradient */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        Estimates are based on your current balance and interest rate. Actual
        savings may vary.
      </p>
    </div>
  );
}
