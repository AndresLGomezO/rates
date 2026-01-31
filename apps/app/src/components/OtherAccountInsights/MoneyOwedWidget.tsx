import React from 'react';
import {
  MoneyOwedInsight,
  OtherAccountInsightStatus,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface MoneyOwedWidgetProps {
  insight: MoneyOwedInsight;
}

export const MoneyOwedWidget: React.FC<MoneyOwedWidgetProps> = ({
  insight,
}) => {
  if (insight.count === 0) return null;

  return (
    <div className="ds-card-light overflow-hidden p-6 transition-all hover:shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Money Owed to You</h3>
          <p className="text-sm text-white/60">
            {formatCurrency(insight.totalReceivable, 'USD')} • {insight.count}{' '}
            items
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {insight.items.map((item, idx) => (
          <div
            key={`${item.accountId}-${idx}`}
            className="group relative rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="font-semibold text-white">{item.name}</div>
                <div className="text-xs text-white/50">
                  {item.ageDays} days ago • {item.notes ?? 'No notes'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-400">
                  {formatCurrency(item.amount, 'USD')}
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>

            {/* Aging Bar Visualization */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-white/40">
                <span>0d</span>
                <span>30d</span>
                <span>60d</span>
                <span>90d+</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                {/* Tick marks */}
                <div className="absolute left-1/3 h-full w-px bg-white/10"></div>
                <div className="absolute left-2/3 h-full w-px bg-white/10"></div>

                {/* Progress fill */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getAgingColor(item.ageDays)}`}
                  style={{
                    width: `${Math.min(100, (item.ageDays / 90) * 100)}%`,
                  }}
                ></div>
              </div>

              {item.ageDays > 30 && (
                <div className="mt-2 text-xs font-medium text-amber-400/90">
                  ⚠️ Outstanding for {item.ageDays} days. Consider a reminder.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {insight.actionableItems > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <button className="text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
            View {insight.actionableItems} follow-up suggestions →
          </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: OtherAccountInsightStatus }) => {
  const styles = {
    completed: 'bg-blue-500/20 text-blue-400',
    overdue: 'bg-red-500/20 text-red-400',
    due_soon: 'bg-amber-500/20 text-amber-400',
    on_track: 'bg-emerald-500/20 text-emerald-400',
    needs_attention: 'bg-orange-500/20 text-orange-400',
    tracking_only: 'bg-slate-500/20 text-slate-400',
  };

  const labels = {
    completed: 'Completed',
    overdue: 'Overdue',
    due_soon: 'Due Soon',
    on_track: 'Active',
    needs_attention: 'Needs Plan',
    tracking_only: 'Tracking',
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

function getAgingColor(days: number): string {
  if (days < 30) return 'bg-emerald-500';
  if (days < 60) return 'bg-amber-500';
  if (days < 90) return 'bg-orange-500';
  return 'bg-red-500';
}
