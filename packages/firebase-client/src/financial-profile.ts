/**
 * Financial Profile Schema
 *
 * Stores global user settings and financial data that isn't tied to a specific account.
 * This is typically a singleton document per user.
 */

import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode } from './financial-accounts.js';

export interface FinancialProfile {
  /** User ID who owns this profile */
  userId: string;

  /** Primary currency for the dashboard (for aggregation) */
  primaryCurrency: CurrencyCode;

  /**
   * Monthly net income (after tax).
   * Critical for Debt-to-Income ratio and "Can I afford this?" insights.
   */
  monthlyNetIncome?: number;

  /**
   * Target savings rate (percentage 0-100).
   * Used for "Health Score" and recommendations.
   */
  targetSavingsRate?: number;

  /**
   * Custom weightings for the Health Score (optional).
   * Allows power users to adjust what matters to them.
   */
  healthScoreWeights?: {
    paymentHabits: number; // default 30
    debtLevel: number; // default 25
    creditHealth: number; // default 25
    progressMomentum: number; // default 20
  };

  /** Timestamp when the profile was created */
  createdAt: Timestamp | Date;
  /** Timestamp when the profile was last updated */
  updatedAt: Timestamp | Date;
}

export type CreateFinancialProfileInput = Omit<
  FinancialProfile,
  'createdAt' | 'updatedAt'
>;
export type UpdateFinancialProfileInput = Partial<
  Omit<FinancialProfile, 'createdAt' | 'userId'>
>;
