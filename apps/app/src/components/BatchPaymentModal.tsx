import { useState, useEffect } from 'react';
import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import { Modal } from './Modal';
import {
  batchLogPaymentsToPeriods,
  getPaymentPeriods,
} from '../services/paymentPeriods';

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
        className="flex flex-col gap-6 py-4"
      >
        <div className="rounded-lg border border-neutral-700/30 bg-white/5 p-5">
          <div className="flex items-center justify-between border-b border-neutral-700/20 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">
              Account Number:
            </span>
            <span className="text-base font-semibold text-white/95">
              {account.accountNumber}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-700/20 py-3 last:border-b-0">
            <span className="text-sm font-medium text-white/70">
              Pending Periods:
            </span>
            <span className="text-base font-semibold text-white/95">
              {periods.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-white/70">
            Loading periods...
          </div>
        ) : periods.length === 0 ? (
          <div className="mb-4 rounded-lg border border-warning-500/30 bg-warning-500/10 p-4 text-white/90">
            No pending periods found for this account.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="start-period"
                className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
              >
                From Period <span className="text-danger-500">*</span>
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
                className="bg-white/8 font-inherit focus:bg-white/12 cursor-pointer rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 ease-in-out focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-[rgba(30,30,30,0.95)] [&>option]:text-white/95"
              >
                {availablePeriodNumbers.map((num) => (
                  <option key={num} value={num}>
                    Period #{num}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="end-period"
                className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
              >
                To Period <span className="text-danger-500">*</span>
                {currentPeriodNumber !== null && (
                  <span className="ml-2 text-sm font-normal text-white/60">
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
                className="bg-white/8 font-inherit focus:bg-white/12 cursor-pointer rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 ease-in-out focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-[rgba(30,30,30,0.95)] [&>option]:text-white/95"
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
              <div className="mb-4 rounded-lg border border-[rgba(33,150,243,0.3)] bg-[rgba(33,150,243,0.1)] p-4 text-white/90">
                <div className="mb-2 font-semibold text-[#2196f3]">
                  Preview:
                </div>
                <div className="text-sm">
                  <div>
                    <strong>{periodsInRange.length}</strong> period
                    {periodsInRange.length !== 1 ? 's' : ''} will be marked as
                    paid
                  </div>
                  <div className="mt-2">
                    Total amount:{' '}
                    <strong className="text-[#2563eb]">
                      {formatCurrency(
                        totalAmount,
                        account.monthlyPayment.currency
                      )}
                    </strong>
                  </div>
                  <div className="mt-2 text-xs text-white/70">
                    Periods: {startPeriod} to {endPeriod}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="use-custom-date"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  id="use-custom-date"
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={(e) => setUseCustomDate(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-[18px] w-[18px] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-[0.95rem] font-semibold text-white/90">
                  Use custom payment date (otherwise uses each period's due
                  date)
                </span>
              </label>
            </div>

            {useCustomDate && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-payment-date"
                  className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
                >
                  Payment Date <span className="text-danger-500">*</span>
                </label>
                <input
                  id="custom-payment-date"
                  type="date"
                  value={customPaymentDate}
                  onChange={(e) => setCustomPaymentDate(e.target.value)}
                  required={useCustomDate}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isSubmitting}
                  className="bg-white/8 font-inherit focus:bg-white/12 rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 ease-in-out focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="batch-notes"
                className="flex items-center gap-1 text-[0.95rem] font-semibold text-white/90"
              >
                Notes (Optional)
              </label>
              <textarea
                id="batch-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes for all payments (e.g., 'Historical payments migration')..."
                disabled={isSubmitting}
                className="bg-white/8 font-inherit focus:bg-white/12 min-h-[80px] resize-y rounded-lg border border-white/15 px-4 py-3 text-base text-white/95 transition-all duration-200 ease-in-out placeholder:text-white/40 focus:border-primary-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger-500/30 bg-danger-500/15 px-4 py-3 text-sm text-danger-500">
                <span className="text-lg">⚠️</span>
                {error}
              </div>
            )}

            {result && (
              <div
                className={`mb-4 rounded-lg p-4 text-white/90 ${
                  result.failed > 0
                    ? 'border border-danger-500/30 bg-danger-500/10'
                    : 'border border-success-css/30 bg-success-css/10'
                }`}
              >
                <div
                  className={`mb-2 font-semibold ${
                    result.failed > 0 ? 'text-danger-500' : 'text-success-css'
                  }`}
                >
                  Batch Payment Results:
                </div>
                <div>
                  <div className="text-success-css">
                    ✓ Successfully logged: {result.success} payment
                    {result.success !== 1 ? 's' : ''}
                  </div>
                  {result.failed > 0 && (
                    <div className="mt-2 text-danger-500">
                      ✗ Failed: {result.failed} payment
                      {result.failed !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {result.failed > 0 && (
                  <details className="mt-2 text-sm text-white/80">
                    <summary className="cursor-pointer">Error details</summary>
                    <ul className="mt-2 pl-6 text-white/70">
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

            <div className="mt-2 flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-none border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white/90 transition-all duration-200 ease-in-out hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  type="submit"
                  className="font-inherit cursor-pointer rounded-lg border-none bg-gradient-to-br from-[#1e40af] to-[#334155] px-6 py-3 text-base font-semibold text-white shadow-[0_4px_12px_rgba(30,64,175,0.4)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(30,64,175,0.5)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
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
