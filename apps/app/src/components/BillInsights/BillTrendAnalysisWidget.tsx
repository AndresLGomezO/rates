import React from 'react';
import { FinancialAccount, isBill } from '@rates/firebase-client';
import { formatCurrency, toDate } from '../../utils/formatters';

interface BillTrendAnalysisWidgetProps {
  account: FinancialAccount;
}

export const BillTrendAnalysisWidget: React.FC<
  BillTrendAnalysisWidgetProps
> = ({ account }) => {
  if (!isBill(account) || !account.paymentLog || account.paymentLog.length < 2)
    return null;

  // Sort history by date descending (newest first)
  const history = [...account.paymentLog].sort((a, b) => {
    return toDate(b.datePaid).getTime() - toDate(a.datePaid).getTime();
  });

  const current = history[0];
  const previous = history[1];
  const currentVal = current.valuePaid;
  const previousVal = previous.valuePaid;

  // Average of last 12 months (excluding current if needed, but let's include all available history up to 12)
  const last12 = history.slice(0, 12);
  const avgAmount =
    last12.reduce((sum, h) => sum + h.valuePaid, 0) / last12.length;

  // Calculate trends
  const monthOverMonthChange =
    previousVal > 0 ? ((currentVal - previousVal) / previousVal) * 100 : 0;
  const vsAverageChange =
    avgAmount > 0 ? ((currentVal - avgAmount) / avgAmount) * 100 : 0;

  // Same month last year comparison
  // Find entry from ~12 months ago
  const sameMonthLastYear = history.find((h) => {
    const d = toDate(h.datePaid);
    const curDate = toDate(current.datePaid);
    return (
      d.getMonth() === curDate.getMonth() &&
      d.getFullYear() === curDate.getFullYear() - 1
    );
  });

  let yearOverYearChange: number | null = null;
  if (sameMonthLastYear) {
    yearOverYearChange =
      sameMonthLastYear.valuePaid > 0
        ? ((currentVal - sameMonthLastYear.valuePaid) /
            sameMonthLastYear.valuePaid) *
          100
        : 0;
  }

  const getChangeColor = (change: number) => {
    if (change > 5) return 'text-red-400'; // Higher bill = bad usually
    if (change < -5) return 'text-green-400'; // Lower bill = good
    return 'text-white/70';
  };

  const getChangeIcon = (change: number) => {
    if (change > 5) return '📈';
    if (change < -5) return '📉';
    return '─';
  };

  const insights = [];

  // Insight 1: Month over Month
  if (Math.abs(monthOverMonthChange) > 1) {
    insights.push({
      label: `vs Last Month (${formatCurrency(previousVal, account.currency)})`,
      value: `${monthOverMonthChange > 0 ? '+' : ''}${monthOverMonthChange.toFixed(1)}%`,
      color: getChangeColor(monthOverMonthChange),
      icon: getChangeIcon(monthOverMonthChange),
      desc:
        monthOverMonthChange > 10
          ? 'Significant increase'
          : 'Normal fluctuation',
    });
  }

  // Insight 2: Vs Average
  insights.push({
    label: `vs 12-Month Average (${formatCurrency(avgAmount, account.currency)})`,
    value: `${vsAverageChange > 0 ? '+' : ''}${vsAverageChange.toFixed(1)}%`,
    color: getChangeColor(vsAverageChange),
    icon: getChangeIcon(vsAverageChange),
    desc: 'Overall trend',
  });

  // Insight 3: Year over Year
  if (yearOverYearChange !== null) {
    insights.push({
      label: `vs Same Month Last Year (${formatCurrency(sameMonthLastYear!.valuePaid, account.currency)})`,
      value: `${yearOverYearChange > 0 ? '+' : ''}${yearOverYearChange.toFixed(1)}%`,
      color: getChangeColor(yearOverYearChange),
      icon: getChangeIcon(yearOverYearChange),
      desc: 'Annual comparison',
    });
  }

  return (
    <div className="ds-card-light p-6">
      <h3 className="m-0 mb-4 flex items-center gap-2 text-xl font-semibold text-white">
        <span>💡</span> Bill Insights
      </h3>

      <div className="flex flex-col gap-4">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">{insight.icon}</span>
              <div>
                <div className="text-sm font-medium text-white/90">
                  {insight.value} {insight.desc}
                </div>
                <div className="text-xs text-white/50">{insight.label}</div>
              </div>
            </div>
            {/* Optional graph or more detail could go here */}
          </div>
        ))}

        {/* Generic helper text based on specs */}
        {account.isAmountVariable && (
          <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
            Variable bills can fluctuate due to usage or seasonality. Set a
            budget alert if this trend continues.
          </div>
        )}
      </div>
    </div>
  );
};
