import type {
  SalaryIncome,
  Income,
  FinancialAccount,
} from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface JobLossRunwayWidgetProps {
  salary: SalaryIncome;
  allIncomes: Income[];
  accounts: FinancialAccount[];
}

export function JobLossRunwayWidget({
  salary,
  allIncomes,
  accounts,
}: JobLossRunwayWidgetProps) {
  const runway = SalaryInsightsService.calculateJobLossRunway(
    salary,
    allIncomes,
    accounts
  );

  const getRunwayStatus = () => {
    if (runway.runwayMonths >= 6)
      return {
        label: 'Secure',
        color: 'text-success-400',
        bg: 'bg-success-500/10',
      };
    if (runway.runwayMonths >= 3)
      return {
        label: 'Moderate',
        color: 'text-warning-400',
        bg: 'bg-warning-500/10',
      };
    return {
      label: 'Critical',
      color: 'text-danger-400',
      bg: 'bg-danger-500/10',
    };
  };

  const status = getRunwayStatus();

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🛡️</span>
          <span>Job Loss Resilience</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Estimated runway if you were to lose this income source today.
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center gap-8 md:flex-row">
          {/* Circular Visual */}
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg
              className="h-full w-full -rotate-90 transform"
              viewBox="0 0 128 128"
            >
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-white/5"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={
                  364.4 * (1 - Math.min(runway.runwayMonths, 12) / 12)
                }
                className={status.color}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${status.color}`}>
                {runway.runwayMonths > 24
                  ? '2+'
                  : runway.runwayMonths.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold uppercase text-white/40">
                Months
              </span>
            </div>
          </div>

          <div className="w-full flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${status.bg} border border-current ${status.color}`}
                ></div>
                <span className="text-sm font-bold text-white">
                  Resilience Status
                </span>
              </div>
              <span
                className={`text-sm font-black uppercase tracking-widest ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase text-white/30">
                  Total Liquidity
                </div>
                <div className="text-sm font-bold text-white">
                  {formatCurrency(runway.totalLiquidity, salary.currency)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase text-white/30">
                  Post-Loss Burn
                </div>
                <div className="text-sm font-bold text-danger-400">
                  {formatCurrency(runway.burnRate, salary.currency)}/mo
                </div>
              </div>
            </div>

            <p className="text-xs italic leading-relaxed text-white/50">
              * Based on your linked Bill and Loan accounts, plus remaining
              income from other sources.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 bg-primary-900/20 px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-primary-400/60">
        Recommended safety net: 6 months of expenses.
      </div>
    </div>
  );
}
