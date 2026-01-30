/**
 * Amortization Plan Generator
 *
 * Generates payment periods for installment loan accounts based on loan terms.
 */

import type { InstallmentLoanAccount } from './financial-accounts.js';
import type { CreatePaymentPeriodInput } from './payment-periods.js';
import { calculatePaymentBreakdown } from './financial-accounts-utils.js';
import { Timestamp } from 'firebase/firestore';

/**
 * Generate amortization plan (all payment periods) for an installment loan account
 *
 * @param account - InstallmentLoanAccount to generate plan for
 * @param paymentIntervalMonths - Payment interval in months (default: 1 for monthly)
 * @returns Array of payment period inputs ready to be created
 */
export function generateAmortizationPlan(
  account: InstallmentLoanAccount,
  paymentIntervalMonths: number = 1
): CreatePaymentPeriodInput[] {
  if (!account.contractStartDate) {
    throw new Error(
      'Account must have contractStartDate to generate amortization plan'
    );
  }

  const startDate =
    account.contractStartDate instanceof Date
      ? account.contractStartDate
      : account.contractStartDate.toDate();

  // Determine number of payments
  if (!account.termInPayments) {
    throw new Error(
      'Account must have termInPayments to generate amortization plan'
    );
  }
  const numberOfPayments = account.termInPayments;

  // Determine payment amount
  const monthlyPayment = account.scheduledPayment?.amount;
  if (!monthlyPayment) {
    throw new Error(
      'Account must have scheduledPayment to generate amortization plan'
    );
  }

  const currency = account.currency;
  const rate = account.annualInterestRate;
  const originalAmount =
    account.originalPrincipal?.amount ?? account.currentPrincipal?.amount ?? 0;

  if (originalAmount === 0) {
    throw new Error(
      'Account must have originalPrincipal or currentPrincipal to generate amortization plan'
    );
  }

  const periods: CreatePaymentPeriodInput[] = [];
  let remainingPrincipal = originalAmount;

  for (let periodNumber = 1; periodNumber <= numberOfPayments; periodNumber++) {
    // Calculate due date (start date + (period number - 1) * payment interval months)
    const dueDate = new Date(startDate);
    dueDate.setMonth(
      dueDate.getMonth() + (periodNumber - 1) * paymentIntervalMonths
    );

    // Calculate payment breakdown with principal reduction
    const breakdown = calculatePaymentBreakdown(
      remainingPrincipal,
      rate,
      monthlyPayment,
      currency
    );
    const capital = breakdown.capital;
    const interest = breakdown.interest;
    const periodRemainingPrincipal = Math.max(
      0,
      remainingPrincipal - breakdown.capital
    );

    // Update remaining principal for next period
    remainingPrincipal = periodRemainingPrincipal;

    // Create period input
    const period: CreatePaymentPeriodInput = {
      accountNumber: account.accountNumber ?? '',
      periodNumber,
      dueDate: Timestamp.fromDate(dueDate) as unknown as Date,
      amount: monthlyPayment,
      currency,
      capital,
      interest,
      remainingPrincipal: periodRemainingPrincipal,
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

/**
 * Calculate the monthly payment required to pay off a loan in a specific number of months
 * (PMT formula)
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate (percentage, e.g. 5.5)
 * @param months - Number of months to pay off
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (months <= 0) return principal;
  if (annualRate === 0) return principal / months;

  const monthlyRate = annualRate / 12 / 100;

  // A = P * (r * (1 + r)^N) / ((1 + r)^N - 1)
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  return principal * (numerator / denominator);
}

/**
 * Calculate the number of months required to pay off a loan with a fixed payment
 * (NPER formula)
 *
 * @param principal - Current principal amount
 * @param annualRate - Annual interest rate (percentage, e.g. 5.5)
 * @param monthlyPayment - Monthly payment amount
 * @returns Number of months (rounded up), or Infinity if payment covers interest only/less
 */
export function calculateLoanTerm(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  if (principal <= 0) return 0;
  if (annualRate === 0) {
    if (monthlyPayment <= 0) return Infinity;
    return Math.ceil(principal / monthlyPayment);
  }

  const monthlyRate = annualRate / 12 / 100;

  // Check if payment covers interest
  const monthlyInterest = principal * monthlyRate;
  if (monthlyPayment <= monthlyInterest) {
    return Infinity;
  }

  // N = -log(1 - (r * P) / A) / log(1 + r)
  const numerator = Math.log(1 - (monthlyRate * principal) / monthlyPayment);
  const denominator = Math.log(1 + monthlyRate);

  return Math.ceil(-numerator / denominator);
}
