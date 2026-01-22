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
import { NewAccountWizard } from '../components/NewAccountWizard';
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
  dueInterest: number;
  duePrincipal: number;
  pendingInterest: number;
  pendingPrincipal: number;
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
  const [isNewAccountWizardOpen, setIsNewAccountWizardOpen] = useState(false);
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

    // Total due interest/principal across visible periods
    const dueInterest = filteredPeriods.reduce(
      (sum, p) => sum + p.period.interest,
      0
    );
    const duePrincipal = filteredPeriods.reduce(
      (sum, p) => sum + p.period.capital,
      0
    );

    // Estimate pending interest/principal based on remaining amount ratio
    let pendingInterest = 0;
    let pendingPrincipal = 0;
    [...pendingPeriods, ...partialPeriods].forEach((p) => {
      const { amountDue, amountRemaining } = p.periodInfo;
      if (amountDue <= 0 || amountRemaining <= 0) return;
      const ratio = amountRemaining / amountDue;
      pendingInterest += p.period.interest * ratio;
      pendingPrincipal += p.period.capital * ratio;
    });

    const uniqueAccounts = new Set(
      filteredPeriods.map((p) => p.account.accountNumber)
    );
    const activeAccounts = accounts.filter((a) => a.status === 'active').length;

    return {
      totalIncome: 0, // TODO: Add income tracking if needed
      totalOutcomes,
      totalInterest,
      totalPrincipal,
      dueInterest,
      duePrincipal,
      pendingInterest,
      pendingPrincipal,
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
      <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-8 overflow-x-hidden p-0">
        <div className="relative mb-10 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
          <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent text-white shadow-[0_2px_20px_rgba(255,255,255,0.05)]">
            Dashboard
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-white">
          <div className="h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/40 border-t-neutral-500/60"></div>
          <p className="text-lg font-medium text-white/90">
            Loading accounts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-8 overflow-x-hidden p-0">
        <div className="relative mb-10 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
          <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent text-white shadow-[0_2px_20px_rgba(255,255,255,0.05)]">
            Dashboard
          </h2>
        </div>
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/20 px-12 py-12 text-center text-white/80 backdrop-blur-[20px]">
          <p className="m-0 text-xl text-danger-500">
            Error loading accounts: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-6 overflow-x-hidden p-0">
      <div className="relative mb-0 flex flex-col items-start justify-between gap-6 pb-4 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/30 after:to-transparent after:content-[''] md:flex-row md:items-center md:gap-0">
        <div>
          <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent text-white shadow-[0_2px_20px_rgba(255,255,255,0.05)] xs:text-[1.75rem] md:text-3xl">
            Financial Overview
          </h2>
          <p className="mb-0 mt-2 text-base font-normal text-white/70">
            {daysAhead > 0
              ? `Viewing ${daysAhead} days before and after today`
              : 'Viewing all periods'}
          </p>
        </div>
        <button
          className="ds-button-gradient hidden items-center gap-2 whitespace-nowrap px-6 py-3.5 text-[0.95rem] md:flex"
          onClick={() => setIsNewAccountWizardOpen(true)}
          title="Create a new account"
        >
          <span className="flex items-center justify-center text-2xl font-light leading-none">
            +
          </span>
          <span>New account</span>
        </button>
      </div>

      <NewAccountWizard
        isOpen={isNewAccountWizardOpen}
        onClose={() => setIsNewAccountWizardOpen(false)}
        onCreated={() => {
          // Refresh dashboard data in the background after creation
          void loadAccounts();
        }}
      />

      {/* Key Metrics */}
      <div className="mb-8 grid w-full grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        <div className="relative min-w-0 overflow-visible rounded-lg border border-neutral-700/30 bg-gradient-to-br from-success-css/20 to-success-css/10 p-6 backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#1e3a8a] before:via-[#334155] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:-translate-y-1 hover:border-neutral-600/40 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:before:opacity-100 xs:p-4">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
            Total Paid
          </div>
          <div className="mb-2 text-3xl font-bold leading-tight -tracking-[0.5px] text-white xs:text-2xl">
            {formatCurrency(metrics.totalPaid, primaryCurrency)}
          </div>
          <div className="text-xs font-medium text-success-css">
            {metrics.paidPeriodsCount} paid periods
          </div>
          {metrics.totalPaid > 0 && (
            <div className="relative z-10 mt-3 flex items-center gap-3 overflow-visible">
              <div className="relative z-[1] min-w-0 flex-1 overflow-visible">
                <ResponsiveContainer width="100%" height={32}>
                  <BarChart
                    data={[
                      {
                        name: 'Paid',
                        interest: metrics.totalInterest,
                        principal: metrics.totalPrincipal,
                      },
                    ]}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        zIndex: 9999,
                      }}
                      wrapperStyle={{
                        zIndex: 9999,
                        pointerEvents: 'none',
                      }}
                      position={{ y: -10 }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, primaryCurrency),
                        name === 'interest' ? 'Interest' : 'Principal',
                      ]}
                    />
                    <Bar
                      dataKey="interest"
                      stackId="paid"
                      fill="#2563eb"
                      radius={[6, 0, 0, 6]}
                    />
                    <Bar
                      dataKey="principal"
                      stackId="paid"
                      fill="#1e40af"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1 text-xs text-white/70">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563eb]"></span>
                  Interest{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.totalInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1e40af]"></span>
                  Principal{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.totalPrincipal, primaryCurrency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative min-w-0 overflow-visible rounded-lg border border-neutral-700/30 bg-gradient-to-br from-danger-500/20 to-danger-500/10 p-6 backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#1e3a8a] before:via-[#334155] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:-translate-y-1 hover:border-neutral-600/40 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:before:opacity-100 xs:p-4">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
            Total Due
          </div>
          <div className="mb-2 text-3xl font-bold leading-tight -tracking-[0.5px] text-white xs:text-2xl">
            {formatCurrency(metrics.totalOutcomes, primaryCurrency)}
          </div>
          <div className="text-xs font-medium text-white/60">
            {filteredPeriods.length} periods
          </div>
          {metrics.dueInterest + metrics.duePrincipal > 0 && (
            <div className="relative z-10 mt-3 flex items-center gap-3 overflow-visible">
              <div className="relative z-[1] min-w-0 flex-1 overflow-visible">
                <ResponsiveContainer width="100%" height={32}>
                  <BarChart
                    data={[
                      {
                        name: 'Due',
                        interest: metrics.dueInterest,
                        principal: metrics.duePrincipal,
                      },
                    ]}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        zIndex: 9999,
                      }}
                      wrapperStyle={{
                        zIndex: 9999,
                        pointerEvents: 'none',
                      }}
                      position={{ y: -10 }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, primaryCurrency),
                        name === 'interest' ? 'Interest due' : 'Principal due',
                      ]}
                    />
                    <Bar
                      dataKey="interest"
                      stackId="due"
                      fill="#2563eb"
                      radius={[6, 0, 0, 6]}
                    />
                    <Bar
                      dataKey="principal"
                      stackId="due"
                      fill="#1e40af"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1 text-xs text-white/70">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563eb]"></span>
                  Interest due{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.dueInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1e40af]"></span>
                  Principal due{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.duePrincipal, primaryCurrency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative min-w-0 overflow-visible rounded-lg border border-neutral-700/30 bg-gradient-to-br from-warning-500/20 to-warning-500/10 p-6 backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#1e3a8a] before:via-[#334155] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:-translate-y-1 hover:border-neutral-600/40 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:before:opacity-100 xs:p-4">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
            Pending Amount
          </div>
          <div className="mb-2 text-3xl font-bold leading-tight -tracking-[0.5px] text-white xs:text-2xl">
            {formatCurrency(metrics.totalPending, primaryCurrency)}
          </div>
          <div className="text-xs font-medium text-warning-500">
            {metrics.pendingPeriodsCount + metrics.partialPeriodsCount} pending
            {metrics.overduePeriodsCount > 0 &&
              ` • ${metrics.overduePeriodsCount} overdue`}
          </div>
          {metrics.pendingInterest + metrics.pendingPrincipal > 0 && (
            <div className="relative z-10 mt-3 flex items-center gap-3 overflow-visible">
              <div className="relative z-[1] min-w-0 flex-1 overflow-visible">
                <ResponsiveContainer width="100%" height={32}>
                  <BarChart
                    data={[
                      {
                        name: 'Pending',
                        interest: metrics.pendingInterest,
                        principal: metrics.pendingPrincipal,
                      },
                    ]}
                    layout="vertical"
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        zIndex: 9999,
                      }}
                      wrapperStyle={{
                        zIndex: 9999,
                        pointerEvents: 'none',
                      }}
                      position={{ y: -10 }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, primaryCurrency),
                        name === 'interest'
                          ? 'Estimated Interest'
                          : 'Estimated Principal',
                      ]}
                    />
                    <Bar
                      dataKey="interest"
                      stackId="pending"
                      fill="#2563eb"
                      radius={[6, 0, 0, 6]}
                    />
                    <Bar
                      dataKey="principal"
                      stackId="pending"
                      fill="#1e40af"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1 text-xs text-white/70">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563eb]"></span>
                  Est. interest{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.pendingInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1e40af]"></span>
                  Est. principal{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.pendingPrincipal, primaryCurrency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      {chartData.length > 0 && (
        <div className="mb-8 box-border grid w-full grid-cols-1 gap-8 xs:grid-cols-1 xs:gap-4 md:grid-cols-2">
          {/* Payment Timeline */}
          <div className="ds-card-medium p-8 xs:p-4">
            <h3 className="m-0 mb-6 text-xl font-bold -tracking-[0.3px] text-white xs:text-lg">
              Payment Timeline
            </h3>
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
            <div className="ds-card-medium p-8 xs:p-4">
              <h3 className="m-0 mb-6 text-xl font-bold -tracking-[0.3px] text-white xs:text-lg">
                Interest vs Principal
              </h3>
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
                        fill={index === 0 ? '#2563eb' : '#1e40af'}
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
            <div className="ds-card-medium p-8 xs:p-4">
              <h3 className="m-0 mb-6 text-xl font-bold -tracking-[0.3px] text-white xs:text-lg">
                By Account Type
              </h3>
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
                  <Bar dataKey="value" fill="#1e40af" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Accounts by Interest - Compact */}
          {topAccountsByInterest.length > 0 && (
            <div className="ds-card-medium flex min-h-[300px] flex-col p-8 xs:p-4">
              <h3 className="m-0 mb-6 text-xl font-bold -tracking-[0.3px] text-white xs:text-lg">
                Top Accounts by Interest
              </h3>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-2 [&::-webkit-scrollbar-thumb:hover]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar]:w-1.5">
                {topAccountsByInterest.map((account, index) => (
                  <div
                    key={account.accountNumber}
                    className="bg-white/8 hover:bg-white/12 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-lg border border-neutral-700/30 px-3 py-3 transition-all duration-200 ease-in-out hover:translate-x-0.5 hover:border-neutral-600/40"
                    onClick={() => {
                      void navigate(`/account/${account.accountNumber}`);
                    }}
                  >
                    <span className="min-w-[1.75rem] flex-shrink-0 text-center text-sm font-bold text-primary-500">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold -tracking-[0.2px] text-white">
                        {account.accountName}
                      </span>
                    </div>
                    <span className="flex-shrink-0 whitespace-nowrap text-[0.95rem] font-bold -tracking-[0.3px] text-[#2563eb]">
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
        <div className="mt-8">
          <h3 className="m-0 mb-6 text-2xl font-bold -tracking-[0.5px] text-white xs:text-xl">
            Pending Payments
          </h3>
          <div className="flex flex-col gap-4">
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
                  className={`ds-card-medium relative overflow-hidden before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-[#1e40af] before:via-[#1e3a8a] before:via-[#334155] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:border-neutral-600/50 hover:shadow-[0_8px_24px_0_rgba(10,14,26,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:before:opacity-100 ${
                    isExpanded
                      ? 'border-neutral-600/50 shadow-[0_12px_32px_0_rgba(10,14,26,0.6)] before:opacity-100'
                      : 'border-white/15'
                  }`}
                >
                  <div
                    className="relative flex cursor-pointer items-center gap-6 px-6 py-5 transition-colors duration-200 ease-in-out hover:bg-white/5 xs:gap-3 xs:px-3.5 md:gap-4 md:px-4"
                    onClick={() => toggleExpand(periodKey)}
                  >
                    <div className="grid min-w-0 flex-1 grid-cols-[220px_140px_140px_180px_auto] items-center gap-8 xs:w-full xs:grid-cols-1 xs:gap-4 md:grid-cols-[200px_130px_130px_160px_auto] md:gap-6">
                      <div className="flex w-[220px] flex-shrink-0 flex-col gap-1 xs:w-full md:w-[200px]">
                        <h3
                          className="m-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold -tracking-[0.3px] text-white transition-colors duration-200 hover:text-primary-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigate(`/account/${account.accountNumber}`);
                          }}
                        >
                          {account.accountName}
                        </h3>
                        <p className="m-0 font-mono text-sm tracking-wide text-white/60">
                          Period #{period.periodNumber} •{' '}
                          {account.accountNumber}
                        </p>
                      </div>
                      <div className="flex w-[140px] flex-col gap-1 xs:w-full md:w-[130px]">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Amount Due
                        </span>
                        <span className="text-xl font-bold -tracking-[0.5px] text-[#2563eb] shadow-[0_2px_10px_rgba(37,99,235,0.3)] xs:text-base">
                          {formatCurrency(
                            periodInfo.amountDue,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="flex w-[140px] flex-col gap-1 xs:w-full md:w-[130px]">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Amount Paid
                        </span>
                        <span className="text-lg font-semibold -tracking-[0.3px] text-white xs:text-base">
                          {formatCurrency(
                            periodInfo.amountPaid,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="flex w-[180px] flex-col gap-1 xs:w-full md:w-[160px]">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Due Date
                        </span>
                        <span
                          className={`text-[0.95rem] font-semibold ${
                            isOverdue
                              ? 'font-bold text-danger-500'
                              : daysRemaining <= 7
                                ? 'font-bold text-warning-400'
                                : 'text-white'
                          }`}
                        >
                          {formatDate(dueDate)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            isOverdue
                              ? 'font-semibold text-danger-500'
                              : daysRemaining <= 7
                                ? 'font-semibold text-warning-400'
                                : 'text-white/70'
                          }`}
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days overdue`
                            : `${daysRemaining} days left`}
                        </span>
                      </div>
                      <span
                        className="w-fit flex-shrink-0 justify-self-start whitespace-nowrap rounded-lg border border-neutral-600/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-[10px]"
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
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <button
                        className="ds-button-gradient flex items-center gap-2 whitespace-nowrap rounded-lg border-none px-5 py-2.5 text-sm"
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
                          className="stroke-[2.5]"
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
                        className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-0 text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-neutral-600/40 hover:bg-white/20 xs:h-8 xs:w-8 ${
                          isExpanded ? 'rotate-180' : ''
                        } ${isExpanded ? 'hover:rotate-180 hover:scale-110' : ''}`}
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
                          className="transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
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
                    className={`overflow-hidden border-t border-neutral-700/30 transition-[max-height,opacity] duration-[400ms,300ms] ease-[cubic-bezier(0.4,0,0.2,1),ease-in-out] ${
                      isExpanded
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="bg-black/20 p-6">
                      <div className="mb-6 border-b border-neutral-700/30 pb-4">
                        <h4 className="m-0 mb-2 text-lg font-bold -tracking-[0.3px] text-white">
                          Payment Period Details
                        </h4>
                        <p className="m-0 text-[0.95rem] leading-relaxed text-white/80">
                          {account.accountDescription}
                        </p>
                      </div>
                      <div className="box-border grid w-full grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 xs:grid-cols-1">
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Account:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            {account.accountName} ({account.accountNumber})
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Period Number:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            #{period.periodNumber}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Status:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            {periodInfo.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Due Date:
                          </span>
                          <span
                            className={`text-lg font-bold -tracking-[0.3px] ${
                              isOverdue
                                ? 'animate-pulse text-danger-500 shadow-[0_2px_10px_rgba(255,107,107,0.3)]'
                                : daysRemaining <= 7
                                  ? 'text-warning-400 shadow-[0_2px_10px_rgba(255,217,61,0.3)]'
                                  : 'text-white'
                            }`}
                          >
                            {formatDate(dueDate)}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Days Remaining:
                          </span>
                          <span
                            className={`text-lg font-bold -tracking-[0.3px] ${
                              isOverdue
                                ? 'animate-pulse text-danger-500 shadow-[0_2px_10px_rgba(255,107,107,0.3)]'
                                : daysRemaining <= 7
                                  ? 'text-warning-400 shadow-[0_2px_10px_rgba(255,217,61,0.3)]'
                                  : 'text-white'
                            }`}
                          >
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days left`}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Amount Due:
                          </span>
                          <span className="text-xl font-bold -tracking-[0.3px] text-[#2563eb] shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
                            {formatCurrency(
                              periodInfo.amountDue,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Amount Paid:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            {formatCurrency(
                              periodInfo.amountPaid,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Amount Remaining:
                          </span>
                          <span className="text-xl font-bold -tracking-[0.3px] text-[#2563eb] shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
                            {formatCurrency(
                              periodInfo.amountRemaining,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Capital Portion:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            {formatCurrency(period.capital, period.currency)}
                          </span>
                        </div>
                        <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                            Interest Portion:
                          </span>
                          <span className="text-lg font-bold -tracking-[0.3px] text-white">
                            {formatCurrency(period.interest, period.currency)}
                          </span>
                        </div>
                        {period.remainingPrincipal !== undefined && (
                          <div className="ds-card-light flex flex-col gap-2 rounded-lg p-4 hover:translate-x-1 hover:border-neutral-600/40 hover:bg-white/10">
                            <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                              Remaining Principal:
                            </span>
                            <span className="text-lg font-bold -tracking-[0.3px] text-white">
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
        <div className="ds-card-light rounded-lg px-12 py-12 text-center text-white/80">
          <p className="m-0 text-xl">
            {searchQuery
              ? `No payment periods found matching "${searchQuery}" in the selected date range`
              : 'No payment periods found in the selected date range'}
          </p>
        </div>
      )}

      {loadingPeriods && (
        <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-white">
          <div className="h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/40 border-t-neutral-500/60"></div>
          <p className="text-lg font-medium text-white/90">
            Loading payment periods...
          </p>
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

      {/* Floating Action Button - Mobile/Tablet only */}
      <button
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#1e40af] to-[#334155] text-3xl font-light text-white shadow-[0_8px_24px_rgba(30,64,175,0.4),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:shadow-[0_12px_32px_rgba(30,64,175,0.5),0_6px_16px_rgba(0,0,0,0.4)] active:scale-95 md:hidden"
        onClick={() => setIsNewAccountWizardOpen(true)}
        aria-label="Create a new account"
        title="Create a new account"
      >
        <span className="flex items-center justify-center leading-none">+</span>
      </button>
    </div>
  );
}
