/**
 * Revolving Credit Calculation Utilities
 *
 * Helper functions for revolving credit calculations including
 * payoff projections and payment suggestions.
 */

import type {
  RevolvingCreditAccount,
  CurrencyAmount,
} from './financial-accounts';
import type { Timestamp } from 'firebase/firestore';

/**
 * Revolving credit payoff projection
 */
export interface RevolvingPayoffProjection {
  /**
   * Estimated number of months to payoff given the fixed payment.
   * Could be fractional; round appropriately for UI.
   */
  monthsToPayoff?: number;

  /** Projected total interest paid until payoff (approximate) */
  totalInterestPaid?: CurrencyAmount;

  /** Projected payoff date (if nextDueDate or statementDayOfMonth are known) */
  projectedPayoffDate?: Timestamp | Date;

  /**
   * If the payment is too small to ever amortize the balance (e.g. less than monthly interest),
   * indicate that the balance won't be paid off.
   */
  willPayoff: boolean;
}

/**
 * Estimate payoff dynamics for a revolving credit account given a fixed monthly payment
 *
 * This uses a simplified month-by-month simulation assuming:
 * - No new purchases
 * - Interest compounds monthly
 * - Fixed payment each month
 *
 * @param account - RevolvingCreditAccount
 * @param fixedMonthlyPayment - The amount the user plans to pay every month
 * @returns Payoff projection
 */
export function projectRevolvingPayoff(
  account: RevolvingCreditAccount,
  fixedMonthlyPayment: CurrencyAmount
): RevolvingPayoffProjection {
  const balance = account.currentBalance.amount;
  const monthlyRate = account.purchaseApr / 100 / 12;
  const payment = fixedMonthlyPayment.amount;

  // Check if payment is sufficient
  const monthlyInterest = balance * monthlyRate;
  if (payment <= monthlyInterest) {
    return {
      willPayoff: false,
      monthsToPayoff: undefined,
      totalInterestPaid: undefined,
      projectedPayoffDate: undefined,
    };
  }

  // Simulate month-by-month payoff
  let remainingBalance = balance;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 1200; // 100 years safety limit

  while (remainingBalance > 0 && months < maxMonths) {
    const interest = remainingBalance * monthlyRate;
    const principalPayment = Math.min(payment - interest, remainingBalance);

    totalInterest += interest;
    remainingBalance -= principalPayment;
    months++;

    // Break if balance is negligible
    if (remainingBalance < 0.01) {
      remainingBalance = 0;
      break;
    }
  }

  // Calculate payoff date if we have a reference date
  let payoffDate: Date | undefined;
  if (account.nextDueDate) {
    payoffDate =
      account.nextDueDate instanceof Date
        ? new Date(account.nextDueDate)
        : account.nextDueDate.toDate();
    payoffDate.setMonth(payoffDate.getMonth() + months);
  } else if (account.statementDayOfMonth) {
    payoffDate = new Date();
    payoffDate.setDate(account.statementDayOfMonth);
    if (payoffDate < new Date()) {
      payoffDate.setMonth(payoffDate.getMonth() + 1);
    }
    payoffDate.setMonth(payoffDate.getMonth() + months);
  }

  return {
    willPayoff: true,
    monthsToPayoff: months,
    totalInterestPaid: {
      amount: totalInterest,
      currency: account.currency,
    },
    projectedPayoffDate: payoffDate,
  };
}

/**
 * Suggest the minimum monthly payment required to pay off the balance
 * within a target number of months (if feasible)
 *
 * Uses binary search to find the payment amount that results in
 * payoff within the target timeframe.
 *
 * @param account - RevolvingCreditAccount
 * @param targetMonths - Desired payoff horizon in months
 * @returns Suggested monthly payment amount, or null if impossible/unrealistic
 */
export function suggestPaymentForTargetMonths(
  account: RevolvingCreditAccount,
  targetMonths: number
): CurrencyAmount | null {
  if (targetMonths <= 0) {
    return null;
  }

  const balance = account.currentBalance.amount;
  const monthlyRate = account.purchaseApr / 100 / 12;

  // Calculate minimum payment (must exceed monthly interest)
  const minPayment = balance * monthlyRate + 0.01;

  // Calculate maximum reasonable payment (pay off in 1 month)
  const maxPayment = balance * (1 + monthlyRate);

  // Binary search for the right payment amount
  let low = minPayment;
  let high = maxPayment;
  const tolerance = 0.01; // $0.01 tolerance
  const maxIterations = 100;
  let iterations = 0;

  while (high - low > tolerance && iterations < maxIterations) {
    const mid = (low + high) / 2;
    const projection = projectRevolvingPayoff(account, {
      amount: mid,
      currency: account.currency,
    });

    if (!projection.willPayoff || !projection.monthsToPayoff) {
      low = mid;
    } else if (projection.monthsToPayoff > targetMonths) {
      low = mid;
    } else {
      high = mid;
    }

    iterations++;
  }

  const suggestedPayment = (low + high) / 2;

  // Verify the suggestion works
  const verification = projectRevolvingPayoff(account, {
    amount: suggestedPayment,
    currency: account.currency,
  });

  if (
    !verification.willPayoff ||
    !verification.monthsToPayoff ||
    verification.monthsToPayoff > targetMonths + 1
  ) {
    return null;
  }

  return {
    amount: Math.ceil(suggestedPayment * 100) / 100, // Round up to nearest cent
    currency: account.currency,
  };
}
