import { useMemo } from 'react';
import {
  BenefitsIncome,
  Income,
  BenefitsInsightsService,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface IncomeCliffWarningWidgetProps {
  benefit: BenefitsIncome;
  otherIncomes: Income[];
}

export function IncomeCliffWarningWidget({
  benefit,
  otherIncomes,
}: IncomeCliffWarningWidgetProps) {
  const analysis = useMemo(() => {
    return BenefitsInsightsService.calculateIncomeCliffWarning(
      benefit,
      otherIncomes
    );
  }, [benefit, otherIncomes]);

  if (!analysis.hasEarningsLimit) return null;

  const {
    status,
    percentOfLimit,
    annualLimit,
    currentEarnedIncome,
    buffer,
    impactIfOver,
    safeToEarnMonthly,
    limitDisappearsAt,
  } = analysis;

  const getStatusColor = () => {
    switch (status) {
      case 'safe':
        return 'text-success-400';
      case 'caution':
        return 'text-warning-400';
      case 'danger':
        return 'text-danger-400';
      case 'over':
        return 'text-danger-600';
      default:
        return 'text-white/60';
    }
  };

  const getProgressBarColor = () => {
    switch (status) {
      case 'safe':
        return 'bg-success-500';
      case 'caution':
        return 'bg-warning-500';
      case 'danger':
        return 'bg-danger-500';
      case 'over':
        return 'bg-danger-600';
      default:
        return 'bg-primary-500';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">⚠️</span> Income Cliff Warning
        </h3>
        {status === 'over' && (
          <span className="rounded-full bg-danger-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-danger-400 ring-1 ring-danger-500/30">
            Critical
          </span>
        )}
      </div>

      <div className="mb-8 rounded-xl border border-white/5 bg-white/5 p-4">
        <div className="mb-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Current Situation
          </div>
          <div className="text-sm font-medium text-white/80">
            {benefit.name} monthly benefit:{' '}
            <span className="text-white">
              {formatCurrency(benefit.benefitAmount.amount, benefit.currency)}
            </span>
          </div>
          <div className="text-sm font-medium text-white/80">
            Your other earned income:{' '}
            <span className="text-white">
              {formatCurrency(
                (currentEarnedIncome || 0) / 12,
                benefit.currency
              )}
              /month
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>Progress to limit</span>
            <span>{Math.round(percentOfLimit || 0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-1000 ease-out ${getProgressBarColor()}`}
              style={{ width: `${Math.min(100, percentOfLimit || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-white/40">
            <span>$0</span>
            <span>
              {formatCurrency(annualLimit || 0, benefit.currency)} (Annual
              Limit)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Status
          </div>
          <div className={`text-lg font-black capitalize ${getStatusColor()}`}>
            {status === 'safe' ? 'Safe Zone ✅' : status}
          </div>
          <div className="mt-1 text-xs text-white/60">
            {buffer && buffer > 0
              ? `${formatCurrency(buffer, benefit.currency)} under limit`
              : 'You have exceeded the limit'}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Safe to Earn More
          </div>
          <div className="text-lg font-black text-primary-400">
            {formatCurrency(safeToEarnMonthly || 0, benefit.currency)}
          </div>
          <div className="mt-1 text-xs text-white/60">
            per month without impact
          </div>
        </div>
      </div>

      {impactIfOver && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-danger-400">
            What happens if you go over
          </div>
          <div className="rounded-xl border border-danger-500/20 bg-danger-500/10 p-4">
            <div className="mb-2 font-bold text-white">
              {impactIfOver.formula}
            </div>
            {impactIfOver.type === 'cliff' ? (
              <p className="m-0 text-xs leading-relaxed text-danger-200/80">
                Unlike some benefits, this has a hard cutoff. Earning even $1
                over the limit could cost you{' '}
                <span className="font-bold">
                  {formatCurrency(
                    impactIfOver.potentialLoss || 0,
                    benefit.currency
                  )}
                  /year
                </span>
                .
              </p>
            ) : (
              <p className="m-0 text-xs leading-relaxed text-danger-200/80">
                Your benefits will be gradually reduced. For every $2 earned
                above the limit, $1 will be withheld from your future payments.
              </p>
            )}
          </div>
        </div>
      )}

      {limitDisappearsAt && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
          <span className="text-lg">💡</span>
          <div>
            <div className="mb-1 text-xs font-bold text-white">Good news</div>
            <p className="m-0 text-xs text-primary-100/70">
              This earnings limit typically expires at{' '}
              <span className="font-medium text-white">
                {limitDisappearsAt}
              </span>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
