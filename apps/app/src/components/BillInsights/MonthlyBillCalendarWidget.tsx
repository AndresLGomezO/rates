import React from 'react';
import { MonthlyCalendarView } from '@rates/firebase-client';

interface MonthlyBillCalendarWidgetProps {
  data: MonthlyCalendarView;
}

export const MonthlyBillCalendarWidget: React.FC<
  MonthlyBillCalendarWidgetProps
> = ({ data }) => {
  const { month, totalDue, totalPaid, remainingDue, bills } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'overdue':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'due_soon':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'upcoming':
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
      default:
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      case 'due_soon':
        return 'Due Soon';
      case 'upcoming':
        return 'Upcoming';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      weekday: 'short',
    }).format(date);
  };

  return (
    <div className="ds-card-light p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-white/70">
            {month} Bills
          </h3>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(totalDue)}{' '}
            <span className="text-base font-normal text-white/50">total</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/60">Remaining</div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(remainingDue)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-neutral-700/50">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{
            width: `${totalDue > 0 ? (totalPaid / totalDue) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Bill List */}
      <div className="space-y-3">
        {bills.map((bill) => (
          <div
            key={`${bill.id}-${bill.date.toISOString()}`}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="flex min-w-[3.5rem] flex-col items-center justify-center rounded-md bg-white/5 px-3 py-2 text-center">
                <span className="text-xs uppercase text-white/50">
                  {formatDate(bill.date).split(',')[0]}
                </span>
                <span className="text-lg font-bold leading-none text-white">
                  {bill.date.getDate()}
                </span>
              </div>
              <div>
                <div className="font-semibold text-white">{bill.name}</div>
                {bill.isVariable && (
                  <div className="text-xs text-orange-300/80">
                    Variable Amount
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white">
                {formatCurrency(bill.amount)}
              </div>
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${getStatusColor(bill.status)}`}
              >
                {getStatusLabel(bill.status)}
              </span>
            </div>
          </div>
        ))}
        {bills.length === 0 && (
          <div className="py-8 text-center italic text-white/40">
            No bills due this month.
          </div>
        )}
      </div>
    </div>
  );
};
