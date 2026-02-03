import { useMemo } from 'react';
import {
  BenefitsIncome,
  BenefitsInsightsService,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface BenefitTimelineWidgetProps {
  benefit: BenefitsIncome;
}

export function BenefitTimelineWidget({ benefit }: BenefitTimelineWidgetProps) {
  const analysis = useMemo(() => {
    return BenefitsInsightsService.calculateBenefitDuration(benefit);
  }, [benefit]);

  if (!analysis.isTemporary) return null;

  const {
    endDate,
    elapsed,
    remaining,
    remainingValue,
    percentComplete,
    urgency,
  } = analysis;

  const getUrgencyStyles = () => {
    switch (urgency) {
      case 'critical':
        return 'text-danger-500 bg-danger-500/10 border-danger-500/20';
      case 'high':
        return 'text-warning-500 bg-warning-500/10 border-warning-500/20';
      case 'medium':
        return 'text-primary-400 bg-primary-400/10 border-primary-400/20';
      default:
        return 'text-success-400 bg-success-400/10 border-success-400/20';
    }
  };

  const getUrgencyLabel = () => {
    switch (urgency) {
      case 'critical':
        return 'Ending Soon! ⏰';
      case 'high':
        return 'A few months left';
      case 'medium':
        return 'Steady progress';
      default:
        return 'Long-term cushion';
    }
  };

  const isWeeks = benefit.benefitSubtype === 'unemployment';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">⏱️</span> Benefit Timeline
        </h3>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${getUrgencyStyles()}`}
        >
          {getUrgencyLabel()}
        </span>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-4xl font-black text-white">
              {remaining}
              <span className="ml-1 text-sm font-bold uppercase tracking-widest text-white/40">
                {isWeeks ? 'Weeks' : 'Months'}
              </span>
            </div>
            <div className="text-xs font-bold text-primary-400">REMAINING</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white/80">
              {endDate?.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              End Date
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>Started</span>
            <span>{Math.round(percentComplete || 0)}% Complete</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Total Elapsed
          </div>
          <div className="text-lg font-bold text-white">
            {elapsed} {isWeeks ? 'Weeks' : 'Months'}
          </div>
          <div className="mt-1 text-xs italic text-white/60">
            of {isWeeks ? 'maximum weeks' : 'duration'}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Remaining Value
          </div>
          <div className="text-lg font-bold text-success-400">
            {formatCurrency(remainingValue || 0, benefit.currency)}
          </div>
          <div className="mt-1 text-xs italic text-white/60">
            estimated total payout
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
          Transition Planning
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-white/70">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/5">
              <span className="text-[10px]">☐</span>
            </div>
            <span>Review expenses for potential cuts</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/5">
              <span className="text-[10px]">☐</span>
            </div>
            <span>
              Build cash buffer of{' '}
              {formatCurrency(
                benefit.benefitAmount.amount * 2,
                benefit.currency
              )}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/5">
              <span className="text-[10px]">☐</span>
            </div>
            <span>Explore alternative income sources</span>
          </div>
        </div>
      </div>
    </div>
  );
}
