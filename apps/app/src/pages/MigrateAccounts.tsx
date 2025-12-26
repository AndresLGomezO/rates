import { useState } from 'react';
import { runMigration, previewMigration } from '../utils/migrateAccounts';
import { getFirestore } from '@rates/firebase-client';
import { collection, getDocs } from 'firebase/firestore';
import { getAuthToken } from '../utils/auth';
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

export default function MigrateAccounts() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

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
    </div>
  );
}
