import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  PaymentPeriod,
  PaymentLogEntry,
  FinancialAccountCalculated,
} from '@rates/firebase-client';
import { isInstallmentLoan, isRevolvingCredit } from '@rates/firebase-client';
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
  PieLabelProps,
  AmortizationScheduleDataPoint,
  CumulativeInterestDataPoint,
  InterestPrincipalRatioDataPoint,
  PaymentStatusDataPoint,
} from './AccountDetail.types';
import * as rechartsModule from 'recharts';
import { LoanPayoffWidget } from '../components/InstallmentLoanInsights/LoanPayoffWidget';
import { PaymentAnatomyWidget } from '../components/InstallmentLoanInsights/PaymentAnatomyWidget';
import { PayoffAcceleratorWidget } from '../components/InstallmentLoanInsights/PayoffAcceleratorWidget';
import { CreditUtilizationWidget } from '../components/RevolvingCreditInsights/CreditUtilizationWidget';
import { RevolvingCostWidget } from '../components/RevolvingCreditInsights/RevolvingCostWidget';
import { RevolvingPayoffAcceleratorWidget } from '../components/RevolvingCreditInsights/RevolvingPayoffAcceleratorWidget';
import { BillHistoryWidget } from '../components/BillInsights/BillHistoryWidget';
import { BillStatsWidget } from '../components/BillInsights/BillStatsWidget';
import { BillTrendAnalysisWidget } from '../components/BillInsights/BillTrendAnalysisWidget';
import { isBill } from '@rates/firebase-client';

// Helper functions to safely extract type-specific fields
function getAccountRemainingBalance(account: FinancialAccount): number {
  if (isInstallmentLoan(account)) {
    return account.currentPrincipal?.amount ?? 0;
  } else if (isRevolvingCredit(account)) {
    return account.currentBalance.amount;
  }
  return 0; // Bills and other don't have a remaining balance concept
}

function getAccountOriginalAmount(
  account: FinancialAccount
): number | undefined {
  if (isInstallmentLoan(account)) {
    return account.originalPrincipal?.amount;
  }
  return undefined;
}

function getAccountStartDate(account: FinancialAccount): Date | undefined {
  if (isInstallmentLoan(account)) {
    const startDate = account.contractStartDate;
    if (!startDate) return undefined;
    return startDate instanceof Date ? startDate : startDate.toDate();
  }
  return undefined;
}

function getAccountTermInPayments(
  account: FinancialAccount
): number | undefined {
  if (isInstallmentLoan(account)) {
    return account.termInPayments;
  }
  return undefined;
}

// calculateAccountMetrics removed
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
    getAccountOriginalAmount(account) ?? getAccountRemainingBalance(account);
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
        getAccountTermInPayments(account) === undefined);

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
      <div className="mx-auto box-border max-w-[1400px] animate-fadeIn-slow px-4 py-4 md:p-4">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center text-white/80">
          <div className="mb-4 h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/30 border-t-primary-500"></div>
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error || !account || !calculatedAccount) {
    return (
      <div className="mx-auto box-border max-w-[1400px] animate-fadeIn-slow px-4 py-4 md:p-4">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center text-white/80">
          <h2 className="mb-4 text-danger-500">Error</h2>
          <p>{error ?? 'Account not found'}</p>
          <button
            onClick={() => {
              void navigate('/dashboard');
            }}
            className="mt-4 flex cursor-pointer items-center gap-2 rounded-md border border-neutral-600/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:-translate-x-1 hover:bg-white/15"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currency = account.currency;

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
    <div className="mx-auto box-border max-w-[1400px] animate-fadeIn-slow px-4 py-4 md:p-4">
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-8 border-b border-neutral-700/30 pb-6 md:flex-col">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => {
              if (account?.accountType) {
                void navigate(`/accounts/${account.accountType}`);
              } else {
                void navigate('/dashboard');
              }
            }}
            className="mb-6 flex cursor-pointer items-center gap-2 rounded-md border border-neutral-600/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:-translate-x-1 hover:bg-white/15"
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
            <h1 className="m-0 mb-2 bg-gradient-to-br from-white to-white/80 bg-clip-text text-xl font-bold -tracking-[0.5px] text-transparent text-white md:text-3xl">
              {account.accountName}
            </h1>
            <p className="m-0 mb-2 font-mono text-sm text-white/70 md:text-base">
              {account.accountNumber}
            </p>
            <p className="m-0 text-base leading-relaxed text-white/80 md:text-lg">
              {account.accountDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 md:mt-4 md:w-full md:flex-row md:items-start">
          <div
            className={`whitespace-nowrap rounded-lg px-6 py-3 text-xs font-semibold uppercase tracking-wide ${
              account.status === 'active'
                ? 'border border-success-css/30 bg-success-css/20 text-success-css'
                : account.status === 'paid_off'
                  ? 'border border-[rgba(33,150,243,0.3)] bg-[rgba(33,150,243,0.2)] text-[#2196f3]'
                  : account.status === 'closed'
                    ? 'border border-[rgba(158,158,158,0.3)] bg-[rgba(158,158,158,0.2)] text-[#9e9e9e]'
                    : account.status === 'defaulted'
                      ? 'border border-danger-500/30 bg-danger-500/20 text-danger-500'
                      : 'border border-warning-500/30 bg-warning-500/20 text-warning-500'
            }`}
          >
            {formatAccountStatus(account.status)}
          </div>
          <div
            className="whitespace-nowrap rounded-lg border px-6 py-3 text-xs font-semibold uppercase tracking-wide"
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
      {/* Charts Section */}
      {isInstallmentLoan(account) ? (
        <div className="mb-12 flex w-full flex-col gap-8">
          <h2 className="col-span-full w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
            Financial Insights
          </h2>
          <LoanPayoffWidget account={account} />
          <PaymentAnatomyWidget account={account} />
          <PayoffAcceleratorWidget account={account} />
        </div>
      ) : isRevolvingCredit(account) ? (
        <div className="mb-12 flex w-full flex-col gap-8">
          <h2 className="col-span-full w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
            Revolving Credit Insights
          </h2>
          <CreditUtilizationWidget account={account} />
          <RevolvingCostWidget account={account} />
          <RevolvingPayoffAcceleratorWidget account={account} />
        </div>
      ) : isBill(account) ? (
        <div className="mb-12 flex w-full flex-col gap-8">
          <h2 className="col-span-full w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
            Bill Insights
          </h2>
          <BillStatsWidget account={account} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <BillHistoryWidget account={account} />
            <BillTrendAnalysisWidget account={account} />
          </div>
        </div>
      ) : (
        <div className="mb-12 flex w-full flex-col">
          <h2 className="col-span-full mb-8 w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
            Loan Payment Insights
          </h2>

          <div className="box-border grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
            {/* Principal Reduction Over Time */}
            {chartData.length > 0 && (
              <div className="ds-card-light p-6">
                <h3 className="m-0 mb-2 text-xl font-semibold text-white">
                  Principal Balance Over Time
                </h3>
                <p className="m-0 mb-4 text-sm leading-relaxed text-white/70">
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
                        <stop
                          offset="5%"
                          stopColor="#1e40af"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#1e40af"
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
                      stroke="#1e40af"
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
                <h3 className="m-0 mb-2 text-xl font-semibold text-white">
                  Amortization Schedule
                </h3>
                <p className="m-0 mb-4 text-sm leading-relaxed text-white/70">
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
                      fill="#1e40af"
                      name="Principal"
                    />
                    <Bar
                      dataKey="interest"
                      stackId="a"
                      fill="#2563eb"
                      name="Interest"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Cumulative Interest Paid */}
            {cumulativeInterestData.length > 0 && (
              <div className="ds-card-light p-6">
                <h3 className="m-0 mb-2 text-xl font-semibold text-white">
                  Cumulative Interest Paid
                </h3>
                <p className="m-0 mb-4 text-sm leading-relaxed text-white/70">
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
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
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
                      stroke="#2563eb"
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
                <h3 className="m-0 mb-2 text-xl font-semibold text-white">
                  Interest vs Principal Ratio
                </h3>
                <p className="m-0 mb-4 text-sm leading-relaxed text-white/70">
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
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Interest Portion"
                      dot={{ fill: '#2563eb', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="principalPortion"
                      stroke="#1e40af"
                      strokeWidth={2}
                      name="Principal Portion"
                      dot={{ fill: '#1e40af', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payment Status Distribution */}
            {paymentStatusData.length > 0 && (
              <div className="ds-card-light p-6">
                <h3 className="m-0 mb-2 text-xl font-semibold text-white">
                  Payment Status Overview
                </h3>
                <p className="m-0 mb-4 text-sm leading-relaxed text-white/70">
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
      )}

      {/* Historical Payments */}
      <div className="mb-12">
        <h2 className="col-span-full mb-8 w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
          Historical Payments
        </h2>
        {paymentHistoryData.length > 0 ? (
          <div className="ds-card-light overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="border-b border-neutral-700/30 px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide text-white/90">
                    Date
                  </th>
                  <th className="border-b border-neutral-700/30 px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide text-white/90">
                    Amount
                  </th>
                  <th className="border-b border-neutral-700/30 px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide text-white/90">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentHistoryData.map((payment, index) => (
                  <tr key={index} className="last:border-b-0 hover:bg-white/5">
                    <td className="border-b border-neutral-700/20 px-6 py-4 text-white/80">
                      {payment.dateStr}
                    </td>
                    <td className="border-b border-neutral-700/20 px-6 py-4 font-semibold text-success-css">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="border-b border-neutral-700/20 px-6 py-4 text-white/80">
                      {payment.notes ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-card-light px-12 py-12 text-center text-white/60">
            <p className="m-0">No payment history available</p>
          </div>
        )}
      </div>

      {/* Payment Periods */}
      <div className="mb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="col-span-full m-0 w-full border-b border-neutral-700/30 pb-4 text-[1.75rem] font-bold text-white">
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
                  !getAccountStartDate(account) ||
                  (account.accountType !== 'bill' &&
                    !getAccountTermInPayments(account))
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
                    !getAccountStartDate(account) ||
                    (account.accountType !== 'bill' &&
                      !getAccountTermInPayments(account))
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isGeneratingPlan ||
                    !getAccountStartDate(account) ||
                    (account.accountType !== 'bill' &&
                      !getAccountTermInPayments(account))
                      ? 0.6
                      : 1,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (
                    !isGeneratingPlan &&
                    getAccountStartDate(account) &&
                    (account.accountType === 'bill' ||
                      getAccountTermInPayments(account))
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="mb-5 flex items-center justify-between border-b border-neutral-700/30 pb-4">
                    <span className="text-lg font-semibold text-white">
                      Period #{period.periodNumber}
                    </span>
                    <span
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
                      style={{
                        backgroundColor: getPaymentStatusColor(period.status),
                      }}
                    >
                      {period.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Due Date:</span>
                      <span className="text-[0.95rem] font-semibold text-white">
                        {formatDate(dueDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Amount Due:</span>
                      <span className="text-[0.95rem] font-semibold text-white">
                        {formatCurrency(period.amount, period.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Amount Paid:
                      </span>
                      <span className="text-[0.95rem] font-semibold text-white">
                        {formatCurrency(period.amountPaid, period.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Remaining:</span>
                      <span className="text-[0.95rem] font-semibold text-white">
                        {formatCurrency(
                          period.amount - period.amountPaid,
                          period.currency
                        )}
                      </span>
                    </div>
                    {period.capital > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">Capital:</span>
                        <span className="text-[0.95rem] font-semibold text-white">
                          {formatCurrency(period.capital, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.interest > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">Interest:</span>
                        <span className="text-[0.95rem] font-semibold text-white">
                          {formatCurrency(period.interest, period.currency)}
                        </span>
                      </div>
                    )}
                    {period.remainingPrincipal !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">
                          Remaining Principal:
                        </span>
                        <span className="text-[0.95rem] font-semibold text-white">
                          {formatCurrency(
                            period.remainingPrincipal,
                            period.currency
                          )}
                        </span>
                      </div>
                    )}
                    {period.paymentLog.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-700/30 pt-4">
                        <span className="text-sm text-white/70">Payments:</span>
                        {period.paymentLog.map((payment, idx) => {
                          const paymentDate = toDate(payment.datePaid);
                          return (
                            <div
                              key={idx}
                              className="bg-white/3 flex flex-col gap-1 rounded-lg px-2 py-2 text-sm text-white/80"
                            >
                              <span>
                                {formatDate(paymentDate)} -{' '}
                                {formatCurrency(
                                  payment.amount,
                                  payment.currency
                                )}
                              </span>
                              {payment.notes && (
                                <span className="text-xs italic text-white/50">
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
          <div className="ds-card-light px-12 py-12 text-center text-white/60">
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
