/**
 * Payment Periods Firestore Service
 *
 * Service functions for managing payment periods (amortization plan)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  type Firestore,
  type DocumentReference,
  type QuerySnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  getAuth,
  isBill,
  isInstallmentLoan,
  isRevolvingCredit,
} from '@rates/firebase-client';
import type {
  PaymentPeriod,
  CreatePaymentPeriodInput,
  UpdatePaymentPeriodInput,
  LogPaymentToPeriodInput,
  PaymentPeriodStatus,
  FinancialAccount,
  InstallmentLoanAccount,
} from '@rates/firebase-client';

// Collection name constant
import { FINANCIAL_ACCOUNTS_COLLECTION } from './financialAccounts';
export const PAYMENT_PERIODS_SUBCOLLECTION = 'paymentPeriods';

/**
 * Helpher to get payment amount details (amount and currency)
 */
export function getAccountPaymentDetails(account: FinancialAccount): {
  amount: number;
  currency: string;
} {
  const defaultPayment = { amount: 0, currency: 'USD' };

  if (isInstallmentLoan(account)) {
    // scheduledPayment might be optional in the type definition?
    return account.scheduledPayment ?? defaultPayment;
  }
  if (isRevolvingCredit(account)) {
    return account.currentMinimumPayment ?? defaultPayment;
  }
  if (isBill(account)) {
    return account.recurringAmount ?? defaultPayment;
  }

  // Checking additional properties for compatibility
  if ('paymentAmount' in account) {
    // Legacy support
    return (account as { paymentAmount: { amount: number; currency: string } })
      .paymentAmount;
  }

  return defaultPayment;
}

/**
 * Helper to get currency safely
 */
function getAccountCurrency(account: FinancialAccount): string {
  if (isInstallmentLoan(account))
    return account.currentPrincipal?.currency ?? 'USD';
  if (isRevolvingCredit(account)) return account.currentBalance.currency;
  if (isBill(account)) return account.currency;
  return account.currency;
}

/**
 * Get the payment periods subcollection reference for an account
 */
function getPaymentPeriodsCollection(
  firestore: Firestore,
  accountNumber: string
) {
  return collection(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountNumber,
    PAYMENT_PERIODS_SUBCOLLECTION
  );
}

/**
 * Get a payment period document reference
 */
function getPaymentPeriodRef(
  firestore: Firestore,
  accountNumber: string,
  periodNumber: number
): DocumentReference<PaymentPeriod> {
  return doc(
    firestore,
    FINANCIAL_ACCOUNTS_COLLECTION,
    accountNumber,
    PAYMENT_PERIODS_SUBCOLLECTION,
    periodNumber.toString()
  ) as DocumentReference<PaymentPeriod>;
}

/**
 * Create a payment period
 */
export async function createPaymentPeriod(
  periodData: CreatePaymentPeriodInput
): Promise<void> {
  console.log('🟡 [createPaymentPeriod] Starting payment period creation...');
  console.log(
    '🟡 [createPaymentPeriod] Account Number:',
    periodData.accountNumber
  );
  console.log(
    '🟡 [createPaymentPeriod] Period Number:',
    periodData.periodNumber
  );

  // Wait for Firebase Auth to be ready
  const auth = getAuth();
  let currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn(
      '⚠️ [createPaymentPeriod] No authenticated user, waiting for auth state...'
    );
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (_user) => {
        unsubscribe();
        resolve();
      });
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 5000);
    });
    // Re-check auth state after waiting
    currentUser = auth.currentUser;
  }
  console.log('🟡 [createPaymentPeriod] Firebase Auth state:', {
    isAuthenticated: !!currentUser,
    uid: currentUser?.uid ?? 'null',
  });

  const firestore: Firestore = getFirestore();
  console.log('🟡 [createPaymentPeriod] Firestore instance retrieved');
  console.log(
    '🟡 [createPaymentPeriod] Project ID:',
    firestore.app.options.projectId
  );

  // Verify the account exists and belongs to the user
  const { getFinancialAccount } = await import('./financialAccounts');
  const account = await getFinancialAccount(periodData.accountNumber);
  if (!account) {
    throw new Error(`Account ${periodData.accountNumber} not found`);
  }
  console.log('🟡 [createPaymentPeriod] Account found:', {
    accountNumber: account.accountNumber,
    userId: account.userId,
    authUid: currentUser?.uid ?? 'null',
    userIdMatches: account.userId === currentUser?.uid,
  });

  if (currentUser && account.userId !== currentUser.uid) {
    throw new Error(
      `Account ${periodData.accountNumber} does not belong to current user`
    );
  }

  const periodRef = getPaymentPeriodRef(
    firestore,
    periodData.accountNumber,
    periodData.periodNumber
  );
  console.log('🟡 [createPaymentPeriod] Period reference created');
  console.log('🟡 [createPaymentPeriod] Full path:', periodRef.path);
  console.log(
    '🟡 [createPaymentPeriod] Full Firestore path: projects/' +
      firestore.app.options.projectId +
      '/databases/(default)/documents/' +
      periodRef.path
  );

  const createdAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
  const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();

  const period: PaymentPeriod = {
    ...periodData,
    amountPaid: 0,
    status: 'pending',
    paymentLog: periodData.paymentLog ?? [],
    createdAt,
    updatedAt,
  };

  // Convert dates to Timestamps if needed
  if (period.dueDate instanceof Date) {
    period.dueDate = Timestamp.fromDate(
      period.dueDate
    ) as unknown as typeof period.dueDate;
  }
  if (period.createdAt instanceof Date) {
    period.createdAt = Timestamp.fromDate(
      period.createdAt
    ) as unknown as typeof period.createdAt;
  }
  if (period.updatedAt instanceof Date) {
    period.updatedAt = Timestamp.fromDate(
      period.updatedAt
    ) as unknown as typeof period.updatedAt;
  }

  // Convert payment log dates
  period.paymentLog = period.paymentLog.map((payment) => ({
    ...payment,
    datePaid:
      payment.datePaid instanceof Date
        ? (Timestamp.fromDate(
            payment.datePaid
          ) as unknown as typeof payment.datePaid)
        : payment.datePaid,
    createdAt:
      payment.createdAt instanceof Date
        ? (Timestamp.fromDate(
            payment.createdAt
          ) as unknown as typeof payment.createdAt)
        : payment.createdAt,
  }));

  // Remove undefined fields (Firestore doesn't allow undefined values)
  // Build the period object, only including remainingPrincipal if it's defined
  const periodToSave = {
    accountNumber: period.accountNumber ?? '',
    periodNumber: period.periodNumber,
    dueDate: period.dueDate,
    amount: period.amount,
    currency: period.currency,
    amountPaid: period.amountPaid,
    status: period.status,
    capital: period.capital,
    interest: period.interest,
    paymentLog: period.paymentLog,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
    ...(period.remainingPrincipal !== undefined && {
      remainingPrincipal: period.remainingPrincipal,
    }),
  };

  console.log('🟡 [createPaymentPeriod] Saving period to Firestore...');
  console.log(
    '🟡 [createPaymentPeriod] Period data keys:',
    Object.keys(periodToSave)
  );

  try {
    await setDoc(periodRef, periodToSave as PaymentPeriod);
    console.log('✅ [createPaymentPeriod] Period saved successfully!');
    console.log('✅ [createPaymentPeriod] Path:', periodRef.path);
  } catch (error) {
    console.error('🔴 [createPaymentPeriod] Firestore save error:', error);
    console.error(
      '🔴 [createPaymentPeriod] Error code:',
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string | number | boolean }).code)
        : 'unknown'
    );
    console.error(
      '🔴 [createPaymentPeriod] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    console.error('🔴 [createPaymentPeriod] Path:', periodRef.path);
    console.error(
      '🔴 [createPaymentPeriod] Auth UID:',
      currentUser?.uid ?? 'null'
    );
    console.error('🔴 [createPaymentPeriod] Account userId:', account.userId);
    throw error;
  }
}

/**
 * Get a payment period by account number and period number
 */
export async function getPaymentPeriod(
  accountNumber: string,
  periodNumber: number
): Promise<PaymentPeriod | null> {
  const firestore: Firestore = getFirestore();
  const periodRef = getPaymentPeriodRef(firestore, accountNumber, periodNumber);
  const periodSnap = await getDoc(periodRef);

  if (!periodSnap.exists()) {
    return null;
  }

  return periodSnap.data() as unknown as PaymentPeriod;
}

/**
 * Get all payment periods for an account
 */
export async function getPaymentPeriods(
  accountNumber: string
): Promise<PaymentPeriod[]> {
  const firestore: Firestore = getFirestore();
  const periodsRef = getPaymentPeriodsCollection(firestore, accountNumber);
  const q = query(periodsRef, orderBy('periodNumber', 'asc'));
  const querySnapshot: QuerySnapshot<PaymentPeriod> = (await getDocs(
    q
  )) as QuerySnapshot<PaymentPeriod>;

  return querySnapshot.docs.map((docSnapshot: { data: () => unknown }) => {
    const data = docSnapshot.data();
    return data as PaymentPeriod;
  });
}

/**
 * Get unpaid payment periods for an account within a date range
 */
export async function getUnpaidPaymentPeriods(
  accountNumber: string,
  daysAhead: number = 15
): Promise<PaymentPeriod[]> {
  const firestore: Firestore = getFirestore();
  const periodsRef = getPaymentPeriodsCollection(firestore, accountNumber);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + daysAhead);
  maxDate.setHours(23, 59, 59, 999);

  // Get all periods and filter client-side for better flexibility
  // Note: For large datasets, consider using composite indexes
  const q = query(periodsRef, orderBy('dueDate', 'asc'));
  const querySnapshot: QuerySnapshot<PaymentPeriod> = (await getDocs(
    q
  )) as QuerySnapshot<PaymentPeriod>;

  const allPeriods = querySnapshot.docs.map(
    (docSnapshot: { data: () => unknown }) => {
      const data = docSnapshot.data();
      return data as PaymentPeriod;
    }
  );

  // Filter by status and date client-side
  return allPeriods.filter((period) => {
    const isUnpaid = ['pending', 'partial', 'overdue'].includes(period.status);
    if (!isUnpaid) return false;

    const dueDate =
      period.dueDate instanceof Date ? period.dueDate : period.dueDate.toDate();
    return dueDate <= maxDate;
  });
}

/**
 * Update a payment period
 */
export async function updatePaymentPeriod(
  accountNumber: string,
  periodNumber: number,
  updates: UpdatePaymentPeriodInput
): Promise<void> {
  const firestore: Firestore = getFirestore();
  const periodRef = getPaymentPeriodRef(firestore, accountNumber, periodNumber);

  const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
  const updateData: UpdatePaymentPeriodInput = {
    ...updates,
    updatedAt,
  };

  // Convert dates to Timestamps if needed
  if (updateData.dueDate instanceof Date) {
    updateData.dueDate = Timestamp.fromDate(
      updateData.dueDate
    ) as unknown as typeof updateData.dueDate;
  }
  if (updateData.updatedAt instanceof Date) {
    updateData.updatedAt = Timestamp.fromDate(
      updateData.updatedAt
    ) as unknown as typeof updateData.updatedAt;
  }

  await updateDoc(periodRef, updateData);
}

/**
 * Calculate period status based on amount paid
 *
 * @param amount - Total amount due
 * @param amountPaid - Amount paid
 * @param isBill - Whether this is a bill (bills are estimated, so any payment > 0 means paid)
 */
function calculatePeriodStatus(
  amount: number,
  amountPaid: number,
  isBill: boolean = false,
  hasPaymentLog: boolean = false
): PaymentPeriodStatus {
  if (isBill) {
    // For bills: any payment log entry (even with 0 value) means paid (estimated amounts)
    // This allows logging 0-value payments to mark bills as paid (e.g., when bill is 0 due to credit)
    if (hasPaymentLog) {
      return 'paid';
    }
    return 'pending';
  }

  // For loans: use standard logic
  if (amountPaid >= amount) {
    return 'paid';
  }
  if (amountPaid > 0) {
    return 'partial';
  }
  return 'pending';
}

/**
 * Log a payment to a specific period
 * Validates that the payment amount is sufficient to mark the period as paid
 *
 * @param accountNumber - Account number
 * @param periodNumber - Period number
 * @param paymentData - Payment data
 * @returns Updated payment period
 */
export async function logPaymentToPeriod(
  accountNumber: string,
  periodNumber: number,
  paymentData: LogPaymentToPeriodInput
): Promise<PaymentPeriod> {
  const firestore: Firestore = getFirestore();
  const periodRef = getPaymentPeriodRef(firestore, accountNumber, periodNumber);

  // Get current period
  const periodSnap = await getDoc(periodRef);
  if (!periodSnap.exists()) {
    throw new Error(
      `Payment period ${periodNumber} not found for account ${accountNumber}`
    );
  }

  const period = periodSnap.data() as unknown as PaymentPeriod;

  // Get account to check if it's a bill
  const { getFinancialAccount } = await import('./financialAccounts');
  const account = await getFinancialAccount(accountNumber);
  const isBill = account?.accountType === 'bill';

  // Create payment log entry
  // Only include notes if it has a value (Firestore doesn't allow empty strings for optional fields)
  const paymentEntry = {
    datePaid: Timestamp.fromDate(paymentData.datePaid) as unknown as Date,
    amount: paymentData.amount,
    currency: paymentData.currency,
    createdAt: Timestamp.now() as unknown as Date,
    ...(paymentData.notes?.trim() && { notes: paymentData.notes.trim() }),
  };

  // Update amount paid
  const newAmountPaid = period.amountPaid + paymentData.amount;

  // Calculate new status
  // For bills: any payment log entry (even with 0 value) means paid
  // For loans: standard logic based on amount paid vs amount due
  // After adding this payment, there will be at least one log entry
  const hasPaymentLogAfter = true; // We're adding a payment log entry
  const newStatus = calculatePeriodStatus(
    period.amount,
    newAmountPaid,
    isBill,
    hasPaymentLogAfter
  );

  // Update period
  const updatedAt: ReturnType<typeof Timestamp.now> = Timestamp.now();
  await updateDoc(periodRef, {
    amountPaid: newAmountPaid,
    status: newStatus,
    paymentLog: [...period.paymentLog, paymentEntry],
    updatedAt,
  });

  // Return updated period
  const updatedSnap = await getDoc(periodRef);
  return updatedSnap.data() as unknown as PaymentPeriod;
}

/**
 * Delete all payment periods for an account
 */
export async function deleteAllPaymentPeriods(
  accountNumber: string
): Promise<void> {
  const firestore: Firestore = getFirestore();
  const periodsRef = getPaymentPeriodsCollection(firestore, accountNumber);
  const q = query(periodsRef);
  const querySnapshot = await getDocs(q);

  // Delete all periods
  const deletePromises = querySnapshot.docs.map((docSnapshot) =>
    deleteDoc(docSnapshot.ref)
  );
  await Promise.all(deletePromises);
}

/**
 * Generate and create all payment periods for an account (amortization plan)
 *
 * For periodic bills, generates periods from start_date to current date.
 * For loans and fixed-period bills, generates the specified number of periods.
 *
 * @param accountNumber - Account number
 * @param regenerate - If true, delete existing periods before generating new ones
 * @param endDate - Optional end date for periodic bills (defaults to current date)
 */
export async function generateAmortizationPlanForAccount(
  accountNumber: string,
  regenerate: boolean = false,
  endDate?: Date
): Promise<void> {
  const { getFinancialAccount } = await import('./financialAccounts');
  const { generateAmortizationPlan } = await import('@rates/firebase-client');

  // Get account
  const account = await getFinancialAccount(accountNumber);
  if (!account) {
    throw new Error(`Account ${accountNumber} not found`);
  }

  // Check if this is a periodic bill
  // Safe access for metadata and check for type
  const isPeriodic =
    isBill(account) &&
    (account.metadata?.isPeriodic === true ||
      // BillAccount doesn't have numberOfPayments, so we treat it as potentially periodic if explicitly set
      // Or if it lacks a fixed term (which bills usually do)
      true); // Bills are usually periodic

  // For periodic bills, check existing periods and only generate new ones
  if (isPeriodic && !regenerate) {
    const existingPeriods = await getPaymentPeriods(accountNumber);
    if (existingPeriods.length > 0) {
      // Find the highest period number
      const maxPeriodNumber = Math.max(
        ...existingPeriods.map((p) => p.periodNumber)
      );

      // Get the due date of the last period
      const lastPeriod = existingPeriods.find(
        (p) => p.periodNumber === maxPeriodNumber
      );
      if (lastPeriod) {
        const lastDueDate =
          lastPeriod.dueDate instanceof Date
            ? lastPeriod.dueDate
            : lastPeriod.dueDate.toDate();

        // Get payment interval
        const paymentIntervalMonths =
          (account.metadata?.paymentIntervalMonths as number) ?? 1;

        // Calculate how many new periods we need to generate
        const today = endDate ?? new Date();
        const monthsDiff =
          (today.getFullYear() - lastDueDate.getFullYear()) * 12 +
          (today.getMonth() - lastDueDate.getMonth());

        // If we need more periods, generate them
        if (monthsDiff >= paymentIntervalMonths) {
          const periodsToGenerate = Math.floor(
            monthsDiff / paymentIntervalMonths
          );

          // Generate only the new periods
          for (let i = 1; i <= periodsToGenerate; i++) {
            const periodNumber = maxPeriodNumber + i;
            const dueDate = new Date(lastDueDate);
            dueDate.setMonth(dueDate.getMonth() + i * paymentIntervalMonths);

            const paymentData = getAccountPaymentDetails(account);
            const paymentAmount = paymentData.amount;
            const currency = paymentData.currency;

            // For periodic bills, payment is fixed (no principal reduction)
            const period: CreatePaymentPeriodInput = {
              accountNumber: account.accountNumber ?? '',
              periodNumber,
              dueDate: Timestamp.fromDate(dueDate) as unknown as Date,
              amount: paymentAmount,
              currency,
              capital: paymentAmount,
              interest: 0,
              // Don't set remainingPrincipal for bills
            };

            await createPaymentPeriod(period);
          }
          return; // Done generating new periods
        } else {
          // No new periods needed
          return;
        }
      }
    }
  }

  // Delete existing periods if regenerating
  if (regenerate) {
    await deleteAllPaymentPeriods(accountNumber);
  }

  // Generate periods
  const periods = generateAmortizationPlan(
    account as unknown as InstallmentLoanAccount,
    1
  );

  // Create all periods
  for (const periodData of periods) {
    await createPaymentPeriod(periodData);
  }
}

/**
 * Extend payment periods for a periodic bill up to the current date
 *
 * This function checks if a periodic bill needs more periods and generates them.
 * Useful for keeping periodic bills up-to-date without regenerating all periods.
 *
 * @param accountNumber - Account number
 * @returns Number of new periods created
 */
export async function extendPeriodicBillPeriods(
  accountNumber: string
): Promise<number> {
  const { getFinancialAccount } = await import('./financialAccounts');

  // Get account
  const account = await getFinancialAccount(accountNumber);
  if (!account) {
    throw new Error(`Account ${accountNumber} not found`);
  }

  // Check if this is a periodic bill
  const isPeriodic =
    isBill(account) &&
    (account.metadata?.isPeriodic === true ||
      // Assume bills are periodic if not processing a fixed loan
      true);

  if (!isPeriodic) {
    throw new Error(
      `Account ${accountNumber} is not a periodic bill. Use generateAmortizationPlanForAccount instead.`
    );
  }

  // Get existing periods
  const existingPeriods = await getPaymentPeriods(accountNumber);
  if (existingPeriods.length === 0) {
    // No periods exist, generate from start
    await generateAmortizationPlanForAccount(accountNumber, false);
    const newPeriods = await getPaymentPeriods(accountNumber);
    return newPeriods.length;
  }

  // Find the highest period number and its due date
  const maxPeriodNumber = Math.max(
    ...existingPeriods.map((p) => p.periodNumber)
  );
  const lastPeriod = existingPeriods.find(
    (p) => p.periodNumber === maxPeriodNumber
  );

  if (!lastPeriod) {
    return 0;
  }

  const lastDueDate =
    lastPeriod.dueDate instanceof Date
      ? lastPeriod.dueDate
      : lastPeriod.dueDate.toDate();

  // Get payment interval
  const paymentIntervalMonths =
    (account.metadata?.paymentIntervalMonths as number) ?? 1;

  // Calculate how many new periods we need
  const today = new Date();
  const monthsDiff =
    (today.getFullYear() - lastDueDate.getFullYear()) * 12 +
    (today.getMonth() - lastDueDate.getMonth());

  if (monthsDiff < paymentIntervalMonths) {
    // No new periods needed yet
    return 0;
  }

  const periodsToGenerate = Math.floor(monthsDiff / paymentIntervalMonths);
  const paymentData = getAccountPaymentDetails(account);
  const paymentAmount = paymentData.amount;
  const currency = paymentData.currency;

  // Generate only the new periods
  for (let i = 1; i <= periodsToGenerate; i++) {
    const periodNumber = maxPeriodNumber + i;
    const dueDate = new Date(lastDueDate);
    dueDate.setMonth(dueDate.getMonth() + i * paymentIntervalMonths);

    // For periodic bills, payment is fixed (no principal reduction)
    const period: CreatePaymentPeriodInput = {
      accountNumber: account.accountNumber ?? '',
      periodNumber,
      dueDate: Timestamp.fromDate(dueDate) as unknown as Date,
      amount: paymentAmount ?? 0,
      currency: currency ?? 'COP',
      capital: paymentAmount ?? 0,
      interest: 0,
      // Don't set remainingPrincipal for bills
    };

    await createPaymentPeriod(period);
  }

  return periodsToGenerate;
}

/**
 * Batch log payments for a range of periods
 *
 * Logs payments for all periods from startPeriod to endPeriod (inclusive).
 * Uses each period's amount and due date for the payment.
 *
 * @param accountNumber - Account number
 * @param startPeriod - Starting period number (inclusive)
 * @param endPeriod - Ending period number (inclusive)
 * @param paymentDate - Optional payment date (defaults to each period's due date)
 * @param notes - Optional notes to add to each payment
 * @returns Array of results for each period payment
 */
export async function batchLogPaymentsToPeriods(
  accountNumber: string,
  startPeriod: number,
  endPeriod: number,
  paymentDate?: Date,
  notes?: string
): Promise<Array<{ periodNumber: number; success: boolean; error?: string }>> {
  // Get all periods for the account
  const allPeriods = await getPaymentPeriods(accountNumber);

  // Filter to only pending periods within the range
  const periodsToPay = allPeriods.filter((period) => {
    const isInRange =
      period.periodNumber >= startPeriod && period.periodNumber <= endPeriod;
    const isPending = period.status === 'pending';
    return isInRange && isPending;
  });

  if (periodsToPay.length === 0) {
    throw new Error(
      `No pending periods found in range ${startPeriod} to ${endPeriod}`
    );
  }

  // Get account for currency
  const { getFinancialAccount } = await import('./financialAccounts');
  const account = await getFinancialAccount(accountNumber);
  if (!account) {
    throw new Error(`Account ${accountNumber} not found`);
  }

  const currency = getAccountCurrency(account);
  const results: Array<{
    periodNumber: number;
    success: boolean;
    error?: string;
  }> = [];

  // Log payment for each period
  for (const period of periodsToPay) {
    try {
      // Use provided payment date or period's due date
      const dateToUse =
        paymentDate ??
        (period.dueDate instanceof Date
          ? period.dueDate
          : period.dueDate.toDate());

      // Use remaining amount (amount - amountPaid) to avoid overpaying
      // For pending periods, this should be the full amount, but this is safer
      const remainingAmount = period.amount - period.amountPaid;

      if (remainingAmount <= 0) {
        // Skip periods that are already fully paid
        results.push({
          periodNumber: period.periodNumber,
          success: false,
          error: 'Period is already fully paid',
        });
        continue;
      }

      await logPaymentToPeriod(accountNumber, period.periodNumber, {
        datePaid: dateToUse,
        amount: remainingAmount,
        currency,
        notes,
      });

      results.push({
        periodNumber: period.periodNumber,
        success: true,
      });
    } catch (error) {
      results.push({
        periodNumber: period.periodNumber,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
