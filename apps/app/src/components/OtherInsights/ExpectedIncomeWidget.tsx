import { useMemo } from 'react';
import { OtherIncome, OtherInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface ExpectedIncomeWidgetProps {
  otherIncomes: OtherIncome[];
}

export function ExpectedIncomeWidget({
  otherIncomes,
}: ExpectedIncomeWidgetProps) {
  const analysis = useMemo(() => {
    return OtherInsightsService.getExpectedIncomeStatus(otherIncomes);
  }, [otherIncomes]);

  if (analysis.pending.length === 0) return null;

  const { upcoming, overdue, recentlyReceived, totalExpected, hasOverdue } =
    analysis;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">⏳</span> Expected Income Tracker
        </h3>
        {hasOverdue && (
          <span className="rounded-full bg-danger-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-danger-400 ring-1 ring-danger-500/30">
            Action Needed
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-danger-400">
              ❓ Overdue Check-in
            </div>
            <div className="space-y-3">
              {overdue.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-xl border border-danger-500/20 bg-danger-500/10 p-4"
                >
                  <div className="mb-3 flex justify-between">
                    <div>
                      <div className="font-bold text-white">{inc.name}</div>
                      <div className="text-xs text-danger-300/70">
                        Expected {toDateString(inc.incomeDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-white">
                        {formatCurrency(inc.incomeAmount.amount, inc.currency)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-lg bg-danger-500/20 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-danger-500/30">
                      ✓ Received
                    </button>
                    <button className="rounded-lg bg-white/5 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all hover:bg-white/10">
                      Update Date
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              WAITING TO RECEIVE
            </div>
            <div className="space-y-3">
              {upcoming.map((inc) => {
                const date = toDate(inc.incomeDate);
                const now = new Date();
                const diffDays = Math.ceil(
                  (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={inc.id}
                    className="rounded-xl border border-white/5 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex justify-between">
                      <div>
                        <div className="font-bold text-white">{inc.name}</div>
                        <div className="text-xs text-white/40">
                          Due ~{toDateString(inc.incomeDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-white">
                          {formatCurrency(
                            inc.incomeAmount.amount,
                            inc.currency
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full bg-primary-500 opacity-60"
                          style={{
                            width: `${Math.max(10, 100 - diffDays * 2)}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-white/40">
                        {diffDays} days away
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="border-t border-white/10 pt-6">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
            📊 SUMMARY
          </div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-white/60">Total expected</span>
            <span className="text-lg font-black text-white">
              {formatCurrency(
                totalExpected,
                upcoming[0]?.currency || overdue[0]?.currency || 'USD'
              )}
            </span>
          </div>
          {upcoming.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Nearest arrival</span>
              <span className="text-sm font-bold text-primary-400">
                {toDate(upcoming[0].incomeDate)?.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Recently Received */}
        {recentlyReceived.length > 0 && (
          <div className="border-t border-white/10 pt-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              RECENTLY RECEIVED
            </div>
            <div className="space-y-2">
              {recentlyReceived.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between rounded-lg border border-success-500/10 bg-success-500/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-success-400">✓</span>
                    <span className="text-xs text-white/80">{inc.name}</span>
                  </div>
                  <span className="text-xs font-bold text-white">
                    {formatCurrency(inc.incomeAmount.amount, inc.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ToDateCapable {
  toDate(): Date;
}

function hasToDate(value: unknown): value is ToDateCapable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Record<'toDate', unknown>).toDate === 'function'
  );
}

function toDate(date: unknown): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;

  if (hasToDate(date)) {
    return date.toDate();
  }

  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date);
  }

  return null;
}

function toDateString(date: unknown): string {
  const d = toDate(date);
  if (!d) return 'Unknown';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
