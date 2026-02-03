import { useMemo } from 'react';
import type { FinancialAccount } from '@rates/firebase-client';
import {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
} from '@rates/firebase-client';
import { formatDate, formatCurrency } from '../utils/formatters';

interface PaymentSuggestionsProps {
  accounts: FinancialAccount[];
  onSelectAccount: (
    account: FinancialAccount,
    suggestionType?: string,
    suggestedAmount?: number
  ) => void;
}

const getDueDate = (account: FinancialAccount): Date | undefined => {
  if (
    isInstallmentLoan(account) ||
    isRevolvingCredit(account) ||
    isBill(account)
  ) {
    return account.nextDueDate instanceof Date
      ? account.nextDueDate
      : account.nextDueDate?.toDate();
  }
  return undefined;
};

export function PaymentSuggestions({
  accounts,
  onSelectAccount,
}: PaymentSuggestionsProps) {
  const suggestions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const dueToday: FinancialAccount[] = [];
    const dueThisWeek: FinancialAccount[] = [];
    const recentlyPaid: FinancialAccount[] = [];

    accounts.forEach((account) => {
      // Skip closed accounts
      if (account.status === 'closed' || account.status === 'paid_off') return;

      const dueDate = getDueDate(account);

      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === today.getTime()) {
          dueToday.push(account);
        } else if (dueDate > today && dueDate <= nextWeek) {
          dueThisWeek.push(account);
        }
      }

      // Check for recent payments (last 5 days) to offer "Log Another"
      // This is a bit complex as we need to check the payment log.
      // For now, simpler logic: if not due today/soon, it might be in "Others"
    });

    return { dueToday, dueThisWeek, recentlyPaid };
  }, [accounts]);

  const getSuggestedAmount = (account: FinancialAccount) => {
    if (account.accountType === 'bill') {
      return account.recurringAmount?.amount;
    }
    if (account.accountType === 'revolving_credit') {
      return (
        account.userPlannedPayment?.amount ??
        account.currentMinimumPayment?.amount
      );
    }
    if (account.accountType === 'installment_loan') {
      return account.scheduledPayment?.amount;
    }
    return undefined;
  };

  const SuggestionCard = ({
    account,
    type,
    label,
  }: {
    account: FinancialAccount;
    type: 'today' | 'week';
    label: string;
  }) => {
    const amount = getSuggestedAmount(account);
    const dueDate = getDueDate(account);

    // Calculate days remaining for "week" view
    const getDaysRemaining = () => {
      if (!dueDate) return '';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(dueDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `(${diffDays} days)`;
    };

    return (
      <div
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 hover:shadow-lg"
        onClick={() => onSelectAccount(account, type, amount)}
      >
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl">
              {account.accountType === 'revolving_credit'
                ? '💳'
                : account.accountType === 'installment_loan'
                  ? '🏦'
                  : '💡'}
            </div>
            <div>
              <h4 className="font-semibold text-white transition-colors group-hover:text-primary-400">
                {account.accountName}
              </h4>
              <div className="text-xs text-white/60">
                {label} {type === 'week' && getDaysRemaining()}
              </div>
            </div>
          </div>
          {amount && (
            <div className="text-right">
              <div className="font-mono font-bold text-white">
                {formatCurrency(amount, account.currency)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button className="rounded-lg bg-primary-500/10 px-3 py-1.5 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/20">
            Quick Log{' '}
            {amount ? formatCurrency(amount, account.currency) : 'Payment'}
          </button>
        </div>
      </div>
    );
  };

  if (
    suggestions.dueToday.length === 0 &&
    suggestions.dueThisWeek.length === 0
  ) {
    return (
      <div className="py-8 text-center text-white/50">
        <div className="mb-3 text-4xl">✅</div>
        <p>No immediate payments due!</p>
        <p className="text-sm">Search above to log any other payment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
        <span>🤖 Suggested Payments</span>
      </div>

      {suggestions.dueToday.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-danger-400">
            <span className="h-2 w-2 rounded-full bg-danger-500"></span>
            DUE TODAY
          </h3>
          <div className="grid gap-3">
            {suggestions.dueToday.map((account) => (
              <SuggestionCard
                key={account.accountNumber}
                account={account}
                type="today"
                label="Due today"
              />
            ))}
          </div>
        </div>
      )}

      {suggestions.dueThisWeek.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-warning-400">
            <span className="h-2 w-2 rounded-full bg-warning-500"></span>
            DUE THIS WEEK
          </h3>
          <div className="grid gap-3">
            {suggestions.dueThisWeek.map((account) => (
              <SuggestionCard
                key={account.accountNumber}
                account={account}
                type="week"
                label={`Due ${getDueDate(account) ? formatDate(getDueDate(account)) : ''}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
