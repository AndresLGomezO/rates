/**
 * Incomes Firestore Service
 *
 * Service functions for creating, reading, updating, and deleting incomes
 */

import {
  collection,
  doc,
  setDoc,
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
  Income,
  CreateIncomeInput,
  UpdateIncomeInput,
} from '@rates/firebase-client';
import { validateIncome } from '@rates/firebase-client';

// Collection name constant
const collectionPrefix = import.meta.env.VITE_FIRESTORE_COLLECTION_PREFIX as
  | string
  | undefined;
const collectionName = 'incomes';

export const INCOMES_COLLECTION = collectionPrefix
  ? collectionPrefix.endsWith('_')
    ? `${collectionPrefix}${collectionName}`
    : `${collectionPrefix}_${collectionName}`
  : collectionName;

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
      return payload.user_id ?? payload.uid ?? payload.sub ?? 'user-mock-123';
    }
  }

  return 'user-mock-123';
}

/**
 * Wait for Firebase Auth to be ready
 */
function waitForAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      resolve();
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      () => {
        unsubscribe();
        resolve();
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );

    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 5000);
  });
}

/**
 * Create a new income record
 */
export async function createIncome(
  incomeData: CreateIncomeInput
): Promise<string> {
  console.log('🔵 [createIncome] Starting income creation...');

  try {
    const firestore: Firestore = getFirestore();
    const userId = incomeData.userId || getCurrentUserId();

    const incomeDataWithUserId = {
      ...incomeData,
      userId,
    } as CreateIncomeInput & { userId: string };

    const errors = validateIncome(incomeDataWithUserId as Partial<Income>);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const createdAt = Timestamp.now();
    const updatedAt = Timestamp.now();

    const income = {
      ...incomeDataWithUserId,
      createdAt,
      updatedAt,
    } as Income;

    // Convert date fields to Timestamps
    if (income.type === 'salary') {
      if (income.nextPayDate instanceof Date) {
        income.nextPayDate = Timestamp.fromDate(
          income.nextPayDate
        ) as unknown as typeof income.nextPayDate;
      }
      if (income.startDate instanceof Date) {
        income.startDate = Timestamp.fromDate(
          income.startDate
        ) as unknown as typeof income.startDate;
      }
      if (income.endDate instanceof Date) {
        income.endDate = Timestamp.fromDate(
          income.endDate
        ) as unknown as typeof income.endDate;
      }
    } else if (income.type === 'freelance') {
      if (income.nextExpectedPayment instanceof Date) {
        income.nextExpectedPayment = Timestamp.fromDate(
          income.nextExpectedPayment
        ) as unknown as typeof income.nextExpectedPayment;
      }
      if (income.startDate instanceof Date) {
        income.startDate = Timestamp.fromDate(
          income.startDate
        ) as unknown as typeof income.startDate;
      }
      if (income.endDate instanceof Date) {
        income.endDate = Timestamp.fromDate(
          income.endDate
        ) as unknown as typeof income.endDate;
      }
    } else if (income.type === 'rental') {
      const rental = income;
      if (rental.leaseStartDate instanceof Date) {
        rental.leaseStartDate = Timestamp.fromDate(
          rental.leaseStartDate
        ) as unknown as typeof rental.leaseStartDate;
      }
      if (rental.leaseEndDate instanceof Date) {
        rental.leaseEndDate = Timestamp.fromDate(
          rental.leaseEndDate
        ) as unknown as typeof rental.leaseEndDate;
      }
      if (rental.expectedVacancyDate instanceof Date) {
        rental.expectedVacancyDate = Timestamp.fromDate(
          rental.expectedVacancyDate
        ) as unknown as typeof rental.expectedVacancyDate;
      }
    }

    const incomeId = `income-${Date.now()}`;
    const incomeRef: DocumentReference<Income> = doc(
      firestore,
      INCOMES_COLLECTION,
      incomeId
    ) as DocumentReference<Income>;

    await setDoc(incomeRef, income);
    console.log('✅ [createIncome] Income saved successfully!', incomeId);

    return incomeId;
  } catch (error) {
    console.error('🔴 [createIncome] Error occurred:', error);
    throw error;
  }
}

/**
 * Get all incomes for the current user
 */
export async function getUserIncomes(): Promise<(Income & { id: string })[]> {
  try {
    await waitForAuth();
    const firestore: Firestore = getFirestore();
    const auth = getAuth();
    const effectiveUserId = auth.currentUser?.uid ?? getCurrentUserId();

    const incomesRef = collection(firestore, INCOMES_COLLECTION);
    const q = query(incomesRef, where('userId', '==', effectiveUserId));

    const querySnapshot: QuerySnapshot<Income> = (await getDocs(
      q
    )) as QuerySnapshot<Income>;

    const incomes = querySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return { id: docSnapshot.id, ...data } as Income & { id: string };
    });

    return incomes;
  } catch (error) {
    console.error('🔴 [getUserIncomes] Error occurred:', error);
    throw error;
  }
}

/**
 * Update an existing income
 */
export async function updateIncome(
  incomeId: string,
  updates: UpdateIncomeInput
): Promise<void> {
  const firestore: Firestore = getFirestore();
  const incomeRef = doc(firestore, INCOMES_COLLECTION, incomeId);

  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  } as Partial<Income>;

  await updateDoc(incomeRef, updateData);
}

/**
 * Delete (deactivate) an income
 */
export async function deleteIncome(incomeId: string): Promise<void> {
  const firestore: Firestore = getFirestore();
  const incomeRef = doc(firestore, INCOMES_COLLECTION, incomeId);
  await updateDoc(incomeRef, {
    status: 'inactive',
    updatedAt: Timestamp.now(),
  });
}
