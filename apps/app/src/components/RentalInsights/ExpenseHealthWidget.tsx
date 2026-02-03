import type { RentalIncome } from '@rates/firebase-client';
import { RentalInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface ExpenseHealthWidgetProps {
  rental: RentalIncome;
}

export function ExpenseHealthWidget({ rental }: ExpenseHealthWidgetProps) {
  const analysis = RentalInsightsService.calculateExpenseHealth(rental);

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>🔍</span>
          <span>Expense Health Check</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Benchmarking your operating expenses against typical industry ranges.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Gauge-like visualization */}
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-white/30">
                Expense Ratio
              </span>
              <span
                className={`text-xl font-black ${analysis.isHealthy ? 'text-primary-400' : 'text-warning-400'}`}
              >
                {analysis.expenseRatio.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-6 w-full overflow-hidden rounded-full bg-white/5">
              {/* Mark segments */}
              <div className="absolute inset-0 flex">
                <div
                  className="h-full bg-primary-500/20"
                  style={{ width: '35%' }}
                />
                <div
                  className="h-full bg-warning-500/20"
                  style={{ width: '15%' }}
                />
                <div
                  className="h-full bg-danger-500/20"
                  style={{ width: '50%' }}
                />
              </div>
              {/* Marker */}
              <div
                className="absolute top-0 h-full w-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000"
                style={{
                  left: `${Math.min(100, analysis.expenseRatio)}%`,
                  marginLeft: '-3px',
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-white/30">
              <span>LOW (Healthy)</span>
              <span className="text-white/60">TYPICAL</span>
              <span>HIGH</span>
            </div>

            <p
              className={`mt-6 text-sm italic ${analysis.isHealthy ? 'text-primary-400' : 'text-warning-400'}`}
            >
              {analysis.statusMessage}
            </p>
          </div>

          {/* Breakdown */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Expense Breakdown
            </h4>
            {analysis.breakdown.length > 0 ? (
              <div className="space-y-3">
                {analysis.breakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{item.category}</span>
                      <span className="font-bold text-white">
                        {formatCurrency(item.amount, analysis.currency)}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full bg-white/20"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                <p className="text-xs italic text-white/40">
                  No detailed expense breakdown provided.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">📚</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                Benchmark Reference
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-[10px] text-white/30">Single Family</p>
                  <p className="text-xs font-bold text-white/70">30-40%</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30">Condo (w/ HOA)</p>
                  <p className="text-xs font-bold text-white/70">35-45%</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30">Multi-Family</p>
                  <p className="text-xs font-bold text-white/70">40-50%</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30">Commercial</p>
                  <p className="text-xs font-bold text-white/70">45-55%+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
