import React from 'react';
import { FinancialAccount, isBill } from '@rates/firebase-client';
import { formatCurrency, toDate } from '../../utils/formatters';

interface BillStatsWidgetProps {
  account: FinancialAccount;
}

export const BillStatsWidget: React.FC<BillStatsWidgetProps> = ({
  account,
}) => {
  if (!isBill(account)) return null;

  const history = account.paymentLog || [];
  const values = history.map((h) => h.valuePaid);

  const totalPaid = values.reduce((sum, v) => sum + v, 0);
  const avgAmount = values.length > 0 ? totalPaid / values.length : 0;

  // Min/Max with Dates
  let minPayment = { amount: 0, date: null as Date | null };
  let maxPayment = { amount: 0, date: null as Date | null };

  if (history.length > 0) {
    // Sort specifically for finding min/max
    const sortedByAmount = [...history].sort(
      (a, b) => a.valuePaid - b.valuePaid
    );
    const min = sortedByAmount[0];
    const max = sortedByAmount[sortedByAmount.length - 1];

    // Safety check for datePaid, handle if it's not a standard object
    const getEntryDate = (entry: (typeof history)[0]) => {
      const d = toDate(entry.datePaid);
      return d || new Date(); // Fallback
    };

    minPayment = { amount: min.valuePaid, date: getEntryDate(min) };
    maxPayment = { amount: max.valuePaid, date: getEntryDate(max) };
  }

  const recurringAmt =
    typeof account.recurringAmount === 'number' ? account.recurringAmount : 0;
  const isVariable = account.isAmountVariable;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="ds-card-light p-6">
        <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          Recurring Amount
        </h3>
        <p className="m-0 text-2xl font-bold text-white">
          {formatCurrency(recurringAmt, account.currency)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {isVariable ? 'Estimated (Variable)' : 'Fixed Amount'}
        </p>
      </div>

      <div className="ds-card-light p-6">
        <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          Average (12mo)
        </h3>
        <p className="m-0 text-2xl font-bold text-white">
          {formatCurrency(avgAmount, account.currency)}
        </p>
        <div className="mt-1 flex justify-between text-xs text-white/50">
          <span>Based on {history.length} payments</span>
        </div>
      </div>

      <div className="ds-card-light p-6">
        <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          Highest Payment
        </h3>
        <p className="m-0 text-2xl font-bold text-white">
          {formatCurrency(maxPayment.amount, account.currency)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {maxPayment.date
            ? maxPayment.date.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })
            : '-'}
        </p>
      </div>

      <div className="ds-card-light p-6">
        <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          Lowest Payment
        </h3>
        <p className="m-0 text-2xl font-bold text-white">
          {formatCurrency(minPayment.amount, account.currency)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {minPayment.date
            ? minPayment.date.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })
            : '-'}
        </p>
      </div>
    </div>
  );
};
