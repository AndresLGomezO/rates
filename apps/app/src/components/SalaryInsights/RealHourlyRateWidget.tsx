import type { SalaryIncome } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface RealHourlyRateWidgetProps {
  salary: SalaryIncome;
}

export function RealHourlyRateWidget({ salary }: RealHourlyRateWidgetProps) {
  const analysis = SalaryInsightsService.calculateRealHourlyRate(salary);

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>⏱️</span>
          <span>True Value of Your Time</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Comparing your nominal hourly rate vs. your real rate after commute
          and work costs.
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Comparison */}
          <div className="flex flex-col justify-center">
            <div className="mb-1 flex items-end gap-2">
              <span className="text-4xl font-black text-white">
                {formatCurrency(analysis.realHourlyRate, salary.currency)}
              </span>
              <span className="mb-2 text-sm font-semibold text-white/40">
                / hour (Real)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/40">vs. Nominal:</span>
              <span className="text-sm font-bold text-white/60">
                {formatCurrency(analysis.nominalHourlyRate, salary.currency)}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/20 text-danger-400">
                <span className="text-xl font-bold">
                  -{Math.abs(Math.round(analysis.percentageDifference))}%
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/70">
                Your real rate is{' '}
                <span className="font-bold text-danger-400">
                  {Math.abs(Math.round(analysis.percentageDifference))}% lower
                </span>{' '}
                than your base pay.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Cost to Earn {salary.currency === 'COP' ? '400k COP' : '$100'}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.hoursPerHundredDollars.toFixed(1)} hours
                </span>
                <span className="text-lg">💼</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Annual Work Hours
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.totalHoursPerYear.toLocaleString()} hrs
                </span>
                <span className="text-lg">🚗</span>
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                Includes estimated commute time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-primary-900/20 px-6 py-4">
        <span className="text-xl">💡</span>
        <p className="text-xs leading-normal text-primary-400">
          Every hour spent commuting effectively reduces your hourly wage.
          Reducing a 30-min commute to 0 is like getting a 12% raise.
        </p>
      </div>
    </div>
  );
}
