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
 * Account type classification (discriminated union)
 */
export type AccountType =
  | 'installment_loan'
  | 'revolving_credit'
  | 'bill'
  | 'other';

/**
 * Installment loan subtypes
 */
export type InstallmentLoanSubtype =
  | 'mortgage'
  | 'auto'
  | 'personal'
  | 'student'
  | 'other';

/**
 * Revolving credit subtypes
 */
export type RevolvingCreditSubtype =
  | 'credit_card'
  | 'line_of_credit'
  | 'store_card'
  | 'overdraft'
  | 'other';

/**
 * Bill subtypes
 */
export type BillSubtype =
  | 'subscription'
  | 'utility'
  | 'rent'
  | 'insurance'
  | 'tax'
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
 * Base account interface with fields common to all account types
 */
export interface BaseAccount {
  /** Firestore document ID */
  id?: string;

  /** Unique account identifier/number (user or institution) */
  accountNumber?: string;

  /** Display name for the account */
  accountName: string;

  /** Detailed description of the account */
  accountDescription?: string;

  /** Type of account (discriminator) */
  accountType: AccountType;

  /** Current status of the account */
  status: AccountStatus;

  /** Primary currency of the account */
  currency: CurrencyCode;

  /**
   * When the user started tracking this in the app.
   * This is NOT necessarily the same as contractStartDate for loans.
   */
  trackingStartDate?: Timestamp | Date;

  /** Additional metadata as key-value pairs */
  metadata?: Record<string, unknown>;

  /** Payment history log */
  paymentLog: PaymentLogEntry[];

  // ===== TIMESTAMPS =====

  /** When the account was created */
  createdAt: Timestamp | Date;

  /** When the account was last updated */
  updatedAt: Timestamp | Date;

  /** User ID who owns this account */
  userId: string;
}

/**
 * Installment Loan Account (Mortgage, Auto, Personal, Student, etc.)
 * Unifies all amortizing loans under a single type
 */
export interface InstallmentLoanAccount extends BaseAccount {
  accountType: 'installment_loan';
  loanSubtype: InstallmentLoanSubtype;

  /** Original principal at origination */
  originalPrincipal?: CurrencyAmount;

  /**
   * Current outstanding principal when the user starts tracking.
   * If missing but originalPrincipal + schedule are known, can be computed.
   */
  currentPrincipal?: CurrencyAmount;

  /** Nominal annual interest rate, % (e.g. 12.5 for 12.5%) */
  annualInterestRate: number;

  /** Fixed payment frequency (e.g. monthly) */
  paymentFrequency: PaymentFrequency;

  /** Contract start date (when the loan actually started) */
  contractStartDate?: Timestamp | Date;

  /** Contract end/maturity date (if known or applicable) */
  contractEndDate?: Timestamp | Date;

  /**
   * Total number of scheduled payments in the contract.
   * e.g. 360 for a 30-year monthly mortgage.
   */
  termInPayments?: number;

  /**
   * Scheduled payment per period (if user knows it).
   * If missing but principal + rate + term are known, it should be calculated.
   */
  scheduledPayment?: CurrencyAmount;

  /**
   * If tracking an existing loan mid-life:
   * how many payments are left (optional; can be calculated).
   */
  remainingPayments?: number;

  /** Next scheduled payment due date (if the loan is active) */
  nextDueDate?: Timestamp | Date;

  /**
   * If lender specifies a minimum different from the standard scheduled payment.
   * Rare but keep the option.
   */
  minimumPaymentOverride?: CurrencyAmount;

  /** Compounding convention for more accurate calculations (optional) */
  compoundingFrequency?: 'daily' | 'monthly' | 'annually';
}

/**
 * Revolving Credit Account (Credit Cards, Lines of Credit, etc.)
 * For credit products that do not have a fixed amortization schedule
 */
export interface RevolvingCreditAccount extends BaseAccount {
  accountType: 'revolving_credit';
  creditSubtype: RevolvingCreditSubtype;

  /** Credit limit approved by issuer (if known) */
  creditLimit?: CurrencyAmount;

  /** Current balance when user starts tracking / current snapshot */
  currentBalance: CurrencyAmount;

  /** Purchase APR (annual), in percent */
  purchaseApr: number;

  /** Cash advance APR (if relevant) */
  cashApr?: number;

  /** How interest is compounded for this account */
  compoundingFrequency?: 'daily' | 'monthly';

  /** Statement day (1–31) or explicit next due date */
  statementDayOfMonth?: number;
  nextDueDate?: Timestamp | Date;

  /**
   * Issuer-defined minimum payment for the current cycle.
   * For manual setups, user may enter what's on their last statement.
   */
  currentMinimumPayment?: CurrencyAmount;

  /**
   * User's intended recurring payment amount
   * (for projections and payoff simulations).
   */
  userPlannedPayment?: CurrencyAmount;
}

/**
 * Bill Account (Utilities, Subscriptions, Rent, etc.)
 * For non-credit obligations
 */
export interface BillAccount extends BaseAccount {
  accountType: 'bill';
  billSubtype: BillSubtype;

  /** True if this bill repeats (subscription, rent, etc.) */
  isRecurring: boolean;

  /** For recurring, fixed amount (if known) */
  recurringAmount?: CurrencyAmount;

  /** Recurrence pattern (monthly, annually, etc.) */
  paymentFrequency?: PaymentFrequency;

  /**
   * True if the amount is variable/unpredictable beforehand (e.g., utilities).
   */
  isAmountVariable?: boolean;

  /** Next due date */
  nextDueDate: Timestamp | Date;

  /**
   * When this bill series ends (e.g., subscription cancellation date).
   */
  endDate?: Timestamp | Date;
}

/**
 * Other Account
 * Catch-all for rare or custom obligations
 */
export interface OtherAccount extends BaseAccount {
  accountType: 'other';

  /** Free-form category or tag, user-defined */
  category?: string;

  /** Current outstanding amount, if any */
  currentAmount?: CurrencyAmount;

  /** Next relevant date (due, review, etc.) */
  nextRelevantDate?: Timestamp | Date;
}

/**
 * Financial Account (Discriminated Union)
 * Main type that encompasses all account types
 */
export type FinancialAccount =
  | InstallmentLoanAccount
  | RevolvingCreditAccount
  | BillAccount
  | OtherAccount;

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
 * Helper to omit properties from a union type distributively
 */
type DistributiveOmit<T, K extends string | number | symbol> = T extends unknown
  ? Omit<T, K>
  : never;

/**
 * Input data for creating a new financial account
 */
export type CreateFinancialAccountInput = DistributiveOmit<
  FinancialAccount,
  'createdAt' | 'updatedAt' | 'paymentLog'
> & {
  paymentLog?: PaymentLogEntry[];
};

/**
 * Input data for updating a financial account
 */
export type UpdateFinancialAccountInput = (FinancialAccount extends unknown
  ? Partial<Omit<FinancialAccount, 'createdAt' | 'userId'>>
  : never) & {
  updatedAt: Timestamp | Date;
};

/**
 * Input data for adding a payment log entry
 */
export type AddPaymentLogInput = Omit<PaymentLogEntry, 'createdAt'>;

// ===== TYPE GUARDS =====

/**
 * Type guard to check if an account is an installment loan
 */
export function isInstallmentLoan(
  account: FinancialAccount
): account is InstallmentLoanAccount {
  return account.accountType === 'installment_loan';
}

/**
 * Type guard to check if an account is revolving credit
 */
export function isRevolvingCredit(
  account: FinancialAccount
): account is RevolvingCreditAccount {
  return account.accountType === 'revolving_credit';
}

/**
 * Type guard to check if an account is a bill
 */
export function isBill(account: FinancialAccount): account is BillAccount {
  return account.accountType === 'bill';
}

/**
 * Type guard to check if an account is other type
 */
export function isOther(account: FinancialAccount): account is OtherAccount {
  return account.accountType === 'other';
}
