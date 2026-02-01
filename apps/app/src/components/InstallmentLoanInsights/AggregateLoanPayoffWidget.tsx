import { useMemo } from 'react';
import { FinancialAccount, getLoanPayoffInsight } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface AggregateLoanPayoffWidgetProps {
  accounts: FinancialAccount[];
}

export function AggregateLoanPayoffWidget({
  accounts,
}: AggregateLoanPayoffWidgetProps) {
  const aggregateData = useMemo(() => {
    let totalOriginal = 0;
    let totalRemaining = 0;
    let totalPaid = 0;
    let currency = 'COP'; // Default, will verify against accounts

    // Check if there are accounts
    if (accounts.length > 0) {
      currency = accounts[0].currency;
    }

    accounts.forEach((account) => {
      const insight = getLoanPayoffInsight(account);
      if (insight) {
        totalOriginal += insight.originalPrincipal.amount;
        totalRemaining += insight.remainingPrincipal.amount;
        totalPaid += insight.principalPaid.amount;
      }
    });

    const progress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

    return {
      totalOriginal,
      totalRemaining,
      totalPaid,
      progress: Math.min(100, Math.max(0, progress)),
      currency,
      count: accounts.length,
    };
  }, [accounts]);

  const {
    totalOriginal,
    totalRemaining,
    totalPaid,
    progress,
    currency,
    count,
  } = aggregateData;

  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-12">
        {/* Title & Count - Mobile: Top, Desktop: Left/Top */}
        <div className="text-center md:text-left">
          <h3 className="mb-2 text-2xl font-bold text-white">
            Overall Loan Progress
          </h3>
          <p className="text-white/60">
            Tracking <span className="font-bold text-white">{count}</span>{' '}
            active installment loans
          </p>
        </div>

        {/* Progress Ring */}
        <div className="relative flex h-48 w-48 flex-shrink-0 items-center justify-center">
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 256 256"
          >
            <defs>
              <linearGradient
                id="aggProgressGradient"
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
              stroke="url(#aggProgressGradient)"
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
            <span className="text-3xl font-bold text-white">
              {Math.round(progress)}%
            </span>
            <span className="text-xs uppercase tracking-wider text-white/50">
              Paid
            </span>
          </div>
        </div>

        {/* Stats Breakdown */}
        <div className="flex w-full max-w-xs flex-col gap-4">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Total Paid</span>
            <span className="font-mono font-bold text-success-css">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Remaining</span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(totalRemaining, currency)}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Total Original</span>
            <span className="font-mono text-white/50">
              {formatCurrency(totalOriginal, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
