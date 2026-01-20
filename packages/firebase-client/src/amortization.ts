/**
 * Amortization Plan Generator
 *
 * Generates payment periods for a financial account based on loan terms.
 */

import type { FinancialAccount } from './financial-accounts';
import type { CreatePaymentPeriodInput } from './payment-periods';
import { calculatePaymentBreakdown } from './financial-accounts-utils';
import { Timestamp } from 'firebase/firestore';

/**
 * Calculate number of periods from start date to current date (or end date if provided)
 *
 * @param startDate - Start date of the account
 * @param paymentIntervalMonths - Payment interval in months
 * @param endDate - Optional end date (defaults to current date)
 * @returns Number of periods
 */
function calculatePeriodicPeriods(
  startDate: Date,
  paymentIntervalMonths: number,
  endDate?: Date
): number {
  const end = endDate ?? new Date();
  const monthsDiff =
    (end.getFullYear() - startDate.getFullYear()) * 12 +
    (end.getMonth() - startDate.getMonth());
  return Math.max(1, Math.ceil(monthsDiff / paymentIntervalMonths));
}

/**
 * Generate amortization plan (all payment periods) for an account
 *
 * @param account - Financial account to generate plan for
 * @param paymentIntervalMonths - Payment interval in months (default: 1 for monthly)
 * @param endDate - Optional end date for periodic bills (defaults to current date)
 * @returns Array of payment period inputs ready to be created
 */
export function generateAmortizationPlan(
  account: FinancialAccount,
  paymentIntervalMonths: number = 1,
  endDate?: Date
): CreatePaymentPeriodInput[] {
  if (!account.startDate) {
    throw new Error(
      'Account must have startDate to generate amortization plan'
    );
  }

  const startDate =
    account.startDate instanceof Date
      ? account.startDate
      : account.startDate.toDate();

  // Check if this is a periodic bill
  const isPeriodic =
    account.accountType === 'bill' &&
    (account.metadata?.isPeriodic === true ||
      account.numberOfPayments === undefined);

  let numberOfPayments: number;
  if (isPeriodic) {
    // For periodic bills, calculate periods from start date to current date (or provided end date)
    numberOfPayments = calculatePeriodicPeriods(
      startDate,
      paymentIntervalMonths,
      endDate
    );
  } else {
    // For loans and fixed-period bills, use numberOfPayments
    if (!account.numberOfPayments) {
      throw new Error(
        'Account must have numberOfPayments to generate amortization plan (or be a periodic bill)'
      );
    }
    numberOfPayments = account.numberOfPayments;
  }

  const monthlyPayment = account.monthlyPayment.amount;
  const currency = account.monthlyPayment.currency;
  const rate = account.rate;
  const originalAmount =
    account.originalAmount?.amount ?? account.totalAmountRemaining.amount;

  const periods: CreatePaymentPeriodInput[] = [];
  let remainingPrincipal = originalAmount;

  for (let periodNumber = 1; periodNumber <= numberOfPayments; periodNumber++) {
    // Calculate due date (start date + (period number - 1) * payment interval months)
    const dueDate = new Date(startDate);
    dueDate.setMonth(
      dueDate.getMonth() + (periodNumber - 1) * paymentIntervalMonths
    );

    // For bills (especially periodic ones), use simpler calculation
    // Bills typically have fixed payments without principal reduction
    let capital: number;
    let interest: number;
    let periodRemainingPrincipal: number | undefined;

    if (account.accountType === 'bill' && isPeriodic) {
      // For periodic bills, payment is typically just the monthly amount
      // No principal reduction (bills are recurring expenses)
      capital = monthlyPayment;
      interest = 0;
      // Don't set remainingPrincipal for bills (they don't have principal)
      periodRemainingPrincipal = undefined;
    } else {
      // For loans, calculate payment breakdown with principal reduction
      const breakdown = calculatePaymentBreakdown(
        remainingPrincipal,
        rate,
        monthlyPayment,
        currency
      );
      capital = breakdown.capital;
      interest = breakdown.interest;
      periodRemainingPrincipal = Math.max(
        0,
        remainingPrincipal - breakdown.capital
      );

      // Update remaining principal for next period
      remainingPrincipal = periodRemainingPrincipal;
    }

    // Create period input
    // Only include remainingPrincipal if it's defined (bills don't have principal)
    const period: CreatePaymentPeriodInput = {
      accountNumber: account.accountNumber,
      periodNumber,
      dueDate: Timestamp.fromDate(dueDate) as unknown as Date,
      amount: monthlyPayment,
      currency,
      capital,
      interest,
      ...(periodRemainingPrincipal !== undefined && {
        remainingPrincipal: periodRemainingPrincipal,
      }),
    };

    periods.push(period);
  }

  return periods;
}

/**
 * Calculate the remaining principal after a specific number of periods
 *
 * @param originalAmount - Original loan amount
 * @param rate - Monthly interest rate (as percentage, e.g., 0.77 for 0.77% per month)
 * @param monthlyPayment - Monthly payment amount
 * @param periodsPaid - Number of periods that have been paid
 * @returns Remaining principal balance
 */
export function calculateRemainingPrincipal(
  originalAmount: number,
  rate: number,
  monthlyPayment: number,
  periodsPaid: number
): number {
  const monthlyRate = rate / 100;
  let remaining = originalAmount;

  for (let i = 0; i < periodsPaid; i++) {
    const interest = remaining * monthlyRate;
    const capital = Math.max(0, monthlyPayment - interest);
    remaining = Math.max(0, remaining - capital);
  }

  return remaining;
}
