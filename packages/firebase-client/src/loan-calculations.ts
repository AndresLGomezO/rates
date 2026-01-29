/**
 * Loan Calculation Utilities
 *
 * Helper functions for installment loan calculations including
 * payment schedules, amortization, and projections.
 */

import type {
  InstallmentLoanAccount,
  CurrencyAmount,
  PaymentFrequency,
} from './financial-accounts';
import type { Timestamp } from 'firebase/firestore';

/**
 * Single payment in an amortization schedule
 */
export interface AmortizationPayment {
  /** Payment number (1-indexed) */
  paymentNumber: number;
  /** Date when payment is due */
  date?: Timestamp | Date;
  /** Total payment amount */
  paymentAmount: CurrencyAmount;
  /** Principal component of payment */
  principalComponent: CurrencyAmount;
  /** Interest component of payment */
  interestComponent: CurrencyAmount;
  /** Remaining principal after this payment */
  remainingPrincipal: CurrencyAmount;
}

/**
 * Loan projection metrics
 */
export interface LoanProjection {
  /** Number of payments remaining */
  remainingPayments: number;
  /** Projected payoff date */
  projectedPayoffDate?: Timestamp | Date;
  /** Total interest remaining to be paid */
  totalInterestRemaining: CurrencyAmount;
}

/**
 * Convert payment frequency to number of payments per year
 */
function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'daily':
      return 365;
    case 'weekly':
      return 52;
    case 'biweekly':
      return 26;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'semi_annually':
      return 2;
    case 'annually':
      return 1;
    default:
      return 12; // default to monthly
  }
}

/**
 * Calculate the fixed periodic payment for an installment loan
 *
 * Uses the standard amortization formula:
 * P = L[c(1 + c)^n]/[(1 + c)^n - 1]
 * where:
 * - P = payment amount
 * - L = loan principal
 * - c = periodic interest rate (annual rate / payments per year)
 * - n = total number of payments
 *
 * @param principal - Principal amount (currency + value)
 * @param annualInterestRate - Nominal annual interest rate in percent (e.g. 12.5 for 12.5%)
 * @param paymentFrequency - Payment frequency (monthly, weekly, etc.)
 * @param termInPayments - Total number of payments (n)
 * @returns Scheduled payment amount per period
 */
export function calculateScheduledPayment(
  principal: CurrencyAmount,
  annualInterestRate: number,
  paymentFrequency: PaymentFrequency,
  termInPayments: number
): CurrencyAmount {
  const paymentsPerYear = getPaymentsPerYear(paymentFrequency);
  const periodicRate = annualInterestRate / 100 / paymentsPerYear;

  // Handle zero interest rate case
  if (periodicRate === 0) {
    return {
      amount: principal.amount / termInPayments,
      currency: principal.currency,
    };
  }

  // Standard amortization formula
  const numerator = periodicRate * Math.pow(1 + periodicRate, termInPayments);
  const denominator = Math.pow(1 + periodicRate, termInPayments) - 1;
  const payment = principal.amount * (numerator / denominator);

  return {
    amount: payment,
    currency: principal.currency,
  };
}

/**
 * Generate an amortization schedule for an installment loan
 *
 * @param loan - InstallmentLoanAccount with required fields
 * @param options - Optional configuration
 * @returns Array of amortization payments
 */
export function generateAmortizationSchedule(
  loan: InstallmentLoanAccount,
  options?: {
    /** Start from today instead of contract start */
    startFromToday?: boolean;
    /** Include dates in the schedule */
    includeDates?: boolean;
  }
): AmortizationPayment[] {
  // Determine principal to use
  const principal = loan.currentPrincipal ??
    loan.originalPrincipal ?? { amount: 0, currency: loan.currency };

  if (principal.amount === 0) {
    return [];
  }

  // Determine payment amount
  const payment =
    loan.scheduledPayment ??
    (loan.termInPayments
      ? calculateScheduledPayment(
          principal,
          loan.annualInterestRate,
          loan.paymentFrequency,
          loan.termInPayments
        )
      : { amount: 0, currency: loan.currency });

  if (payment.amount === 0) {
    return [];
  }

  // Determine number of payments
  const numberOfPayments =
    loan.remainingPayments ??
    loan.termInPayments ??
    Math.ceil(principal.amount / payment.amount);

  const paymentsPerYear = getPaymentsPerYear(loan.paymentFrequency);
  const periodicRate = loan.annualInterestRate / 100 / paymentsPerYear;

  const schedule: AmortizationPayment[] = [];
  let remainingPrincipal = principal.amount;

  // Determine start date for date calculations
  let currentDate: Date | undefined;
  if (options?.includeDates) {
    if (loan.nextDueDate) {
      currentDate =
        loan.nextDueDate instanceof Date
          ? loan.nextDueDate
          : loan.nextDueDate.toDate();
    } else if (loan.contractStartDate && !options.startFromToday) {
      currentDate =
        loan.contractStartDate instanceof Date
          ? loan.contractStartDate
          : loan.contractStartDate.toDate();
    } else {
      currentDate = new Date();
    }
  }

  for (let i = 1; i <= numberOfPayments; i++) {
    const interestAmount = remainingPrincipal * periodicRate;
    const principalAmount = Math.min(
      payment.amount - interestAmount,
      remainingPrincipal
    );
    remainingPrincipal = Math.max(0, remainingPrincipal - principalAmount);

    const amortizationPayment: AmortizationPayment = {
      paymentNumber: i,
      paymentAmount: payment,
      principalComponent: {
        amount: principalAmount,
        currency: principal.currency,
      },
      interestComponent: {
        amount: interestAmount,
        currency: principal.currency,
      },
      remainingPrincipal: {
        amount: remainingPrincipal,
        currency: principal.currency,
      },
    };

    // Add date if requested
    if (currentDate && options?.includeDates) {
      amortizationPayment.date = new Date(currentDate);
      // Increment date based on frequency
      switch (loan.paymentFrequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'semi_annually':
          currentDate.setMonth(currentDate.getMonth() + 6);
          break;
        case 'annually':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    schedule.push(amortizationPayment);

    // Stop if principal is paid off
    if (remainingPrincipal === 0) {
      break;
    }
  }

  return schedule;
}

/**
 * Project installment loan metrics
 *
 * @param loan - InstallmentLoanAccount
 * @returns Loan projection with remaining payments, payoff date, and interest
 */
export function projectInstallmentLoan(
  loan: InstallmentLoanAccount
): LoanProjection {
  const schedule = generateAmortizationSchedule(loan, { includeDates: true });

  const remainingPayments = schedule.length;
  const totalInterestRemaining = schedule.reduce(
    (sum, payment) => sum + payment.interestComponent.amount,
    0
  );

  const lastPayment = schedule[schedule.length - 1];
  const projectedPayoffDate = lastPayment?.date;

  return {
    remainingPayments,
    projectedPayoffDate,
    totalInterestRemaining: {
      amount: totalInterestRemaining,
      currency: loan.currency,
    },
  };
}
