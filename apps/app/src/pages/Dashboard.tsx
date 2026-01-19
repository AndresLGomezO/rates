import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
  PaymentPeriod,
} from '@rates/firebase-client';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import { getPaymentPeriods } from '../services/paymentPeriods';
import { formatCurrency, toDate, formatDate } from '../utils/formatters';
import { calculateDaysRemaining } from '../utils/paymentUtils';
import { LogPaymentModal } from '../components/LogPaymentModal';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

interface PeriodWithAccount {
  period: PaymentPeriod;
  account: FinancialAccount;
  periodInfo: {
    amountDue: number;
    amountPaid: number;
    amountRemaining: number;
    interest: number;
    capital: number;
    status: 'paid' | 'pending' | 'partial' | 'overdue';
  };
}

interface DashboardMetrics {
  totalIncome: number;
  totalOutcomes: number;
  totalInterest: number;
  totalPrincipal: number;
  totalPaid: number;
  totalPending: number;
  totalAccounts: number;
  activeAccounts: number;
  paidPeriodsCount: number;
  pendingPeriodsCount: number;
  partialPeriodsCount: number;
  overduePeriodsCount: number;
}

interface ChartDataPoint {
  date: string;
  income: number;
  outcome: number;
  interest: number;
  principal: number;
}

interface AccountInterestData {
  accountName: string;
  accountNumber: string;
  totalInterest: number;
  currency: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPeriods, setAllPeriods] = useState<PeriodWithAccount[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [selectedAccountForPayment, setSelectedAccountForPayment] =
    useState<FinancialAccount | null>(null);
  const [selectedPeriodForPayment, setSelectedPeriodForPayment] =
    useState<PaymentPeriod | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';
  const daysAhead = parseInt(searchParams.get('daysAhead') ?? '15', 10);

  // Calculate date range (daysAhead forward and backward from today)
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysAhead);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate, today };
  }, [daysAhead]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const allAccounts = await getUserFinancialAccounts();
      setAccounts(allAccounts);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentPeriods = useCallback(
    async (accountsToLoad: FinancialAccount[]) => {
      try {
        setLoadingPeriods(true);
        const periodsWithAccounts: PeriodWithAccount[] = [];

        await Promise.all(
          accountsToLoad.map(async (account) => {
            try {
              const periods = await getPaymentPeriods(account.accountNumber);
              const isBill = account.accountType === 'bill';

              periods.forEach((period) => {
                const dueDate = toDate(period.dueDate);
                const periodDate = new Date(dueDate);
                periodDate.setHours(0, 0, 0, 0);

                // Filter periods within date range
                if (
                  periodDate >= dateRange.startDate &&
                  periodDate <= dateRange.endDate
                ) {
                  const amountDue = period.amount;
                  const amountPaid = period.amountPaid;
                  const amountRemaining = Math.max(0, amountDue - amountPaid);
                  const hasPaymentLog = period.paymentLog.length > 0;

                  let status: 'paid' | 'pending' | 'partial' | 'overdue';
                  if (isBill) {
                    status = hasPaymentLog ? 'paid' : 'pending';
                  } else {
                    if (period.status === 'paid' || amountPaid >= amountDue) {
                      status = 'paid';
                    } else if (period.status === 'overdue') {
                      status = 'overdue';
                    } else if (amountPaid > 0) {
                      status = 'partial';
                    } else {
                      status = 'pending';
                    }
                  }

                  periodsWithAccounts.push({
                    period,
                    account,
                    periodInfo: {
                      amountDue,
                      amountPaid,
                      amountRemaining,
                      interest: period.interest,
                      capital: period.capital,
                      status,
                    },
                  });
                }
              });
            } catch (err) {
              console.error(
                `Error loading periods for ${account.accountNumber}:`,
                err
              );
            }
          })
        );

        setAllPeriods(periodsWithAccounts);
      } catch (err) {
        console.error('Error loading payment periods:', err);
      } finally {
        setLoadingPeriods(false);
      }
    },
    [dateRange]
  );

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      void loadPaymentPeriods(accounts);
    }
  }, [accounts, loadPaymentPeriods]);

  // Filter periods based on URL parameters
  const filteredPeriods = useMemo(() => {
    let filtered = allPeriods;

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.account.accountName.toLowerCase().includes(query) ||
          item.account.accountNumber.toLowerCase().includes(query) ||
          item.account.accountDescription?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    const statusFilters = (searchParams
      .get('status')
      ?.split(',')
      .filter(Boolean) ?? []) as AccountStatus[];
    if (statusFilters.length > 0) {
      filtered = filtered.filter((item) =>
        statusFilters.includes(item.account.status)
      );
    }

    // Apply type filter
    const typeFilters = (searchParams.get('type')?.split(',').filter(Boolean) ??
      []) as AccountType[];
    if (typeFilters.length > 0) {
      filtered = filtered.filter((item) =>
        typeFilters.includes(item.account.accountType)
      );
    }

    // Apply currency filter
    const currencyFilter = searchParams.get('currency') ?? '';
    if (currencyFilter) {
      filtered = filtered.filter(
        (item) => item.period.currency === currencyFilter
      );
    }

    return filtered;
  }, [allPeriods, searchQuery, searchParams]);

  // Calculate dashboard metrics
  const metrics = useMemo((): DashboardMetrics => {
    const paidPeriods = filteredPeriods.filter(
      (p) => p.periodInfo.status === 'paid'
    );
    const pendingPeriods = filteredPeriods.filter(
      (p) => p.periodInfo.status === 'pending'
    );
    const partialPeriods = filteredPeriods.filter(
      (p) => p.periodInfo.status === 'partial'
    );
    const overduePeriods = filteredPeriods.filter(
      (p) => p.periodInfo.status === 'overdue'
    );

    // Separate income (positive amounts) and outcomes (negative amounts)
    // For now, we'll treat all payments as outcomes
    const totalOutcomes = filteredPeriods.reduce(
      (sum, p) => sum + p.periodInfo.amountDue,
      0
    );
    const totalPaid = paidPeriods.reduce(
      (sum, p) => sum + p.periodInfo.amountPaid,
      0
    );
    const totalPending = [...pendingPeriods, ...partialPeriods].reduce(
      (sum, p) => sum + p.periodInfo.amountRemaining,
      0
    );
    const totalInterest = paidPeriods.reduce(
      (sum, p) => sum + p.periodInfo.interest,
      0
    );
    const totalPrincipal = paidPeriods.reduce(
      (sum, p) => sum + p.periodInfo.capital,
      0
    );

    const uniqueAccounts = new Set(
      filteredPeriods.map((p) => p.account.accountNumber)
    );
    const activeAccounts = accounts.filter((a) => a.status === 'active').length;

    return {
      totalIncome: 0, // TODO: Add income tracking if needed
      totalOutcomes,
      totalInterest,
      totalPrincipal,
      totalPaid,
      totalPending,
      totalAccounts: uniqueAccounts.size,
      activeAccounts,
      paidPeriodsCount: paidPeriods.length,
      pendingPeriodsCount: pendingPeriods.length,
      partialPeriodsCount: partialPeriods.length,
      overduePeriodsCount: overduePeriods.length,
    };
  }, [filteredPeriods, accounts]);

  // Prepare chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    const dataMap = new Map<string, ChartDataPoint>();

    filteredPeriods.forEach((item) => {
      const dueDate = toDate(item.period.dueDate);
      const dateKey = dueDate.toISOString().split('T')[0];

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: dateKey,
          income: 0,
          outcome: 0,
          interest: 0,
          principal: 0,
        });
      }

      const data = dataMap.get(dateKey)!;
      if (item.periodInfo.status === 'paid') {
        data.income += item.periodInfo.amountPaid;
        data.interest += item.periodInfo.interest;
        data.principal += item.periodInfo.capital;
      }
      data.outcome += item.periodInfo.amountDue;
    });

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [filteredPeriods]);

  // Account type distribution
  const accountTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    filteredPeriods.forEach((item) => {
      const type = item.account.accountType;
      const current = typeMap.get(type) ?? 0;
      typeMap.set(type, current + item.periodInfo.amountDue);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
  }, [filteredPeriods]);

  // Top accounts by interest paid
  const topAccountsByInterest = useMemo((): AccountInterestData[] => {
    const accountMap = new Map<string, AccountInterestData>();

    filteredPeriods
      .filter((p) => p.periodInfo.status === 'paid')
      .forEach((item) => {
        const key = item.account.accountNumber;
        if (!accountMap.has(key)) {
          accountMap.set(key, {
            accountName: item.account.accountName,
            accountNumber: item.account.accountNumber,
            totalInterest: 0,
            currency: item.period.currency,
          });
        }
        const account = accountMap.get(key)!;
        account.totalInterest += item.periodInfo.interest;
      });

    return Array.from(accountMap.values())
      .sort((a, b) => b.totalInterest - a.totalInterest)
      .slice(0, 5);
  }, [filteredPeriods]);

  // Interest vs Principal breakdown
  const interestPrincipalData = useMemo(() => {
    const paidPeriods = filteredPeriods.filter(
      (p) => p.periodInfo.status === 'paid'
    );
    const totalInterest = paidPeriods.reduce(
      (sum, p) => sum + p.periodInfo.interest,
      0
    );
    const totalPrincipal = paidPeriods.reduce(
      (sum, p) => sum + p.periodInfo.capital,
      0
    );
    return [
      { name: 'Interest', value: totalInterest },
      { name: 'Principal', value: totalPrincipal },
    ];
  }, [filteredPeriods]);

  const primaryCurrency =
    filteredPeriods[0]?.period.currency ||
    accounts[0]?.monthlyPayment.currency ||
    'COP';

  // Get pending periods (missing and incomplete)
  const pendingPeriods = useMemo(() => {
    return filteredPeriods.filter(
      (p) =>
        p.periodInfo.status === 'pending' || p.periodInfo.status === 'partial'
    );
  }, [filteredPeriods]);

  const handleLogPayment = (
    account: FinancialAccount,
    period: PaymentPeriod
  ) => {
    setSelectedAccountForPayment(account);
    setSelectedPeriodForPayment(period);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentLogged = () => {
    void loadAccounts();
  };

  const toggleExpand = (key: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
        </div>
        <div className="error-state">
          <p>Error loading accounts: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Financial Overview</h2>
          <p className="dashboard-subtitle">
            {daysAhead > 0
              ? `Viewing ${daysAhead} days before and after today`
              : 'Viewing all periods'}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card income">
          <div className="metric-label">Total Paid</div>
          <div className="metric-value">
            {formatCurrency(metrics.totalPaid, primaryCurrency)}
          </div>
          <div className="metric-change positive">
            {metrics.paidPeriodsCount} paid periods
          </div>
        </div>
        <div className="metric-card outcome">
          <div className="metric-label">Total Due</div>
          <div className="metric-value">
            {formatCurrency(metrics.totalOutcomes, primaryCurrency)}
          </div>
          <div className="metric-change">{filteredPeriods.length} periods</div>
        </div>
        <div className="metric-card pending">
          <div className="metric-label">Pending Amount</div>
          <div className="metric-value">
            {formatCurrency(metrics.totalPending, primaryCurrency)}
          </div>
          <div className="metric-change warning">
            {metrics.pendingPeriodsCount + metrics.partialPeriodsCount} pending
            {metrics.overduePeriodsCount > 0 &&
              ` • ${metrics.overduePeriodsCount} overdue`}
          </div>
        </div>
        <div className="metric-card interest">
          <div className="metric-label">Interest Paid</div>
          <div className="metric-value">
            {formatCurrency(metrics.totalInterest, primaryCurrency)}
          </div>
          <div className="metric-change">
            {((metrics.totalInterest / metrics.totalPaid) * 100 || 0).toFixed(
              1
            )}
            % of total
          </div>
        </div>
        <div className="metric-card principal">
          <div className="metric-label">Principal Paid</div>
          <div className="metric-value">
            {formatCurrency(metrics.totalPrincipal, primaryCurrency)}
          </div>
          <div className="metric-change">
            {((metrics.totalPrincipal / metrics.totalPaid) * 100 || 0).toFixed(
              1
            )}
            % of total
          </div>
        </div>
        <div className="metric-card accounts">
          <div className="metric-label">Active Accounts</div>
          <div className="metric-value">{metrics.activeAccounts}</div>
          <div className="metric-change">{metrics.totalAccounts} in view</div>
        </div>
      </div>

      {/* Charts Section */}
      {chartData.length > 0 && (
        <div className="charts-section">
          {/* Payment Timeline */}
          <div className="chart-card">
            <h3 className="chart-title">Payment Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.6)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value: number) =>
                    formatCurrency(value, primaryCurrency).replace(
                      /[^\d.,]/g,
                      ''
                    )
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) =>
                    formatCurrency(value, primaryCurrency)
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="outcome"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                  name="Amount Due"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#4caf50"
                  strokeWidth={2}
                  name="Amount Paid"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interest vs Principal */}
          {interestPrincipalData.some((d) => d.value > 0) && (
            <div className="chart-card">
              <h3 className="chart-title">Interest vs Principal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={interestPrincipalData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {interestPrincipalData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#f093fb' : '#4facfe'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) =>
                      formatCurrency(value, primaryCurrency)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Account Type Distribution */}
          {accountTypeData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">By Account Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accountTypeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value: number) =>
                      formatCurrency(value, primaryCurrency).replace(
                        /[^\d.,]/g,
                        ''
                      )
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) =>
                      formatCurrency(value, primaryCurrency)
                    }
                  />
                  <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Accounts by Interest - Compact */}
          {topAccountsByInterest.length > 0 && (
            <div className="chart-card top-accounts-compact">
              <h3 className="chart-title">Top Accounts by Interest</h3>
              <div className="top-accounts-compact-list">
                {topAccountsByInterest.map((account, index) => (
                  <div
                    key={account.accountNumber}
                    className="top-account-compact-item"
                    onClick={() => {
                      void navigate(`/account/${account.accountNumber}`);
                    }}
                  >
                    <span className="top-account-compact-rank">
                      #{index + 1}
                    </span>
                    <div className="top-account-compact-info">
                      <span className="top-account-compact-name">
                        {account.accountName}
                      </span>
                    </div>
                    <span className="top-account-compact-amount">
                      {formatCurrency(account.totalInterest, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Payments List */}
      {pendingPeriods.length > 0 && (
        <div className="pending-payments-section">
          <h3 className="section-title">Pending Payments</h3>
          <div className="accounts-list">
            {pendingPeriods.map((item) => {
              const { periodInfo, account, period } = item;
              const dueDate = toDate(period.dueDate);
              const daysRemaining = calculateDaysRemaining(dueDate);
              const isOverdue = daysRemaining < 0;

              const periodKey = `${account.accountNumber}-${period.periodNumber}`;
              const isExpanded = expandedAccounts.has(periodKey);

              return (
                <div
                  key={periodKey}
                  className={`account-row ${isExpanded ? 'expanded' : ''}`}
                >
                  <div
                    className="account-row-summary"
                    onClick={() => toggleExpand(periodKey)}
                  >
                    <div className="account-row-main">
                      <div className="account-row-primary">
                        <h3
                          className="account-row-name"
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigate(`/account/${account.accountNumber}`);
                          }}
                          style={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#667eea';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '';
                          }}
                        >
                          {account.accountName}
                        </h3>
                        <p className="account-row-number">
                          Period #{period.periodNumber} •{' '}
                          {account.accountNumber}
                        </p>
                      </div>
                      <div className="account-row-balance">
                        <span className="account-row-balance-label">
                          Amount Due
                        </span>
                        <span className="account-row-balance-amount">
                          {formatCurrency(
                            periodInfo.amountDue,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="account-row-payment">
                        <span className="account-row-payment-label">
                          Amount Paid
                        </span>
                        <span className="account-row-payment-amount">
                          {formatCurrency(
                            periodInfo.amountPaid,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="account-row-due">
                        <span className="account-row-due-label">Due Date</span>
                        <span
                          className={`account-row-due-value ${
                            isOverdue
                              ? 'overdue'
                              : daysRemaining <= 7
                                ? 'due-soon'
                                : ''
                          }`}
                        >
                          {formatDate(dueDate)}
                        </span>
                        <span
                          className={`account-row-due-days ${
                            isOverdue
                              ? 'overdue'
                              : daysRemaining <= 7
                                ? 'due-soon'
                                : ''
                          }`}
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days overdue`
                            : `${daysRemaining} days left`}
                        </span>
                      </div>
                      <span
                        className="account-row-status"
                        style={{
                          backgroundColor:
                            periodInfo.status === 'pending'
                              ? '#ff9800'
                              : periodInfo.status === 'partial'
                                ? '#ff9800'
                                : '#f44336',
                        }}
                      >
                        {periodInfo.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="account-row-actions">
                      <button
                        className="account-row-log-payment"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogPayment(account, period);
                        }}
                        aria-label="Log Payment"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 3V15M3 9H15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Log Payment
                      </button>
                      <button
                        className={`account-row-expand ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(periodKey);
                        }}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details View */}
                  <div
                    className={`account-row-details ${isExpanded ? 'visible' : ''}`}
                  >
                    <div className="account-row-details-content">
                      <div className="account-row-details-header">
                        <h4>Payment Period Details</h4>
                        <p className="account-description">
                          {account.accountDescription}
                        </p>
                      </div>
                      <div className="account-details-grid">
                        <div className="detail-row">
                          <span className="detail-label">Account:</span>
                          <span className="detail-value">
                            {account.accountName} ({account.accountNumber})
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Period Number:</span>
                          <span className="detail-value">
                            #{period.periodNumber}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Status:</span>
                          <span className="detail-value">
                            {periodInfo.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Due Date:</span>
                          <span
                            className={`detail-value ${
                              isOverdue
                                ? 'overdue'
                                : daysRemaining <= 7
                                  ? 'due-soon'
                                  : ''
                            }`}
                          >
                            {formatDate(dueDate)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Days Remaining:</span>
                          <span
                            className={`detail-value ${
                              isOverdue
                                ? 'overdue'
                                : daysRemaining <= 7
                                  ? 'due-soon'
                                  : ''
                            }`}
                          >
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days left`}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Amount Due:</span>
                          <span className="detail-value amount">
                            {formatCurrency(
                              periodInfo.amountDue,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Amount Paid:</span>
                          <span className="detail-value">
                            {formatCurrency(
                              periodInfo.amountPaid,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">
                            Amount Remaining:
                          </span>
                          <span className="detail-value amount">
                            {formatCurrency(
                              periodInfo.amountRemaining,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Capital Portion:</span>
                          <span className="detail-value">
                            {formatCurrency(period.capital, period.currency)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">
                            Interest Portion:
                          </span>
                          <span className="detail-value">
                            {formatCurrency(period.interest, period.currency)}
                          </span>
                        </div>
                        {period.remainingPrincipal !== undefined && (
                          <div className="detail-row">
                            <span className="detail-label">
                              Remaining Principal:
                            </span>
                            <span className="detail-value">
                              {formatCurrency(
                                period.remainingPrincipal,
                                period.currency
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPeriods.length === 0 && !loading && !loadingPeriods && (
        <div className="empty-state">
          <p>
            {searchQuery
              ? `No payment periods found matching "${searchQuery}" in the selected date range`
              : 'No payment periods found in the selected date range'}
          </p>
        </div>
      )}

      {loadingPeriods && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading payment periods...</p>
        </div>
      )}

      <LogPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedAccountForPayment(null);
          setSelectedPeriodForPayment(null);
        }}
        account={selectedAccountForPayment}
        period={selectedPeriodForPayment}
        onPaymentLogged={handlePaymentLogged}
      />
    </div>
  );
}
