/**
 * Revolving Credit Calculation Utilities
 *
 * Helper functions for revolving credit calculations including
 * payoff projections and payment suggestions.
 */

import type {
  RevolvingCreditAccount,
  CurrencyAmount,
} from './financial-accounts.js';
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
  } else {
    // Fallback to today + months if no due date known
    payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
  }

  const isPaidOff = remainingBalance <= 0.01;

  return {
    willPayoff: isPaidOff,
    monthsToPayoff: isPaidOff ? months : undefined,
    totalInterestPaid: isPaidOff
      ? {
          amount: totalInterest,
          currency: account.currency,
        }
      : undefined,
    projectedPayoffDate: isPaidOff ? payoffDate : undefined,
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

/**
 * Declining Payment Payoff Simulation Result
 */
export interface DecliningPayoffProjection {
  /** Number of months until paid off */
  monthsToPayoff: number;
  /** Total interest paid over the life */
  totalInterestPaid: CurrencyAmount;
  /** Total amount paid (principal + interest) */
  totalPaid: CurrencyAmount;
  /** Projected payoff date */
  projectedPayoffDate?: Date;
  /** True if the balance will ever be paid off */
  willPayoff: boolean;
}

/**
 * Simulate payoff where the user only pays the Minimum Payment each month.
 * The minimum payment usually declines as the balance declines.
 *
 * Strategy:
 * payment = max(fixedFloor, balance * percentage + interest?)
 * Common: max($25, balance * 2%)
 */
export function simulateDecliningPaymentPayoff(
  account: RevolvingCreditAccount,
  options?: { minPaymentPercentage?: number; minPaymentFloor?: number }
): DecliningPayoffProjection {
  const balance = account.currentBalance.amount;
  const currency = account.currency;
  const monthlyRate = account.purchaseApr / 100 / 12;

  // Heuristic for minimum payment if not specified
  const minFloor = options?.minPaymentFloor ?? 25; // Standard $25 floor
  const minPercent = options?.minPaymentPercentage ?? 0.02; // Standard 2% of balance

  let remainingBalance = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  const maxMonths = 1200; // 100 years cap

  while (remainingBalance > 0.01 && months < maxMonths) {
    const interest = remainingBalance * monthlyRate;

    // Calculate minimum payment for this month based on current balance
    // Most issuers: Max($25, Balance * 1-3%) + sometimes interest
    // Simplification: Max($25, Balance * 2%)
    let payment = Math.max(minFloor, remainingBalance * minPercent);

    // Some issuers require Interest + 1% of balance.
    // Let's stick to the heuristic or try to derive from currentMinimumPayment?
    // Deriving is hard without history.
    // If currentMinimumPayment is available and ratio matches, we could tune it.

    // Ensure payment covers at least the interest if we want to be generous?
    // Actually, minimum payments OFTEN barely cover interest.
    // But they usually have a floor.

    // Final check: don't pay more than remaining balance + interest
    if (payment > remainingBalance + interest) {
      payment = remainingBalance + interest;
    }

    const principalPaid = Math.max(0, payment - interest); // Can be negative effectively if interest > payment, balance grows?
    // Usually banks don't allow min payment < interest unless promo.
    // If payment < interest, balance grows.

    remainingBalance = remainingBalance - principalPaid;
    if (payment < interest) {
      remainingBalance += interest - payment; // Add unpaid interest to balance
    }

    totalInterest += interest;
    totalPaid += payment;
    months++;
  }

  // Calculate generic payoff date (starting from today roughly)
  const today = new Date();
  const payoffDate = new Date(today.setMonth(today.getMonth() + months));

  return {
    willPayoff: months < maxMonths,
    monthsToPayoff: months,
    totalInterestPaid: { amount: totalInterest, currency },
    totalPaid: { amount: totalPaid, currency },
    projectedPayoffDate: payoffDate,
  };
}

/**
 * Credit Utilization Metrics
 */
export interface UtilizationMetrics {
  currentUtilization: number; // 0-100
  utilizationZone: 'excellent' | 'good' | 'high' | 'very_high' | 'critical';
  availableCredit: CurrencyAmount;
  amountToReachZone: {
    good: number | null; // Amount to pay to reach <30%
    excellent: number | null; // Amount to pay to reach <10%
  };
}

/**
 * Calculate standard credit utilization metrics from balance and limit
 */
export function calculateUtilizationMetrics(
  account: RevolvingCreditAccount
): UtilizationMetrics | null {
  if (!account.creditLimit || account.creditLimit.amount <= 0) {
    return null;
  }

  const limit = account.creditLimit.amount;
  const balance = account.currentBalance.amount;
  const ratio = (balance / limit) * 100;

  let zone: UtilizationMetrics['utilizationZone'] = 'excellent';
  if (ratio > 75) zone = 'critical';
  else if (ratio > 50) zone = 'very_high';
  else if (ratio > 30) zone = 'high';
  else if (ratio > 10) zone = 'good';

  const amountToGood = Math.max(0, balance - limit * 0.3);
  const amountToExcellent = Math.max(0, balance - limit * 0.1);

  return {
    currentUtilization: Math.min(100, Math.max(0, ratio)),
    utilizationZone: zone,
    availableCredit: {
      amount: Math.max(0, limit - balance),
      currency: account.currency,
    },
    amountToReachZone: {
      good: ratio > 30 ? amountToGood : null,
      excellent: ratio > 10 ? amountToExcellent : null,
    },
  };
}
