import type { SalaryIncome } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface SalaryYTDWidgetProps {
  salary: SalaryIncome;
}

export function SalaryYTDWidget({ salary }: SalaryYTDWidgetProps) {
  const currentYear = new Date().getFullYear();
  const stats = SalaryInsightsService.getSalaryYTDAndProjection(
    salary,
    currentYear
  );

  return (
    <div className="ds-card-light p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-lg font-bold text-white">
            Earnings Progress
          </h3>
          <p className="text-sm text-white/50">
            {currentYear} Year-to-Date Projection
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-white">
            {Math.round(stats.progressPercentage || 0)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Year Complete
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-1000 ease-out"
            style={{ width: `${stats.progressPercentage || 0}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase text-white/30">
              Earned YTD
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(stats.ytdEarnings, salary.currency)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase text-white/30">
              Projected Total
            </div>
            <div className="text-xl font-bold text-white/80">
              {formatCurrency(stats.projectedFullYear, salary.currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-white/50">
            Remaining Months:{' '}
            <span className="font-bold text-white">
              {stats.remainingMonths}
            </span>
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-400">
            On Track 🚀
          </span>
        </div>
      </div>
    </div>
  );
}
