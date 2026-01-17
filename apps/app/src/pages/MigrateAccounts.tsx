import { useState, useEffect } from 'react';
import {
  runMigration,
  previewMigration,
  migrateHistoricalPayments,
  previewHistoricalPaymentsMigration,
  type HistoricalPaymentData,
} from '../utils/migrateAccounts';
import { getFirestore } from '@rates/firebase-client';
import { collection, getDocs } from 'firebase/firestore';
import { getAuthToken } from '../utils/auth';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import {
  getPaymentPeriods,
  generateAmortizationPlanForAccount,
  extendPeriodicBillPeriods,
} from '../services/paymentPeriods';
import type { FinancialAccount } from '@rates/firebase-client';
import { BatchPaymentModal } from '../components/BatchPaymentModal';
import './Dashboard.css';

// Helper to decode user ID from token
function getCurrentUserId(): string {
  const tokenResult = getAuthToken(false);
  const token = typeof tokenResult === 'string' ? tokenResult : null;

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1])) as {
          uid?: string;
          user_id?: string;
          sub?: string;
        };
        return payload.user_id ?? payload.uid ?? payload.sub ?? 'unknown';
      }
    } catch {
      // Ignore
    }
  }
  return 'no-token';
}

interface AccountPlanStatus {
  account: FinancialAccount;
  hasPlan: boolean;
  periodCount: number;
  pendingPeriodCount: number;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

export default function MigrateAccounts() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountPlans, setAccountPlans] = useState<
    Record<string, AccountPlanStatus>
  >({});

  // Historical payments migration state
  const [historicalPaymentsData, setHistoricalPaymentsData] =
    useState<string>('');
  const [isRunningHistorical, setIsRunningHistorical] = useState(false);
  const [isPreviewingHistorical, setIsPreviewingHistorical] = useState(false);
  const [historicalResult, setHistoricalResult] = useState<string | null>(null);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  // Batch payment modal state
  const [batchPaymentAccount, setBatchPaymentAccount] =
    useState<FinancialAccount | null>(null);
  const [isBatchPaymentModalOpen, setIsBatchPaymentModalOpen] = useState(false);

  const handlePreview = () => {
    try {
      setIsPreviewing(true);
      setError(null);
      setResult(null);

      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
        originalLog(...args);
      };

      previewMigration();

      console.log = originalLog;
      setResult(logs.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRunMigration = async () => {
    if (
      !confirm(
        'Are you sure you want to run the migration? This will create all accounts in the database.'
      )
    ) {
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setResult(null);

      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      const logs: string[] = [];

      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
        originalLog(...args);
      };

      console.error = (...args: unknown[]) => {
        logs.push('ERROR: ' + args.map(String).join(' '));
        originalError(...args);
      };

      await runMigration();

      console.log = originalLog;
      console.error = originalError;

      setResult(logs.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  // Load accounts and check plan status
  useEffect(() => {
    void loadAccountsAndPlans();
  }, []);

  const loadAccountsAndPlans = async () => {
    try {
      setAccountsLoading(true);
      const userAccounts = await getUserFinancialAccounts();
      setAccounts(userAccounts);

      // Check plan status for each account
      const plansStatus: Record<string, AccountPlanStatus> = {};
      for (const account of userAccounts) {
        try {
          const periods = await getPaymentPeriods(account.accountNumber);
          const pendingPeriods = periods.filter((p) => p.status === 'pending');
          plansStatus[account.accountNumber] = {
            account,
            hasPlan: periods.length > 0,
            periodCount: periods.length,
            pendingPeriodCount: pendingPeriods.length,
            isLoading: false,
            isGenerating: false,
            error: null,
          };
        } catch (err) {
          plansStatus[account.accountNumber] = {
            account,
            hasPlan: false,
            periodCount: 0,
            pendingPeriodCount: 0,
            isLoading: false,
            isGenerating: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }
      setAccountPlans(plansStatus);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleGeneratePlan = async (accountNumber: string) => {
    const planStatus = accountPlans[accountNumber];
    if (!planStatus) return;

    const account = planStatus.account;
    const isPeriodic =
      account.accountType === 'bill' &&
      (account.metadata?.isPeriodic === true ||
        account.numberOfPayments === undefined);

    setAccountPlans((prev) => ({
      ...prev,
      [accountNumber]: {
        ...planStatus,
        isGenerating: true,
        error: null,
      },
    }));

    try {
      // For periodic bills with existing periods, extend them
      // Otherwise, generate from scratch
      if (isPeriodic && planStatus.hasPlan) {
        await extendPeriodicBillPeriods(accountNumber);
        // Reload plan status
        const periods = await getPaymentPeriods(accountNumber);
        const pendingPeriods = periods.filter((p) => p.status === 'pending');
        setAccountPlans((prev) => ({
          ...prev,
          [accountNumber]: {
            ...planStatus,
            hasPlan: true,
            periodCount: periods.length,
            pendingPeriodCount: pendingPeriods.length,
            isGenerating: false,
            error: null,
          },
        }));
      } else {
        await generateAmortizationPlanForAccount(accountNumber);
        // Reload plan status
        const periods = await getPaymentPeriods(accountNumber);
        const pendingPeriods = periods.filter((p) => p.status === 'pending');
        setAccountPlans((prev) => ({
          ...prev,
          [accountNumber]: {
            ...planStatus,
            hasPlan: true,
            periodCount: periods.length,
            pendingPeriodCount: pendingPeriods.length,
            isGenerating: false,
            error: null,
          },
        }));
      }
    } catch (err) {
      setAccountPlans((prev) => ({
        ...prev,
        [accountNumber]: {
          ...planStatus,
          isGenerating: false,
          error: err instanceof Error ? err.message : 'Failed to generate plan',
        },
      }));
    }
  };

  const handleRegeneratePlan = async (accountNumber: string) => {
    if (
      !confirm(
        'Are you sure you want to regenerate the amortization plan? This will delete all existing periods and create new ones based on current account parameters.'
      )
    ) {
      return;
    }

    const planStatus = accountPlans[accountNumber];
    if (!planStatus) return;

    setAccountPlans((prev) => ({
      ...prev,
      [accountNumber]: {
        ...planStatus,
        isGenerating: true,
        error: null,
      },
    }));

    try {
      await generateAmortizationPlanForAccount(accountNumber, true);
      // Reload plan status
      const periods = await getPaymentPeriods(accountNumber);
      const pendingPeriods = periods.filter((p) => p.status === 'pending');
      setAccountPlans((prev) => ({
        ...prev,
        [accountNumber]: {
          ...planStatus,
          hasPlan: true,
          periodCount: periods.length,
          pendingPeriodCount: pendingPeriods.length,
          isGenerating: false,
          error: null,
        },
      }));
    } catch (err) {
      setAccountPlans((prev) => ({
        ...prev,
        [accountNumber]: {
          ...planStatus,
          isGenerating: false,
          error:
            err instanceof Error ? err.message : 'Failed to regenerate plan',
        },
      }));
    }
  };

  const handleDebug = async () => {
    try {
      setError(null);
      const firestore = getFirestore();
      const userId = getCurrentUserId();

      const info: string[] = [];
      info.push('=== Debug Information ===');
      info.push(`Current User ID: ${userId}`);
      info.push(`Firestore Project: ${firestore.app.options.projectId}`);
      info.push(`Firestore App Name: ${firestore.app.name}`);
      info.push('');

      // Get all accounts (for debugging)
      const accountsRef = collection(firestore, 'financialAccounts');
      const snapshot = await getDocs(accountsRef);

      info.push(`Total accounts in database: ${snapshot.size}`);
      info.push('');

      if (snapshot.size > 0) {
        info.push('All accounts:');
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          info.push(
            `  - ${doc.id}: ${data.accountName ?? 'N/A'} (userId: ${data.userId ?? 'N/A'})`
          );
        });
        info.push('');
      }

      // Get accounts for current user
      const userAccounts = snapshot.docs.filter(
        (doc) => doc.data().userId === userId
      );
      info.push(
        `Accounts for current user (${userId}): ${userAccounts.length}`
      );

      if (userAccounts.length > 0) {
        info.push('Your accounts:');
        userAccounts.forEach((doc) => {
          const data = doc.data();
          info.push(`  - ${doc.id}: ${data.accountName ?? 'N/A'}`);
        });
      } else if (snapshot.size > 0) {
        info.push('');
        info.push('⚠️ WARNING: Accounts exist but with different userId!');
        info.push('This means accounts were created with a different user ID.');
        info.push('Possible causes:');
        info.push('  1. You logged in with a different account');
        info.push('  2. The token format changed');
        info.push("  3. You're using a different Firebase project");
      }

      setDebugInfo(info.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePreviewHistoricalPayments = () => {
    try {
      setIsPreviewingHistorical(true);
      setHistoricalError(null);
      setHistoricalResult(null);

      if (!historicalPaymentsData.trim()) {
        setHistoricalError('Please enter payment data');
        return;
      }

      // Parse JSON data
      let accountsData: HistoricalPaymentData[];
      try {
        // Try parsing as single object first
        const parsed = JSON.parse(historicalPaymentsData) as
          | HistoricalPaymentData
          | HistoricalPaymentData[];
        if (Array.isArray(parsed)) {
          accountsData = parsed;
        } else {
          // Single account object, wrap in array
          accountsData = [parsed];
        }
      } catch {
        setHistoricalError(
          'Invalid JSON format. Please check your data structure.'
        );
        return;
      }

      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
        originalLog(...args);
      };

      previewHistoricalPaymentsMigration(accountsData);

      console.log = originalLog;
      setHistoricalResult(logs.join('\n'));
    } catch (err) {
      setHistoricalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewingHistorical(false);
    }
  };

  const handleRunHistoricalPaymentsMigration = async () => {
    if (
      !confirm(
        'Are you sure you want to migrate historical payments? This will log payments to existing payment periods.'
      )
    ) {
      return;
    }

    try {
      setIsRunningHistorical(true);
      setHistoricalError(null);
      setHistoricalResult(null);

      if (!historicalPaymentsData.trim()) {
        setHistoricalError('Please enter payment data');
        return;
      }

      // Parse JSON data
      let accountsData: HistoricalPaymentData[];
      try {
        // Try parsing as single object first
        const parsed = JSON.parse(historicalPaymentsData) as
          | HistoricalPaymentData
          | HistoricalPaymentData[];
        if (Array.isArray(parsed)) {
          accountsData = parsed;
        } else {
          // Single account object, wrap in array
          accountsData = [parsed];
        }
      } catch {
        setHistoricalError(
          'Invalid JSON format. Please check your data structure.'
        );
        return;
      }

      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      const logs: string[] = [];

      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
        originalLog(...args);
      };

      console.error = (...args: unknown[]) => {
        logs.push('ERROR: ' + args.map(String).join(' '));
        originalError(...args);
      };

      await migrateHistoricalPayments(accountsData);

      console.log = originalLog;
      console.error = originalError;

      setHistoricalResult(logs.join('\n'));
    } catch (err) {
      setHistoricalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunningHistorical(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Account Migration</h1>
        <p>
          Migrate your initial accounts from the spreadsheet to the database
        </p>
      </div>

      <div className="dashboard-content">
        <div className="migration-controls" style={{ marginBottom: '2rem' }}>
          <button
            onClick={handlePreview}
            disabled={isPreviewing || isRunning}
            style={{
              padding: '0.75rem 1.5rem',
              marginRight: '1rem',
              fontSize: '1rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPreviewing || isRunning ? 'not-allowed' : 'pointer',
              opacity: isPreviewing || isRunning ? 0.6 : 1,
            }}
          >
            {isPreviewing ? 'Previewing...' : 'Preview Migration'}
          </button>

          <button
            onClick={() => {
              void handleRunMigration();
            }}
            disabled={isRunning || isPreviewing}
            style={{
              padding: '0.75rem 1.5rem',
              marginRight: '1rem',
              fontSize: '1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning || isPreviewing ? 'not-allowed' : 'pointer',
              opacity: isRunning || isPreviewing ? 0.6 : 1,
            }}
          >
            {isRunning ? 'Running Migration...' : 'Run Migration'}
          </button>

          <button
            onClick={() => {
              void handleDebug();
            }}
            disabled={isRunning || isPreviewing}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning || isPreviewing ? 'not-allowed' : 'pointer',
              opacity: isRunning || isPreviewing ? 0.6 : 1,
            }}
          >
            🔍 Debug Database
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              border: '1px solid #ef5350',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '600px',
              overflow: 'auto',
              marginBottom: '1rem',
            }}
          >
            {result}
          </div>
        )}

        {debugInfo && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              border: '1px solid #ffc107',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '600px',
              overflow: 'auto',
              marginBottom: '1rem',
            }}
          >
            {debugInfo}
          </div>
        )}

        {/* Historical Payments Migration Section */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h2 style={{ marginTop: 0, color: 'white' }}>
            Historical Payments Migration
          </h2>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '1.5rem',
            }}
          >
            Migrate historical payment data to existing payment periods. Paste
            JSON data with account ID and payment history. Each payment will be
            matched to the corresponding payment period based on the date
            (YYYY-MM format).
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="historical-payments-input"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 600,
              }}
            >
              Payment Data (JSON):
            </label>
            <textarea
              id="historical-payments-input"
              value={historicalPaymentsData}
              onChange={(e) => setHistoricalPaymentsData(e.target.value)}
              placeholder={`Example with "date":\n{\n  "id": "hipotecario-2-001",\n  "payments": [\n    {"date": "2024-08", "amount": 4537094},\n    {"date": "2024-09", "amount": 4538000}\n  ]\n}\n\nOr with "period":\n{\n  "id": "tc-signature-003",\n  "payments": [\n    {"period": "2024-08", "amount": 391000}\n  ]\n}\n\nOr with "month":\n{\n  "id": "prestamo-personal-004",\n  "payments": [\n    {"month": "2025-10", "amount": 5400000}\n  ]\n}\n\nOr an array of accounts:\n[\n  { "id": "...", "payments": [...] }\n]`}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                resize: 'vertical',
              }}
              disabled={isRunningHistorical || isPreviewingHistorical}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <button
              onClick={handlePreviewHistoricalPayments}
              disabled={isPreviewingHistorical || isRunningHistorical}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isPreviewingHistorical || isRunningHistorical
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  isPreviewingHistorical || isRunningHistorical ? 0.6 : 1,
              }}
            >
              {isPreviewingHistorical ? 'Previewing...' : 'Preview Migration'}
            </button>

            <button
              onClick={() => {
                void handleRunHistoricalPaymentsMigration();
              }}
              disabled={isRunningHistorical || isPreviewingHistorical}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isRunningHistorical || isPreviewingHistorical
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  isRunningHistorical || isPreviewingHistorical ? 0.6 : 1,
              }}
            >
              {isRunningHistorical ? 'Running Migration...' : 'Run Migration'}
            </button>
          </div>

          {historicalError && (
            <div
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                border: '1px solid #ef5350',
              }}
            >
              <strong>Error:</strong> {historicalError}
            </div>
          )}

          {historicalResult && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '600px',
                overflow: 'auto',
                marginBottom: '1rem',
              }}
            >
              {historicalResult}
            </div>
          )}

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(33, 150, 243, 0.3)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2196f3' }}>
              About Historical Payments Migration
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.5rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
              }}
            >
              <li>
                Payment periods must exist before migrating historical payments.
                Generate amortization plans first if needed.
              </li>
              <li>
                Payments are matched to periods based on the date (YYYY-MM
                format). The payment date must match the period's due date month
                and year.
              </li>
              <li>
                Each payment will be logged to the matching period, updating the
                amount paid and status automatically.
              </li>
              <li>
                You can paste a single account object or an array of account
                objects.
              </li>
            </ul>
          </div>
        </div>

        {/* Amortization Plans Section */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h2 style={{ marginTop: 0, color: 'white' }}>
            Payment Plans Management
          </h2>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '1.5rem',
            }}
          >
            Generate or regenerate payment plans for your accounts. For loans,
            plans are created based on start date and number of payments. For
            periodic bills, plans are generated from start date to current date
            and will continue generating periods automatically.
          </p>

          {accountsLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              No accounts found. Run the migration first to create accounts.
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {accounts.map((account) => {
                const planStatus = accountPlans[account.accountNumber];
                if (!planStatus) return null;

                // Check if this is a periodic bill
                const isPeriodic =
                  account.accountType === 'bill' &&
                  (account.metadata?.isPeriodic === true ||
                    account.numberOfPayments === undefined);

                // For periodic bills, only need startDate
                // For loans and fixed-period bills, need both startDate and numberOfPayments
                const canGenerate = isPeriodic
                  ? !!account.startDate
                  : !!(account.startDate && account.numberOfPayments);

                const missingFields: string[] = [];
                if (!account.startDate) missingFields.push('startDate');
                if (!isPeriodic && !account.numberOfPayments)
                  missingFields.push('numberOfPayments');

                return (
                  <div
                    key={account.accountNumber}
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'white',
                            fontSize: '1.1rem',
                          }}
                        >
                          {account.accountName}
                        </h3>
                        <p
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {account.accountNumber}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: '1.5rem',
                            flexWrap: 'wrap',
                            marginTop: '0.75rem',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.85rem',
                              }}
                            >
                              Plan Status:{' '}
                            </span>
                            <span
                              style={{
                                color: planStatus.hasPlan
                                  ? '#4caf50'
                                  : '#ff9800',
                                fontWeight: 600,
                              }}
                            >
                              {planStatus.hasPlan
                                ? `✓ ${planStatus.periodCount} periods`
                                : 'No plan'}
                            </span>
                          </div>
                          {account.startDate && (
                            <div>
                              <span
                                style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                Start Date:{' '}
                              </span>
                              <span
                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                              >
                                {new Date(
                                  account.startDate instanceof Date
                                    ? account.startDate
                                    : account.startDate.toDate()
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {isPeriodic ? (
                            <div>
                              <span
                                style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                Type:{' '}
                              </span>
                              <span
                                style={{ color: '#4caf50', fontWeight: 600 }}
                              >
                                Periodic Bill
                              </span>
                            </div>
                          ) : (
                            account.numberOfPayments && (
                              <div>
                                <span
                                  style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  Total Payments:{' '}
                                </span>
                                <span
                                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                                >
                                  {account.numberOfPayments}
                                </span>
                              </div>
                            )
                          )}
                          <div>
                            <span
                              style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.85rem',
                              }}
                            >
                              Monthly Payment:{' '}
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: account.monthlyPayment.currency,
                                minimumFractionDigits: 0,
                              }).format(account.monthlyPayment.amount)}
                            </span>
                          </div>
                        </div>
                        {!canGenerate && (
                          <div
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: 'rgba(255, 152, 0, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 152, 0, 0.3)',
                            }}
                          >
                            <span
                              style={{
                                color: '#ff9800',
                                fontSize: '0.85rem',
                              }}
                            >
                              ⚠️ Missing required fields:{' '}
                              {missingFields.join(', ')}. Update the account
                              first to generate a plan.
                            </span>
                          </div>
                        )}
                        {planStatus.error && (
                          <div
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(244, 67, 54, 0.3)',
                            }}
                          >
                            <span
                              style={{
                                color: '#f44336',
                                fontSize: '0.85rem',
                              }}
                            >
                              Error: {planStatus.error}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        {planStatus.hasPlan ? (
                          <>
                            {planStatus.pendingPeriodCount > 0 && (
                              <button
                                onClick={() => {
                                  setBatchPaymentAccount(account);
                                  setIsBatchPaymentModalOpen(true);
                                }}
                                disabled={planStatus.isGenerating}
                                style={{
                                  padding: '0.625rem 1.25rem',
                                  fontSize: '0.9rem',
                                  backgroundColor: '#2196f3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: planStatus.isGenerating
                                    ? 'not-allowed'
                                    : 'pointer',
                                  opacity: planStatus.isGenerating ? 0.6 : 1,
                                  fontWeight: 600,
                                }}
                              >
                                Batch Add Payments
                              </button>
                            )}
                            <button
                              onClick={() =>
                                void handleRegeneratePlan(account.accountNumber)
                              }
                              disabled={!canGenerate || planStatus.isGenerating}
                              style={{
                                padding: '0.625rem 1.25rem',
                                fontSize: '0.9rem',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor:
                                  !canGenerate || planStatus.isGenerating
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  !canGenerate || planStatus.isGenerating
                                    ? 0.6
                                    : 1,
                                fontWeight: 600,
                              }}
                            >
                              {planStatus.isGenerating
                                ? 'Regenerating...'
                                : 'Regenerate Plan'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              void handleGeneratePlan(account.accountNumber)
                            }
                            disabled={!canGenerate || planStatus.isGenerating}
                            style={{
                              padding: '0.625rem 1.25rem',
                              fontSize: '0.9rem',
                              backgroundColor: '#4caf50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor:
                                !canGenerate || planStatus.isGenerating
                                  ? 'not-allowed'
                                  : 'pointer',
                              opacity:
                                !canGenerate || planStatus.isGenerating
                                  ? 0.6
                                  : 1,
                              fontWeight: 600,
                            }}
                          >
                            {planStatus.isGenerating
                              ? 'Generating...'
                              : 'Generate Plan'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(33, 150, 243, 0.3)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2196f3' }}>
              About Payment Plans
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.5rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
              }}
            >
              <li>
                <strong>Loans:</strong> Plans are created based on start date
                and total number of payments. Each period tracks due date,
                amount, capital, interest, and payment status.
              </li>
              <li>
                <strong>Periodic Bills:</strong> Plans are generated from start
                date to current date. Periods continue generating automatically
                each period until the account is cancelled. Bills use fixed
                payments without principal reduction.
              </li>
              <li>
                Regenerating a plan will delete existing periods and create new
                ones based on current account parameters.
              </li>
              <li>
                Loans need <code>startDate</code> and{' '}
                <code>numberOfPayments</code>. Periodic bills only need{' '}
                <code>startDate</code>.
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Instructions</h3>
          <ol>
            <li>
              Click <strong>"Preview Migration"</strong> to see what accounts
              will be created without actually creating them.
            </li>
            <li>
              Review the preview to ensure all accounts are correctly mapped.
            </li>
            <li>
              Click <strong>"Run Migration"</strong> to create all accounts in
              the database.
            </li>
            <li>
              After migration, you can view your accounts in the Dashboard or
              Accounts by Type pages.
            </li>
          </ol>
          <p style={{ marginTop: '1rem', marginBottom: 0 }}>
            <strong>Note:</strong> The migration will create accounts for the
            currently logged-in user. Make sure you are authenticated before
            running the migration.
          </p>
        </div>
      </div>

      {/* Batch Payment Modal */}
      <BatchPaymentModal
        isOpen={isBatchPaymentModalOpen}
        onClose={() => {
          setIsBatchPaymentModalOpen(false);
          setBatchPaymentAccount(null);
        }}
        account={batchPaymentAccount}
        onPaymentsLogged={() => {
          // Reload account plans to reflect updated payment status
          void loadAccountsAndPlans();
        }}
      />
    </div>
  );
}
