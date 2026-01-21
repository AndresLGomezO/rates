import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
  CreateFinancialAccountInput,
} from '@rates/firebase-client';
import { getAccountWithCalculated } from '@rates/firebase-client';
import {
  createFinancialAccount,
  getUserFinancialAccounts,
  updateFinancialAccount,
  deleteFinancialAccount,
} from '../services/financialAccounts';
import { filterAccounts } from '../utils/filterAccounts';
import { Modal } from '../components/Modal';
import { CreateAccountForm } from '../components/CreateAccountForm';

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
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(
    null
  );
  const [deletingAccount, setDeletingAccount] =
    useState<FinancialAccount | null>(null);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';

  // Filter accounts based on search query and filters (type is already filtered by route)
  const filteredAccounts = useMemo(() => {
    const statusFilters = (searchParams
      .get('status')
      ?.split(',')
      .filter(Boolean) ?? []) as AccountStatus[];
    const currencyFilter = searchParams.get('currency') ?? '';

    return filterAccounts(accounts, {
      search: searchQuery,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      currency: currencyFilter || undefined,
    });
  }, [accounts, searchQuery, searchParams]);

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

  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
    setError(null);
  };

  const handleOpenEditModal = (account: FinancialAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    if (!saving) {
      setIsModalOpen(false);
      setEditingAccount(null);
      setError(null);
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
        ...(accountData.numberOfPayments && {
          numberOfPayments: accountData.numberOfPayments,
        }),
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
      handleCloseModal();
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

  const handleUpdateAccount = async (
    accountData: Omit<CreateFinancialAccountInput, 'userId'>
  ) => {
    if (!editingAccount) return;

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        accountName: accountData.accountName,
        accountDescription: accountData.accountDescription,
        status: accountData.status,
        totalAmountRemaining: accountData.totalAmountRemaining,
        monthlyPayment: accountData.monthlyPayment,
        rate: accountData.rate,
        nextDueDate: accountData.nextDueDate,
        updatedAt: new Date(),
        ...(accountData.originalAmount && {
          originalAmount: accountData.originalAmount,
        }),
        ...(accountData.startDate && { startDate: accountData.startDate }),
        ...(accountData.numberOfPayments !== undefined && {
          numberOfPayments: accountData.numberOfPayments,
        }),
      };

      await updateFinancialAccount(editingAccount.accountNumber, updateData);
      await loadAccounts();
      handleCloseModal();
    } catch (err) {
      console.error('Error updating account:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    try {
      setSaving(true);
      setError(null);
      await deleteFinancialAccount(deletingAccount.accountNumber);
      await loadAccounts();
      setDeletingAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-8 overflow-x-hidden p-0">
        <div className="relative mb-10 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
          <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
            {type ? ACCOUNT_TYPE_LABELS[type] : 'Accounts'}
          </h2>
        </div>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center text-white/80">
          <div className="mb-4 h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/30 border-t-primary-500"></div>
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (!type || !ACCOUNT_TYPE_LABELS[type]) {
    return (
      <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-8 overflow-x-hidden p-0">
        <div className="relative mb-10 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
          <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
            Invalid Account Type
          </h2>
        </div>
        <p className="text-white">The requested account type does not exist.</p>
      </div>
    );
  }

  return (
    <div className="m-0 box-border flex w-full max-w-full animate-fadeIn-slow flex-col gap-8 overflow-x-hidden p-0">
      <div className="relative mb-10 flex items-center justify-between pb-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']">
        <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-4xl font-bold -tracking-[0.5px] text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
          {ACCOUNT_TYPE_LABELS[type]}
        </h2>
        <button
          className="ds-button-gradient flex items-center gap-2 px-6 py-3.5 text-[0.95rem]"
          onClick={handleOpenCreateModal}
          title="Add New Account"
        >
          <span className="text-xl font-bold leading-none">+</span>
          <span>Add New</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingAccount
            ? `Edit ${ACCOUNT_TYPE_LABELS[type]?.slice(0, -1) ?? 'Account'}`
            : `Create New ${ACCOUNT_TYPE_LABELS[type]?.slice(0, -1) ?? 'Account'}`
        }
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
            onSubmit={(account) =>
              editingAccount
                ? void handleUpdateAccount(account)
                : void handleCreateAccount(account)
            }
            onCancel={handleCloseModal}
            isSubmitting={saving}
            initialData={editingAccount ?? undefined}
            mode={editingAccount ? 'edit' : 'create'}
          />
        )}
      </Modal>

      <Modal
        isOpen={deletingAccount !== null}
        onClose={() => {
          if (!saving) {
            setDeletingAccount(null);
            setError(null);
          }
        }}
        title="Delete Account"
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
        {deletingAccount && (
          <div style={{ color: 'white' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Are you sure you want to delete this account?
            </p>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {deletingAccount.accountName}
              </p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {deletingAccount.accountNumber}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-neutral-600/40 bg-white/10 px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (!saving) {
                    setDeletingAccount(null);
                    setError(null);
                  }
                }}
                disabled={saving}
                style={{
                  padding: '0.875rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={saving}
                style={{
                  padding: '0.875rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background:
                    'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                }}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
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
            className="ds-button-gradient mx-auto flex items-center gap-2 px-6 py-3.5 text-[0.95rem]"
            onClick={handleOpenCreateModal}
          >
            <span className="text-xl font-bold leading-none">+</span>
            <span>Add Your First Account</span>
          </button>
        </div>
      ) : filteredAccounts.length === 0 && searchQuery ? (
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
            No {ACCOUNT_TYPE_LABELS[type].toLowerCase()} found matching "
            {searchQuery}"
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="ds-card-light p-6">
              <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                Total Accounts
              </h3>
              <p className="m-0 text-2xl font-bold text-white">
                {filteredAccounts.length}
              </p>
            </div>
            <div className="ds-card-light p-6">
              <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                Active Accounts
              </h3>
              <p className="m-0 text-2xl font-bold text-white">
                {filteredAccounts.filter((a) => a.status === 'active').length}
              </p>
            </div>
            <div className="ds-card-light p-6">
              <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                Total Remaining
              </h3>
              <p className="m-0 text-2xl font-bold text-white">
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

          <div className="flex flex-col gap-6">
            {filteredAccounts.map((account) => {
              const accountWithCalculated = getAccountWithCalculated(account);
              const daysRemaining =
                accountWithCalculated.daysRemainingToDueDate;
              const isOverdue = daysRemaining < 0;

              return (
                <div key={account.accountNumber} className="ds-card-light p-6">
                  <div className="mb-6 flex items-start justify-between border-b border-neutral-700/30 pb-4">
                    <div>
                      <h3 className="m-0 mb-2 text-xl font-bold text-white">
                        {account.accountName}
                      </h3>
                      <p className="m-0 mb-1 font-mono text-sm text-white/60">
                        {account.accountNumber}
                      </p>
                      <p className="m-0 text-sm text-white/80">
                        {account.accountDescription}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
                        style={{
                          backgroundColor: getStatusColor(account.status),
                        }}
                      >
                        {account.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigate(`/account/${account.accountNumber}`);
                          }}
                          title="View Details"
                          style={{
                            background: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.5)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              'rgba(76, 175, 80, 0.3)';
                            e.currentTarget.style.transform =
                              'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              'rgba(76, 175, 80, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span>📊</span>
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(account);
                          }}
                          title="Edit Account"
                          style={{
                            background: 'rgba(102, 126, 234, 0.2)',
                            border: '1px solid rgba(102, 126, 234, 0.5)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              'rgba(102, 126, 234, 0.3)';
                            e.currentTarget.style.transform =
                              'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              'rgba(102, 126, 234, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingAccount(account);
                          }}
                          title="Delete Account"
                          style={{
                            background: 'rgba(244, 67, 54, 0.2)',
                            border: '1px solid rgba(244, 67, 54, 0.5)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              'rgba(244, 67, 54, 0.3)';
                            e.currentTarget.style.transform =
                              'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              'rgba(244, 67, 54, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Type:</span>
                      <span className="text-sm font-semibold text-white">
                        {account.accountType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Remaining Balance:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(
                            account.totalAmountRemaining.amount,
                            account.totalAmountRemaining.currency
                          )}
                        </span>
                        {account.additionalAmounts?.[0] && (
                          <span className="text-xs text-white/50">
                            (
                            {formatCurrency(
                              account.additionalAmounts[0].amount,
                              account.additionalAmounts[0].currency
                            )}
                            )
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Monthly Payment:
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(
                          account.monthlyPayment.amount,
                          account.monthlyPayment.currency
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Interest Rate:
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {account.rate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Capital/Interest Split:
                      </span>
                      <span className="text-sm font-semibold text-white">
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Next Due Date:
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isOverdue
                            ? 'text-danger-500'
                            : daysRemaining <= 7
                              ? 'text-warning-500'
                              : 'text-white'
                        }`}
                      >
                        {formatDate(account.nextDueDate)} (
                        {accountWithCalculated.nextDueDateMonth})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Days Remaining:
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isOverdue
                            ? 'text-danger-500'
                            : daysRemaining <= 7
                              ? 'text-warning-500'
                              : 'text-white'
                        }`}
                      >
                        {daysRemaining} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">
                        Payments Made:
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {account.paymentLog.length} payments
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Total Paid:</span>
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(
                          accountWithCalculated.totalPaid.amount,
                          accountWithCalculated.totalPaid.currency
                        )}
                      </span>
                    </div>
                    {accountWithCalculated.estimatedPayoffDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">
                          Estimated Payoff:
                        </span>
                        <span className="text-sm font-semibold text-white">
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
