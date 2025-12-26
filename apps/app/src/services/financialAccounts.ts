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
import { getFirestore } from '@rates/firebase-client';
import { getAuthToken } from '../utils/auth';
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
      '🔵 [createFinancialAccount] Account data to save:',
      JSON.stringify(account, null, 2)
    );
    await setDoc(accountRef, account);
    console.log('✅ [createFinancialAccount] Account saved successfully!');
    console.log('✅ [createFinancialAccount] Account ID:', accountId);

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
  const firestore: Firestore = getFirestore();
  const accountRef: DocumentReference<FinancialAccount> = doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountId
  ) as DocumentReference<FinancialAccount>;
  const accountSnap = await getDoc(accountRef);

  if (!accountSnap.exists()) {
    return null;
  }

  return accountSnap.data() as unknown as FinancialAccount;
}

/**
 * Get all financial accounts for the current user
 */
export async function getUserFinancialAccounts(): Promise<FinancialAccount[]> {
  const firestore: Firestore = getFirestore();
  const userId = getCurrentUserId();
  const accountsRef = collection(firestore, FINANCIAL_ACCOUNTS_COLLECTION);
  const q = query(accountsRef, where('userId', '==', userId));
  const querySnapshot: QuerySnapshot<FinancialAccount> = (await getDocs(
    q
  )) as QuerySnapshot<FinancialAccount>;

  return querySnapshot.docs.map((docSnapshot: { data: () => unknown }) => {
    const data = docSnapshot.data();
    return data as FinancialAccount;
  });
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
