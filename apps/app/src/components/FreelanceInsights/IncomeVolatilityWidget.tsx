import type { FreelanceGigIncome } from '@rates/firebase-client';
import { FreelanceInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface IncomeVolatilityWidgetProps {
  income: FreelanceGigIncome;
}

export function IncomeVolatilityWidget({
  income,
}: IncomeVolatilityWidgetProps) {
  const insights = FreelanceInsightsService.calculateInsights(income);
  const { volatility } = insights;

  const getVolatilityLabel = (score: number) => {
    if (score < 15) return 'Very Stable';
    if (score < 30) return 'Moderate';
    if (score < 50) return 'Variable';
    return 'Highly Volatile';
  };

  const maxVal = Math.max(...volatility.monthlyData.map((d) => d.amount), 1);

  return (
    <div className="ds-card-light p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-lg font-bold text-white">Income Stability</h3>
          <p className="text-xs text-white/50">
            Performance over last {volatility.monthlyData.length || 12} months
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-sm font-black uppercase tracking-widest ${
              volatility.volatilityScore < 30
                ? 'text-green-400'
                : volatility.volatilityScore < 50
                  ? 'text-yellow-400'
                  : 'text-orange-500'
            }`}
          >
            {getVolatilityLabel(volatility.volatilityScore)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            {volatility.trend} Trend
          </div>
        </div>
      </div>

      <div className="mb-8 flex h-32 items-end justify-between gap-1">
        {volatility.monthlyData.length > 0 ? (
          volatility.monthlyData.map((data, idx) => (
            <div
              key={idx}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full rounded-t-sm bg-primary-500/40 transition-all duration-500 group-hover:bg-primary-500/60"
                style={{ height: `${(data.amount / maxVal) * 100}%` }}
              />
              <div className="mt-2 h-4 overflow-hidden text-[8px] font-bold uppercase tracking-tighter text-white/20">
                {data.month.split('-')[1]}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block">
                <div className="whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-[10px] text-white shadow-xl ring-1 ring-white/10">
                  {formatCurrency(data.amount, income.currency)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex w-full flex-col items-center justify-center italic text-white/20">
            <svg
              className="mb-2"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span className="text-[10px]">Insufficient history for chart</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
            Average Monthly
          </div>
          <div className="text-xl font-black text-white">
            {formatCurrency(volatility.averageMonthlyIncome, income.currency)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-right text-[10px] font-bold uppercase tracking-widest text-white/30">
            Best Month
          </div>
          <div className="text-right text-xl font-black text-white">
            {formatCurrency(maxVal, income.currency)}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-primary-500/5 p-4 ring-1 ring-primary-500/20">
        <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary-400">
          Budgeting Recommendation
        </h4>
        <p className="text-xs leading-relaxed text-white/70">
          Based on your {volatility.volatilityScore}% volatility, we suggest
          budgeting with
          <strong className="text-white">
            {' '}
            {formatCurrency(volatility.p25Income, income.currency)}{' '}
          </strong>
          to stay safe during slow periods.
        </p>
      </div>
    </div>
  );
}
