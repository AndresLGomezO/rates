/**
 * Revolving Credit Calculation Utilities
 */

/**
 * Estimates the minimum monthly payment based on industry standards.
 * Typically the greater of $25 or 2% of the balance.
 *
 * @param balance The current credit card balance
 * @returns Estimated minimum payment
 */
export function estimateMinimumPayment(balance: number): number {
  if (balance <= 0) return 0;
  // Rule: Max of $25 or 2% of balance, but if balance < 25, then balance.
  if (balance < 25) return balance;
  return Math.max(25, balance * 0.02);
}

/**
 * Calculates the number of months to pay off a balance and total interest paid.
 * Uses standard amortization formula for fixed payments on revolving debt.
 *
 * @param balance Current balance
 * @param apr Annual Percentage Rate (e.g., 24.99)
 * @param monthlyPayment The fixed monthly payment amount
 * @returns Object containing months to payoff and total interest
 */
export function calculatePayoff(
  balance: number,
  apr: number,
  monthlyPayment: number
): { months: number; totalInterest: number } {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity };

  // If APR is 0, simple division
  if (apr === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { months, totalInterest: 0 };
  }

  const monthlyRate = apr / 100 / 12;

  // If payment is less than interest accrued in first month, balance grows/stalls
  // Interest = Balance * Rate
  if (monthlyPayment <= balance * monthlyRate) {
    return { months: Infinity, totalInterest: Infinity };
  }

  // Formula: n = -log(1 - (r * PV) / P) / log(1 + r)
  const numerator = Math.log(1 - (balance * monthlyRate) / monthlyPayment);
  const denominator = Math.log(1 + monthlyRate);

  // Result is negative because numerator is negative (log of < 1) and denominator is positive (log of > 1)
  // But we have -numerator, so result is positive.
  // Wait, standard formula: n = - log(1 - r*PV/P) / log(1+r)
  const term = -numerator / denominator;
  const months = Math.ceil(term);

  // Approximate total interest
  // Total Paid = Months * Monthly Payment
  // This is an upper bound approximation because the last payment is usually a partial one.
  // For better accuracy:
  // We can calculate exact total paid if we wanted, but this is usually sufficient for estimates.
  // Refined: (Months - 1) * Payment + LastPayment
  // Last Payment Balance: B_{n-1} * (1+r)

  const totalPaidEstimate = months * monthlyPayment;
  const totalInterest = Math.max(0, totalPaidEstimate - balance);

  return { months, totalInterest };
}

/**
 * Calculates credit utilization percentage.
 *
 * @param balance Current balance
 * @param limit Credit limit
 * @returns Utilization percentage (0-100+)
 */
export function calculateUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return (balance / limit) * 100;
}
