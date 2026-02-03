import type { Income } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';

interface IncomeDependencyWidgetProps {
  targetIncome: Income;
  allIncomes: Income[];
}

export function IncomeDependencyWidget({
  targetIncome,
  allIncomes,
}: IncomeDependencyWidgetProps) {
  const dependency = SalaryInsightsService.calculateIncomeDependency(
    targetIncome,
    allIncomes
  );

  const getDependencyLevel = () => {
    if (dependency > 75)
      return {
        label: 'High Dependency',
        color: 'bg-danger-500',
        text: 'text-danger-400',
      };
    if (dependency > 40)
      return {
        label: 'Moderate Dependency',
        color: 'bg-warning-500',
        text: 'text-warning-400',
      };
    return {
      label: 'Low Dependency',
      color: 'bg-success-500',
      text: 'text-success-400',
    };
  };

  const level = getDependencyLevel();

  return (
    <div className="ds-card-light p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-lg font-bold text-white">
            Income Dependency
          </h3>
          <p className="text-sm text-white/50">
            Proportion of your total income from this source.
          </p>
        </div>
        <div className={`text-2xl font-black ${level.text}`}>
          {Math.round(dependency)}%
        </div>
      </div>

      <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-1000 ease-out ${level.color}`}
          style={{ width: `${dependency}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">
          {level.label}
        </span>
        <span className="text-xs text-white/40">
          Total from {allIncomes.length} sources
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3 text-xs leading-relaxed text-white/70">
        {dependency > 70
          ? '⚠️ You are highly dependent on this single income. Consider diversifying with side gigs or investments to reduce risk.'
          : '✅ Your income is diversified, which reduces financial impact if one source is lost.'}
      </div>
    </div>
  );
}
