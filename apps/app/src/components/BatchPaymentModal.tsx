import { useState, useEffect } from 'react';
import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import { Modal } from './Modal';
import {
  batchLogPaymentsToPeriods,
  getPaymentPeriods,
} from '../services/paymentPeriods';
import './LogPaymentModal.css';

interface BatchPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onPaymentsLogged: () => void;
}

export function BatchPaymentModal({
  isOpen,
  onClose,
  account,
  onPaymentsLogged,
}: BatchPaymentModalProps) {
  const [periods, setPeriods] = useState<PaymentPeriod[]>([]);
  const [_allPeriods, setAllPeriods] = useState<PaymentPeriod[]>([]);
  const [currentPeriodNumber, setCurrentPeriodNumber] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [endPeriod, setEndPeriod] = useState<number>(1);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customPaymentDate, setCustomPaymentDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    details: Array<{ periodNumber: number; success: boolean; error?: string }>;
  } | null>(null);

  // Reset state when modal closes or account changes
  useEffect(() => {
    if (!isOpen || !account) {
      // Reset all state when modal closes or account is null
      setPeriods([]);
      setAllPeriods([]);
      setCurrentPeriodNumber(null);
      setLoading(false);
      setStartPeriod(1);
      setEndPeriod(1);
      setUseCustomDate(false);
      setNotes('');
      setError(null);
      setResult(null);
      setIsSubmitting(false);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setCustomPaymentDate(today.toISOString().split('T')[0]);
      return;
    }

    // Load periods when modal opens with a valid account
    // Reset state first to clear previous account's data
    setPeriods([]);
    setAllPeriods([]);
    setCurrentPeriodNumber(null);
    setLoading(true);
    setStartPeriod(1);
    setEndPeriod(1);
    setUseCustomDate(false);
    setNotes('');
    setError(null);
    setResult(null);
    setIsSubmitting(false);

    void loadPeriods(account);
    // Set default payment date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCustomPaymentDate(today.toISOString().split('T')[0]);
  }, [account, isOpen]);

  // When start period or current period changes, ensure end period doesn't exceed current period
  useEffect(() => {
    setEndPeriod((currentEnd) => {
      // First check if end period exceeds current period
      if (currentPeriodNumber !== null && currentEnd > currentPeriodNumber) {
        return currentPeriodNumber;
      }
      // Then check if start period is greater than end period
      if (startPeriod > currentEnd) {
        return startPeriod;
      }
      return currentEnd;
    });
  }, [startPeriod, currentPeriodNumber]);

  const loadPeriods = async (accountToLoad: FinancialAccount) => {
    setLoading(true);
    setError(null);
    try {
      const loadedPeriods = await getPaymentPeriods(
        accountToLoad.accountNumber
      );
      setAllPeriods(loadedPeriods);

      // Determine current date (today)
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Filter to only pending periods with due date <= today (exclude future periods)
      const pendingPeriods = loadedPeriods.filter((p) => {
        if (p.status !== 'pending') return false;
        const dueDate =
          p.dueDate instanceof Date ? p.dueDate : p.dueDate.toDate();
        return dueDate <= today;
      });
      setPeriods(pendingPeriods);

      // Determine current period (highest period number with due date <= today)
      const currentPeriod = loadedPeriods
        .filter((p) => {
          const dueDate =
            p.dueDate instanceof Date ? p.dueDate : p.dueDate.toDate();
          return dueDate <= today;
        })
        .sort((a, b) => b.periodNumber - a.periodNumber)[0];

      const currentPeriodNum = currentPeriod?.periodNumber ?? null;
      setCurrentPeriodNumber(currentPeriodNum);

      // Set default range to first and last pending period (up to current period)
      if (pendingPeriods.length > 0) {
        const sorted = [...pendingPeriods].sort(
          (a, b) => a.periodNumber - b.periodNumber
        );
        const firstPeriod = sorted[0].periodNumber;
        const lastPendingPeriod = sorted[sorted.length - 1].periodNumber;

        // Limit to current period if it exists
        const maxPeriod =
          currentPeriodNum !== null
            ? Math.min(lastPendingPeriod, currentPeriodNum)
            : lastPendingPeriod;

        setStartPeriod(firstPeriod);
        setEndPeriod(maxPeriod);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    if (startPeriod > endPeriod) {
      setError('Start period must be less than or equal to end period');
      return;
    }

    // Validate that end period doesn't exceed current period
    if (currentPeriodNumber !== null && endPeriod > currentPeriodNumber) {
      setError(
        `End period cannot exceed current period (Period #${currentPeriodNumber})`
      );
      return;
    }

    // Check if there are any pending periods in the range
    const periodsInRange = periods.filter(
      (p) => p.periodNumber >= startPeriod && p.periodNumber <= endPeriod
    );

    if (periodsInRange.length === 0) {
      setError(
        `No pending periods found in range ${startPeriod} to ${endPeriod}`
      );
      return;
    }

    if (useCustomDate && !customPaymentDate) {
      setError('Please select a payment date or uncheck "Use custom date"');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const paymentDate = useCustomDate
        ? new Date(customPaymentDate)
        : undefined;

      paymentDate?.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

      const results = await batchLogPaymentsToPeriods(
        account.accountNumber,
        startPeriod,
        endPeriod,
        paymentDate,
        notes?.trim() || undefined
      );

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      setResult({
        success: successCount,
        failed: failedCount,
        details: results,
      });

      // Reload periods to reflect changes
      if (account) {
        await loadPeriods(account);
      }

      // Notify parent
      if (successCount > 0) {
        onPaymentsLogged();
      }
    } catch (err) {
      console.error('Error batch logging payments:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to batch log payments. Please try again.'
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

  // Get periods in the selected range
  const periodsInRange = periods.filter(
    (p) => p.periodNumber >= startPeriod && p.periodNumber <= endPeriod
  );

  // Calculate total remaining amount (amount - amountPaid for each period)
  const totalAmount = periodsInRange.reduce(
    (sum, p) => sum + Math.max(0, p.amount - p.amountPaid),
    0
  );

  // Get available period numbers for dropdowns (only up to current period)
  const availablePeriodNumbers = periods
    .map((p) => p.periodNumber)
    .filter((num) => currentPeriodNumber === null || num <= currentPeriodNumber)
    .sort((a, b) => a - b);

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batch Add Payments - ${account.accountName}`}
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
          <div className="info-row">
            <span className="info-label">Pending Periods:</span>
            <span className="info-value">{periods.length}</span>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Loading periods...
          </div>
        ) : periods.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              marginBottom: '1rem',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            No pending periods found for this account.
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="start-period">
                From Period <span className="required">*</span>
              </label>
              <select
                id="start-period"
                value={startPeriod}
                onChange={(e) => {
                  const newStart = Number(e.target.value);
                  setStartPeriod(newStart);
                  // Auto-adjust end period if needed
                  if (newStart > endPeriod) {
                    setEndPeriod(newStart);
                  }
                }}
                required
                disabled={isSubmitting}
              >
                {availablePeriodNumbers.map((num) => (
                  <option key={num} value={num}>
                    Period #{num}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="end-period">
                To Period <span className="required">*</span>
                {currentPeriodNumber !== null && (
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: 400,
                      marginLeft: '0.5rem',
                    }}
                  >
                    (Max: Period #{currentPeriodNumber})
                  </span>
                )}
              </label>
              <select
                id="end-period"
                value={endPeriod}
                onChange={(e) => {
                  const newEnd = Number(e.target.value);
                  // Ensure it doesn't exceed current period
                  if (
                    currentPeriodNumber === null ||
                    newEnd <= currentPeriodNumber
                  ) {
                    setEndPeriod(newEnd);
                  } else {
                    setError(
                      `End period cannot exceed current period (Period #${currentPeriodNumber})`
                    );
                  }
                }}
                required
                disabled={isSubmitting}
              >
                {availablePeriodNumbers
                  .filter((num) => num >= startPeriod)
                  .map((num) => (
                    <option key={num} value={num}>
                      Period #{num}
                    </option>
                  ))}
              </select>
            </div>

            {periodsInRange.length > 0 && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  marginBottom: '1rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <div
                  style={{
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: '#2196f3',
                  }}
                >
                  Preview:
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <div>
                    <strong>{periodsInRange.length}</strong> period
                    {periodsInRange.length !== 1 ? 's' : ''} will be marked as
                    paid
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    Total amount:{' '}
                    <strong style={{ color: '#4facfe' }}>
                      {formatCurrency(
                        totalAmount,
                        account.monthlyPayment.currency
                      )}
                    </strong>
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    Periods: {startPeriod} to {endPeriod}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label
                htmlFor="use-custom-date"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  id="use-custom-date"
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={(e) => setUseCustomDate(e.target.checked)}
                  disabled={isSubmitting}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                />
                <span>
                  Use custom payment date (otherwise uses each period's due
                  date)
                </span>
              </label>
            </div>

            {useCustomDate && (
              <div className="form-group">
                <label htmlFor="custom-payment-date">
                  Payment Date <span className="required">*</span>
                </label>
                <input
                  id="custom-payment-date"
                  type="date"
                  value={customPaymentDate}
                  onChange={(e) => setCustomPaymentDate(e.target.value)}
                  required={useCustomDate}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="batch-notes">Notes (Optional)</label>
              <textarea
                id="batch-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes for all payments (e.g., 'Historical payments migration')..."
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="form-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {result && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  backgroundColor:
                    result.failed > 0
                      ? 'rgba(244, 67, 54, 0.1)'
                      : 'rgba(76, 175, 80, 0.1)',
                  border: `1px solid ${
                    result.failed > 0
                      ? 'rgba(244, 67, 54, 0.3)'
                      : 'rgba(76, 175, 80, 0.3)'
                  }`,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: result.failed > 0 ? '#f44336' : '#4caf50',
                  }}
                >
                  Batch Payment Results:
                </div>
                <div>
                  <div style={{ color: '#4caf50' }}>
                    ✓ Successfully logged: {result.success} payment
                    {result.success !== 1 ? 's' : ''}
                  </div>
                  {result.failed > 0 && (
                    <div style={{ color: '#f44336', marginTop: '0.5rem' }}>
                      ✗ Failed: {result.failed} payment
                      {result.failed !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {result.failed > 0 && (
                  <details
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    <summary style={{ cursor: 'pointer' }}>
                      Error details
                    </summary>
                    <ul
                      style={{
                        marginTop: '0.5rem',
                        paddingLeft: '1.5rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {result.details
                        .filter((d) => !d.success)
                        .map((d) => (
                          <li key={d.periodNumber}>
                            Period #{d.periodNumber}: {d.error}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || periodsInRange.length === 0}
                >
                  {isSubmitting
                    ? 'Logging Payments...'
                    : `Log ${periodsInRange.length} Payment${periodsInRange.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
