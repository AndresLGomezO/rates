import { useNavigate } from 'react-router-dom';
import { FinancialAccount, isBill } from '@rates/firebase-client';
import { formatCurrency, formatDate, toDate } from '../../utils/formatters';

interface BillCardProps {
  account: FinancialAccount;
  getStatusColor: (status: string) => string;
}

export function BillCard({ account }: BillCardProps) {
  const navigate = useNavigate();

  if (!isBill(account)) return null;

  const handleCardClick = () => {
    void navigate(`/account/${account.accountNumber}`);
  };

  const amount =
    typeof account.recurringAmount === 'number' ? account.recurringAmount : 0;
  const isVariable = account.isAmountVariable;

  // Determine bill status logic
  const today = new Date();
  const nextDue = account.nextDueDate ? toDate(account.nextDueDate) : null;

  let billStatus = 'upcoming';
  let daysUntil = 0;

  if (nextDue) {
    const diffTime = nextDue.getTime() - today.getTime();
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) billStatus = 'overdue';
    else if (daysUntil <= 3) billStatus = 'due_soon';
  }

  const getBillStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#22c55e'; // Green
      case 'overdue':
        return '#ef4444'; // Red
      case 'due_soon':
        return '#f97316'; // Orange
      default:
        return '#9ca3af'; // Gray
    }
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
              style={{ backgroundColor: getBillStatusColor(billStatus) }} // Use derived bill status color
            >
              {billStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="m-0 mb-4 font-mono text-sm text-white/60">
            {account.accountNumber}
          </p>

          <div className="flex flex-col gap-1">
            <div className="text-sm text-white/70">
              {isVariable ? 'Est. Amount' : 'Amount Due'}
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(amount, account.currency)}
              {isVariable && (
                <span className="ml-1 text-sm font-normal text-white/50">
                  (var)
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-0.5 text-xs text-white/50">
              {nextDue && (
                <span>
                  Due:{' '}
                  <span className="text-white/80">{formatDate(nextDue)}</span>
                  {daysUntil > 0 && (
                    <span className="ml-1 text-white/40">
                      ({daysUntil} days)
                    </span>
                  )}
                </span>
              )}
              <span className="capitalize">
                {account.paymentFrequency ?? 'Monthly'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Icon/Ring */}
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
          {billStatus === 'overdue' ? (
            <span className="text-2xl">⚠️</span>
          ) : billStatus === 'due_soon' ? (
            <span className="text-2xl">⏰</span>
          ) : (
            <span className="text-2xl">📅</span>
          )}
        </div>
      </div>

      {/* Hover decoration */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </div>
  );
}
