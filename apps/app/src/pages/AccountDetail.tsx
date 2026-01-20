import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  PaymentPeriod,
  PaymentLogEntry,
  FinancialAccountCalculated,
} from '@rates/firebase-client';
import { getFinancialAccount } from '../services/financialAccounts';
import {
  getPaymentPeriods,
  generateAmortizationPlanForAccount,
  extendPeriodicBillPeriods,
} from '../services/paymentPeriods';
import { getAccountWithCalculated } from '@rates/firebase-client';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  toDate,
  getPaymentStatusColor,
  formatAccountStatus,
  getAccountPaymentStatusColor,
  formatAccountPaymentStatus,
} from '../utils/formatters';
import { getAccountPaymentStatus } from '../utils/paymentUtils';
import { BatchPaymentModal } from '../components/BatchPaymentModal';
import type {
  ChartDataPoint,
  PaymentHistoryEntry,
  AccountMetrics,
  PieLabelProps,
  AmortizationScheduleDataPoint,
  CumulativeInterestDataPoint,
  InterestPrincipalRatioDataPoint,
  PaymentStatusDataPoint,
} from './AccountDetail.types';
import * as rechartsModule from 'recharts';

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
 * Prepare amortization schedule data (Principal vs Interest breakdown per period)
 */
function prepareAmortizationScheduleData(
  paymentPeriods: PaymentPeriod[]
): AmortizationScheduleDataPoint[] {
  if (!paymentPeriods.length) return [];

  return paymentPeriods.map((period) => {
    const dueDate = toDate(period.dueDate);
    return {
      period: period.periodNumber,
      date: formatDateShort(dueDate),
      principal: period.capital,
      interest: period.interest,
      total: period.amount,
    };
  });
}

/**
 * Prepare cumulative interest paid over time
 */
function prepareCumulativeInterestData(
  paymentPeriods: PaymentPeriod[]
): CumulativeInterestDataPoint[] {
  if (!paymentPeriods.length) return [];

  let cumulativeInterest = 0;
  return paymentPeriods.map((period) => {
    const dueDate = toDate(period.dueDate);
    const interestThisPeriod = period.status === 'paid' ? period.interest : 0;
    cumulativeInterest += interestThisPeriod;

    return {
      period: period.periodNumber,
      date: formatDateShort(dueDate),
      cumulativeInterest,
      interestThisPeriod,
    };
  });
}

/**
 * Prepare interest vs principal ratio over time
 */
function prepareInterestPrincipalRatioData(
  paymentPeriods: PaymentPeriod[]
): InterestPrincipalRatioDataPoint[] {
  if (!paymentPeriods.length) return [];

  return paymentPeriods.map((period) => {
    const dueDate = toDate(period.dueDate);
    const total = period.amount;
    const interestPortion = period.interest;
    const principalPortion = period.capital;
    const interestPercentage = total > 0 ? (interestPortion / total) * 100 : 0;

    return {
      period: period.periodNumber,
      date: formatDateShort(dueDate),
      interestPortion,
      principalPortion,
      interestPercentage,
    };
  });
}

/**
 * Prepare payment status distribution data
 */
function preparePaymentStatusData(
  paymentPeriods: PaymentPeriod[]
): PaymentStatusDataPoint[] {
  if (!paymentPeriods.length) return [];

  const statusCounts = paymentPeriods.reduce(
    (acc, period) => {
      const status = period.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusColors: Record<string, string> = {
    paid: '#4caf50',
    pending: '#ff9800',
    overdue: '#f44336',
  };

  const statusLabels: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
  };

  return Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || '#9e9e9e',
  }));
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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isBatchPaymentModalOpen, setIsBatchPaymentModalOpen] = useState(false);

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

  const handleGeneratePlan = async () => {
    if (!account || !accountNumber) return;

    const isPeriodic =
      account.accountType === 'bill' &&
      (account.metadata?.isPeriodic === true ||
        account.numberOfPayments === undefined);

    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      // For periodic bills with existing periods, extend them
      // Otherwise, generate from scratch
      if (isPeriodic && paymentPeriods.length > 0) {
        await extendPeriodicBillPeriods(accountNumber);
      } else {
        await generateAmortizationPlanForAccount(accountNumber);
      }
      // Reload account data to reflect changes
      await loadAccountData();
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Failed to generate plan'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!account || !accountNumber) return;

    if (
      !confirm(
        'Are you sure you want to regenerate the amortization plan? This will delete all existing periods and create new ones based on current account parameters.'
      )
    ) {
      return;
    }

    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      await generateAmortizationPlanForAccount(accountNumber, true);
      // Reload account data to reflect changes
      await loadAccountData();
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Failed to regenerate plan'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Memoized computed data
  const chartData = useMemo(
    () => (account ? prepareChartData(account, paymentPeriods) : []),
    [account, paymentPeriods]
  );

  const paymentHistoryData = useMemo(
    () => (account ? preparePaymentHistoryData(account) : []),
    [account]
  );

  // Loan-specific chart data
  const amortizationScheduleData = useMemo(
    () => prepareAmortizationScheduleData(paymentPeriods),
    [paymentPeriods]
  );

  const cumulativeInterestData = useMemo(
    () => prepareCumulativeInterestData(paymentPeriods),
    [paymentPeriods]
  );

  const interestPrincipalRatioData = useMemo(
    () => prepareInterestPrincipalRatioData(paymentPeriods),
    [paymentPeriods]
  );

  const paymentStatusData = useMemo(
    () => preparePaymentStatusData(paymentPeriods),
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

  const paymentStatus = useMemo(() => {
    return getAccountPaymentStatus(paymentPeriods);
  }, [paymentPeriods]);

  // Count pending periods (only up to current date, exclude future periods)
  const pendingPeriodsCount = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return paymentPeriods.filter((p) => {
      if (p.status !== 'pending') return false;
      const dueDate = toDate(p.dueDate);
      return dueDate <= today;
    }).length;
  }, [paymentPeriods]);

  if (loading) {
    return (
      <div className="py-8 px-8 max-w-[1400px] mx-auto animate-fadeIn-slow box-border md:p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-white/80">
          <div className="w-[50px] h-[50px] border-4 border-white/10 border-t-primary-500 rounded-full animate-spin mb-4"></div>
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error || !account || !calculatedAccount) {
    return (
      <div className="py-8 px-8 max-w-[1400px] mx-auto animate-fadeIn-slow box-border md:p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-white/80">
          <h2 className="text-danger-500 mb-4">Error</h2>
          <p>{error ?? 'Account not found'}</p>
          <button
            onClick={() => {
              void navigate('/dashboard');
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-[10px] text-white border border-white/20 rounded-[10px] cursor-pointer text-sm font-semibold transition-all duration-300 ease-in-out mt-4 hover:bg-white/15 hover:-translate-x-1"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currency = account.totalAmountRemaining.currency;

  // Extract recharts components
  const {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
  } = rechartsModule;

  return (
    <div className="py-8 px-8 max-w-[1400px] mx-auto animate-fadeIn-slow box-border md:p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-6 border-b border-white/10 gap-8 flex-wrap md:flex-col">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => {
              if (account?.accountType) {
                void navigate(`/accounts/${account.accountType}`);
              } else {
                void navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-[10px] text-white border border-white/20 rounded-[10px] cursor-pointer text-sm font-semibold transition-all duration-300 ease-in-out mb-6 hover:bg-white/15 hover:-translate-x-1"
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
          <div>
            <h1 className="m-0 mb-2 text-white text-4xl font-bold -tracking-[0.5px] bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent md:text-3xl">
              {account.accountName}
            </h1>
            <p className="text-white/70 text-base m-0 mb-2 font-mono">
              {account.accountNumber}
            </p>
            <p className="text-white/80 text-lg m-0 leading-relaxed">
              {account.accountDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 items-end md:flex-row md:items-start md:w-full md:mt-4">
          <div
            className={`px-6 py-3 rounded-xl font-semibold text-xs tracking-wide uppercase whitespace-nowrap ${
              account.status === 'active'
                ? 'bg-success-css/20 text-success-css border border-success-css/30'
                : account.status === 'paid_off'
                  ? 'bg-[rgba(33,150,243,0.2)] text-[#2196f3] border border-[rgba(33,150,243,0.3)]'
                  : account.status === 'closed'
                    ? 'bg-[rgba(158,158,158,0.2)] text-[#9e9e9e] border border-[rgba(158,158,158,0.3)]'
                    : account.status === 'defaulted'
                      ? 'bg-danger-500/20 text-danger-500 border border-danger-500/30'
                      : 'bg-warning-500/20 text-warning-500 border border-warning-500/30'
            }`}
          >
            {formatAccountStatus(account.status)}
          </div>
          <div
            className="px-6 py-3 rounded-xl font-semibold text-xs tracking-wide uppercase whitespace-nowrap border"
            style={{
              backgroundColor: `${getAccountPaymentStatusColor(paymentStatus)}20`,
              color: getAccountPaymentStatusColor(paymentStatus),
              borderColor: `${getAccountPaymentStatusColor(paymentStatus)}50`,
            }}
          >
            {formatAccountPaymentStatus(paymentStatus)}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 mb-12 md:grid-cols-1">
        <div className="ds-card-light p-6">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Remaining Balance
          </div>
          <div className="text-primary-500 text-[1.75rem] font-bold mb-2">
            {formatCurrency(account.totalAmountRemaining.amount, currency)}
          </div>
          {account.originalAmount && (
            <div className="text-white/50 text-sm">
              {formatCurrency(account.originalAmount.amount, currency)} original
            </div>
          )}
        </div>
        <div className="ds-card-light p-6">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Total Paid
          </div>
          <div className="text-success-css text-[1.75rem] font-bold mb-2">
            {formatCurrency(metrics.totalPaid, currency)}
          </div>
          <div className="text-white/50 text-sm">
            {paymentHistoryData.length} payments
          </div>
        </div>
        <div className="ds-card-light p-6">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Monthly Payment
          </div>
          <div className="text-white text-[1.75rem] font-bold mb-2">
            {formatCurrency(account.monthlyPayment.amount, currency)}
          </div>
          <div className="text-white/50 text-sm">
            {account.rate}% interest rate
          </div>
        </div>
        <div className="ds-card-light p-6">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Progress
          </div>
          <div className="text-white text-[1.75rem] font-bold mb-2">
            {metrics.paidPeriods} / {metrics.totalPeriods} periods
          </div>
          <div className="w-full h-2 bg-white/10 rounded overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded transition-all duration-500 ease-in-out"
              style={{ width: `${metrics.progressPercentage}%` }}
            ></div>
          </div>
        </div>
        {account.nextDueDate && (
          <div className="ds-card-light p-6">
            <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
              Next Due Date
            </div>
            <div className="text-white text-[1.75rem] font-bold">
              {formatDate(account.nextDueDate)}
            </div>
          </div>
        )}
        <div className="ds-card-light p-6">
          <div className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-3">
            Interest Paid
          </div>
          <div className="text-warning-500 text-[1.75rem] font-bold mb-2">
            {formatCurrency(metrics.totalInterestPaid, currency)}
          </div>
          <div className="text-white/50 text-sm">
            {metrics.totalCapitalPaid > 0
              ? `${((metrics.totalInterestPaid / (metrics.totalInterestPaid + metrics.totalCapitalPaid)) * 100).toFixed(1)}% of total`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-12 flex flex-col w-full">
        <h2 className="text-white text-[1.75rem] font-bold mb-8 pb-4 border-b border-white/10 w-full col-span-full">
          Loan Payment Insights
        </h2>

        <div className="grid grid-cols-2 gap-6 w-full box-border md:grid-cols-1 md:gap-4">
          {/* Principal Reduction Over Time */}
          {chartData.length > 0 && (
            <div className="ds-card-light p-6">
              <h3 className="text-white text-xl font-semibold m-0 mb-2">
                Principal Balance Over Time
              </h3>
              <p className="text-white/70 text-sm m-0 mb-4 leading-relaxed">
                Track how your loan principal decreases as you make payments
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="principalGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#667eea"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) =>
                      formatCurrency(value, currency)
                    }
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#667eea"
                    fillOpacity={1}
                    fill="url(#principalGradient)"
                    name="Principal Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Amortization Schedule - Principal vs Interest */}
          {amortizationScheduleData.length > 0 && (
            <div className="ds-card-light p-6">
              <h3 className="text-white text-xl font-semibold m-0 mb-2">
                Amortization Schedule
              </h3>
              <p className="text-white/70 text-sm m-0 mb-4 leading-relaxed">
                See how each payment is split between principal and interest
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={amortizationScheduleData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) =>
                      formatCurrency(value, currency)
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="principal"
                    stackId="a"
                    fill="#667eea"
                    name="Principal"
                  />
                  <Bar
                    dataKey="interest"
                    stackId="a"
                    fill="#f093fb"
                    name="Interest"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cumulative Interest Paid */}
          {cumulativeInterestData.length > 0 && (
            <div className="ds-card-light p-6">
              <h3 className="text-white text-xl font-semibold m-0 mb-2">
                Cumulative Interest Paid
              </h3>
              <p className="text-white/70 text-sm m-0 mb-4 leading-relaxed">
                Track total interest paid over the life of the loan
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cumulativeInterestData}>
                  <defs>
                    <linearGradient
                      id="interestGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#f093fb"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) =>
                      formatCurrency(value, currency)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeInterest"
                    stroke="#f093fb"
                    fillOpacity={1}
                    fill="url(#interestGradient)"
                    name="Cumulative Interest"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Interest vs Principal Ratio Over Time */}
          {interestPrincipalRatioData.length > 0 && (
            <div className="ds-card-light p-6">
              <h3 className="text-white text-xl font-semibold m-0 mb-2">
                Interest vs Principal Ratio
              </h3>
              <p className="text-white/70 text-sm m-0 mb-4 leading-relaxed">
                Watch how the interest portion decreases and principal portion
                increases over time
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={interestPrincipalRatioData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={CHART_AXIS_STYLE}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) =>
                      formatCurrency(value, currency)
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="interestPortion"
                    stroke="#f093fb"
                    strokeWidth={2}
                    name="Interest Portion"
                    dot={{ fill: '#f093fb', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="principalPortion"
                    stroke="#667eea"
                    strokeWidth={2}
                    name="Principal Portion"
                    dot={{ fill: '#667eea', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment Status Distribution */}
          {paymentStatusData.length > 0 && (
            <div className="ds-card-light p-6">
              <h3 className="text-white text-xl font-semibold m-0 mb-2">
                Payment Status Overview
              </h3>
              <p className="text-white/70 text-sm m-0 mb-4 leading-relaxed">
                Distribution of payment statuses across all periods
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={formatPieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: number) => `${value} periods`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Historical Payments */}
      <div className="mb-12">
        <h2 className="text-white text-[1.75rem] font-bold mb-8 pb-4 border-b border-white/10 w-full col-span-full">
          Historical Payments
        </h2>
        {paymentHistoryData.length > 0 ? (
          <div className="ds-card-light overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-white/90 font-semibold text-sm uppercase tracking-wide border-b border-white/10">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-white/90 font-semibold text-sm uppercase tracking-wide border-b border-white/10">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-white/90 font-semibold text-sm uppercase tracking-wide border-b border-white/10">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentHistoryData.map((payment, index) => (
                  <tr key={index} className="hover:bg-white/5 last:border-b-0">
                    <td className="px-6 py-4 text-white/80 border-b border-white/5">
                      {payment.dateStr}
                    </td>
                    <td className="px-6 py-4 font-semibold text-success-css border-b border-white/5">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 text-white/80 border-b border-white/5">
                      {payment.notes ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-card-light py-12 px-12 text-center text-white/60">
            <p className="m-0">No payment history available</p>
          </div>
        )}
      </div>

      {/* Payment Periods */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-white text-[1.75rem] font-bold pb-4 border-b border-white/10 w-full col-span-full m-0">
            Payment Periods
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {paymentPeriods.length > 0 ? (
              <>
                {pendingPeriodsCount > 0 && (
                  <button
                    onClick={() => {
                      setIsBatchPaymentModalOpen(true);
                    }}
                    disabled={isGeneratingPlan || !account}
                    style={{
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.9rem',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor:
                        isGeneratingPlan || !account
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: isGeneratingPlan || !account ? 0.6 : 1,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isGeneratingPlan && account) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(33, 150, 243, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    Batch Add Payments
                  </button>
                )}
                <button
                  onClick={() => {
                    void handleRegeneratePlan();
                  }}
                  disabled={isGeneratingPlan || !account}
                  style={{
                    padding: '0.625rem 1.25rem',
                    fontSize: '0.9rem',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor:
                      isGeneratingPlan || !account ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingPlan || !account ? 0.6 : 1,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isGeneratingPlan && account) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 12px rgba(255, 152, 0, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {isGeneratingPlan ? 'Regenerating...' : 'Regenerate Plan'}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  void handleGeneratePlan();
                }}
                disabled={
                  isGeneratingPlan ||
                  !account?.startDate ||
                  (account.accountType !== 'bill' && !account.numberOfPayments)
                }
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.9rem',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    isGeneratingPlan ||
                    !account?.startDate ||
                    (account.accountType !== 'bill' &&
                      !account.numberOfPayments)
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isGeneratingPlan ||
                    !account?.startDate ||
                    (account.accountType !== 'bill' &&
                      !account.numberOfPayments)
                      ? 0.6
                      : 1,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (
                    !isGeneratingPlan &&
                    account?.startDate &&
                    (account.accountType === 'bill' || account.numberOfPayments)
                  ) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 12px rgba(76, 175, 80, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {isGeneratingPlan ? 'Generating...' : 'Generate Plan'}
              </button>
            )}
          </div>
        </div>
        {planError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#f44336',
              fontSize: '0.9rem',
            }}
          >
            <strong>Error:</strong> {planError}
          </div>
        )}
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
                  className={`ds-card-light p-6 ${
                    isOverdue
                      ? 'border-danger-500/50 bg-danger-500/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-white/10">
                    <span className="text-white font-semibold text-lg">
                      Period #{period.periodNumber}
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase text-white"
                      style={{
                        backgroundColor: getPaymentStatusColor(period.status),
                      }}
                    >
                      {period.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Due Date:</span>
                      <span className="text-white font-semibold text-[0.95rem]">
                        {formatDate(dueDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Amount Due:</span>
                      <span className="text-white font-semibold text-[0.95rem]">
                        {formatCurrency(period.amount, period.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">
                        Amount Paid:
                      </span>
                      <span className="text-white font-semibold text-[0.95rem]">
                        {formatCurrency(period.amountPaid, period.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Remaining:</span>
                      <span className="text-white font-semibold text-[0.95rem]">
                        {formatCurrency(
                          period.amount - period.amountPaid,
                          period.currency
                        )}
                      </span>
                    </div>
                    {period.capital > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Capital:</span>
                        <span className="text-white font-semibold text-[0.95rem]">
                          {formatCurrency(period.capital, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.interest > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Interest:</span>
                        <span className="text-white font-semibold text-[0.95rem]">
                          {formatCurrency(period.interest, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.remainingPrincipal !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">
                          Remaining Principal:
                        </span>
                        <span className="text-white font-semibold text-[0.95rem]">
                          {formatCurrency(
                            period.remainingPrincipal,
                            period.currency
                          )}
                        </span>
                      </div>
                    )}
                    {period.paymentLog.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                        <span className="text-white/70 text-sm">Payments:</span>
                        {period.paymentLog.map((payment, idx) => {
                          const paymentDate = toDate(payment.datePaid);
                          return (
                            <div
                              key={idx}
                              className="flex flex-col gap-1 px-2 py-2 bg-white/3 rounded-lg text-sm text-white/80"
                            >
                              <span>
                                {formatDate(paymentDate)} -{' '}
                                {formatCurrency(
                                  payment.amount,
                                  payment.currency
                                )}
                              </span>
                              {payment.notes && (
                                <span className="text-white/50 text-xs italic">
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
          <div className="ds-card-light py-12 px-12 text-center text-white/60">
            <p className="m-0">No payment periods available</p>
          </div>
        )}
      </div>

      {/* Batch Payment Modal */}
      <BatchPaymentModal
        isOpen={isBatchPaymentModalOpen}
        onClose={() => {
          setIsBatchPaymentModalOpen(false);
        }}
        account={account}
        onPaymentsLogged={() => {
          // Reload account data to reflect updated payment status
          void loadAccountData();
        }}
      />
    </div>
  );
}
