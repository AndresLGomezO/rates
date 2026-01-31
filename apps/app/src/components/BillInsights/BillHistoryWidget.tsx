import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { FinancialAccount, isBill } from '@rates/firebase-client';
import {
  formatCurrency,
  formatDateShort,
  toDate,
} from '../../utils/formatters';

interface BillHistoryWidgetProps {
  account: FinancialAccount;
}

export const BillHistoryWidget: React.FC<BillHistoryWidgetProps> = ({
  account,
}) => {
  if (!isBill(account)) return null;

  const rawData = (account.paymentLog || [])
    .map((entry) => ({
      date: formatDateShort(toDate(entry.datePaid)),
      rawDate: toDate(entry.datePaid),
      amount: entry.valuePaid,
    }))
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  // Calculate Average
  const totalAmount = rawData.reduce((sum, item) => sum + item.amount, 0);
  const averageAmount = rawData.length > 0 ? totalAmount / rawData.length : 0;

  const data = rawData.map((d) => ({ ...d, average: averageAmount }));

  if (data.length === 0) {
    return (
      <div className="ds-card-light p-6 text-center italic text-white/50">
        No payment history available.
      </div>
    );
  }

  return (
    <div className="ds-card-light p-6">
      <h3 className="m-0 mb-2 text-xl font-semibold text-white">
        Payment History
      </h3>
      <p className="m-0 mb-6 text-sm text-white/70">
        Tracking your payments vs 12-month average.
      </p>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(val) => `$${val}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(23, 23, 23, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                boxShadow:
                  '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => {
                if (name === 'average')
                  return [formatCurrency(value, account.currency), 'Average'];
                return [formatCurrency(value, account.currency), 'Paid'];
              }}
              labelStyle={{
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '0.5rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAmount)"
              activeDot={{
                r: 6,
                stroke: '#fff',
                strokeWidth: 2,
                fill: '#22c55e',
              }}
            />
            <ReferenceLine
              y={averageAmount}
              stroke="#fbbf24"
              strokeDasharray="3 3"
              label={{
                value: 'Avg',
                position: 'right',
                fill: '#fbbf24',
                fontSize: 12,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
