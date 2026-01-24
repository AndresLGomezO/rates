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
      <div className="p-0 max-w-full w-full m-0 animate-fadeIn-slow box-border overflow-x-hidden flex flex-col gap-8">
        <div className="flex justify-between items-center mb-10 pb-6 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent">
          <h2 className="m-0 text-white text-4xl font-bold -tracking-[0.5px] bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent shadow-[0_2px_20px_rgba(255,255,255,0.05)]">
            Dashboard
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-8 text-white gap-6">
          <div className="w-[50px] h-[50px] border-4 border-neutral-600/40 border-t-neutral-500/60 rounded-full animate-spin"></div>
          <p className="text-lg text-white/90 font-medium">
            Loading accounts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0 max-w-full w-full m-0 animate-fadeIn-slow box-border overflow-x-hidden flex flex-col gap-8">
        <div className="flex justify-between items-center mb-10 pb-6 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent">
          <h2 className="m-0 text-white text-4xl font-bold -tracking-[0.5px] bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent shadow-[0_2px_20px_rgba(255,255,255,0.05)]">
            Dashboard
          </h2>
        </div>
        <div className="text-center py-12 px-12 text-white/80 bg-danger-500/20 backdrop-blur-[20px] rounded-lg border border-danger-500/30">
          <p className="text-xl m-0 text-danger-500">
            Error loading accounts: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 max-w-full w-full m-0 animate-fadeIn-slow box-border overflow-x-hidden flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-0 pb-4 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/30 after:to-transparent gap-6 md:gap-0">
        <div>
          <h2 className="m-0 text-white text-4xl font-bold -tracking-[0.5px] bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent shadow-[0_2px_20px_rgba(255,255,255,0.05)] md:text-3xl xs:text-[1.75rem]">
            Financial Overview
          </h2>
          <p className="mt-2 mb-0 text-white/70 text-base font-normal">
            {daysAhead > 0
              ? `Viewing ${daysAhead} days before and after today`
              : 'Viewing all periods'}
          </p>
        </div>
        <button
          className="hidden md:flex ds-button-gradient items-center gap-2 px-6 py-3.5 text-[0.95rem] whitespace-nowrap"
          onClick={() => setIsNewAccountWizardOpen(true)}
          title="Create a new account"
        >
          <span className="text-2xl leading-none font-light flex items-center justify-center">
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
      <div className="grid grid-cols-1 gap-3 mb-8 w-full md:grid-cols-3 md:gap-6">
        <div className="relative overflow-visible bg-gradient-to-br from-success-css/20 to-success-css/10 backdrop-blur-[20px] backdrop-saturate-[180%] border border-neutral-700/30 rounded-lg p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#334155] before:via-[#1e3a8a] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 hover:-translate-y-1 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:border-neutral-600/40 min-w-0 xs:p-4">
          <div className="text-sm text-white/70 font-semibold uppercase tracking-wide mb-2">
            Total Paid
          </div>
          <div className="text-3xl font-bold text-white -tracking-[0.5px] mb-2 leading-tight xs:text-2xl">
            {formatCurrency(metrics.totalPaid, primaryCurrency)}
          </div>
          <div className="text-xs text-success-css font-medium">
            {metrics.paidPeriodsCount} paid periods
          </div>
          {metrics.totalPaid > 0 && (
            <div className="flex items-center gap-3 mt-3 overflow-visible relative z-10">
              <div className="flex-1 min-w-0 overflow-visible relative z-[1]">
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
                  <span className="w-2 h-2 rounded-full bg-[#2563eb] inline-block"></span>
                  Interest{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.totalInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#1e40af] inline-block"></span>
                  Principal{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.totalPrincipal, primaryCurrency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative overflow-visible bg-gradient-to-br from-danger-500/20 to-danger-500/10 backdrop-blur-[20px] backdrop-saturate-[180%] border border-neutral-700/30 rounded-lg p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#334155] before:via-[#1e3a8a] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 hover:-translate-y-1 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:border-neutral-600/40 min-w-0 xs:p-4">
          <div className="text-sm text-white/70 font-semibold uppercase tracking-wide mb-2">
            Total Due
          </div>
          <div className="text-3xl font-bold text-white -tracking-[0.5px] mb-2 leading-tight xs:text-2xl">
            {formatCurrency(metrics.totalOutcomes, primaryCurrency)}
          </div>
          <div className="text-xs text-white/60 font-medium">
            {filteredPeriods.length} periods
          </div>
          {metrics.dueInterest + metrics.duePrincipal > 0 && (
            <div className="flex items-center gap-3 mt-3 overflow-visible relative z-10">
              <div className="flex-1 min-w-0 overflow-visible relative z-[1]">
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
                  <span className="w-2 h-2 rounded-full bg-[#2563eb] inline-block"></span>
                  Interest due{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.dueInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#1e40af] inline-block"></span>
                  Principal due{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.duePrincipal, primaryCurrency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative overflow-visible bg-gradient-to-br from-warning-500/20 to-warning-500/10 backdrop-blur-[20px] backdrop-saturate-[180%] border border-neutral-700/30 rounded-lg p-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-[#1e40af] before:via-[#334155] before:via-[#1e3a8a] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 hover:-translate-y-1 hover:shadow-[0_12px_40px_0_rgba(10,14,26,0.6)] hover:border-neutral-600/40 min-w-0 xs:p-4">
          <div className="text-sm text-white/70 font-semibold uppercase tracking-wide mb-2">
            Pending Amount
          </div>
          <div className="text-3xl font-bold text-white -tracking-[0.5px] mb-2 leading-tight xs:text-2xl">
            {formatCurrency(metrics.totalPending, primaryCurrency)}
          </div>
          <div className="text-xs text-warning-500 font-medium">
            {metrics.pendingPeriodsCount + metrics.partialPeriodsCount} pending
            {metrics.overduePeriodsCount > 0 &&
              ` • ${metrics.overduePeriodsCount} overdue`}
          </div>
          {metrics.pendingInterest + metrics.pendingPrincipal > 0 && (
            <div className="flex items-center gap-3 mt-3 overflow-visible relative z-10">
              <div className="flex-1 min-w-0 overflow-visible relative z-[1]">
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
                  <span className="w-2 h-2 rounded-full bg-[#2563eb] inline-block"></span>
                  Est. interest{' '}
                  <span className="font-semibold text-white">
                    {formatCurrency(metrics.pendingInterest, primaryCurrency)}
                  </span>
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#1e40af] inline-block"></span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full box-border xs:grid-cols-1 xs:gap-4">
          {/* Payment Timeline */}
          <div className="ds-card-medium p-8 xs:p-4">
            <h3 className="m-0 mb-6 text-white text-xl font-bold -tracking-[0.3px] xs:text-lg">
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
              <h3 className="m-0 mb-6 text-white text-xl font-bold -tracking-[0.3px] xs:text-lg">
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
              <h3 className="m-0 mb-6 text-white text-xl font-bold -tracking-[0.3px] xs:text-lg">
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
            <div className="flex flex-col min-h-[300px] ds-card-medium p-8 xs:p-4">
              <h3 className="m-0 mb-6 text-white text-xl font-bold -tracking-[0.3px] xs:text-lg">
                Top Accounts by Interest
              </h3>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
                {topAccountsByInterest.map((account, index) => (
                  <div
                    key={account.accountNumber}
                    className="flex items-center gap-3 px-3 py-3 bg-white/8 border border-neutral-700/30 rounded-lg cursor-pointer transition-all duration-200 ease-in-out flex-shrink-0 hover:bg-white/12 hover:border-neutral-600/40 hover:translate-x-0.5"
                    onClick={() => {
                      void navigate(`/account/${account.accountNumber}`);
                    }}
                  >
                    <span className="text-sm font-bold text-primary-500 min-w-[1.75rem] text-center flex-shrink-0">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <span className="text-sm font-semibold text-white -tracking-[0.2px] whitespace-nowrap overflow-hidden text-ellipsis block">
                        {account.accountName}
                      </span>
                    </div>
                    <span className="text-[0.95rem] font-bold text-[#2563eb] -tracking-[0.3px] whitespace-nowrap flex-shrink-0">
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
          <h3 className="m-0 mb-6 text-white text-2xl font-bold -tracking-[0.5px] xs:text-xl">
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
                  className={`relative ds-card-medium overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#1e40af] before:via-[#334155] before:via-[#1e3a8a] before:via-[#475569] before:to-[#2563eb] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 hover:border-neutral-600/50 hover:shadow-[0_8px_24px_0_rgba(10,14,26,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] ${
                    isExpanded
                      ? 'border-neutral-600/50 shadow-[0_12px_32px_0_rgba(10,14,26,0.6)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] before:opacity-100'
                      : 'border-white/15'
                  }`}
                >
                  <div
                    className="flex items-center px-6 py-5 cursor-pointer gap-6 transition-colors duration-200 ease-in-out relative hover:bg-white/5 md:px-4 md:gap-4 xs:px-3.5 xs:gap-3"
                    onClick={() => toggleExpand(periodKey)}
                  >
                    <div className="grid grid-cols-[220px_140px_140px_180px_auto] items-center flex-1 gap-8 min-w-0 md:grid-cols-[200px_130px_130px_160px_auto] md:gap-6 xs:grid-cols-1 xs:gap-4 xs:w-full">
                      <div className="flex flex-col gap-1 w-[220px] flex-shrink-0 md:w-[200px] xs:w-full">
                        <h3
                          className="m-0 text-white text-lg font-bold -tracking-[0.3px] whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer transition-colors duration-200 hover:text-primary-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigate(`/account/${account.accountNumber}`);
                          }}
                        >
                          {account.accountName}
                        </h3>
                        <p className="m-0 text-white/60 text-sm font-mono tracking-wide">
                          Period #{period.periodNumber} •{' '}
                          {account.accountNumber}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 w-[140px] md:w-[130px] xs:w-full">
                        <span className="text-xs text-white/60 font-semibold uppercase tracking-wide">
                          Amount Due
                        </span>
                        <span className="text-xl font-bold text-[#2563eb] shadow-[0_2px_10px_rgba(37,99,235,0.3)] -tracking-[0.5px] xs:text-base">
                          {formatCurrency(
                            periodInfo.amountDue,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 w-[140px] md:w-[130px] xs:w-full">
                        <span className="text-xs text-white/60 font-semibold uppercase tracking-wide">
                          Amount Paid
                        </span>
                        <span className="text-lg font-semibold text-white -tracking-[0.3px] xs:text-base">
                          {formatCurrency(
                            periodInfo.amountPaid,
                            period.currency
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 w-[180px] md:w-[160px] xs:w-full">
                        <span className="text-xs text-white/60 font-semibold uppercase tracking-wide">
                          Due Date
                        </span>
                        <span
                          className={`text-[0.95rem] font-semibold ${
                            isOverdue
                              ? 'text-danger-500 font-bold'
                              : daysRemaining <= 7
                                ? 'text-warning-400 font-bold'
                                : 'text-white'
                          }`}
                        >
                          {formatDate(dueDate)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            isOverdue
                              ? 'text-danger-500 font-semibold'
                              : daysRemaining <= 7
                                ? 'text-warning-400 font-semibold'
                                : 'text-white/70'
                          }`}
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days overdue`
                            : `${daysRemaining} days left`}
                        </span>
                      </div>
                      <span
                        className="px-4 py-2 rounded-lg text-white text-xs font-bold uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-[10px] border border-neutral-600/40 whitespace-nowrap flex-shrink-0 justify-self-start w-fit"
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
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        className="ds-button-gradient flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap border-none rounded-lg"
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
                        className={`bg-white/10 border border-neutral-600/40 rounded-lg w-9 h-9 flex items-center justify-center cursor-pointer text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0 p-0 hover:bg-white/20 hover:border-neutral-600/40 hover:scale-110 xs:w-8 xs:h-8 ${
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
                    className={`overflow-hidden transition-[max-height,opacity] duration-[400ms,300ms] ease-[cubic-bezier(0.4,0,0.2,1),ease-in-out] border-t border-neutral-700/30 ${
                      isExpanded
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-6 bg-black/20">
                      <div className="mb-6 pb-4 border-b border-neutral-700/30">
                        <h4 className="m-0 mb-2 text-white text-lg font-bold -tracking-[0.3px]">
                          Payment Period Details
                        </h4>
                        <p className="m-0 text-white/80 text-[0.95rem] leading-relaxed">
                          {account.accountDescription}
                        </p>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 w-full box-border xs:grid-cols-1">
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Account:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            {account.accountName} ({account.accountNumber})
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Period Number:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            #{period.periodNumber}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Status:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            {periodInfo.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Due Date:
                          </span>
                          <span
                            className={`text-lg font-bold -tracking-[0.3px] ${
                              isOverdue
                                ? 'text-danger-500 shadow-[0_2px_10px_rgba(255,107,107,0.3)] animate-pulse'
                                : daysRemaining <= 7
                                  ? 'text-warning-400 shadow-[0_2px_10px_rgba(255,217,61,0.3)]'
                                  : 'text-white'
                            }`}
                          >
                            {formatDate(dueDate)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Days Remaining:
                          </span>
                          <span
                            className={`text-lg font-bold -tracking-[0.3px] ${
                              isOverdue
                                ? 'text-danger-500 shadow-[0_2px_10px_rgba(255,107,107,0.3)] animate-pulse'
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
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Amount Due:
                          </span>
                          <span className="text-xl text-[#2563eb] font-bold -tracking-[0.3px] shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
                            {formatCurrency(
                              periodInfo.amountDue,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Amount Paid:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            {formatCurrency(
                              periodInfo.amountPaid,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Amount Remaining:
                          </span>
                          <span className="text-xl text-[#2563eb] font-bold -tracking-[0.3px] shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
                            {formatCurrency(
                              periodInfo.amountRemaining,
                              period.currency
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Capital Portion:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            {formatCurrency(period.capital, period.currency)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                          <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                            Interest Portion:
                          </span>
                          <span className="text-lg text-white font-bold -tracking-[0.3px]">
                            {formatCurrency(period.interest, period.currency)}
                          </span>
                        </div>
                        {period.remainingPrincipal !== undefined && (
                          <div className="flex flex-col gap-2 p-4 ds-card-light rounded-lg hover:bg-white/10 hover:border-neutral-600/40 hover:translate-x-1">
                            <span className="text-sm text-white/70 font-semibold uppercase tracking-wide">
                              Remaining Principal:
                            </span>
                            <span className="text-lg text-white font-bold -tracking-[0.3px]">
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
        <div className="text-center py-12 px-12 text-white/80 ds-card-light rounded-lg">
          <p className="text-xl m-0">
            {searchQuery
              ? `No payment periods found matching "${searchQuery}" in the selected date range`
              : 'No payment periods found in the selected date range'}
          </p>
        </div>
      )}

      {loadingPeriods && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-white gap-6">
          <div className="w-[50px] h-[50px] border-4 border-neutral-600/40 border-t-neutral-500/60 rounded-full animate-spin"></div>
          <p className="text-lg text-white/90 font-medium">
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
        className="fixed bottom-6 right-6 z-[90] md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#1e40af] to-[#334155] text-white text-3xl font-light shadow-[0_8px_24px_rgba(30,64,175,0.4),0_4px_12px_rgba(0,0,0,0.3)] border border-white/20 backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:shadow-[0_12px_32px_rgba(30,64,175,0.5),0_6px_16px_rgba(0,0,0,0.4)] active:scale-95"
        onClick={() => setIsNewAccountWizardOpen(true)}
        aria-label="Create a new account"
        title="Create a new account"
      >
        <span className="flex items-center justify-center leading-none">+</span>
      </button>
    </div>
  );
}
