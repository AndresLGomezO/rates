import type {
  RentalIncome,
  FinancialAccount,
  InstallmentLoanAccount,
} from '@rates/firebase-client';
import { RentalInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface TrueCashFlowWidgetProps {
  rental: RentalIncome;
  accounts: FinancialAccount[];
}

export function TrueCashFlowWidget({
  rental,
  accounts,
}: TrueCashFlowWidgetProps) {
  const analysis = RentalInsightsService.calculateTrueCashFlow(
    rental,
    rental.linkedMortgageAccountId
      ? (accounts.find(
          (a) => a.id === rental.linkedMortgageAccountId
        ) as InstallmentLoanAccount)
      : null
  );

  return (
    <div className="ds-card-light overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <span>💰</span>
          <span>True Cash Flow Reality</span>
        </h3>
        <p className="mt-1 text-sm text-white/50">
          What you collect vs. what you actually keep after all expenses.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Gross Monthly Rent
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(analysis.grossRent, analysis.currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Total Outflows
            </div>
            <div className="text-2xl font-black text-danger-400">
              -{formatCurrency(analysis.totalOutflows, analysis.currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 p-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-400">
              Net Cash Flow
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(analysis.monthlyCashFlow, analysis.currency)}
            </div>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Cash Flow breakdown
            </span>
            <span className="text-xs font-bold text-primary-400">
              {analysis.cashFlowPercentage.toFixed(1)}% of Rent
            </span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-danger-500/60"
              style={{
                width: `${(analysis.interestPortion / analysis.grossRent) * 100}%`,
              }}
              title="Interest"
            />
            <div
              className="h-full bg-warning-500/60"
              style={{
                width: `${(analysis.principalPortion / analysis.grossRent) * 100}%`,
              }}
              title="Principal"
            />
            <div
              className="h-full bg-neutral-500/60"
              style={{
                width: `${(analysis.operatingExpenses / analysis.grossRent) * 100}%`,
              }}
              title="Expenses"
            />
            <div
              className="h-full bg-primary-500"
              style={{
                width: `${analysis.cashFlowPercentage}%`,
              }}
              title="Cash Flow"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-danger-500/60" />
              <span className="text-[10px] text-white/50">
                Mortgage Interest
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning-500/60" />
              <span className="text-[10px] text-white/50">
                Mortgage Principal
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-neutral-500/60" />
              <span className="text-[10px] text-white/50">
                Operating Expenses
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary-500" />
              <span className="text-[10px] text-white/50">Net Cash Flow</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-warning-500/20 bg-warning-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-bold text-warning-400">
                Wealth Building Perspective
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                While your cash flow is{' '}
                {formatCurrency(analysis.monthlyCashFlow, analysis.currency)},
                you're also building{' '}
                <span className="font-bold text-white">
                  {formatCurrency(analysis.principalPortion, analysis.currency)}
                </span>{' '}
                in equity each month. Your true monthly benefit is{' '}
                <span className="font-bold text-white">
                  {formatCurrency(analysis.trueBenefit, analysis.currency)}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
