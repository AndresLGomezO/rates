import React from 'react';
import {
  ObligationsInsight,
  OtherAccountInsightStatus,
} from '@rates/firebase-client';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ObligationsOverviewWidgetProps {
  insight: ObligationsInsight;
}

export const ObligationsOverviewWidget: React.FC<
  ObligationsOverviewWidgetProps
> = ({ insight }) => {
  if (insight.liabilityCount === 0) return null;

  return (
    <div className="ds-card-light overflow-hidden p-6 transition-all hover:shadow-lg">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white">Obligations Overview</h3>
        <p className="text-sm text-white/60">
          {insight.liabilityCount} items • Total Outstanding
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            {formatCurrency(insight.totalOutstanding, 'USD')}
          </span>
          {insight.totalPaid > 0 && (
            <span className="text-xs text-emerald-400">
              {Math.round(insight.progressPercentage)}% paid off
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {insight.items.slice(0, 5).map((item, idx) => (
          <div key={`${item.accountId}-${idx}`} className="group">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-white transition-colors group-hover:text-primary-400">
                {item.name}
              </span>
              <span className="font-mono text-white/80">
                {formatCurrency(item.amount, 'USD')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                style={{ width: `${item.progress}%` }}
              ></div>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-white/50">
                {item.nextDate
                  ? `Due: ${formatDate(item.nextDate, { month: 'short', day: 'numeric' })}`
                  : 'No due date'}
              </span>
              <StatusText status={item.status} />
            </div>
          </div>
        ))}
      </div>

      {insight.items.length > 5 && (
        <div className="mt-4 text-center">
          <span className="text-xs text-white/40">
            +{insight.items.length - 5} more items
          </span>
        </div>
      )}
    </div>
  );
};

const StatusText = ({ status }: { status: OtherAccountInsightStatus }) => {
  const colors = {
    completed: 'text-blue-400',
    overdue: 'text-red-400',
    due_soon: 'text-amber-400',
    on_track: 'text-emerald-400',
    needs_attention: 'text-orange-400',
    tracking_only: 'text-slate-400',
  };

  const labels = {
    completed: 'Completed',
    overdue: 'Overdue',
    due_soon: 'Due Soon',
    on_track: 'On Track',
    needs_attention: 'Needs Plan',
    tracking_only: 'Tracking',
  };

  return (
    <span className={`text-[10px] font-bold uppercase ${colors[status]}`}>
      {labels[status]}
    </span>
  );
};

function getStatusColor(status: OtherAccountInsightStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-blue-500';
    case 'overdue':
      return 'bg-red-500';
    case 'due_soon':
      return 'bg-amber-500';
    case 'on_track':
      return 'bg-emerald-500';
    case 'needs_attention':
      return 'bg-orange-500';
    default:
      return 'bg-slate-500';
  }
}
