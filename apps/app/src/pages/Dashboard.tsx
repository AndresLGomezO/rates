import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
} from '@rates/firebase-client';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import {
  calculateDaysRemaining,
  identifyPendingPaymentsForAccount,
  type PeriodPaymentInfo,
} from '../utils/paymentUtils';
import type { PaymentPeriod } from '@rates/firebase-client';
import { LogPaymentModal } from '../components/LogPaymentModal';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [selectedAccountForPayment, setSelectedAccountForPayment] =
    useState<FinancialAccount | null>(null);
  const [selectedPeriodForPayment, setSelectedPeriodForPayment] =
    useState<PaymentPeriod | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [accountPaymentPeriods, setAccountPaymentPeriods] = useState<
    Record<string, PeriodPaymentInfo[]>
  >({});
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';
  const daysAhead = parseInt(searchParams.get('daysAhead') ?? '15', 10);

  // Flatten all pending payment periods from all accounts
  interface PendingPeriodWithAccount {
    periodInfo: PeriodPaymentInfo;
    account: FinancialAccount;
  }

  const allPendingPeriods = useMemo(() => {
    const periods: PendingPeriodWithAccount[] = [];

    accounts.forEach((account) => {
      // Only process active accounts
      if (account.status !== 'active') {
        return;
      }

      const accountPeriods = accountPaymentPeriods[account.accountNumber] || [];

      // Filter to only pending periods
      // For bills: only missing is pending (any payment means paid)
      // For loans: both missing and incomplete are pending
      const isBill = account.accountType === 'bill';
      const pendingPeriods = accountPeriods.filter(
        (p) => p.status === 'missing' || (!isBill && p.status === 'incomplete')
      );

      // If using daysAhead filter, check if period is within the date range
      if (daysAhead > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + daysAhead);
        maxDate.setHours(23, 59, 59, 999);

        pendingPeriods.forEach((periodInfo) => {
          const dueDate =
            periodInfo.period.dueDate instanceof Date
              ? periodInfo.period.dueDate
              : periodInfo.period.dueDate.toDate();
          const periodDate = new Date(dueDate);
          periodDate.setHours(0, 0, 0, 0);
          if (periodDate <= maxDate) {
            periods.push({ periodInfo, account });
          }
        });
      } else {
        // If no daysAhead filter, show all pending periods
        pendingPeriods.forEach((periodInfo) => {
          periods.push({ periodInfo, account });
        });
      }
    });

    return periods;
  }, [accounts, accountPaymentPeriods, daysAhead]);

  // Filter and sort pending periods
  const filteredPendingPeriods = useMemo(() => {
    let filtered = allPendingPeriods;

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
        (item) => item.account.monthlyPayment.currency === currencyFilter
      );
    }

    // Sort by due date (ascending - most urgent first)
    return filtered.sort((a, b) => {
      const dueDateA =
        a.periodInfo.period.dueDate instanceof Date
          ? a.periodInfo.period.dueDate
          : a.periodInfo.period.dueDate.toDate();
      const dueDateB =
        b.periodInfo.period.dueDate instanceof Date
          ? b.periodInfo.period.dueDate
          : b.periodInfo.period.dueDate.toDate();
      return dueDateA.getTime() - dueDateB.getTime();
    });
  }, [allPendingPeriods, searchQuery, searchParams]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load accounts from Firestore
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
        const periodsMap: Record<string, PeriodPaymentInfo[]> = {};
        const { extendPeriodicBillPeriods } =
          await import('../services/paymentPeriods');

        // Load payment periods for each account
        await Promise.all(
          accountsToLoad.map(async (account) => {
            try {
              // For periodic bills, extend periods first if needed
              const isPeriodic =
                account.accountType === 'bill' &&
                (account.metadata?.isPeriodic === true ||
                  account.numberOfPayments === undefined);

              if (isPeriodic) {
                try {
                  await extendPeriodicBillPeriods(account.accountNumber);
                } catch (err) {
                  // If extension fails, try to generate from scratch
                  console.warn(
                    `Failed to extend periods for ${account.accountNumber}, will try to generate:`,
                    err
                  );
                  const { generateAmortizationPlanForAccount } =
                    await import('../services/paymentPeriods');
                  try {
                    await generateAmortizationPlanForAccount(
                      account.accountNumber,
                      false
                    );
                  } catch (genErr) {
                    console.error(
                      `Failed to generate periods for ${account.accountNumber}:`,
                      genErr
                    );
                  }
                }
              }

              const periods = await identifyPendingPaymentsForAccount(account);
              periodsMap[account.accountNumber] = periods;
            } catch (err) {
              console.error(
                `Error loading periods for ${account.accountNumber}:`,
                err
              );
              // Set empty array on error
              periodsMap[account.accountNumber] = [];
            }
          })
        );

        setAccountPaymentPeriods(periodsMap);
      } catch (err) {
        console.error('Error loading payment periods:', err);
      } finally {
        setLoadingPeriods(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadAccounts();
  }, []);

  // Load payment periods for all accounts
  useEffect(() => {
    if (accounts.length > 0) {
      void loadPaymentPeriods(accounts);
    }
  }, [accounts, loadPaymentPeriods]);

  const handleLogPayment = (
    account: FinancialAccount,
    period: PaymentPeriod
  ) => {
    setSelectedAccountForPayment(account);
    setSelectedPeriodForPayment(period);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentLogged = () => {
    // Reload accounts and payment periods after payment is logged
    void loadAccounts();
    // Payment periods will be reloaded automatically via useEffect
  };

  const formatCurrency = (amount: number, currency: string): string => {
    if (currency === 'COP') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | { toDate: () => Date }): string => {
    const d = date instanceof Date ? date : date.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
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
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.8)',
            background: 'rgba(255, 107, 107, 0.2)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          <p style={{ fontSize: '1.2rem', margin: 0, color: '#ff6b6b' }}>
            Error loading accounts: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Pending Payments</h2>
        <p className="dashboard-subtitle">
          {daysAhead > 0
            ? `Accounts with missing or incomplete payments within the next ${daysAhead} days from start date`
            : 'Accounts with missing or incomplete payments from start date'}
        </p>
      </div>

      <div className="accounts-summary">
        <div className="summary-card">
          <h3>Pending Periods</h3>
          <p className="summary-value">{filteredPendingPeriods.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Pending Amount</h3>
          <p className="summary-value">
            {formatCurrency(
              filteredPendingPeriods.reduce(
                (sum, item) => sum + item.periodInfo.amountRemaining,
                0
              ),
              filteredPendingPeriods[0]?.account.monthlyPayment.currency ||
                'COP'
            )}
          </p>
        </div>
        <div className="summary-card">
          <h3>Unique Accounts</h3>
          <p className="summary-value">
            {
              new Set(
                filteredPendingPeriods.map((item) => item.account.accountNumber)
              ).size
            }
          </p>
        </div>
      </div>

      {filteredPendingPeriods.length === 0 && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.8)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <p style={{ fontSize: '1.2rem', margin: 0 }}>
            {searchQuery
              ? `No pending payment periods found matching "${searchQuery}"`
              : loadingPeriods
                ? 'Loading payment periods...'
                : 'No pending payment periods found. All payments are complete!'}
          </p>
        </div>
      )}

      {filteredPendingPeriods.length > 0 && (
        <div className="accounts-list">
          {filteredPendingPeriods.map((item) => {
            const { periodInfo, account } = item;
            const period = periodInfo.period;

            // Calculate days remaining for this specific period
            const dueDate =
              period.dueDate instanceof Date
                ? period.dueDate
                : period.dueDate.toDate();
            const daysRemaining = calculateDaysRemaining(dueDate);
            const isOverdue = daysRemaining < 0;

            const periodKey = `${account.accountNumber}-${period.periodNumber}`;
            const isExpanded = expandedAccounts.has(periodKey);

            return (
              <div
                key={periodKey}
                className={`account-row ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Simplified Row View */}
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
                        Period #{period.periodNumber} • {account.accountNumber}
                      </p>
                    </div>
                    <div className="account-row-balance">
                      <span className="account-row-balance-label">
                        Amount Due
                      </span>
                      <span className="account-row-balance-amount">
                        {formatCurrency(periodInfo.amountDue, period.currency)}
                      </span>
                    </div>
                    <div className="account-row-payment">
                      <span className="account-row-payment-label">
                        Amount Paid
                      </span>
                      <span className="account-row-payment-amount">
                        {formatCurrency(periodInfo.amountPaid, period.currency)}
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
                          periodInfo.status === 'missing'
                            ? '#f44336'
                            : periodInfo.status === 'incomplete'
                              ? '#ff9800'
                              : '#4caf50',
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
                        <span className="detail-label">Amount Remaining:</span>
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
                        <span className="detail-label">Interest Portion:</span>
                        <span className="detail-value">
                          {formatCurrency(period.interest, period.currency)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">
                          Payment Log Entries:
                        </span>
                        <span className="detail-value">
                          {periodInfo.paymentLogCount}{' '}
                          {periodInfo.paymentLogCount === 1
                            ? 'entry'
                            : 'entries'}
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
