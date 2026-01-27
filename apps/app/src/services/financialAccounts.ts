/**
 * Financial Accounts Firestore Service
 *
 * Service functions for creating, reading, updating, and deleting financial accounts
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  type Firestore,
  type DocumentReference,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirestore, getAuth } from '@rates/firebase-client';
import { getAuthToken } from '../utils/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type {
  FinancialAccount,
  CreateFinancialAccountInput,
  UpdateFinancialAccountInput,
} from '@rates/firebase-client';
import { validateFinancialAccount } from '@rates/firebase-client';

// Collection name constant
export const FINANCIAL_ACCOUNTS_COLLECTION = 'financialAccounts';

/**
 * Decode JWT token to extract user ID
 */
function decodeTokenPayload(
  token: string
): { uid?: string; user_id?: string; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1])) as {
      uid?: string;
      user_id?: string;
      sub?: string;
    };
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the current user ID from the auth token
 * Falls back to a mock user ID if not authenticated
 */
function getCurrentUserId(): string {
  const tokenResult = getAuthToken(false);
  const token = typeof tokenResult === 'string' ? tokenResult : null;

  if (token) {
    const payload = decodeTokenPayload(token);
    if (payload) {
      // Firebase ID tokens use 'user_id' or 'sub' for the user ID
      // Some tokens might use 'uid'
      return payload.user_id ?? payload.uid ?? payload.sub ?? 'user-mock-123';
    }
  }

  // Fallback to mock user ID for development
  // In production, this should redirect to login
  return 'user-mock-123';
}

/**
 * Create a new financial account
 */
export async function createFinancialAccount(
  accountData: Omit<CreateFinancialAccountInput, 'userId'>
): Promise<string> {
  console.log('🔵 [createFinancialAccount] Starting account creation...');
  console.log('🔵 [createFinancialAccount] Input data:', accountData);

  try {
    console.log(
      '🔵 [createFinancialAccount] Step 1: Getting Firestore instance...'
    );
    const firestore: Firestore = getFirestore();
    console.log('🔵 [createFinancialAccount] Firestore instance:', firestore);
    console.log('🔵 [createFinancialAccount] Firestore app:', firestore.app);
    console.log(
      '🔵 [createFinancialAccount] Firestore app name:',
      firestore.app.name
    );
    console.log('🔵 [createFinancialAccount] Firestore app options:', {
      projectId: firestore.app.options.projectId,
      apiKey: firestore.app.options.apiKey ? 'SET' : 'NOT SET',
    });

    console.log('🔵 [createFinancialAccount] Step 2: Getting user ID...');
    const userId = getCurrentUserId();
    console.log('🔵 [createFinancialAccount] User ID:', userId);

    // Add userId to account data
    const accountDataWithUserId: CreateFinancialAccountInput = {
      ...accountData,
      userId,
    };
    console.log(
      '🔵 [createFinancialAccount] Account data with userId:',
      accountDataWithUserId
    );

    console.log(
      '🔵 [createFinancialAccount] Step 3: Validating account data...'
    );
    const errors = validateFinancialAccount(accountDataWithUserId);
    if (errors.length > 0) {
      console.error('🔴 [createFinancialAccount] Validation errors:', errors);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    console.log('🔵 [createFinancialAccount] Validation passed');

    console.log(
      '🔵 [createFinancialAccount] Step 4: Creating account document...'
    );
    const createdAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
    const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
    const account: FinancialAccount = {
      ...accountDataWithUserId,
      paymentLog: accountDataWithUserId.paymentLog ?? [],
      createdAt,
      updatedAt,
    };
    console.log('🔵 [createFinancialAccount] Account object created:', account);

    console.log(
      '🔵 [createFinancialAccount] Step 5: Converting dates to Timestamps...'
    );
    if (account.nextDueDate instanceof Date) {
      account.nextDueDate = Timestamp.fromDate(
        account.nextDueDate
      ) as unknown as typeof account.nextDueDate;
      console.log(
        '🔵 [createFinancialAccount] nextDueDate converted:',
        account.nextDueDate
      );
    }
    if (account.startDate instanceof Date) {
      account.startDate = Timestamp.fromDate(
        account.startDate
      ) as unknown as typeof account.startDate;
      console.log(
        '🔵 [createFinancialAccount] startDate converted:',
        account.startDate
      );
    }
    if (account.endDate instanceof Date) {
      account.endDate = Timestamp.fromDate(
        account.endDate
      ) as unknown as typeof account.endDate;
      console.log(
        '🔵 [createFinancialAccount] endDate converted:',
        account.endDate
      );
    }

    // Convert payment log dates
    account.paymentLog = (account.paymentLog ?? []).map((entry) => ({
      ...entry,
      datePaid:
        entry.datePaid instanceof Date
          ? (Timestamp.fromDate(
              entry.datePaid
            ) as unknown as typeof entry.datePaid)
          : entry.datePaid,
      createdAt:
        entry.createdAt instanceof Date
          ? (Timestamp.fromDate(
              entry.createdAt
            ) as unknown as typeof entry.createdAt)
          : entry.createdAt,
    }));
    console.log('🔵 [createFinancialAccount] Payment log processed');

    // Use accountNumber as document ID
    const accountId = account.accountNumber;
    console.log(
      '🔵 [createFinancialAccount] Step 6: Creating document reference...'
    );
    console.log(
      '🔵 [createFinancialAccount] Collection:',
      FINANCIAL_ACCOUNTS_COLLECTION
    );
    console.log('🔵 [createFinancialAccount] Document ID:', accountId);
    const accountRef: DocumentReference<FinancialAccount> = doc(
      firestore,
      FINANCIAL_ACCOUNTS_COLLECTION,
      accountId
    ) as DocumentReference<FinancialAccount>;
    console.log('🔵 [createFinancialAccount] Document reference:', accountRef);
    const accountRefPath: string = accountRef.path;
    console.log('🔵 [createFinancialAccount] Document path:', accountRefPath);

    console.log('🔵 [createFinancialAccount] Step 7: Saving to Firestore...');
    console.log(
      '🔵 [createFinancialAccount] Firestore database:',
      firestore.app.options.projectId
    );
    console.log(
      '🔵 [createFinancialAccount] Collection path:',
      FINANCIAL_ACCOUNTS_COLLECTION
    );
    console.log('🔵 [createFinancialAccount] Document ID:', accountId);
    console.log(
      '🔵 [createFinancialAccount] Full document path:',
      accountRef.path
    );
    console.log(
      '🔵 [createFinancialAccount] Full Firestore path: projects/' +
        firestore.app.options.projectId +
        '/databases/(default)/documents/' +
        accountRef.path
    );
    console.log(
      '🔵 [createFinancialAccount] Connection: Firebase SDK → GCP Firestore'
    );
    console.log(
      '🔵 [createFinancialAccount] Database: (default) in project',
      firestore.app.options.projectId
    );
    console.log(
      '🔵 [createFinancialAccount] Account data to save:',
      JSON.stringify(account, null, 2)
    );

    try {
      await setDoc(accountRef, account);
      console.log('✅ [createFinancialAccount] Account saved successfully!');
      console.log('✅ [createFinancialAccount] Account ID:', accountId);
      console.log(
        '✅ [createFinancialAccount] Document path:',
        accountRef.path
      );
      console.log(
        '✅ [createFinancialAccount] Database:',
        firestore.app.options.projectId
      );
    } catch (saveError) {
      console.error(
        '🔴 [createFinancialAccount] Firestore save error:',
        saveError
      );
      console.error(
        '🔴 [createFinancialAccount] Error code:',
        saveError && typeof saveError === 'object' && 'code' in saveError
          ? saveError.code
          : 'unknown'
      );
      console.error(
        '🔴 [createFinancialAccount] Error message:',
        saveError instanceof Error ? saveError.message : String(saveError)
      );
      console.error(
        '🔴 [createFinancialAccount] Document path:',
        accountRef.path
      );
      console.error(
        '🔴 [createFinancialAccount] Database:',
        firestore.app.options.projectId
      );
      throw saveError;
    }

    return accountId;
  } catch (error) {
    console.error('🔴 [createFinancialAccount] Error occurred:', error);
    console.error(
      '🔴 [createFinancialAccount] Error name:',
      error instanceof Error ? error.name : 'Unknown'
    );
    console.error(
      '🔴 [createFinancialAccount] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      '🔴 [createFinancialAccount] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('🔴 [createFinancialAccount] Error code:', error.code);
    }
    throw error;
  }
}

/**
 * Get a financial account by ID
 */
export async function getFinancialAccount(
  accountId: string
): Promise<FinancialAccount | null> {
  console.log('🔵 [getFinancialAccount] Starting account retrieval...');
  console.log('🔵 [getFinancialAccount] Account ID:', accountId);

  try {
    const firestore: Firestore = getFirestore();
    console.log('🔵 [getFinancialAccount] Firestore instance retrieved');
    console.log(
      '🔵 [getFinancialAccount] Firestore database:',
      firestore.app.options.projectId
    );
    console.log(
      '🔵 [getFinancialAccount] Collection:',
      FINANCIAL_ACCOUNTS_COLLECTION
    );
    console.log(
      '🔵 [getFinancialAccount] Connection: Firebase SDK → GCP Firestore'
    );
    console.log(
      '🔵 [getFinancialAccount] Full database path: projects/' +
        firestore.app.options.projectId +
        '/databases/(default)'
    );

    const accountRef: DocumentReference<FinancialAccount> = doc(
      firestore,
      FINANCIAL_ACCOUNTS_COLLECTION,
      accountId
    ) as DocumentReference<FinancialAccount>;
    console.log('🔵 [getFinancialAccount] Document reference created');
    console.log('🔵 [getFinancialAccount] Document path:', accountRef.path);
    console.log(
      '🔵 [getFinancialAccount] Full Firestore path:',
      `projects/${firestore.app.options.projectId}/databases/(default)/documents/${accountRef.path}`
    );
    console.log(
      '🔵 [getFinancialAccount] Connection: Firebase SDK → GCP Firestore'
    );
    console.log(
      '🔵 [getFinancialAccount] Database: (default) in project',
      firestore.app.options.projectId
    );

    console.log('🔵 [getFinancialAccount] Fetching document from Firestore...');
    const accountSnap = await getDoc(accountRef);
    console.log('🔵 [getFinancialAccount] Document snapshot received');
    console.log(
      '🔵 [getFinancialAccount] Document exists:',
      accountSnap.exists()
    );
    console.log('🔵 [getFinancialAccount] Document ID:', accountSnap.id);
    console.log(
      '🔵 [getFinancialAccount] Document path:',
      accountSnap.ref.path
    );

    if (!accountSnap.exists()) {
      console.log('⚠️ [getFinancialAccount] Document does not exist');
      return null;
    }

    const data = accountSnap.data() as unknown as FinancialAccount;
    console.log('✅ [getFinancialAccount] Document retrieved successfully');
    console.log(
      '✅ [getFinancialAccount] Document data keys:',
      Object.keys(data)
    );
    return data;
  } catch (error) {
    console.error('🔴 [getFinancialAccount] Error occurred:', error);
    console.error(
      '🔴 [getFinancialAccount] Error name:',
      error instanceof Error ? error.name : 'Unknown'
    );
    console.error(
      '🔴 [getFinancialAccount] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('🔴 [getFinancialAccount] Error code:', error.code);
    }
    throw error;
  }
}

/**
 * Get all financial accounts for the current user
 */
/**
 * Wait for Firebase Auth to be ready (user authenticated)
 * This ensures request.auth is available for Firestore security rules
 */
function waitForAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      console.log(
        '✅ [waitForAuth] User already authenticated:',
        currentUser.uid
      );
      resolve();
      return;
    }

    console.log('⏳ [waitForAuth] Waiting for auth state...');
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          console.log('✅ [waitForAuth] Auth state ready, user:', user.uid);
          resolve();
        } else {
          console.warn('⚠️ [waitForAuth] Auth state ready but no user');
          // Still resolve - let Firestore rules handle it
          resolve();
        }
      },
      (error) => {
        unsubscribe();
        console.error('❌ [waitForAuth] Auth state error:', error);
        reject(error);
      }
    );

    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      console.warn('⚠️ [waitForAuth] Auth state timeout, proceeding anyway');
      resolve();
    }, 5000);
  });
}

export async function getUserFinancialAccounts(): Promise<FinancialAccount[]> {
  console.log('🔵 [getUserFinancialAccounts] Starting accounts retrieval...');

  try {
    // Wait for Firebase Auth to be ready before querying
    // This ensures request.auth.uid is available for Firestore security rules
    await waitForAuth();

    const auth = getAuth();
    const currentUser = auth.currentUser;
    console.log('🔵 [getUserFinancialAccounts] Firebase Auth state:', {
      isAuthenticated: !!currentUser,
      uid: currentUser?.uid ?? 'null',
    });

    const firestore: Firestore = getFirestore();
    console.log('🔵 [getUserFinancialAccounts] Firestore instance retrieved');
    console.log(
      '🔵 [getUserFinancialAccounts] Firestore database:',
      firestore.app.options.projectId
    );
    console.log(
      '🔵 [getUserFinancialAccounts] Connection: Firebase SDK → GCP Firestore'
    );
    console.log(
      '🔵 [getUserFinancialAccounts] Full database path: projects/' +
        firestore.app.options.projectId +
        '/databases/(default)'
    );

    const userId = getCurrentUserId();
    console.log('🔵 [getUserFinancialAccounts] User ID from token:', userId);
    console.log(
      '🔵 [getUserFinancialAccounts] User ID from Firebase Auth:',
      currentUser?.uid ?? 'null'
    );

    // Use Firebase Auth UID if available, otherwise fall back to token UID
    const effectiveUserId = currentUser?.uid ?? userId;
    if (currentUser && currentUser.uid !== userId) {
      console.warn('⚠️ [getUserFinancialAccounts] UID mismatch:', {
        tokenUid: userId,
        authUid: currentUser.uid,
      });
    }

    const accountsRef = collection(firestore, FINANCIAL_ACCOUNTS_COLLECTION);
    console.log('🔵 [getUserFinancialAccounts] Collection reference created');
    console.log(
      '🔵 [getUserFinancialAccounts] Collection path:',
      accountsRef.path
    );
    console.log(
      '🔵 [getUserFinancialAccounts] Full Firestore path: projects/' +
        firestore.app.options.projectId +
        '/databases/(default)/documents/' +
        accountsRef.path
    );

    const q = query(accountsRef, where('userId', '==', effectiveUserId));
    console.log(
      '🔵 [getUserFinancialAccounts] Query created: userId ==',
      effectiveUserId
    );
    console.log('🔵 [getUserFinancialAccounts] Query details:', {
      collection: FINANCIAL_ACCOUNTS_COLLECTION,
      filter: `userId == ${effectiveUserId}`,
      projectId: firestore.app.options.projectId,
      database: '(default)', // Firestore database ID (default database)
      fullPath: `projects/${firestore.app.options.projectId}/databases/(default)/documents/${accountsRef.path}`,
      firebaseAuthUid: currentUser?.uid ?? 'null',
      tokenUid: userId,
    });
    console.log('🔵 [getUserFinancialAccounts] Executing query...');

    const querySnapshot: QuerySnapshot<FinancialAccount> = (await getDocs(
      q
    )) as QuerySnapshot<FinancialAccount>;

    console.log('🔵 [getUserFinancialAccounts] Query snapshot received');
    console.log(
      '🔵 [getUserFinancialAccounts] Documents found:',
      querySnapshot.size
    );
    console.log('🔵 [getUserFinancialAccounts] Empty:', querySnapshot.empty);
    console.log(
      '🔵 [getUserFinancialAccounts] Database:',
      firestore.app.options.projectId
    );
    console.log('🔵 [getUserFinancialAccounts] Query metadata:', {
      fromCache: querySnapshot.metadata.fromCache,
      hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
      isFromCache: querySnapshot.metadata.fromCache,
    });

    const accounts = querySnapshot.docs.map(
      (docSnapshot: { data: () => unknown }) => {
        const data = docSnapshot.data();
        return data as FinancialAccount;
      }
    );

    console.log(
      '✅ [getUserFinancialAccounts] Accounts retrieved:',
      accounts.length
    );
    console.log(
      '✅ [getUserFinancialAccounts] Account IDs:',
      accounts.map((a) => a.accountNumber)
    );

    return accounts;
  } catch (error) {
    console.error('🔴 [getUserFinancialAccounts] Error occurred:', error);
    console.error(
      '🔴 [getUserFinancialAccounts] Error name:',
      error instanceof Error ? error.name : 'Unknown'
    );
    console.error(
      '🔴 [getUserFinancialAccounts] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('🔴 [getUserFinancialAccounts] Error code:', error.code);
    }
    throw error;
  }
}

/**
 * Update a financial account
 */
export async function updateFinancialAccount(
  accountId: string,
  updates: UpdateFinancialAccountInput
): Promise<void> {
  const firestore: Firestore = getFirestore();
  const accountRef: DocumentReference<FinancialAccount> = doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountId
  ) as DocumentReference<FinancialAccount>;

  // Ensure updatedAt is set
  const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
  const updateData: UpdateFinancialAccountInput = {
    ...updates,
    updatedAt,
  };

  // Convert dates to Timestamps if needed
  if (updateData.nextDueDate instanceof Date) {
    updateData.nextDueDate = Timestamp.fromDate(
      updateData.nextDueDate
    ) as unknown as typeof updateData.nextDueDate;
  }
  if (updateData.startDate instanceof Date) {
    updateData.startDate = Timestamp.fromDate(
      updateData.startDate
    ) as unknown as typeof updateData.startDate;
  }
  if (updateData.endDate instanceof Date) {
    updateData.endDate = Timestamp.fromDate(
      updateData.endDate
    ) as unknown as typeof updateData.endDate;
  }

  await updateDoc(accountRef, updateData);
}

/**
 * Delete a financial account
 */
export async function deleteFinancialAccount(accountId: string): Promise<void> {
  const firestore: Firestore = getFirestore();
  const accountRef: DocumentReference<FinancialAccount> = doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountId
  ) as DocumentReference<FinancialAccount>;
  await updateDoc(accountRef, { status: 'closed' as const });
  // Or use deleteDoc if you want to permanently delete:
  // await deleteDoc(accountRef);
}

/**
 * Log a payment for a financial account
 * This will:
 * 1. Find the appropriate payment period(s) to apply the payment to
 * 2. Log the payment to the period(s) and validate amounts
 * 3. Add the payment to the account payment log
 * 4. Update the total amount remaining (subtract capital portion)
 * 5. Update the next due date (add one month)
 * 6. Recalculate account status if needed
 */
export async function logPayment(
  accountId: string,
  paymentData: {
    valuePaid: number;
    currency: string;
    datePaid: Date;
    notes?: string;
  }
): Promise<void> {
  const firestore: Firestore = getFirestore();
  const accountRef: DocumentReference<FinancialAccount> = doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountId
  ) as DocumentReference<FinancialAccount>;

  // Get current account data
  const accountSnap = await getDoc(accountRef);
  if (!accountSnap.exists()) {
    throw new Error('Account not found');
  }

  const account = accountSnap.data() as unknown as FinancialAccount;

  // Import calculation utilities
  const { calculatePaymentBreakdown, createPaymentLogEntry } =
    await import('@rates/firebase-client');

  // Try to find and update payment periods
  let totalCapitalPaid = 0;
  let remainingPayment = paymentData.valuePaid;

  try {
    const { getUnpaidPaymentPeriods, logPaymentToPeriod } =
      await import('./paymentPeriods');

    // Get unpaid periods ordered by due date (oldest first)
    const unpaidPeriods = await getUnpaidPaymentPeriods(accountId, 365); // Get all unpaid periods

    // Apply payment to periods in order (oldest first)
    for (const period of unpaidPeriods) {
      if (remainingPayment <= 0) break;

      const periodAmountDue = period.amount - period.amountPaid;
      const paymentForThisPeriod = Math.min(remainingPayment, periodAmountDue);

      if (paymentForThisPeriod > 0) {
        // Log payment to this period
        await logPaymentToPeriod(accountId, period.periodNumber, {
          datePaid: paymentData.datePaid,
          amount: paymentForThisPeriod,
          currency: paymentData.currency,
          notes: paymentData.notes,
        });

        // Track capital paid (use period's capital breakdown)
        totalCapitalPaid +=
          period.capital * (paymentForThisPeriod / period.amount);
        remainingPayment -= paymentForThisPeriod;
      }
    }

    // If there's remaining payment after all periods are paid, calculate capital from remaining
    if (remainingPayment > 0) {
      const breakdown = calculatePaymentBreakdown(
        account.totalAmountRemaining.amount,
        account.rate,
        remainingPayment,
        paymentData.currency
      );
      totalCapitalPaid += breakdown.capital;
    }
  } catch (error) {
    // If payment periods don't exist yet, fall back to simple calculation
    console.warn('Payment periods not found, using simple calculation:', error);
    const breakdown = calculatePaymentBreakdown(
      account.totalAmountRemaining.amount,
      account.rate,
      paymentData.valuePaid,
      paymentData.currency
    );
    totalCapitalPaid = breakdown.capital;
  }

  // Create payment log entry
  const paymentEntry = createPaymentLogEntry(
    paymentData.valuePaid,
    paymentData.currency,
    paymentData.datePaid,
    paymentData.notes
  );

  // Convert date to Timestamp if needed
  if (paymentEntry.datePaid instanceof Date) {
    paymentEntry.datePaid = Timestamp.fromDate(
      paymentEntry.datePaid
    ) as unknown as typeof paymentEntry.datePaid;
  }
  if (paymentEntry.createdAt instanceof Date) {
    paymentEntry.createdAt = Timestamp.fromDate(
      paymentEntry.createdAt
    ) as unknown as typeof paymentEntry.createdAt;
  }

  // Calculate new remaining amount
  const newRemainingAmount = Math.max(
    0,
    account.totalAmountRemaining.amount - totalCapitalPaid
  );

  // Calculate next due date (add one month)
  const currentDueDate =
    account.nextDueDate instanceof Date
      ? account.nextDueDate
      : account.nextDueDate.toDate();
  const nextDueDate = new Date(currentDueDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);

  // Update account
  const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
  const updateData: UpdateFinancialAccountInput = {
    paymentLog: [...account.paymentLog, paymentEntry],
    totalAmountRemaining: {
      amount: newRemainingAmount,
      currency: account.totalAmountRemaining.currency,
    },
    nextDueDate: Timestamp.fromDate(
      nextDueDate
    ) as unknown as typeof account.nextDueDate,
    updatedAt,
  };

  // Update status if account is paid off
  if (newRemainingAmount <= 0 && account.status === 'active') {
    updateData.status = 'paid_off';
  }

  await updateDoc(accountRef, updateData);
}
