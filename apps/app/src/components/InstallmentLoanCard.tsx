import { useNavigate } from 'react-router-dom';
import { FinancialAccount, getLoanPayoffInsight } from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../utils/formatters';

interface InstallmentLoanCardProps {
  account: FinancialAccount;
  getStatusColor: (status: string) => string;
}

export function InstallmentLoanCard({
  account,
  getStatusColor,
}: InstallmentLoanCardProps) {
  const navigate = useNavigate();
  const insight = getLoanPayoffInsight(account);

  if (!insight) return null; // Should not happen if confirmed installment loan, but safety first

  const progress = Math.min(100, Math.max(0, insight.progressPercentage));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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
            <div className="text-sm text-white/70">Remaining Balance</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(
                insight.remainingPrincipal.amount,
                insight.remainingPrincipal.currency
              )}
            </div>
            {'nextDueDate' in account && account.nextDueDate && (
              <div className="mt-1 text-xs text-white/50">
                Next payment:{' '}
                <span className="text-white/80">
                  {formatDate(
                    account.nextDueDate instanceof Date
                      ? account.nextDueDate
                      : account.nextDueDate.toDate()
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Ring */}
        <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center">
          {/* Background Circle */}
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 96 96"
          >
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className="text-primary-500 transition-all duration-1000 ease-out"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-white">
              {Math.round(progress)}%
            </span>
            <span className="text-[0.6rem] uppercase tracking-wider text-white/60">
              Paid
            </span>
          </div>
        </div>
      </div>

      {/* Hover decoration */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </div>
  );
}
