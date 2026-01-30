import { FinancialAccount, getLoanPayoffInsight } from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface LoanPayoffWidgetProps {
  account: FinancialAccount;
}

export function LoanPayoffWidget({ account }: LoanPayoffWidgetProps) {
  const insight = getLoanPayoffInsight(account);

  if (!insight) return null;

  const progress = Math.min(100, Math.max(0, insight.progressPercentage));
  const radius = 80; // Bigger radius for detail view
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <h3 className="mb-6 text-xl font-bold text-white">
        Loan Payoff Progress
      </h3>

      <div className="flex flex-col items-center gap-8 md:flex-row md:justify-around">
        {/* Visual Progress */}
        <div className="relative flex h-64 w-64 items-center justify-center">
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 256 256"
          >
            <defs>
              <linearGradient
                id="progressGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold text-white">
              {Math.round(progress)}%
            </span>
            <span className="text-sm uppercase tracking-wider text-white/50">
              Paid Off
            </span>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Principal Paid</span>
            <span className="font-mono font-bold text-success-css">
              {formatCurrency(
                insight.principalPaid.amount,
                insight.principalPaid.currency
              )}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Remaining Balance</span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(
                insight.remainingPrincipal.amount,
                insight.remainingPrincipal.currency
              )}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Original Principal</span>
            <span className="font-mono text-white/50">
              {formatCurrency(
                insight.originalPrincipal.amount,
                insight.originalPrincipal.currency
              )}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-white/5 p-4">
            <div>
              <div className="text-xs uppercase text-white/50">
                Estimated Payoff
              </div>
              <div className="text-lg font-bold text-primary-400">
                {insight.estimatedPayoffDate
                  ? formatDate(insight.estimatedPayoffDate)
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-white/50">
                Remaining Payments
              </div>
              <div className="text-lg font-bold text-white">
                {insight.remainingPayments > 0
                  ? insight.remainingPayments
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
