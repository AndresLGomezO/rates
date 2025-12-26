import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
} from '@rates/firebase-client';
import { getAccountWithCalculated } from '@rates/firebase-client';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import { filterAccounts } from '../utils/filterAccounts';
import './Dashboard.css';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';

  // Filter accounts based on search query and filters
  const filteredAccounts = useMemo(() => {
    const statusFilters = (searchParams
      .get('status')
      ?.split(',')
      .filter(Boolean) ?? []) as AccountStatus[];
    const typeFilters = (searchParams.get('type')?.split(',').filter(Boolean) ??
      []) as AccountType[];
    const currencyFilter = searchParams.get('currency') ?? '';

    return filterAccounts(accounts, {
      search: searchQuery,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      type: typeFilters.length > 0 ? typeFilters : undefined,
      currency: currencyFilter || undefined,
    });
  }, [accounts, searchQuery, searchParams]);

  useEffect(() => {
    void loadAccounts();
  }, []);

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'paid_off':
        return '#2196f3';
      case 'closed':
        return '#757575';
      case 'defaulted':
        return '#f44336';
      case 'on_hold':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const toggleExpand = (accountNumber: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountNumber)) {
        newSet.delete(accountNumber);
      } else {
        newSet.add(accountNumber);
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
        <h2>Financial Accounts</h2>
      </div>

      <div className="accounts-summary">
        <div className="summary-card">
          <h3>Total Accounts</h3>
          <p className="summary-value">{filteredAccounts.length}</p>
        </div>
        <div className="summary-card">
          <h3>Active Accounts</h3>
          <p className="summary-value">
            {filteredAccounts.filter((a) => a.status === 'active').length}
          </p>
        </div>
        <div className="summary-card">
          <h3>Total Remaining</h3>
          <p className="summary-value">
            {formatCurrency(
              filteredAccounts.reduce(
                (sum, a) => sum + a.totalAmountRemaining.amount,
                0
              ),
              'COP'
            )}
          </p>
        </div>
      </div>

      {searchQuery && filteredAccounts.length === 0 && (
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
            No accounts found matching "{searchQuery}"
          </p>
        </div>
      )}

      {filteredAccounts.length > 0 && (
        <div className="accounts-list">
          {filteredAccounts.map((account) => {
            const accountWithCalculated = getAccountWithCalculated(account);
            const daysRemaining = accountWithCalculated.daysRemainingToDueDate;
            const isOverdue = daysRemaining < 0;
            const isExpanded = expandedAccounts.has(account.accountNumber);

            return (
              <div
                key={account.accountNumber}
                className={`account-row ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Simplified Row View */}
                <div
                  className="account-row-summary"
                  onClick={() => toggleExpand(account.accountNumber)}
                >
                  <div className="account-row-main">
                    <div className="account-row-primary">
                      <h3 className="account-row-name">
                        {account.accountName}
                      </h3>
                      <p className="account-row-number">
                        {account.accountNumber}
                      </p>
                    </div>
                    <div className="account-row-balance">
                      <span className="account-row-balance-label">Balance</span>
                      <span className="account-row-balance-amount">
                        {formatCurrency(
                          account.totalAmountRemaining.amount,
                          account.totalAmountRemaining.currency
                        )}
                      </span>
                    </div>
                    <div className="account-row-payment">
                      <span className="account-row-payment-label">Monthly</span>
                      <span className="account-row-payment-amount">
                        {formatCurrency(
                          account.monthlyPayment.amount,
                          account.monthlyPayment.currency
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
                        {formatDate(account.nextDueDate)}
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
                        backgroundColor: getStatusColor(account.status),
                      }}
                    >
                      {account.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <button
                    className={`account-row-expand ${isExpanded ? 'expanded' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(account.accountNumber);
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

                {/* Expanded Details View */}
                <div
                  className={`account-row-details ${isExpanded ? 'visible' : ''}`}
                >
                  <div className="account-row-details-content">
                    <div className="account-row-details-header">
                      <h4>Account Details</h4>
                      <p className="account-description">
                        {account.accountDescription}
                      </p>
                    </div>
                    <div className="account-details-grid">
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">
                          {account.accountType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Remaining Balance:</span>
                        <span className="detail-value amount">
                          {formatCurrency(
                            account.totalAmountRemaining.amount,
                            account.totalAmountRemaining.currency
                          )}
                        </span>
                        {account.additionalAmounts?.[0] && (
                          <span className="detail-value-secondary">
                            (
                            {formatCurrency(
                              account.additionalAmounts[0].amount,
                              account.additionalAmounts[0].currency
                            )}
                            )
                          </span>
                        )}
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Monthly Payment:</span>
                        <span className="detail-value">
                          {formatCurrency(
                            account.monthlyPayment.amount,
                            account.monthlyPayment.currency
                          )}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Interest Rate:</span>
                        <span className="detail-value">{account.rate}%</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">
                          Capital/Interest Split:
                        </span>
                        <span className="detail-value">
                          {formatCurrency(
                            accountWithCalculated.monthlyCapital.amount,
                            accountWithCalculated.monthlyCapital.currency
                          )}{' '}
                          /{' '}
                          {formatCurrency(
                            accountWithCalculated.monthlyInterest.amount,
                            accountWithCalculated.monthlyInterest.currency
                          )}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Next Due Date:</span>
                        <span
                          className={`detail-value ${
                            isOverdue
                              ? 'overdue'
                              : daysRemaining <= 7
                                ? 'due-soon'
                                : ''
                          }`}
                        >
                          {formatDate(account.nextDueDate)} (
                          {accountWithCalculated.nextDueDateMonth})
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
                          {daysRemaining} days
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Payments Made:</span>
                        <span className="detail-value">
                          {account.paymentLog.length} payments
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Total Paid:</span>
                        <span className="detail-value">
                          {formatCurrency(
                            accountWithCalculated.totalPaid.amount,
                            accountWithCalculated.totalPaid.currency
                          )}
                        </span>
                      </div>
                      {accountWithCalculated.estimatedPayoffDate && (
                        <div className="detail-row">
                          <span className="detail-label">
                            Estimated Payoff:
                          </span>
                          <span className="detail-value">
                            {formatDate(
                              accountWithCalculated.estimatedPayoffDate
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
    </div>
  );
}
