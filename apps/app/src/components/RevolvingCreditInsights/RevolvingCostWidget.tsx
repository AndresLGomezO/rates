import {
  FinancialAccount,
  getRevolvingCostInsight,
  isRevolvingCredit,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface RevolvingCostWidgetProps {
  account: FinancialAccount;
}

export function RevolvingCostWidget({ account }: RevolvingCostWidgetProps) {
  if (!isRevolvingCredit(account)) return null;
  const insight = getRevolvingCostInsight(account);
  if (!insight) return null;

  const {
    currentMinPayment,
    currentInterestCharged,
    currentPrincipalPaid,
    isTreadingWater,
    minPayoffProjection,
  } = insight;

  const minPaymentAmount = currentMinPayment.amount;
  const interestAmount = currentInterestCharged.amount;
  const principalAmount = currentPrincipalPaid.amount;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">
          The Cost of Minimum Payments
        </h3>
        {isTreadingWater && (
          <span className="rounded-full border border-danger-500/30 bg-danger-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-danger-500">
            ⚠️ Treading Water
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Payment Anatomy Bar */}
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Payment Anatomy
          </h4>
          <div className="rounded-lg border border-white/5 bg-neutral-800 p-4">
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-white/70">Typical Min Payment</span>
              <span className="font-bold text-white">
                {formatCurrency(minPaymentAmount, account.currency)}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="mb-2 flex h-4 w-full overflow-hidden rounded-full bg-neutral-700">
              <div
                className="h-full bg-blue-600"
                style={{
                  width: `${Math.min(100, (interestAmount / minPaymentAmount) * 100)}%`,
                }}
              />
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${Math.min(100, (principalAmount / minPaymentAmount) * 100)}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                <span className="text-white/60">
                  Interest: {formatCurrency(interestAmount, account.currency)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-white/60">
                  Principal: {formatCurrency(principalAmount, account.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Projection / Trap Warning */}
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Long Term Impact
          </h4>
          <div
            className={`rounded-lg border p-4 ${isTreadingWater ? 'border-danger-500/30 bg-danger-900/10' : 'border-white/5 bg-neutral-800'}`}
          >
            {isTreadingWater ? (
              <>
                <p className="mb-2 font-bold text-danger-400">
                  You are barely covering interest.
                </p>
                <p className="mb-3 text-sm text-white/70">
                  At this rate, you'll be paying this debt for decades.
                </p>
              </>
            ) : (
              <p className="mb-3 text-sm text-white/70">
                Making only minimum payments will significantly extend your debt
                repayment.
              </p>
            )}

            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-sm text-white/60">
                Projected Payoff Time
              </span>
              <span className="text-lg font-bold text-white">
                {minPayoffProjection.willPayoff
                  ? `${(minPayoffProjection.monthsToPayoff / 12).toFixed(1)} Years`
                  : '> 100 Years'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-sm text-white/60">
                Total Future Interest
              </span>
              <span className="font-bold text-danger-400">
                {formatCurrency(
                  minPayoffProjection.totalInterestPaid.amount,
                  account.currency
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
