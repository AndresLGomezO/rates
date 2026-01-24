/**
 * Example usage of Financial Accounts schema
 *
 * This file demonstrates how to use the financial accounts types and utilities
 * with Firestore.
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
} from 'firebase/firestore';
import { getFirestore } from './services';
import type {
  FinancialAccount,
  CreateFinancialAccountInput,
  UpdateFinancialAccountInput,
  AddPaymentLogInput,
  PaymentLogEntry,
} from './financial-accounts';
import {
  getAccountWithCalculated,
  createPaymentLogEntry,
  validateFinancialAccount,
} from './financial-accounts-utils';

// Collection name constant
export const FINANCIAL_ACCOUNTS_COLLECTION = 'financialAccounts';

/**
 * Create a new financial account
 */
export async function createFinancialAccount(
  userId: string,
  accountData: CreateFinancialAccountInput
): Promise<string> {
  const firestore = getFirestore();

  // Validate the account data
  const errors = validateFinancialAccount(accountData);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Create the account document
  const account: FinancialAccount = {
    ...accountData,
    userId,
    paymentLog: accountData.paymentLog ?? [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Convert dates to Timestamps if needed
  if (account.nextDueDate instanceof Date) {
    account.nextDueDate = Timestamp.fromDate(account.nextDueDate);
  }
  if (account.startDate instanceof Date) {
    account.startDate = Timestamp.fromDate(account.startDate);
  }
  if (account.endDate instanceof Date) {
    account.endDate = Timestamp.fromDate(account.endDate);
  }

  // Convert payment log dates
  account.paymentLog = account.paymentLog.map((entry) => ({
    ...entry,
    datePaid:
      entry.datePaid instanceof Date
        ? Timestamp.fromDate(entry.datePaid)
        : entry.datePaid,
    createdAt:
      entry.createdAt instanceof Date
        ? Timestamp.fromDate(entry.createdAt)
        : entry.createdAt,
  }));

  // Use accountNumber as document ID (or generate one)
  const accountId = account.accountNumber;
  const accountRef = doc(firestore, FINANCIAL_ACCOUNTS_COLLECTION, accountId);

  await setDoc(accountRef, account);

  return accountId;
}

/**
 * Get a financial account by ID
 */
export async function getFinancialAccount(
  accountId: string
): Promise<FinancialAccount | null> {
  const firestore = getFirestore();
  const accountRef = doc(firestore, FINANCIAL_ACCOUNTS_COLLECTION, accountId);
  const accountSnap = await getDoc(accountRef);

  if (!accountSnap.exists()) {
    return null;
  }

  return accountSnap.data() as FinancialAccount;
}

/**
 * Get a financial account with calculated fields
 */
export async function getFinancialAccountWithCalculated(accountId: string) {
  const account = await getFinancialAccount(accountId);
  if (!account) {
    return null;
  }

  return getAccountWithCalculated(account);
}

/**
 * Update a financial account
 */
export async function updateFinancialAccount(
  accountId: string,
  updates: UpdateFinancialAccountInput
): Promise<void> {
  const firestore = getFirestore();
  const accountRef = doc(firestore, FINANCIAL_ACCOUNTS_COLLECTION, accountId);

  // Ensure updatedAt is set
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  // Convert dates to Timestamps if needed
  if (updateData.nextDueDate instanceof Date) {
    updateData.nextDueDate = Timestamp.fromDate(updateData.nextDueDate);
  }
  if (updateData.startDate instanceof Date) {
    updateData.startDate = Timestamp.fromDate(updateData.startDate);
  }
  if (updateData.endDate instanceof Date) {
    updateData.endDate = Timestamp.fromDate(updateData.endDate);
  }

  await updateDoc(accountRef, updateData);
}

/**
 * Add a payment log entry to an account
 */
export async function addPaymentLogEntry(
  accountId: string,
  payment: AddPaymentLogInput
): Promise<void> {
  const account = await getFinancialAccount(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const newEntry = createPaymentLogEntry(
    payment.valuePaid,
    payment.currency,
    payment.datePaid instanceof Date
      ? payment.datePaid
      : payment.datePaid.toDate(),
    payment.notes
  );

  // Convert to Timestamp
  const entryWithTimestamp: PaymentLogEntry = {
    ...newEntry,
    datePaid:
      newEntry.datePaid instanceof Date
        ? Timestamp.fromDate(newEntry.datePaid)
        : newEntry.datePaid,
    createdAt: Timestamp.fromDate(newEntry.createdAt as Date),
  };

  // Update the account with the new payment log entry
  const updatedPaymentLog = [...account.paymentLog, entryWithTimestamp];

  // Also update the total amount remaining
  const updatedTotalAmount = {
    ...account.totalAmountRemaining,
    amount: Math.max(
      0,
      account.totalAmountRemaining.amount - payment.valuePaid
    ),
  };

  await updateFinancialAccount(accountId, {
    paymentLog: updatedPaymentLog,
    totalAmountRemaining: updatedTotalAmount,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get all financial accounts for a user
 */
export async function getUserFinancialAccounts(
  userId: string
): Promise<FinancialAccount[]> {
  const firestore = getFirestore();
  const accountsRef = collection(firestore, FINANCIAL_ACCOUNTS_COLLECTION);
  const q = query(accountsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as FinancialAccount);
}

/**
 * Get all financial accounts for a user with calculated fields
 */
export async function getUserFinancialAccountsWithCalculated(userId: string) {
  const accounts = await getUserFinancialAccounts(userId);
  return accounts.map(getAccountWithCalculated);
}

/**
 * Example: Create a sample loan account
 */
export async function createSampleLoanAccount(userId: string) {
  const sampleAccount: CreateFinancialAccountInput = {
    accountNumber: 'LOAN-001',
    accountName: 'Personal Loan - Bank ABC',
    accountDescription: 'Personal loan for home improvement',
    accountType: 'personal_loan',
    status: 'active',
    totalAmountRemaining: {
      amount: 5000000, // 5M COP
      currency: 'COP',
    },
    monthlyPayment: {
      amount: 500000, // 500K COP
      currency: 'COP',
    },
    rate: 12.5, // 12.5% annual
    nextDueDate: new Date('2024-02-15'),
    originalAmount: {
      amount: 10000000, // 10M COP
      currency: 'COP',
    },
    additionalAmounts: [
      {
        amount: 1250, // USD equivalent
        currency: 'USD',
      },
    ],
    userId,
  };

  return await createFinancialAccount(userId, sampleAccount);
}
