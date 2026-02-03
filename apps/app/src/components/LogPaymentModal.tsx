import { useState, useEffect } from 'react';
import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
} from '@rates/firebase-client';
import { Modal } from './Modal';
import {
  logPayment,
  getUserFinancialAccounts,
} from '../services/financialAccounts';
import { logPaymentToPeriod } from '../services/paymentPeriods';
import { PaymentSuggestions } from './PaymentSuggestions';
import { formatCurrency, formatDate } from '../utils/formatters';

interface LogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null; // Can be null if opened from global FAB
  period: PaymentPeriod | null;
  onPaymentLogged: () => void;
}

type ViewState = 'suggestions' | 'form' | 'confirmation';

export function LogPaymentModal({
  isOpen,
  onClose,
  account: initialAccount,
  period,
  onPaymentLogged,
}: LogPaymentModalProps) {
  // State
  const [view, setView] = useState<ViewState>('suggestions');
  const [selectedAccount, setSelectedAccount] =
    useState<FinancialAccount | null>(null);
  const [allAccounts, setAllAccounts] = useState<FinancialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Form State
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    amount: number;
    date: Date;
    accountName: string;
  } | null>(null);

  // Derived State
  const activeAccount = selectedAccount || initialAccount;

  // Initialize
  useEffect(() => {
    if (isOpen) {
      if (initialAccount) {
        setView('form');
        setSelectedAccount(initialAccount);
        initializeForm(initialAccount, period);
      } else {
        setView('suggestions');
        void loadAllAccounts();
      }
    } else {
      // Reset view when closed
      setTimeout(() => {
        setView('suggestions');
        setSelectedAccount(null);
        setSuccessInfo(null);
      }, 300);
    }
  }, [isOpen, initialAccount, period]);

  const loadAllAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const accounts = await getUserFinancialAccounts();
      setAllAccounts(accounts);
    } catch (err) {
      console.error('Failed to load accounts', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const initializeForm = (
    acc: FinancialAccount,
    p: PaymentPeriod | null,
    defaultAmount?: number
  ) => {
    // Set default payment date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPaymentDate(today.toISOString().split('T')[0]);
    setNotes('');
    setError(null);

    // Determines default amount
    if (defaultAmount !== undefined) {
      setPaymentAmount(defaultAmount.toString());
      return;
    }

    if (p) {
      const amt = Math.max(0, p.amount - p.amountPaid) || p.amount;
      setPaymentAmount(amt.toString());
    } else {
      let amt = 0;
      if (isInstallmentLoan(acc)) amt = acc.scheduledPayment?.amount ?? 0;
      else if (isRevolvingCredit(acc))
        amt =
          acc.userPlannedPayment?.amount ??
          acc.currentMinimumPayment?.amount ??
          0;
      else if (isBill(acc)) amt = acc.recurringAmount?.amount ?? 0;
      setPaymentAmount(amt.toString());
    }
  };

  const handleSelectAccount = (
    acc: FinancialAccount,
    _suggestionType?: string,
    suggestedAmount?: number
  ) => {
    setSelectedAccount(acc);
    initializeForm(acc, null, suggestedAmount);
    setView('form');
  };

  // Smart Warnings
  const getAmountWarning = (): string | null => {
    if (!activeAccount || !paymentAmount) return null;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount)) return null;

    if (isRevolvingCredit(activeAccount)) {
      const balance = activeAccount.currentBalance.amount;
      if (amount > balance)
        return `⚠️ Exceeds current balance of ${formatCurrency(balance, activeAccount.currency)}`;

      const minPayment = activeAccount.currentMinimumPayment?.amount ?? 0;
      if (amount < minPayment && amount > 0)
        return `⚠️ Below minimum payment of ${formatCurrency(minPayment, activeAccount.currency)}`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid payment amount (0 or greater)');
      return;
    }

    if (amount === 0 && activeAccount.accountType !== 'bill') {
      if (!confirm('Log a payment of 0? This will not reduce the balance.'))
        return;
    }

    if (!paymentDate) {
      setError('Please select a payment date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const date = new Date(paymentDate);
      date.setHours(12, 0, 0, 0);

      if (period) {
        await logPaymentToPeriod(
          activeAccount.accountNumber ?? '',
          period.periodNumber,
          {
            datePaid: date,
            amount,
            currency: activeAccount.currency,
            notes: notes?.trim() || undefined,
          }
        );
      } else {
        await logPayment(activeAccount.accountNumber ?? '', {
          valuePaid: amount,
          currency: activeAccount.currency,
          datePaid: date,
          notes: notes?.trim() || undefined,
        });
      }

      setSuccessInfo({
        amount,
        date,
        accountName: activeAccount.accountName,
      });
      setView('confirmation');
      onPaymentLogged();
    } catch (err) {
      console.error('Error logging payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to log payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (initialAccount) {
      onClose(); // Can't go back if opened for specific account
    } else {
      setView('suggestions');
      setSelectedAccount(null);
    }
  };

  // Render Helpers
  const renderSuggestions = () => (
    <div className="flex flex-col gap-4 py-2">
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search accounts..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition-all focus:border-primary-500/50 focus:bg-white/10 focus:outline-none"
          onChange={(_e) => {
            // Simple client-side search for now
            // In a full impl, we'd filter `allAccounts` and show a list
          }}
        />
      </div>

      <div className="custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
        {isLoadingAccounts ? (
          <div className="py-8 text-center text-white/50">
            Loading accounts...
          </div>
        ) : (
          <>
            <PaymentSuggestions
              accounts={allAccounts}
              onSelectAccount={handleSelectAccount}
            />

            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
                All Accounts
              </h3>
              <div className="space-y-2">
                {allAccounts.map((acc) => (
                  <div
                    key={acc.accountNumber}
                    onClick={() => handleSelectAccount(acc)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-white/5 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm">
                        {acc.accountType === 'revolving_credit'
                          ? '💳'
                          : acc.accountType === 'installment_loan'
                            ? '🏦'
                            : '💡'}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {acc.accountName}
                        </div>
                        <div className="text-xs text-white/50">
                          {acc.accountNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-white/40">Log Payment →</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderForm = () => {
    if (!activeAccount) return null;

    const currency = activeAccount.currency;
    const warning = getAmountWarning();

    // Quick amount chips
    const getQuickAmounts = () => {
      const chips: { label: string; value: number }[] = [];

      if (isRevolvingCredit(activeAccount)) {
        if (activeAccount.currentMinimumPayment?.amount) {
          chips.push({
            label: 'Minimum',
            value: activeAccount.currentMinimumPayment.amount,
          });
        }
        if (activeAccount.userPlannedPayment?.amount) {
          chips.push({
            label: 'Usual',
            value: activeAccount.userPlannedPayment.amount,
          });
        }
        // Balance
        chips.push({
          label: 'Full Balance',
          value: activeAccount.currentBalance.amount,
        });
      } else if (isInstallmentLoan(activeAccount)) {
        if (activeAccount.scheduledPayment?.amount) {
          chips.push({
            label: 'Regular',
            value: activeAccount.scheduledPayment.amount,
          });
        }
        // Payoff
        if (activeAccount.currentPrincipal?.amount) {
          chips.push({
            label: 'Pay Off',
            value: activeAccount.currentPrincipal.amount,
          });
        }
      } else if (isBill(activeAccount)) {
        if (activeAccount.recurringAmount?.amount) {
          chips.push({
            label: 'Recurring',
            value: activeAccount.recurringAmount.amount,
          });
        }
      }

      // Dedupe by value
      return chips.filter(
        (chip, index, self) =>
          index === self.findIndex((t) => t.value === chip.value)
      );
    };

    const quickAmounts = getQuickAmounts();

    return (
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-6 py-2"
      >
        {!initialAccount && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-2 flex w-fit items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
          >
            ← Select different account
          </button>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">
              {activeAccount.accountName}
            </h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase text-white/70">
              {activeAccount.accountType.replace('_', ' ')}
            </span>
          </div>
          {/* Context Info */}
          <div className="flex gap-4 text-sm text-white/60">
            {isRevolvingCredit(activeAccount) && (
              <span>
                Balance:{' '}
                {formatCurrency(activeAccount.currentBalance.amount, currency)}
              </span>
            )}
            {isInstallmentLoan(activeAccount) && (
              <span>
                Balance:{' '}
                {formatCurrency(
                  activeAccount.currentPrincipal?.amount ?? 0,
                  currency
                )}
              </span>
            )}
            {(isInstallmentLoan(activeAccount) ||
              isRevolvingCredit(activeAccount) ||
              isBill(activeAccount)) &&
              activeAccount.nextDueDate && (
                <span>Due: {formatDate(activeAccount.nextDueDate)}</span>
              )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <label
              htmlFor="amount"
              className="block text-sm font-semibold text-white/90"
            >
              Payment Amount ({currency}){' '}
              <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/50">
                $
              </span>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-white/8 focus:bg-white/12 w-full rounded-xl border border-white/15 px-4 py-3 pl-8 text-2xl font-bold text-white transition-all focus:border-primary-500/50 focus:outline-none"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {/* Quick Chips */}
            <div className="mt-2 flex flex-wrap gap-2">
              {quickAmounts.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setPaymentAmount(chip.value.toString())}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 transition-all hover:border-primary-500/30 hover:bg-white/10"
                >
                  {chip.label} {formatCurrency(chip.value, currency)}
                </button>
              ))}
            </div>
            {/* Warning */}
            {warning && (
              <div className="mt-1 flex items-center gap-2 text-sm text-warning-400">
                <span>{warning}</span>
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label
              htmlFor="date"
              className="block text-sm font-semibold text-white/90"
            >
              Payment Date <span className="text-danger-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white/8 focus:bg-white/12 flex-1 rounded-lg border border-white/15 px-4 py-3 text-white transition-all focus:border-primary-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setPaymentDate(y.toISOString().split('T')[0]);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-all hover:bg-white/10"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentDate(new Date().toISOString().split('T')[0]);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-all hover:bg-white/10"
              >
                Today
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-semibold text-white/90"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="bg-white/8 focus:bg-white/12 w-full resize-none rounded-lg border border-white/15 px-4 py-3 text-white transition-all focus:border-primary-500/50 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger-500/20 bg-danger-500/10 p-3 text-sm text-danger-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition-all hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] rounded-lg bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-3 font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:from-primary-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Logging...' : '✓ Log Payment'}
          </button>
        </div>
      </form>
    );
  };

  const renderConfirmation = () => {
    if (!successInfo || !activeAccount) return null;

    return (
      <div className="flex animate-fadeIn flex-col items-center justify-center py-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-css/20 text-3xl">
          ✓
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">Payment Logged</h2>
        <p className="mb-8 max-w-[250px] text-white/60">
          Successfully logged{' '}
          {formatCurrency(successInfo.amount, activeAccount.currency)} for{' '}
          {successInfo.accountName}
        </p>

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={() => {
              // "Log Another"
              setSuccessInfo(null);
              setSelectedAccount(null);
              setPaymentAmount('');
              setNotes('');
              setView('suggestions');
              void loadAllAccounts();
            }}
            className="w-full rounded-lg bg-white/10 px-4 py-3 font-semibold text-white transition-all hover:bg-white/15"
          >
            Log Another Payment
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-white/5 px-4 py-3 text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === 'confirmation'
          ? ''
          : view === 'suggestions'
            ? 'Log Payment'
            : `Log Payment`
      }
    >
      {view === 'suggestions' && renderSuggestions()}
      {view === 'form' && renderForm()}
      {view === 'confirmation' && renderConfirmation()}
    </Modal>
  );
}
