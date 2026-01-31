import { useNavigate } from 'react-router-dom';
import {
  FinancialAccount,
  getCreditUtilizationInsight,
  isRevolvingCredit,
} from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../utils/formatters';

interface RevolvingCreditCardProps {
  account: FinancialAccount;
  getStatusColor: (status: string) => string;
}

export function RevolvingCreditCard({
  account,
  getStatusColor,
}: RevolvingCreditCardProps) {
  const navigate = useNavigate();

  if (!isRevolvingCredit(account)) return null;

  const insight = getCreditUtilizationInsight(account);
  // Insight might be null if creditLimit is missing/zero, but we should still show the card.

  const utilization = insight ? insight.currentUtilization : 0;

  // Color coding
  let strokeColor = '#22c55e'; // Green
  if (utilization > 75) strokeColor = '#ef4444';
  else if (utilization > 50) strokeColor = '#f97316';
  else if (utilization > 30) strokeColor = '#eab308';

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, utilization) / 100) * circumference;

  const handleCardClick = () => {
    void navigate(`/account/${account.accountNumber}`);
  };

  return (
    <div
      className="ds-card-light group relative cursor-pointer overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="m-0 text-xl font-bold text-white transition-colors group-hover:text-primary-400">
              {account.accountName}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: getStatusColor(account.status) }}
            >
              {account.status.replace('_', ' ')}
            </span>
          </div>
          <p className="m-0 mb-4 font-mono text-sm text-white/60">
            {account.accountNumber}
          </p>

          <div className="flex flex-col gap-1">
            <div className="text-sm text-white/70">Current Balance</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(
                account.currentBalance.amount,
                account.currentBalance.currency
              )}
            </div>

            {/* Min Payment or Due Date info */}
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-white/50">
              {account.nextDueDate && (
                <span>
                  Due:{' '}
                  <span className="text-white/80">
                    {formatDate(account.nextDueDate)}
                  </span>
                </span>
              )}
              {account.currentMinimumPayment && (
                <span>
                  Min Payment:{' '}
                  <span className="text-white/80">
                    {formatCurrency(
                      account.currentMinimumPayment.amount,
                      account.currency
                    )}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Utilization Ring */}
        <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center">
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 96 96"
          >
            {/* Track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={strokeColor}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                filter: `drop-shadow(0 0 4px ${strokeColor}66)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-white">
              {Math.round(utilization)}%
            </span>
            <span className="text-[0.6rem] uppercase tracking-wider text-white/60">
              Used
            </span>
          </div>
        </div>
      </div>

      {/* Hover decoration */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </div>
  );
}
