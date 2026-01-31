import React, { useMemo } from 'react';
import {
  FinancialAccount,
  isOther,
  generateOtherAccountsInsights,
  getAvailableAccountDirection,
} from '@rates/firebase-client';
import { ObligationsOverviewWidget } from './ObligationsOverviewWidget';
import { CommitmentTrackerWidget } from './CommitmentTrackerWidget';
import { MoneyOwedWidget } from './MoneyOwedWidget';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OtherAccountDetailProps {
  account: FinancialAccount;
}

export const OtherAccountDetail: React.FC<OtherAccountDetailProps> = ({
  account,
}) => {
  const insights = useMemo(() => {
    if (!isOther(account)) return null;
    return generateOtherAccountsInsights([account]);
  }, [account]);

  if (!insights || !isOther(account)) return null;

  const direction = getAvailableAccountDirection(account);
  const paymentLog = account.paymentLog ?? [];

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="border-b border-neutral-700/30 pb-4">
        <h2 className="text-[1.75rem] font-bold text-white">
          Account Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Render relevant widget based on account nature */}
        {(() => {
          if (direction === 'liability') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return (
              <ObligationsOverviewWidget insight={insights.obligations} />
            ) as // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any;
          }
          return null;
        })()}

        {/* Show commitment tracker if there's a plan or it's a liability */}
        {(direction === 'liability' ||
          (account.metadata as { paymentPlan?: unknown })?.paymentPlan) && (
          <CommitmentTrackerWidget insight={insights.commitments} />
        )}

        {direction === 'asset' && (
          <MoneyOwedWidget insight={insights.moneyOwed} />
        )}
      </div>

      {/* Manual History / Payment Log */}
      <div className="mt-8">
        <h3 className="mb-4 text-xl font-bold text-white">Activity History</h3>
        {paymentLog.length === 0 ? (
          <div className="rounded-lg bg-white/5 p-6 text-center text-white/50">
            No activity recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white/5">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/10 text-xs uppercase text-white/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentLog.map((log, idx) => {
                  // Handle FireStore date
                  const paidDate =
                    log.datePaid instanceof Date
                      ? log.datePaid
                      : (log.datePaid as { toDate: () => Date }).toDate();
                  return (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="px-4 py-3">{formatDate(paidDate)}</td>
                      <td className="px-4 py-3 font-mono">
                        {formatCurrency(log.valuePaid, log.currency)}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {log.notes ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
