import type { SalaryIncome, FinancialAccount } from '@rates/firebase-client';
import { SalaryInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface PaycheckBillsAlignmentWidgetProps {
  salary: SalaryIncome;
  accounts: FinancialAccount[];
}

export function PaycheckBillsAlignmentWidget({
  salary,
  accounts,
}: PaycheckBillsAlignmentWidgetProps) {
  const analysis = SalaryInsightsService.analyzePaycheckBillsAlignment(
    salary,
    accounts,
    new Date()
  );

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>⚖️</span>
          <span>Cash Flow Alignment</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Checking if each paycheck covers the bills due before the next one
          arrives.
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {analysis.periods.map((period, i) => {
            const isGap = period.totalBills > period.pay;
            return (
              <div
                key={i}
                className={`rounded-xl border ${isGap ? 'border-danger-500/30 bg-danger-500/5' : 'border-white/10 bg-white/5'} p-4`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">
                      Period {i + 1}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {period.start.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {period.end.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${isGap ? 'bg-danger-500 text-white' : 'bg-success-500/20 text-success-400'}`}
                  >
                    {isGap ? 'Potential Gap' : 'Covered'}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-[10px] uppercase text-white/30">
                      <span>Paycheck</span>
                      <span>Bills</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`absolute left-0 top-0 h-full bg-primary-500`}
                        style={{ width: '100%' }}
                      />
                      <div
                        className={`absolute left-0 top-0 h-full ${isGap ? 'bg-danger-500' : 'bg-white/40'}`}
                        style={{
                          width: `${Math.min(100, (period.totalBills / period.pay) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="min-w-[80px] text-right">
                    <div
                      className={`text-sm font-black ${isGap ? 'text-danger-400' : 'text-white'}`}
                    >
                      {formatCurrency(
                        period.pay - period.totalBills,
                        salary.currency
                      )}
                    </div>
                    <div className="text-[10px] text-white/40">Remains</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`flex items-center gap-3 px-6 py-4 ${analysis.isAligned ? 'bg-success-500/10' : 'bg-danger-500/10'}`}
      >
        <span className="text-xl">{analysis.isAligned ? '✅' : '⚠️'}</span>
        <p
          className={`text-xs font-bold leading-normal ${analysis.isAligned ? 'text-success-400' : 'text-danger-400'}`}
        >
          {analysis.isAligned
            ? 'Perfect Alignment! All your paycheck periods this month have enough to cover the bills due.'
            : 'Cash Flow Warning: One or more pay periods have more bills due than the paycheck amount. You may need to use savings or buffer funds.'}
        </p>
      </div>
    </div>
  );
}
