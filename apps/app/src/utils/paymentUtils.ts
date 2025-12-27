/**
 * Payment utility functions
 *
 * Functions to determine payment periods and check payment status
 */

import type { FinancialAccount, PaymentPeriod } from '@rates/firebase-client';
import { getMonthString } from '@rates/firebase-client';
import { getPaymentPeriods } from '../services/paymentPeriods';

/**
 * Get the current period month in YYYY-MM format
 */
export function getCurrentPeriod(): string {
  return getMonthString(new Date());
}

/**
 * Calculate days remaining until due date
 */
export function calculateDaysRemaining(
  dueDate: Date | { toDate: () => Date }
): number {
  const date = dueDate instanceof Date ? dueDate : dueDate.toDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if an account has a pending payment within the specified days ahead
 *
 * @param account - Financial account to check
 * @param daysAhead - Number of days ahead to check (default: 15)
 * @returns true if payment is pending within the days ahead
 */
export function hasPendingPaymentWithinDays(
  account: FinancialAccount,
  daysAhead: number = 15
): boolean {
  if (account.status !== 'active') {
    return false;
  }

  const nextDueDate =
    account.nextDueDate instanceof Date
      ? account.nextDueDate
      : account.nextDueDate.toDate();

  const daysRemaining = calculateDaysRemaining(nextDueDate);

  // Check if payment is due within the specified days (including overdue)
  if (daysRemaining > daysAhead) {
    return false;
  }

  // Check if there's already a payment logged for the current period
  const currentPeriod = getCurrentPeriod();
  const hasPaymentForCurrentPeriod = account.paymentLog.some(
    (entry) => entry.monthPaid === currentPeriod
  );

  return !hasPaymentForCurrentPeriod;
}

/**
 * Get the period month for a payment based on due date
 */
export function getPaymentPeriod(
  dueDate: Date | { toDate: () => Date }
): string {
  const date = dueDate instanceof Date ? dueDate : dueDate.toDate();
  return getMonthString(date);
}

/**
 * Payment status for a period based on payment log
 */
export type PeriodPaymentStatus = 'missing' | 'incomplete' | 'complete';

/**
 * Payment status information for a period
 */
export interface PeriodPaymentInfo {
  period: PaymentPeriod;
  status: PeriodPaymentStatus;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  hasPaymentLog: boolean;
  paymentLogCount: number;
}

/**
 * Get payment status for a single period
 *
 * @param period - Payment period to check
 * @param isBill - Whether this period belongs to a bill account (bills are estimated, so any payment log means paid)
 * @returns Payment status information
 */
export function getPeriodPaymentStatus(
  period: PaymentPeriod,
  isBill: boolean = false
): PeriodPaymentInfo {
  const amountDue = period.amount;
  const amountPaid = period.amountPaid;
  const hasPaymentLog = period.paymentLog.length > 0;
  const paymentLogCount = period.paymentLog.length;
  const amountRemaining = Math.max(0, amountDue - amountPaid);

  let status: PeriodPaymentStatus;

  if (isBill) {
    // For bills: if there's a payment log entry (even with 0 value), consider it paid (complete)
    // Only missing if no log entry exists
    // This allows logging 0-value payments to mark bills as paid (e.g., when bill is 0 due to credit)
    if (!hasPaymentLog) {
      status = 'missing';
    } else {
      // Any payment log entry (even with 0 amount) means the bill is paid (estimated amounts)
      status = 'complete';
    }
  } else {
    // For loans: use standard logic
    if (!hasPaymentLog) {
      status = 'missing';
    } else if (amountPaid >= amountDue) {
      status = 'complete';
    } else {
      status = 'incomplete';
    }
  }

  return {
    period,
    status,
    amountDue,
    amountPaid,
    amountRemaining,
    hasPaymentLog,
    paymentLogCount,
  };
}

/**
 * Parse a month-year string (e.g., "02-2024" or "2024-02") to a Date object
 *
 * @param monthYear - String in format "MM-YYYY" or "YYYY-MM"
 * @returns Date object for the first day of that month
 */
export function parseMonthYear(monthYear: string): Date {
  // Try MM-YYYY format first
  const mmYyyyMatch = monthYear.match(/^(\d{2})-(\d{4})$/);
  if (mmYyyyMatch) {
    const [, month, year] = mmYyyyMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  }

  // Try YYYY-MM format
  const yyyyMmMatch = monthYear.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMmMatch) {
    const [, year, month] = yyyyMmMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  }

  throw new Error(
    `Invalid month-year format: ${monthYear}. Expected "MM-YYYY" or "YYYY-MM"`
  );
}

/**
 * Identify all pending payments for an account based on payment periods
 *
 * Checks all payment periods from the start date and identifies:
 * - Missing payments: No payment log entries (or amount paid <= 0 for bills)
 * - Incomplete payments: Payment log exists but amount is partial (loans only)
 * - Complete payments: Payment log exists with full amount (or any amount > 0 for bills)
 *
 * @param accountNumber - Account number to check
 * @param startFromDate - Optional date to start checking from (defaults to account start date or first period)
 *                       Can also be a month-year string like "02-2024" or "2024-02"
 * @param isBill - Whether this account is a bill (bills are estimated, so any payment means paid)
 * @returns Array of payment status information for each period
 */
export async function identifyPendingPayments(
  accountNumber: string,
  startFromDate?: Date | string,
  isBill: boolean = false
): Promise<PeriodPaymentInfo[]> {
  // Get all payment periods for the account
  const periods = await getPaymentPeriods(accountNumber);

  if (periods.length === 0) {
    return [];
  }

  // Filter periods based on start date if provided
  let periodsToCheck = periods;
  if (startFromDate) {
    // Parse string date if needed (e.g., "02-2024")
    const startDate =
      typeof startFromDate === 'string'
        ? parseMonthYear(startFromDate)
        : new Date(startFromDate);
    startDate.setHours(0, 0, 0, 0);

    periodsToCheck = periods.filter((period) => {
      const dueDate =
        period.dueDate instanceof Date
          ? period.dueDate
          : period.dueDate.toDate();
      const periodDate = new Date(dueDate);
      periodDate.setHours(0, 0, 0, 0);
      return periodDate >= startDate;
    });
  }

  // Get payment status for each period
  return periodsToCheck.map((period) => getPeriodPaymentStatus(period, isBill));
}

/**
 * Identify pending payments for an account using the account's start date
 *
 * This is a convenience function that automatically uses the account's startDate
 * if available, otherwise checks all periods.
 *
 * @param account - Financial account to check
 * @returns Array of payment status information for each period from the start date
 */
export async function identifyPendingPaymentsForAccount(
  account: FinancialAccount
): Promise<PeriodPaymentInfo[]> {
  let startDate: Date | undefined;

  // Use account's start date if available
  if (account.startDate) {
    startDate =
      account.startDate instanceof Date
        ? account.startDate
        : account.startDate.toDate();
  }

  // Check if this is a bill account
  const isBill = account.accountType === 'bill';

  return identifyPendingPayments(account.accountNumber, startDate, isBill);
}

/**
 * Get pending payment periods (missing or incomplete) for an account
 *
 * @param accountNumber - Account number to check
 * @param startFromDate - Optional date to start checking from (can be Date or month-year string like "02-2024")
 * @param isBill - Whether this account is a bill (bills are estimated, so any payment means paid)
 * @returns Array of payment status information for pending periods only
 */
export async function getPendingPaymentPeriods(
  accountNumber: string,
  startFromDate?: Date | string,
  isBill: boolean = false
): Promise<PeriodPaymentInfo[]> {
  const allPayments = await identifyPendingPayments(
    accountNumber,
    startFromDate,
    isBill
  );
  // For bills, only missing periods are pending (incomplete doesn't exist for bills)
  // For loans, both missing and incomplete are pending
  return allPayments.filter(
    (info) =>
      info.status === 'missing' || (!isBill && info.status === 'incomplete')
  );
}

/**
 * Check if an account has pending payments based on payment periods
 *
 * This is an improved version that checks actual payment periods
 * instead of just the account's paymentLog
 *
 * @param account - Financial account to check
 * @param daysAhead - Number of days ahead to check (default: 15)
 * @returns true if there are pending payments within the days ahead
 */
export async function hasPendingPaymentsFromPeriods(
  account: FinancialAccount,
  daysAhead: number = 15
): Promise<boolean> {
  if (account.status !== 'active') {
    return false;
  }

  // Get all payment periods
  const periods = await getPaymentPeriods(account.accountNumber);

  if (periods.length === 0) {
    // If no periods exist, fall back to the old method
    return hasPendingPaymentWithinDays(account, daysAhead);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + daysAhead);
  maxDate.setHours(23, 59, 59, 999);

  // Check if this is a bill account
  const isBill = account.accountType === 'bill';

  // Check if any period within the date range is pending or incomplete
  for (const period of periods) {
    const dueDate =
      period.dueDate instanceof Date ? period.dueDate : period.dueDate.toDate();
    const periodDate = new Date(dueDate);
    periodDate.setHours(0, 0, 0, 0);

    // Check if period is within the date range
    if (periodDate <= maxDate) {
      const status = getPeriodPaymentStatus(period, isBill);
      // For bills, only missing is pending (any payment means paid)
      // For loans, both missing and incomplete are pending
      if (
        status.status === 'missing' ||
        (!isBill && status.status === 'incomplete')
      ) {
        return true;
      }
    }
  }

  return false;
}
