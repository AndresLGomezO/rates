import React from 'react';
import {
  CommitmentInsight,
  OtherAccountInsightStatus,
} from '@rates/firebase-client';

interface CommitmentTrackerWidgetProps {
  insight: CommitmentInsight;
}

export const CommitmentTrackerWidget: React.FC<
  CommitmentTrackerWidgetProps
> = ({ insight }) => {
  if (insight.totalCommitments === 0) return null;

  return (
    <div className="ds-card-light overflow-hidden p-6 transition-all hover:shadow-lg">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Commitment Tracker</h3>
          <p className="text-sm text-white/60">
            {insight.totalCommitments} active commitments
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40">
            Overall
          </div>
          <div
            className={`text-sm font-bold ${getOverallColor(insight.overallStatus)}`}
          >
            {insight.overallStatus === 'great'
              ? 'Excellent'
              : insight.overallStatus === 'good'
                ? 'Good'
                : 'Needs Focus'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {insight.commitments.map((item, idx) => (
          <div
            key={`${item.accountId}-${idx}`}
            className="flex items-center justify-between rounded-lg bg-white/5 p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${getMoodColor(item.status)}`}
              >
                {getMoodIcon(item.status)}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white">{item.name}</span>
                <span className="text-[10px] text-white/50">
                  {item.hasPlan
                    ? item.status === 'overdue'
                      ? 'Missed payment'
                      : `${item.streak} month streak`
                    : 'No payment plan'}
                </span>
              </div>
            </div>

            {/* Streak dots visualization */}
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i < item.streak % 6 ? 'bg-emerald-500' : 'bg-white/10'}`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-blue-500/10 p-3 text-center text-xs text-blue-300">
        "A good name is better than riches."
        <div className="mt-1 font-bold text-blue-200/60">— Ancient Proverb</div>
      </div>
    </div>
  );
};

function getOverallColor(
  status: 'great' | 'good' | 'needs_improvement'
): string {
  switch (status) {
    case 'great':
      return 'text-emerald-400';
    case 'good':
      return 'text-blue-400';
    default:
      return 'text-amber-400';
  }
}

function getMoodColor(status: OtherAccountInsightStatus): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'overdue':
      return 'bg-red-500/20 text-red-400';
    case 'due_soon':
      return 'bg-amber-500/20 text-amber-400';
    case 'needs_attention':
      return 'bg-orange-500/20 text-orange-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

function getMoodIcon(status: OtherAccountInsightStatus): string {
  switch (status) {
    case 'on_track':
      return '✓';
    case 'overdue':
      return '!';
    case 'due_soon':
      return '⏱';
    case 'needs_attention':
      return '?';
    default:
      return '-';
  }
}
