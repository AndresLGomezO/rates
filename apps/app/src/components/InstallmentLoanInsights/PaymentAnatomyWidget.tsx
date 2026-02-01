import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FinancialAccount,
  getPaymentAnatomyInsight,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface PaymentAnatomyWidgetProps {
  account: FinancialAccount;
}

const COLORS = {
  principal: '#22c55e', // Green for principal (good)
  interest: '#f59e0b', // Orange for interest (cost)
};

export function PaymentAnatomyWidget({ account }: PaymentAnatomyWidgetProps) {
  const insight = useMemo(() => getPaymentAnatomyInsight(account), [account]);

  if (!insight) return null;

  // Data for Yearly Breakdown Chart
  const yearlyData = insight.yearlyBreakdown.map((y) => ({
    year: `Year ${y.year}`,
    Principal: y.principalTotal,
    Interest: y.interestTotal,
  }));

  // Data for Lifetime Pie Chart
  const lifetimeData = [
    {
      name: 'Principal',
      value: insight.totalLifetimePrincipal.amount,
      color: COLORS.principal,
    },
    {
      name: 'Interest',
      value: insight.totalLifetimeInterest.amount,
      color: COLORS.interest,
    },
  ];

  return (
    <div className="ds-card-light p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="text-xl font-bold text-white">Payment Anatomy</h3>
        <p className="text-sm text-white/60">Where your money goes</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Section 1: Lifetime Cost */}
        <div className="flex flex-col items-center">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/80">
            Lifetime Cost Breakdown
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lifetimeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {lifetimeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value, account.currency)
                  }
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderColor: '#374151',
                    color: '#fff',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex w-full justify-between gap-4 rounded-lg bg-white/5 p-4 text-sm">
            <div>
              <div className="text-white/50">Total Interest</div>
              <div className="font-bold text-warning-500">
                {formatCurrency(
                  insight.totalLifetimeInterest.amount,
                  account.currency
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/50">Total Principal</div>
              <div className="font-bold text-success-css">
                {formatCurrency(
                  insight.totalLifetimePrincipal.amount,
                  account.currency
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Yearly Progression */}
        <div className="flex flex-col">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/80">
            Yearly Principal vs Interest
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={yearlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value, account.currency)
                  }
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderColor: '#374151',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend />
                <Bar
                  dataKey="Principal"
                  stackId="a"
                  fill={COLORS.principal}
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="Interest"
                  stackId="a"
                  fill={COLORS.interest}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-center text-xs text-white/50">
            Notice how the interest portion (orange) decreases over time while
            principal (green) increases.
          </p>
        </div>
      </div>
    </div>
  );
}
