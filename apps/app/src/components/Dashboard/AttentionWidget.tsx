import type { AttentionItem } from '@rates/firebase-client';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  items: AttentionItem[];
}

export function AttentionWidget({ items }: Props) {
  // If no items, show simplified "All Clear"
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-700/30 bg-neutral-900/40 p-6 text-center backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">All Clear</h3>
          <p className="text-sm text-neutral-400">
            You're all caught up. Great job!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <AttentionCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const navigate = useNavigate();

  const isUrgent = item.priority === 'urgent';
  const bgClass = isUrgent
    ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
    : 'bg-neutral-800/40 border-neutral-700/50 hover:border-neutral-600';

  const iconColor = isUrgent ? 'text-rose-400' : 'text-yellow-400';

  return (
    <div
      className={`group flex items-center justify-between gap-4 rounded-xl border p-4 transition-all ${bgClass}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/20 ${iconColor}`}
        >
          {isUrgent ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>
        <div>
          <div>
            <h4 className="font-semibold text-white">{item.title}</h4>
            <p className="text-sm text-neutral-400">
              <span className="text-neutral-300">{item.accountName}</span>
              {item.amount && item.currency ? (
                <>
                  {' • '}
                  <span className="font-medium text-white">
                    {formatCurrency(item.amount, item.currency)}
                  </span>
                  {item.message ? ` • ${item.message}` : ''}
                </>
              ) : item.message ? (
                ` • ${item.message}`
              ) : (
                ''
              )}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          void navigate(item.actionLink);
        }}
        className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        {item.actionLabel}
      </button>
    </div>
  );
}
