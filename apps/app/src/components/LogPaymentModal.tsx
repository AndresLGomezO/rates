import { useState, useEffect } from 'react';
import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import { Modal } from './Modal';
import { logPayment } from '../services/financialAccounts';
import { logPaymentToPeriod } from '../services/paymentPeriods';

interface LogPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  period: PaymentPeriod | null;
  onPaymentLogged: () => void;
}

export function LogPaymentModal({
  isOpen,
  onClose,
  account,
  period,
  onPaymentLogged,
}: LogPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with default values when account or period changes
  useEffect(() => {
    if (account && isOpen) {
      // Set default payment date to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setPaymentDate(today.toISOString().split('T')[0]);

      // Set default amount based on period if available, otherwise use monthly payment
      if (period) {
        // Use remaining amount for this period, or the period amount if nothing paid yet
        const defaultAmount =
          Math.max(0, period.amount - period.amountPaid) || period.amount;
        setPaymentAmount(defaultAmount.toString());
      } else {
        setPaymentAmount(account.paymentAmount.amount.toString());
      }
      setNotes('');
      setError(null);
    }
  }, [account, period, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid payment amount (0 or greater)');
      return;
    }

    // Allow 0 value payments for bills (e.g., when bill is 0 due to credit)
    // For loans, warn but allow if user wants to log 0
    if (amount === 0 && account.accountType !== 'bill') {
      if (
        !confirm(
          'Are you sure you want to log a payment of 0? This will not reduce the loan balance.'
        )
      ) {
        return;
      }
    }

    if (!paymentDate) {
      setError('Please select a payment date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const date = new Date(paymentDate);
      date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

      // If we have a specific period, log directly to that period
      if (period) {
        await logPaymentToPeriod(account.accountNumber, period.periodNumber, {
          datePaid: date,
          amount: amount,
          currency: account.paymentAmount.currency,
          notes: notes?.trim() || undefined,
        });
      } else {
        // Fallback to general account payment logging
        await logPayment(account.accountNumber, {
          valuePaid: amount,
          currency: account.paymentAmount.currency,
          datePaid: date,
          notes: notes?.trim() || undefined,
        });
      }

      // Reset form
      setPaymentDate('');
      setPaymentAmount('');
      setNotes('');

      // Notify parent and close
      onPaymentLogged();
      onClose();
    } catch (err) {
      console.error('Error logging payment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to log payment. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  const formatCurrency = (amount: number, currency: string): string => {
    if (currency === 'COP') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Use period-specific information if available, otherwise use account info
  const periodDueDate = period
    ? period.dueDate instanceof Date
      ? period.dueDate
      : period.dueDate.toDate()
    : account.nextDueDate instanceof Date
      ? account.nextDueDate
      : account.nextDueDate.toDate();

  const periodAmount = period ? period.amount : account.paymentAmount.amount;
  const periodAmountPaid = period ? period.amountPaid : 0;
  const periodAmountRemaining = period
    ? Math.max(0, period.amount - period.amountPaid)
    : account.totalAmountRemaining.amount;
  const currency = period ? period.currency : account.paymentAmount.currency;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Payment - ${account.accountName}${period ? ` (Period #${period.periodNumber})` : ''}`}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-6 py-4"
      >
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">
              Account Number:
            </span>
            <span className="text-base font-semibold text-white/95">
              {account.accountNumber}
            </span>
          </div>
          {period && (
            <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
              <span className="text-sm font-medium text-white/70">
                Period Number:
              </span>
              <span className="text-base font-semibold text-white/95">
                #{period.periodNumber}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">
              {period ? 'Period Amount:' : 'Expected Payment:'}
            </span>
            <span className="text-base font-semibold text-white/95">
              {formatCurrency(periodAmount, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">Due Date:</span>
            <span className="text-base font-semibold text-white/95">
              {periodDueDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          {period && (
            <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
              <span className="text-sm font-medium text-white/70">
                Amount Paid:
              </span>
              <span className="text-base font-semibold text-white/95">
                {formatCurrency(periodAmountPaid, currency)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">
              {period ? 'Amount Remaining:' : 'Remaining Balance:'}
            </span>
            <span className="text-base font-semibold text-white/95">
              {formatCurrency(periodAmountRemaining, currency)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="payment-date"
            className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
          >
            Payment Date <span className="text-danger-500">*</span>
          </label>
          <input
            id="payment-date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
            disabled={isSubmitting}
            className="bg-white/8 font-inherit ease focus:bg-white/12 rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="payment-amount"
            className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
          >
            Payment Amount ({currency}){' '}
            <span className="text-danger-500">*</span>
          </label>
          <input
            id="payment-amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            min="0"
            step="0.01"
            placeholder={
              periodAmountRemaining > 0
                ? periodAmountRemaining.toString()
                : periodAmount.toString()
            }
            disabled={isSubmitting}
            className="bg-white/8 font-inherit ease focus:bg-white/12 rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <small className="-mt-1 text-[0.85rem] text-white/60">
            {period
              ? `Remaining: ${formatCurrency(periodAmountRemaining, currency)} (You can enter 0 to mark as paid when bill is 0)`
              : `Default: ${formatCurrency(periodAmount, currency)}${account.accountType === 'bill' ? ' (You can enter 0 to mark as paid when bill is 0)' : ''}`}
          </small>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="payment-notes"
            className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
          >
            Notes (Optional)
          </label>
          <textarea
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes about this payment..."
            disabled={isSubmitting}
            className="bg-white/8 font-inherit ease focus:bg-white/12 min-h-[80px] resize-y rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-danger-500/30 bg-danger-500/15 px-4 py-3 text-sm text-danger-500">
            <span className="text-xl">⚠️</span>
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="ease font-inherit cursor-pointer rounded-lg border border-none border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white/90 transition-all duration-200 hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ease font-inherit cursor-pointer rounded-lg border-none bg-gradient-to-br from-primary-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging Payment...' : 'Log Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
