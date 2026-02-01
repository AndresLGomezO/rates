import {
  FinancialAccount,
  getCreditUtilizationInsight,
  isRevolvingCredit,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface CreditUtilizationWidgetProps {
  account: FinancialAccount;
}

export function CreditUtilizationWidget({
  account,
}: CreditUtilizationWidgetProps) {
  if (!isRevolvingCredit(account)) return null;
  const insight = getCreditUtilizationInsight(account);
  if (!insight) return null;

  const { currentUtilization, utilizationZone, availableCredit } = insight;

  // Color logic
  let strokeColor = '#22c55e'; // Green
  let zoneLabel = 'Excellent';
  let zoneColor = 'text-success-css';

  if (utilizationZone === 'critical') {
    strokeColor = '#ef4444'; // Red
    zoneLabel = 'Critical';
    zoneColor = 'text-danger-500';
  } else if (utilizationZone === 'very_high') {
    strokeColor = '#f97316'; // Orange
    zoneLabel = 'Very High';
    zoneColor = 'text-warning-500';
  } else if (utilizationZone === 'high') {
    strokeColor = '#eab308'; // Yellow
    zoneLabel = 'High';
    zoneColor = 'text-yellow-500';
  } else if (utilizationZone === 'good') {
    strokeColor = '#3b82f6'; // Blue
    zoneLabel = 'Good';
    zoneColor = 'text-primary-400';
  }

  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, currentUtilization) / 100) * circumference;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <h3 className="mb-6 text-xl font-bold text-white">Credit Utilization</h3>

      <div className="flex flex-col items-center gap-8 md:flex-row md:justify-around">
        {/* Visual Progress */}
        <div className="relative flex h-64 w-64 items-center justify-center">
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 256 256"
          >
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
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                filter: `drop-shadow(0 0 6px ${strokeColor}66)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold text-white">
              {Math.round(currentUtilization)}%
            </span>
            <span
              className={`text-sm uppercase tracking-wider ${zoneColor} mt-1 font-bold`}
            >
              {zoneLabel}
            </span>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Current Balance</span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(account.currentBalance.amount, account.currency)}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Credit Limit</span>
            <span className="font-mono text-white/50">
              {account.creditLimit
                ? formatCurrency(account.creditLimit.amount, account.currency)
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Available Credit</span>
            <span className="font-mono font-bold text-success-css">
              {formatCurrency(availableCredit.amount, availableCredit.currency)}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm leading-relaxed text-white/80">
              {utilizationZone === 'critical' || utilizationZone === 'very_high'
                ? 'Your utilization is high, which may negatively impact your credit score. Try to pay this down to below 30%.'
                : utilizationZone === 'high'
                  ? 'Your utilization is moderate. Paying it down below 30% is recommended for the best credit score impact.'
                  : 'Great job! Your utilization is in a healthy range.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
