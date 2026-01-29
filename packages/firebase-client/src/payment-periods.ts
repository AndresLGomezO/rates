/**
 * Payment Periods Schema for Firestore
 *
 * This schema tracks individual payment periods in an amortization plan.
 * Each period represents one payment installment in the loan/account schedule.
 */

import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode } from './financial-accounts.js';

/**
 * Payment period status
 */
export type PaymentPeriodStatus = 'pending' | 'paid' | 'partial' | 'overdue';

/**
 * Payment Period Document
 *
 * Represents a single payment period in an amortization plan.
 * Stored as a subcollection: financialAccounts/{accountNumber}/paymentPeriods/{periodNumber}
 */
export interface PaymentPeriod {
  /** Account number this period belongs to */
  accountNumber: string;

  /** Period number (1-based, e.g., 1, 2, 3, ...) */
  periodNumber: number;

  /** Due date for this period */
  dueDate: Timestamp | Date;

  /** Total amount due for this period */
  amount: number;

  /** Currency of the amount */
  currency: CurrencyCode;

  /** Amount paid towards this period */
  amountPaid: number;

  /** Status of this period */
  status: PaymentPeriodStatus;

  /** Capital portion of this period's payment */
  capital: number;

  /** Interest portion of this period's payment */
  interest: number;

  /** Remaining principal balance after this period (if paid) */
  remainingPrincipal?: number;

  /** Payment log entries for this period */
  paymentLog: PaymentPeriodPayment[];

  /** Timestamp when this period was created */
  createdAt: Timestamp | Date;

  /** Timestamp when this period was last updated */
  updatedAt: Timestamp | Date;
}

/**
 * Payment made towards a specific period
 */
export interface PaymentPeriodPayment {
  /** Date when payment was made */
  datePaid: Timestamp | Date;

  /** Amount paid */
  amount: number;

  /** Currency of the payment */
  currency: CurrencyCode;

  /** Optional notes about this payment */
  notes?: string;

  /** Timestamp when this payment entry was created */
  createdAt: Timestamp | Date;
}

/**
 * Input for creating a payment period
 */
export type CreatePaymentPeriodInput = Omit<
  PaymentPeriod,
  'amountPaid' | 'status' | 'paymentLog' | 'createdAt' | 'updatedAt'
> & {
  paymentLog?: PaymentPeriodPayment[];
};

/**
 * Input for updating a payment period
 */
export type UpdatePaymentPeriodInput = Partial<
  Omit<PaymentPeriod, 'accountNumber' | 'periodNumber' | 'createdAt'>
> & {
  updatedAt: Timestamp | Date;
};

/**
 * Input for logging a payment to a period
 */
export type LogPaymentToPeriodInput = {
  datePaid: Date;
  amount: number;
  currency: CurrencyCode;
  notes?: string;
};
