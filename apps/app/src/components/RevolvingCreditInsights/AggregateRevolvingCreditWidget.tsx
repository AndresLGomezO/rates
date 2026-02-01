import { useMemo } from 'react';
import { FinancialAccount, isRevolvingCredit } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface AggregateRevolvingCreditWidgetProps {
  accounts: FinancialAccount[];
}

export function AggregateRevolvingCreditWidget({
  accounts,
}: AggregateRevolvingCreditWidgetProps) {
  const aggregateData = useMemo(() => {
    let totalBalance = 0;
    let totalLimit = 0;
    let currency = 'COP'; // Default

    if (accounts.length > 0) {
      currency = accounts[0].currency;
    }

    accounts.forEach((account) => {
      if (isRevolvingCredit(account)) {
        totalBalance += account.currentBalance.amount;
        if (account.creditLimit) {
          totalLimit += account.creditLimit.amount;
        }
      }
    });

    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    const available = Math.max(0, totalLimit - totalBalance);

    return {
      totalBalance,
      totalLimit,
      utilization,
      available,
      currency,
      count: accounts.length,
    };
  }, [accounts]);

  const { totalBalance, totalLimit, utilization, available, currency, count } =
    aggregateData;

  // Color coding for utilization
  let strokeColor = '#22c55e'; // Green
  if (utilization > 75)
    strokeColor = '#ef4444'; // Red
  else if (utilization > 50)
    strokeColor = '#f97316'; // Orange
  else if (utilization > 30) strokeColor = '#eab308'; // Yellow

  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, utilization) / 100) * circumference;

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-12">
        {/* Title & Count */}
        <div className="text-center md:text-left">
          <h3 className="mb-2 text-2xl font-bold text-white">
            Credit Utilization
          </h3>
          <p className="text-white/60">
            Across <span className="font-bold text-white">{count}</span> active
            credit accounts
          </p>
        </div>

        {/* Progress Ring */}
        <div className="relative flex h-48 w-48 flex-shrink-0 items-center justify-center">
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
                filter: `drop-shadow(0 0 6px ${strokeColor}66)`, // 66 = 40% opacity
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-white">
              {Math.round(utilization)}%
            </span>
            <span className="text-xs uppercase tracking-wider text-white/50">
              Used
            </span>
          </div>
        </div>

        {/* Stats Breakdown */}
        <div className="flex w-full max-w-xs flex-col gap-4">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Total Debt</span>
            <span className="font-mono font-bold text-white">
              {formatCurrency(totalBalance, currency)}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Available</span>
            <span className="font-mono font-bold text-success-css">
              {formatCurrency(available, currency)}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">Total Limit</span>
            <span className="font-mono text-white/50">
              {formatCurrency(totalLimit, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
