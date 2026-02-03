import { useState } from 'react';
import type { SalaryIncome } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface RaiseImpactWidgetProps {
  salary: SalaryIncome;
}

export function RaiseImpactWidget({ salary }: RaiseImpactWidgetProps) {
  const [raisePercent, setRaisePercent] = useState(5);
  const impact = SalaryInsightsService.calculateRaiseImpact(
    salary,
    raisePercent
  );

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🚀</span>
          <span>Raise Impact Simulator</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Visualize how a pay increase affects your bottom line.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-white/60">
              Proposed Raise
            </span>
            <span className="text-2xl font-black text-primary-400">
              {raisePercent}%
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={raisePercent}
            onChange={(e) => setRaisePercent(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary-500"
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
            <span>1%</span>
            <span>30%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10">
            <div className="mb-2 text-[10px] font-bold uppercase text-white/30">
              New Annual Gross
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(impact.newAnnual, salary.currency)}
            </div>
            <div className="mt-1 text-sm font-bold text-success-400">
              +{formatCurrency(impact.annualIncrease, salary.currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 bg-white/5 p-5 transition-all">
            <div className="mb-2 text-[10px] font-bold uppercase text-primary-400/60">
              Estimated Monthly Net
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(impact.newMonthly, salary.currency)}
            </div>
            <div className="mt-1 text-sm font-bold text-success-400">
              +{formatCurrency(impact.monthlyIncrease, salary.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 bg-primary-900/20 px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-primary-400/60">
        Assumes a constant tax rate for the incremental income.
      </div>
    </div>
  );
}
