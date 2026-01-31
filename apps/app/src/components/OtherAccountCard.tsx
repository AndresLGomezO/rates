import { useNavigate } from 'react-router-dom';
import { OtherAccount } from '@rates/firebase-client';
import {
  getAvailableAccountDirection,
  getOtherAccountInsightStatus,
  OtherAccountInsightStatus,
} from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OtherAccountCardProps {
  account: OtherAccount; // Specifically expects OtherAccount
}

export function OtherAccountCard({ account }: OtherAccountCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    void navigate(`/account/${account.accountNumber}`);
  };

  const direction = getAvailableAccountDirection(account);
  const insightStatus = getOtherAccountInsightStatus(account);

  // Decide icon/color based on direction
  const isAsset = direction === 'asset';
  const icon = isAsset ? '💰' : '📉'; // Simple visual distinction

  // Status badge style
  const statusBadgeStyle = getInsightStatusStyle(insightStatus);

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
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${statusBadgeStyle}`}
            >
              {insightStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="m-0 mb-4 font-mono text-sm text-white/60">
            {account.category ?? 'Miscellaneous'}
          </p>

          <div className="flex flex-col gap-1">
            {account.currentAmount && (
              <>
                <div className="text-sm text-white/70">
                  {isAsset ? 'Amount Receivable' : 'Current Balance'}
                </div>
                <div
                  className={`text-2xl font-bold ${isAsset ? 'text-emerald-400' : 'text-white'}`}
                >
                  {formatCurrency(
                    account.currentAmount.amount,
                    account.currentAmount.currency
                  )}
                </div>
              </>
            )}

            {account.nextRelevantDate && (
              <div className="mt-1 text-xs text-white/50">
                Next Date:{' '}
                <span className="text-white/80">
                  {formatDate(
                    (account.nextRelevantDate as { toDate?: () => Date }).toDate
                      ? (
                          account.nextRelevantDate as { toDate: () => Date }
                        ).toDate()
                      : account.nextRelevantDate
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Icon/Indicator */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl">
          {icon}
        </div>
      </div>

      {/* Hover decoration */}
      <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </div>
  );
}

function getInsightStatusStyle(status: OtherAccountInsightStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-blue-500/20 text-blue-400';
    case 'overdue':
      return 'bg-red-500/20 text-red-400';
    case 'due_soon':
      return 'bg-amber-500/20 text-amber-400';
    case 'on_track':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'needs_attention':
      return 'bg-orange-500/20 text-orange-400';
    case 'tracking_only':
      return 'bg-slate-500/20 text-slate-400';
    default:
      return 'bg-slate-500/20 text-white';
  }
}
