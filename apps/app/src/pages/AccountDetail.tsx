import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  PaymentPeriod,
  PaymentLogEntry,
  FinancialAccountCalculated,
} from '@rates/firebase-client';
import { getFinancialAccount } from '../services/financialAccounts';
import { getPaymentPeriods } from '../services/paymentPeriods';
import { getAccountWithCalculated } from '@rates/firebase-client';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  toDate,
  getPaymentStatusColor,
  formatAccountStatus,
} from '../utils/formatters';
import type {
  ChartDataPoint,
  PaymentHistoryEntry,
  CumulativePaymentDataPoint,
  InterestCapitalDataPoint,
  AccountMetrics,
  PieLabelProps,
  RechartsModule,
  RechartsComponent,
} from './AccountDetail.types';
import './AccountDetail.css';

// Type declaration for require in browser context
declare const require: ((module: string) => unknown) | undefined;

let rechartsModule: RechartsModule | null = null;

// Try to import recharts dynamically
try {
  // Using require for dynamic import - this is acceptable for optional dependencies
  if (typeof require !== 'undefined') {
    const recharts = require('recharts') as RechartsModule;
    rechartsModule = recharts;
  }
} catch {
  // Recharts not installed - will use fallback visualization
  // This is expected if recharts hasn't been installed yet
}

/**
 * Calculate account metrics from calculated account and payment periods
 */
function calculateAccountMetrics(
  calculatedAccount: FinancialAccountCalculated,
  paymentPeriods: PaymentPeriod[]
): AccountMetrics {
  const totalPaid = calculatedAccount.totalPaid?.amount ?? 0;
  const totalInterestPaid = paymentPeriods.reduce(
    (sum, p) => sum + (p.status === 'paid' ? p.interest : 0),
    0
  );
  const totalCapitalPaid = paymentPeriods.reduce(
    (sum, p) => sum + (p.status === 'paid' ? p.capital : 0),
    0
  );
  const paidPeriods = paymentPeriods.filter((p) => p.status === 'paid').length;
  const totalPeriods = paymentPeriods.length;
  const progressPercentage =
    totalPeriods > 0 ? (paidPeriods / totalPeriods) * 100 : 0;

  return {
    totalPaid,
    totalInterestPaid,
    totalCapitalPaid,
    paidPeriods,
    totalPeriods,
    progressPercentage,
  };
}

/**
 * Prepare chart data from payment periods
 */
function prepareChartData(
  account: FinancialAccount,
  paymentPeriods: PaymentPeriod[]
): ChartDataPoint[] {
  if (!paymentPeriods.length) return [];

  const data: ChartDataPoint[] = [];
  // Use account's original amount or current remaining balance as starting point
  const startingBalance =
    account.originalAmount?.amount ?? account.totalAmountRemaining.amount;
  let runningBalance = startingBalance;

  paymentPeriods.forEach((period) => {
    const dueDate = toDate(period.dueDate);

    // Calculate running balance (for loans)
    if (period.remainingPrincipal !== undefined) {
      runningBalance = period.remainingPrincipal;
    } else if (period.status === 'paid' && period.capital > 0) {
      runningBalance = Math.max(0, runningBalance - period.capital);
    }

    data.push({
      period: period.periodNumber,
      date: formatDateShort(dueDate),
      due: period.amount,
      paid: period.amountPaid,
      capital: period.capital,
      interest: period.interest,
      balance: runningBalance,
      status: period.status,
    });
  });

  return data;
}

/**
 * Prepare payment history data from account payment log
 */
function preparePaymentHistoryData(
  account: FinancialAccount
): PaymentHistoryEntry[] {
  if (!account.paymentLog.length) return [];

  return account.paymentLog
    .map((entry: PaymentLogEntry) => {
      const datePaid = toDate(entry.datePaid);
      return {
        date: datePaid,
        dateStr: formatDate(datePaid, { month: 'short' }),
        amount: entry.valuePaid,
        currency: entry.currency,
        notes: entry.notes,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Prepare cumulative payment data
 */
function prepareCumulativePaymentData(
  paymentHistoryData: PaymentHistoryEntry[]
): CumulativePaymentDataPoint[] {
  if (!paymentHistoryData.length) return [];

  let cumulative = 0;
  return paymentHistoryData.map((payment) => {
    cumulative += payment.amount;
    return {
      date: payment.dateStr,
      amount: payment.amount,
      cumulative,
    };
  });
}

/**
 * Prepare interest vs capital breakdown data
 */
function prepareInterestCapitalData(
  paymentPeriods: PaymentPeriod[]
): InterestCapitalDataPoint[] {
  if (!paymentPeriods.length) return [];

  const totalInterest = paymentPeriods.reduce(
    (sum, p) => sum + (p.status === 'paid' ? p.interest : 0),
    0
  );
  const totalCapital = paymentPeriods.reduce(
    (sum, p) => sum + (p.status === 'paid' ? p.capital : 0),
    0
  );

  return [
    { name: 'Capital' as const, value: totalCapital, color: '#667eea' },
    { name: 'Interest' as const, value: totalInterest, color: '#f093fb' },
  ];
}

/**
 * Format pie chart label
 */
function formatPieLabel({ name, percent }: PieLabelProps): string {
  return `${name}: ${(percent * 100).toFixed(0)}%`;
}

/**
 * Chart tooltip style configuration
 */
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0,0,0,0.8)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '8px',
  color: '#fff',
} as const;

/**
 * Chart axis style configuration
 */
const CHART_AXIS_STYLE = {
  fontSize: '12px',
} as const;

export default function AccountDetail() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<FinancialAccount | null>(null);
  const [calculatedAccount, setCalculatedAccount] =
    useState<FinancialAccountCalculated | null>(null);
  const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    if (!accountNumber) return;

    try {
      setLoading(true);
      setError(null);

      // Load account
      const accountData = await getFinancialAccount(accountNumber);
      if (!accountData) {
        setError('Account not found');
        return;
      }

      setAccount(accountData);

      // Get calculated fields
      const calculated = getAccountWithCalculated(accountData);
      setCalculatedAccount(calculated);

      // Load payment periods
      try {
        const periods = await getPaymentPeriods(accountNumber);
        setPaymentPeriods(periods);
      } catch (err) {
        console.warn('Could not load payment periods:', err);
        setPaymentPeriods([]);
      }
    } catch (err) {
      console.error('Error loading account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    if (accountNumber) {
      void loadAccountData();
    }
  }, [accountNumber, loadAccountData]);

  // Memoized computed data
  const chartData = useMemo(
    () => (account ? prepareChartData(account, paymentPeriods) : []),
    [account, paymentPeriods]
  );

  const paymentHistoryData = useMemo(
    () => (account ? preparePaymentHistoryData(account) : []),
    [account]
  );

  const cumulativePaymentData = useMemo(
    () => prepareCumulativePaymentData(paymentHistoryData),
    [paymentHistoryData]
  );

  const interestCapitalData = useMemo(
    () => prepareInterestCapitalData(paymentPeriods),
    [paymentPeriods]
  );

  const metrics = useMemo(() => {
    if (!calculatedAccount) {
      return {
        totalPaid: 0,
        totalInterestPaid: 0,
        totalCapitalPaid: 0,
        paidPeriods: 0,
        totalPeriods: 0,
        progressPercentage: 0,
      };
    }
    return calculateAccountMetrics(calculatedAccount, paymentPeriods);
  }, [calculatedAccount, paymentPeriods]);

  if (loading) {
    return (
      <div className="account-detail">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error || !account || !calculatedAccount) {
    return (
      <div className="account-detail">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error ?? 'Account not found'}</p>
          <button
            onClick={() => {
              void navigate(-1);
            }}
            className="btn-back"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currency = account.totalAmountRemaining.currency;
  const hasRecharts = rechartsModule !== null;

  // Extract recharts components with proper types
  const LineChart: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.LineChart ?? null)
    : null;

  const Line: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Line ?? null)
    : null;

  const AreaChart: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.AreaChart ?? null)
    : null;

  const Area: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Area ?? null)
    : null;

  const BarChart: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.BarChart ?? null)
    : null;

  const Bar: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Bar ?? null)
    : null;

  const XAxis: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.XAxis ?? null)
    : null;

  const YAxis: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.YAxis ?? null)
    : null;

  const CartesianGrid: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.CartesianGrid ?? null)
    : null;

  const Tooltip: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Tooltip ?? null)
    : null;

  const ResponsiveContainer: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.ResponsiveContainer ?? null)
    : null;

  const PieChart: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.PieChart ?? null)
    : null;

  const Pie: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Pie ?? null)
    : null;

  const Cell: RechartsComponent | null = hasRecharts
    ? (rechartsModule?.Cell ?? null)
    : null;

  return (
    <div className="account-detail">
      {/* Header */}
      <div className="account-detail-header">
        <div className="account-detail-header-left">
          <button
            onClick={() => {
              void navigate(-1);
            }}
            className="btn-back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
          <div className="account-title-section">
            <h1>{account.accountName}</h1>
            <p className="account-number">{account.accountNumber}</p>
            <p className="account-description">{account.accountDescription}</p>
          </div>
        </div>
        <div className="account-status-badge" data-status={account.status}>
          {formatAccountStatus(account.status)}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="account-metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Remaining Balance</div>
          <div className="metric-value primary">
            {formatCurrency(account.totalAmountRemaining.amount, currency)}
          </div>
          {account.originalAmount && (
            <div className="metric-sublabel">
              {formatCurrency(account.originalAmount.amount, currency)} original
            </div>
          )}
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Paid</div>
          <div className="metric-value success">
            {formatCurrency(metrics.totalPaid, currency)}
          </div>
          <div className="metric-sublabel">
            {paymentHistoryData.length} payments
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Monthly Payment</div>
          <div className="metric-value">
            {formatCurrency(account.monthlyPayment.amount, currency)}
          </div>
          <div className="metric-sublabel">{account.rate}% interest rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Progress</div>
          <div className="metric-value">
            {metrics.paidPeriods} / {metrics.totalPeriods} periods
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${metrics.progressPercentage}%` }}
            ></div>
          </div>
        </div>
        {account.nextDueDate && (
          <div className="metric-card">
            <div className="metric-label">Next Due Date</div>
            <div className="metric-value">
              {formatDate(account.nextDueDate)}
            </div>
          </div>
        )}
        <div className="metric-card">
          <div className="metric-label">Interest Paid</div>
          <div className="metric-value warning">
            {formatCurrency(metrics.totalInterestPaid, currency)}
          </div>
          <div className="metric-sublabel">
            {metrics.totalCapitalPaid > 0
              ? `${((metrics.totalInterestPaid / (metrics.totalInterestPaid + metrics.totalCapitalPaid)) * 100).toFixed(1)}% of total`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <h2 className="section-title">Account Behavior Over Time</h2>

        <div className="charts-grid">
          {/* Balance Over Time */}
          {chartData.length > 0 && (
            <div className="chart-card">
              <h3>Balance Reduction</h3>
              {hasRecharts && ResponsiveContainer && AreaChart && Area ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="balanceGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#667eea"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#667eea"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    {CartesianGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                      />
                    )}
                    {XAxis && (
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {YAxis && (
                      <YAxis
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {Tooltip && (
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number) =>
                          formatCurrency(value, currency)
                        }
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#667eea"
                      fillOpacity={1}
                      fill="url(#balanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-fallback">
                  <p>Chart visualization requires recharts library</p>
                  <p>Install with: pnpm add recharts</p>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {cumulativePaymentData.length > 0 && (
            <div className="chart-card">
              <h3>Cumulative Payments</h3>
              {hasRecharts && ResponsiveContainer && LineChart && Line ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cumulativePaymentData}>
                    {CartesianGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                      />
                    )}
                    {XAxis && (
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {YAxis && (
                      <YAxis
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {Tooltip && (
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number) =>
                          formatCurrency(value, currency)
                        }
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#4caf50"
                      strokeWidth={3}
                      dot={{ fill: '#4caf50', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-fallback">
                  <p>Chart visualization requires recharts library</p>
                </div>
              )}
            </div>
          )}

          {/* Interest vs Capital */}
          {interestCapitalData.length > 0 &&
            interestCapitalData[0].value + interestCapitalData[1].value > 0 && (
              <div className="chart-card">
                <h3>Interest vs Capital</h3>
                {hasRecharts &&
                ResponsiveContainer &&
                PieChart &&
                Pie &&
                Cell ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={interestCapitalData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={formatPieLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {interestCapitalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      {Tooltip && (
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: number) =>
                            formatCurrency(value, currency)
                          }
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-fallback">
                    <p>Chart visualization requires recharts library</p>
                  </div>
                )}
              </div>
            )}

          {/* Payment Status Timeline */}
          {chartData.length > 0 && (
            <div className="chart-card">
              <h3>Payment Status Timeline</h3>
              {hasRecharts && ResponsiveContainer && BarChart && Bar ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    {CartesianGrid && (
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.1)"
                      />
                    )}
                    {XAxis && (
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {YAxis && (
                      <YAxis
                        stroke="rgba(255,255,255,0.6)"
                        style={CHART_AXIS_STYLE}
                      />
                    )}
                    {Tooltip && (
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number) =>
                          formatCurrency(value, currency)
                        }
                      />
                    )}
                    <Bar dataKey="due" fill="#9e9e9e" name="Amount Due" />
                    <Bar dataKey="paid" fill="#4caf50" name="Amount Paid" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-fallback">
                  <p>Chart visualization requires recharts library</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historical Payments */}
      <div className="payments-section">
        <h2 className="section-title">Historical Payments</h2>
        {paymentHistoryData.length > 0 ? (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistoryData.map((payment, index) => (
                  <tr key={index}>
                    <td>{payment.dateStr}</td>
                    <td className="amount-cell">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td>{payment.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No payment history available</p>
          </div>
        )}
      </div>

      {/* Payment Periods */}
      <div className="periods-section">
        <h2 className="section-title">Payment Periods</h2>
        {paymentPeriods.length > 0 ? (
          <div className="periods-grid">
            {paymentPeriods.map((period) => {
              const dueDate = toDate(period.dueDate);
              const isOverdue =
                period.status === 'overdue' ||
                (period.status === 'pending' && dueDate < new Date());

              return (
                <div
                  key={period.periodNumber}
                  className={`period-card ${period.status} ${
                    isOverdue ? 'overdue' : ''
                  }`}
                >
                  <div className="period-header">
                    <span className="period-number">
                      Period #{period.periodNumber}
                    </span>
                    <span
                      className="period-status"
                      style={{
                        backgroundColor: getPaymentStatusColor(period.status),
                      }}
                    >
                      {period.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="period-details">
                    <div className="period-detail-row">
                      <span className="period-label">Due Date:</span>
                      <span className="period-value">
                        {formatDate(dueDate)}
                      </span>
                    </div>
                    <div className="period-detail-row">
                      <span className="period-label">Amount Due:</span>
                      <span className="period-value">
                        {formatCurrency(period.amount, period.currency)}
                      </span>
                    </div>
                    <div className="period-detail-row">
                      <span className="period-label">Amount Paid:</span>
                      <span className="period-value">
                        {formatCurrency(period.amountPaid, period.currency)}
                      </span>
                    </div>
                    <div className="period-detail-row">
                      <span className="period-label">Remaining:</span>
                      <span className="period-value">
                        {formatCurrency(
                          period.amount - period.amountPaid,
                          period.currency
                        )}
                      </span>
                    </div>
                    {period.capital > 0 && (
                      <div className="period-detail-row">
                        <span className="period-label">Capital:</span>
                        <span className="period-value">
                          {formatCurrency(period.capital, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.interest > 0 && (
                      <div className="period-detail-row">
                        <span className="period-label">Interest:</span>
                        <span className="period-value">
                          {formatCurrency(period.interest, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.remainingPrincipal !== undefined && (
                      <div className="period-detail-row">
                        <span className="period-label">
                          Remaining Principal:
                        </span>
                        <span className="period-value">
                          {formatCurrency(
                            period.remainingPrincipal,
                            period.currency
                          )}
                        </span>
                      </div>
                    )}
                    {period.paymentLog.length > 0 && (
                      <div className="period-payments">
                        <span className="period-label">Payments:</span>
                        {period.paymentLog.map((payment, idx) => {
                          const paymentDate = toDate(payment.datePaid);
                          return (
                            <div key={idx} className="period-payment-entry">
                              <span>
                                {formatDate(paymentDate)} -{' '}
                                {formatCurrency(
                                  payment.amount,
                                  payment.currency
                                )}
                              </span>
                              {payment.notes && (
                                <span className="payment-note">
                                  {payment.notes}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No payment periods available</p>
          </div>
        )}
      </div>
    </div>
  );
}
