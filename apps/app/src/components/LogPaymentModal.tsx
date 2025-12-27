import { useState, useEffect } from 'react';
import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import { Modal } from './Modal';
import { logPayment } from '../services/financialAccounts';
import { logPaymentToPeriod } from '../services/paymentPeriods';
import './LogPaymentModal.css';

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
        setPaymentAmount(account.monthlyPayment.amount.toString());
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
          currency: account.monthlyPayment.currency,
          notes: notes?.trim() || undefined,
        });
      } else {
        // Fallback to general account payment logging
        await logPayment(account.accountNumber, {
          valuePaid: amount,
          currency: account.monthlyPayment.currency,
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

  const periodAmount = period ? period.amount : account.monthlyPayment.amount;
  const periodAmountPaid = period ? period.amountPaid : 0;
  const periodAmountRemaining = period
    ? Math.max(0, period.amount - period.amountPaid)
    : account.totalAmountRemaining.amount;
  const currency = period ? period.currency : account.monthlyPayment.currency;

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
        className="log-payment-form"
      >
        <div className="payment-account-info">
          <div className="info-row">
            <span className="info-label">Account Number:</span>
            <span className="info-value">{account.accountNumber}</span>
          </div>
          {period && (
            <div className="info-row">
              <span className="info-label">Period Number:</span>
              <span className="info-value">#{period.periodNumber}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">
              {period ? 'Period Amount:' : 'Monthly Payment:'}
            </span>
            <span className="info-value">
              {formatCurrency(periodAmount, currency)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Due Date:</span>
            <span className="info-value">
              {periodDueDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          {period && (
            <div className="info-row">
              <span className="info-label">Amount Paid:</span>
              <span className="info-value">
                {formatCurrency(periodAmountPaid, currency)}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">
              {period ? 'Amount Remaining:' : 'Remaining Balance:'}
            </span>
            <span className="info-value">
              {formatCurrency(periodAmountRemaining, currency)}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="payment-date">
            Payment Date <span className="required">*</span>
          </label>
          <input
            id="payment-date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="payment-amount">
            Payment Amount ({currency}) <span className="required">*</span>
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
          />
          <small className="form-hint">
            {period
              ? `Remaining: ${formatCurrency(periodAmountRemaining, currency)} (You can enter 0 to mark as paid when bill is 0)`
              : `Default: ${formatCurrency(periodAmount, currency)}${account.accountType === 'bill' ? ' (You can enter 0 to mark as paid when bill is 0)' : ''}`}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="payment-notes">Notes (Optional)</label>
          <textarea
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes about this payment..."
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="form-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging Payment...' : 'Log Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
