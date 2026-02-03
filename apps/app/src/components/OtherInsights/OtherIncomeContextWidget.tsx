import { useMemo } from 'react';
import {
  OtherIncome,
  Income,
  OtherInsightsService,
  FinancialAccount,
  isBill,
  isInstallmentLoan,
  isRevolvingCredit,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface OtherIncomeContextWidgetProps {
  otherIncomes: OtherIncome[];
  allIncomes: Income[];
  accounts: FinancialAccount[];
}

export function OtherIncomeContextWidget({
  otherIncomes,
  allIncomes,
  accounts,
}: OtherIncomeContextWidgetProps) {
  const analysis = useMemo(() => {
    // Calculate monthly expenses from accounts
    const monthlyExpenses = accounts.reduce((sum, acc) => {
      if (isBill(acc) && acc.recurringAmount) {
        return sum + acc.recurringAmount.amount;
      }
      if (isInstallmentLoan(acc) && acc.scheduledPayment) {
        return sum + acc.scheduledPayment.amount;
      }
      if (isRevolvingCredit(acc)) {
        return (
          sum +
          (acc.userPlannedPayment?.amount ||
            acc.currentMinimumPayment?.amount ||
            0)
        );
      }
      return sum;
    }, 0);

    return OtherInsightsService.analyzeOtherIncomeInContext(
      otherIncomes,
      allIncomes,
      monthlyExpenses
    );
  }, [otherIncomes, allIncomes, accounts]);

  const { recurring, oneTime, context } = analysis;

  if (otherIncomes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">📊</span> Your Other Income in Context
        </h3>
      </div>

      <div className="space-y-8">
        {/* Monthly Context */}
        <div>
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
            HOW IT FITS YOUR TOTAL INCOME
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-6">
            <div className="mb-6 space-y-4">
              {/* This is a simplified version of the bar chart in the spec */}
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                  Monthly Breakdown
                </span>
                <span className="text-xl font-black text-white">
                  {formatCurrency(context.totalMonthlyIncome, 'USD')}
                </span>
              </div>

              <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-white/40"
                  style={{ width: `${100 - context.otherAsPercentOfTotal}%` }}
                />
                <div
                  className="h-full bg-primary-500"
                  style={{ width: `${context.otherAsPercentOfTotal}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                  <span className="text-white/40">Regular Income</span>
                </div>
                <div className="flex items-center gap-2 text-primary-400">
                  <span className="">
                    "Other" {context.otherAsPercentOfTotal.toFixed(1)}%
                  </span>
                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="text-sm leading-relaxed text-white/80">
                  {context.recommendation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recurring Other */}
          <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-4">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                Recurring Other
              </div>
              <div className="text-2xl font-black text-white">
                ~{formatCurrency(recurring.total, 'USD')}
                <span className="text-sm font-normal text-white/40">/mo</span>
              </div>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <div className="mb-1 text-[10px] italic text-white/60">
                {recurring.daysCovered.toFixed(1)} days of expenses covered
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary-400">
                {recurring.reliablePercentage.toFixed(0)}% Reliable
              </div>
            </div>
          </div>

          {/* One-Time Total */}
          <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-4">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                One-Time (YTD)
              </div>
              <div className="text-2xl font-black text-white">
                {formatCurrency(oneTime.total, 'USD')}
              </div>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <div className="mb-1 text-[10px] italic text-white/60">
                Equals {oneTime.monthsCovered.toFixed(1)} months of expenses
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                {formatCurrency(oneTime.received, 'USD')} Received
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
