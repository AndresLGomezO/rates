/**
 * Financial Accounts Schema for Firestore
 *
 * This schema is designed to be generic and extensible for tracking
 * various types of financial accounts (bills, loans, credit cards, etc.)
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Supported currency codes
 * Common currencies: COP, USD, EUR, etc.
 */
export type CurrencyCode = string;

/**
 * Account type classification
 */
export type AccountType =
  | 'loan'
  | 'credit_card'
  | 'bill'
  | 'mortgage'
  | 'personal_loan'
  | 'auto_loan'
  | 'other';

/**
 * Account status
 */
export type AccountStatus =
  | 'active'
  | 'paid_off'
  | 'closed'
  | 'defaulted'
  | 'on_hold';

/**
 * Payment frequency
 */
export type PaymentFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annually'
  | 'annually';

/**
 * Payment log entry
 * Records each payment made to the account
 */
export interface PaymentLogEntry {
  /** Month when payment was made (YYYY-MM format) */
  monthPaid: string;
  /** Exact date when payment was made */
  datePaid: Timestamp | Date;
  /** Amount paid in the account's currency */
  valuePaid: number;
  /** Currency of the payment */
  currency: CurrencyCode;
  /** Optional notes about this payment */
  notes?: string;
  /** Timestamp when this log entry was created */
  createdAt: Timestamp | Date;
}

/**
 * Amount in a specific currency
 */
export interface CurrencyAmount {
  /** Amount value */
  amount: number;
  /** Currency code (COP, USD, etc.) */
  currency: CurrencyCode;
}

/**
 * Capital and interest breakdown for a payment
 */
export interface PaymentBreakdown {
  /** Capital portion of the payment */
  capital: number;
  /** Interest portion of the payment */
  interest: number;
  /** Total payment (capital + interest) */
  total: number;
  /** Currency of the breakdown */
  currency: CurrencyCode;
}

/**
 * Main Financial Account Document
 *
 * This is the core schema stored in Firestore.
 * Calculated fields should be computed client-side or via Cloud Functions.
 */
export interface FinancialAccount {
  // ===== REQUIRED FIELDS =====

  /** Unique account identifier/number */
  accountNumber: string;

  /** Display name for the account */
  accountName: string;

  /** Detailed description of the account */
  accountDescription: string;

  /** Type of account (loan, credit card, bill, etc.) */
  accountType: AccountType;

  /** Current status of the account */
  status: AccountStatus;

  /** Total amount remaining in the account's primary currency */
  totalAmountRemaining: CurrencyAmount;

  /** Payment amount per period in the account's primary currency */
  paymentAmount: CurrencyAmount;

  /** Payment frequency */
  paymentFrequency: PaymentFrequency;

  /** Interest rate (as a percentage, e.g., 12.5 for 12.5%) */
  rate: number;

  /** Next payment due date */
  nextDueDate: Timestamp | Date;

  /** Payment history log */
  paymentLog: PaymentLogEntry[];

  // ===== OPTIONAL FIELDS =====

  /** Additional currency amounts (e.g., USD equivalent if primary is COP) */
  additionalAmounts?: CurrencyAmount[];

  /** Account start date */
  startDate?: Timestamp | Date;

  /** Account end/maturity date */
  endDate?: Timestamp | Date;

  /** Minimum payment (if different from monthly payment) */
  minimumPayment?: CurrencyAmount;

  /** Credit limit (for credit cards) */
  creditLimit?: CurrencyAmount;

  /** Original loan/account amount */
  originalAmount?: CurrencyAmount;

  /** Number of payment periods */
  numberOfPayments?: number;

  /** Remaining number of payments */
  remainingPayments?: number;

  /** Additional metadata as key-value pairs */
  metadata?: Record<string, unknown>;

  // ===== TIMESTAMPS =====

  /** When the account was created */
  createdAt: Timestamp | Date;

  /** When the account was last updated */
  updatedAt: Timestamp | Date;

  /** User ID who owns this account */
  userId: string;
}

/**
 * Calculated Fields (not stored in Firestore, computed on-demand)
 *
 * These fields should be calculated client-side or via Cloud Functions
 */
export interface FinancialAccountCalculated {
  /** Days remaining until next due date */
  daysRemainingToDueDate: number;

  /** Next due date period (YYYY-MM format) */
  nextDueDatePeriod: string;

  /** Capital portion of periodic payment based on rate */
  periodicCapital: CurrencyAmount;

  /** Interest portion of periodic payment based on rate */
  periodicInterest: CurrencyAmount;

  /** Total amount remaining in all currencies */
  totalAmountsByCurrency: Record<CurrencyCode, number>;

  /** Total paid amount (sum of all payment log entries) */
  totalPaid: CurrencyAmount;

  /** Remaining balance percentage */
  remainingBalancePercentage: number;

  /** Estimated payoff date based on current payment schedule */
  estimatedPayoffDate?: Date;

  /** Total interest paid to date */
  totalInterestPaid: CurrencyAmount;

  /** Total capital paid to date */
  totalCapitalPaid: CurrencyAmount;
}

/**
 * Complete Financial Account with calculated fields
 */
export type FinancialAccountWithCalculated = FinancialAccount &
  FinancialAccountCalculated;

/**
 * Input data for creating a new financial account
 */
export type CreateFinancialAccountInput = Omit<
  FinancialAccount,
  'createdAt' | 'updatedAt' | 'paymentLog'
> & {
  paymentLog?: PaymentLogEntry[];
};

/**
 * Input data for updating a financial account
 */
export type UpdateFinancialAccountInput = Partial<
  Omit<FinancialAccount, 'createdAt' | 'userId'>
> & {
  updatedAt: Timestamp | Date;
};

/**
 * Input data for adding a payment log entry
 */
export type AddPaymentLogInput = Omit<PaymentLogEntry, 'createdAt'>;
