import { useMemo } from 'react';
import {
  OtherIncome,
  FinancialAccount,
  OtherInsightsService,
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface WindfallDecisionWidgetProps {
  income: OtherIncome;
  accounts: FinancialAccount[];
}

export function WindfallDecisionWidget({
  income,
  accounts,
}: WindfallDecisionWidgetProps) {
  const amount = income.incomeAmount.amount;
  const currency = income.currency;

  const suggestions = useMemo(() => {
    // 1. Calculate monthly expenses from accounts
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

    // 2. Estimate emergency fund from accounts
    const emergencyFundBalance = accounts.reduce((sum, acc) => {
      const name = acc.accountName.toLowerCase();
      if (
        name.includes('savings') ||
        name.includes('emergency') ||
        name.includes('fund')
      ) {
        if (acc.accountType === 'other' && acc.currentAmount) {
          return sum + acc.currentAmount.amount;
        }
      }
      return sum;
    }, 0);

    // 3. Extract debts
    const debts = accounts
      .filter((acc) => isInstallmentLoan(acc) || isRevolvingCredit(acc))
      .map((acc) => {
        let balance = 0;
        let apr = 0;
        let type: 'loan' | 'credit' = 'loan';

        if (isInstallmentLoan(acc)) {
          balance = acc.currentPrincipal?.amount || 0;
          apr = acc.annualInterestRate;
          type = 'loan';
        } else if (isRevolvingCredit(acc)) {
          balance = acc.currentBalance.amount;
          apr = acc.purchaseApr;
          type = 'credit';
        }

        return {
          name: acc.accountName,
          balance,
          apr,
          type,
        };
      })
      .filter((d) => d.balance > 0);

    // 4. Extract mortgage
    const mortgage = debts.find((d) =>
      d.name.toLowerCase().includes('mortgage')
    );

    const userFinancials = {
      totalMonthlyExpenses: monthlyExpenses,
      emergencyFundBalance,
      debts,
      mortgage: mortgage
        ? { name: mortgage.name, balance: mortgage.balance, apr: mortgage.apr }
        : undefined,
    };

    return OtherInsightsService.generateWindfallSuggestions(
      amount,
      userFinancials
    );
  }, [amount, accounts]);

  if (amount < 500 || !income.isReceived) return null;

  const { suggestions: list, isLargeWindfall } = suggestions;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm ${isLargeWindfall ? 'ring-2 ring-primary-500/30' : ''}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">🎁</span>{' '}
          {isLargeWindfall
            ? 'You received a windfall!'
            : 'You received an extra payment!'}
        </h3>
        {isLargeWindfall && (
          <span className="rounded-full bg-primary-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-400 ring-1 ring-primary-500/30">
            Significant
          </span>
        )}
      </div>

      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="text-sm font-medium text-white/80">"{income.name}"</div>
        <div className="text-2xl font-black text-white">
          {formatCurrency(amount, currency)}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
          💡{' '}
          {isLargeWindfall
            ? 'WHAT COULD YOU DO WITH THIS MONEY?'
            : 'QUICK IDEAS'}
        </div>

        <div className="space-y-4">
          {list.map((suggestion, index) => (
            <div
              key={index}
              className="group rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${getCategoryColor(suggestion.category)} bg-opacity-20 text-sm font-bold`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white">
                      {suggestion.category.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-white/60">
                      {suggestion.reason}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white">
                    {formatCurrency(suggestion.amount, currency)}
                  </div>
                  <div className="text-[10px] font-bold text-white/30">
                    {Math.round((suggestion.amount / amount) * 100)}%
                  </div>
                </div>
              </div>

              {isLargeWindfall && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full opacity-60 transition-all duration-700 group-hover:opacity-100 ${getCategoryBg(suggestion.category)}`}
                    style={{ width: `${(suggestion.amount / amount) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button className="w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-primary-600 active:scale-95">
          📝 Create a plan for this money
        </button>
        <button className="w-full rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white/80 transition-all hover:bg-white/20 active:scale-95">
          ✓ I've already decided what to do
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="m-0 text-[10px] uppercase leading-relaxed tracking-tighter text-white/30">
          This is just a suggestion based on common financial priorities.
          <br />
          Use it however makes sense for your life.
        </p>
      </div>
    </div>
  );
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'emergency_fund':
      return 'text-success-400 bg-success-500';
    case 'debt_payoff':
      return 'text-danger-400 bg-danger-500';
    case 'mortgage_principal':
      return 'text-warning-400 bg-warning-500';
    case 'invest':
      return 'text-primary-400 bg-primary-500';
    default:
      return 'text-white/60 bg-white/20';
  }
}

function getCategoryBg(category: string) {
  switch (category) {
    case 'emergency_fund':
      return 'bg-success-500';
    case 'debt_payoff':
      return 'bg-danger-500';
    case 'mortgage_principal':
      return 'bg-warning-500';
    case 'invest':
      return 'bg-primary-500';
    default:
      return 'bg-white/20';
  }
}
