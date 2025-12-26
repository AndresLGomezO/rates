import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type {
  FinancialAccount,
  AccountType,
  CreateFinancialAccountInput,
} from '@rates/firebase-client';
import { getAccountWithCalculated } from '@rates/firebase-client';
import {
  createFinancialAccount,
  getUserFinancialAccounts,
} from '../services/financialAccounts';
import { Modal } from '../components/Modal';
import { CreateAccountForm } from '../components/CreateAccountForm';
import './Dashboard.css';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  loan: 'Loans',
  credit_card: 'Credit Cards',
  bill: 'Bills',
  mortgage: 'Mortgages',
  personal_loan: 'Personal Loans',
  auto_loan: 'Auto Loans',
  other: 'Other Accounts',
};

export default function AccountsByType() {
  const { type } = useParams<{ type: AccountType }>();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load accounts from Firestore
      const allAccounts = await getUserFinancialAccounts();

      // Filter accounts by type
      if (type) {
        const filtered = allAccounts.filter(
          (account) => account.accountType === type
        );
        setAccounts(filtered);
      } else {
        setAccounts([]);
      }
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

  const handleCreateAccount = async (
    accountData: Omit<CreateFinancialAccountInput, 'userId'>
  ) => {
    console.log(
      '🟢 [handleCreateAccount] Starting account creation handler...'
    );
    console.log('🟢 [handleCreateAccount] Account data received:', accountData);

    // Log Firebase and environment configuration
    console.log('🟢 [handleCreateAccount] === FIREBASE CONFIGURATION ===');
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_API_KEY:',
      import.meta.env.VITE_FIREBASE_API_KEY ? '***SET***' : 'NOT SET'
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_AUTH_DOMAIN:',
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_PROJECT_ID:',
      import.meta.env.VITE_FIREBASE_PROJECT_ID
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_STORAGE_BUCKET:',
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_MESSAGING_SENDER_ID:',
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_APP_ID:',
      import.meta.env.VITE_FIREBASE_APP_ID
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_USE_FIREBASE_EMULATOR:',
      import.meta.env.VITE_USE_FIREBASE_EMULATOR
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_MODE:',
      import.meta.env.VITE_FIREBASE_MODE
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_EMULATOR_HOST:',
      import.meta.env.VITE_FIREBASE_EMULATOR_HOST
    );
    console.log(
      '🟢 [handleCreateAccount] VITE_FIREBASE_EMULATOR_FIRESTORE_PORT:',
      import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT
    );
    console.log('🟢 [handleCreateAccount] DEV mode:', import.meta.env.DEV);
    console.log('🟢 [handleCreateAccount] PROD mode:', import.meta.env.PROD);
    console.log('🟢 [handleCreateAccount] === END CONFIGURATION ===');

    try {
      setSaving(true);
      setError(null);
      console.log('🟢 [handleCreateAccount] Saving state set to true');

      // Convert to input format (userId will be added by the service)
      const accountInput: Omit<CreateFinancialAccountInput, 'userId'> = {
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        accountDescription: accountData.accountDescription,
        accountType: accountData.accountType,
        status: accountData.status,
        totalAmountRemaining: accountData.totalAmountRemaining,
        monthlyPayment: accountData.monthlyPayment,
        rate: accountData.rate,
        nextDueDate: accountData.nextDueDate,
        paymentLog: [],
        ...(accountData.originalAmount && {
          originalAmount: accountData.originalAmount,
        }),
        ...(accountData.startDate && { startDate: accountData.startDate }),
        ...(accountData.additionalAmounts && {
          additionalAmounts: accountData.additionalAmounts,
        }),
      };
      console.log(
        '🟢 [handleCreateAccount] Account input prepared:',
        accountInput
      );

      console.log('🟢 [handleCreateAccount] Calling createFinancialAccount...');
      // Save to Firestore (service will add userId automatically)
      const accountId = await createFinancialAccount(accountInput);
      console.log(
        '🟢 [handleCreateAccount] Account created with ID:',
        accountId
      );

      console.log('🟢 [handleCreateAccount] Reloading accounts...');
      // Reload accounts to get the updated list from Firestore
      await loadAccounts();
      console.log('🟢 [handleCreateAccount] Accounts reloaded');

      console.log('🟢 [handleCreateAccount] Closing modal...');
      // Close modal on success
      setIsModalOpen(false);
      console.log(
        '✅ [handleCreateAccount] Account creation completed successfully!'
      );
    } catch (err) {
      console.error('🔴 [handleCreateAccount] Error creating account:', err);
      console.error('🔴 [handleCreateAccount] Error type:', typeof err);
      console.error('🔴 [handleCreateAccount] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : 'No stack trace',
        ...(err && typeof err === 'object' && 'code' in err
          ? { code: err.code }
          : {}),
      });
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      console.log('🟢 [handleCreateAccount] Setting saving state to false');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>{type ? ACCOUNT_TYPE_LABELS[type] : 'Accounts'}</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (!type || !ACCOUNT_TYPE_LABELS[type]) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Invalid Account Type</h2>
        </div>
        <p style={{ color: 'white' }}>
          The requested account type does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{ACCOUNT_TYPE_LABELS[type]}</h2>
        <button
          className="btn-add-new"
          onClick={() => setIsModalOpen(true)}
          title="Add New Account"
        >
          <span className="btn-add-icon">+</span>
          <span>Add New</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!saving) {
            setIsModalOpen(false);
            setError(null);
          }
        }}
        title={`Create New ${ACCOUNT_TYPE_LABELS[type]?.slice(0, -1) || 'Account'}`}
      >
        {error && (
          <div
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: 'rgba(255, 107, 107, 0.2)',
              border: '1px solid #ff6b6b',
              borderRadius: '12px',
              color: '#ff6b6b',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}
        {type && (
          <CreateAccountForm
            accountType={type}
            onSubmit={(account) => void handleCreateAccount(account)}
            onCancel={() => {
              if (!saving) {
                setIsModalOpen(false);
                setError(null);
              }
            }}
            isSubmitting={saving}
          />
        )}
      </Modal>

      {accounts.length === 0 ? (
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
          <p style={{ fontSize: '1.2rem', margin: '0 0 1.5rem 0' }}>
            No {ACCOUNT_TYPE_LABELS[type].toLowerCase()} found.
          </p>
          <button
            className="btn-add-new"
            onClick={() => setIsModalOpen(true)}
            style={{ margin: '0 auto' }}
          >
            <span className="btn-add-icon">+</span>
            <span>Add Your First Account</span>
          </button>
        </div>
      ) : (
        <>
          <div className="accounts-summary">
            <div className="summary-card">
              <h3>Total Accounts</h3>
              <p className="summary-value">{accounts.length}</p>
            </div>
            <div className="summary-card">
              <h3>Active Accounts</h3>
              <p className="summary-value">
                {accounts.filter((a) => a.status === 'active').length}
              </p>
            </div>
            <div className="summary-card">
              <h3>Total Remaining</h3>
              <p className="summary-value">
                {formatCurrency(
                  accounts.reduce(
                    (sum, a) => sum + a.totalAmountRemaining.amount,
                    0
                  ),
                  'COP'
                )}
              </p>
            </div>
          </div>

          <div className="accounts-list">
            {accounts.map((account) => {
              const accountWithCalculated = getAccountWithCalculated(account);
              const daysRemaining =
                accountWithCalculated.daysRemainingToDueDate;
              const isOverdue = daysRemaining < 0;

              return (
                <div key={account.accountNumber} className="account-card">
                  <div className="account-header">
                    <div>
                      <h3>{account.accountName}</h3>
                      <p className="account-number">{account.accountNumber}</p>
                      <p className="account-description">
                        {account.accountDescription}
                      </p>
                    </div>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(account.status),
                      }}
                    >
                      {account.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="account-details">
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
                        <span className="detail-label">Estimated Payoff:</span>
                        <span className="detail-value">
                          {formatDate(
                            accountWithCalculated.estimatedPayoffDate
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
