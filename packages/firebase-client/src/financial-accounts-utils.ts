/**
 * Utility functions for Financial Accounts
 *
 * These functions help calculate derived fields and perform common operations
 */

import type {
  FinancialAccount,
  FinancialAccountCalculated,
  PaymentBreakdown,
  CurrencyAmount,
  CurrencyCode,
  PaymentLogEntry,
} from './financial-accounts';

/**
 * Calculate capital and interest split for a payment based on rate
 *
 * @param principal - Remaining principal amount
 * @param rate - Annual interest rate (as percentage, e.g., 12.5 for 12.5%)
 * @param paymentAmount - Total payment amount
 * @param currency - Currency code
 * @returns Payment breakdown with capital and interest portions
 */
export function calculatePaymentBreakdown(
  principal: number,
  rate: number,
  paymentAmount: number,
  currency: CurrencyCode
): PaymentBreakdown {
  // Convert annual rate to monthly rate
  const monthlyRate = rate / 100 / 12;

  // Calculate interest portion
  const interest = principal * monthlyRate;

  // Calculate capital portion (payment - interest)
  const capital = Math.max(0, paymentAmount - interest);

  return {
    capital,
    interest,
    total: paymentAmount,
    currency,
  };
}

/**
 * Calculate days remaining until a due date
 *
 * @param dueDate - Next due date
 * @returns Number of days remaining (can be negative if overdue)
 */
export function calculateDaysRemaining(dueDate: Date | string): number {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get month string in YYYY-MM format
 *
 * @param date - Date to extract month from
 * @returns Month string in YYYY-MM format
 */
export function getMonthString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate all derived/calculated fields for a financial account
 *
 * @param account - Financial account document
 * @returns Calculated fields
 */
export function calculateAccountFields(
  account: FinancialAccount
): FinancialAccountCalculated {
  const nextDueDate =
    account.nextDueDate instanceof Date
      ? account.nextDueDate
      : account.nextDueDate.toDate();

  const daysRemaining = calculateDaysRemaining(nextDueDate);
  const nextDueDateMonth = getMonthString(nextDueDate);

  // Calculate monthly capital and interest breakdown
  const breakdown = calculatePaymentBreakdown(
    account.totalAmountRemaining.amount,
    account.rate,
    account.monthlyPayment.amount,
    account.monthlyPayment.currency
  );

  const monthlyCapital: CurrencyAmount = {
    amount: breakdown.capital,
    currency: breakdown.currency,
  };

  const monthlyInterest: CurrencyAmount = {
    amount: breakdown.interest,
    currency: breakdown.currency,
  };

  // Calculate total amounts by currency
  const totalAmountsByCurrency: Record<CurrencyCode, number> = {
    [account.totalAmountRemaining.currency]:
      account.totalAmountRemaining.amount,
  };

  if (account.additionalAmounts) {
    account.additionalAmounts.forEach((amt) => {
      if (totalAmountsByCurrency[amt.currency]) {
        totalAmountsByCurrency[amt.currency] += amt.amount;
      } else {
        totalAmountsByCurrency[amt.currency] = amt.amount;
      }
    });
  }

  // Calculate total paid from payment log
  const primaryCurrency = account.totalAmountRemaining.currency;
  let totalPaidAmount = 0;
  let totalInterestPaid = 0;
  let totalCapitalPaid = 0;

  account.paymentLog.forEach((entry) => {
    if (entry.currency === primaryCurrency) {
      totalPaidAmount += entry.valuePaid;

      // Estimate interest vs capital for each payment
      // This is a simplified calculation - you may want to track this per payment
      const entryBreakdown = calculatePaymentBreakdown(
        account.originalAmount?.amount ??
          account.totalAmountRemaining.amount + totalPaidAmount,
        account.rate,
        entry.valuePaid,
        entry.currency
      );
      totalInterestPaid += entryBreakdown.interest;
      totalCapitalPaid += entryBreakdown.capital;
    }
  });

  const totalPaid: CurrencyAmount = {
    amount: totalPaidAmount,
    currency: primaryCurrency,
  };

  const totalInterestPaidAmount: CurrencyAmount = {
    amount: totalInterestPaid,
    currency: primaryCurrency,
  };

  const totalCapitalPaidAmount: CurrencyAmount = {
    amount: totalCapitalPaid,
    currency: primaryCurrency,
  };

  // Calculate remaining balance percentage
  const originalAmount =
    account.originalAmount?.amount ??
    account.totalAmountRemaining.amount + totalPaidAmount;
  const remainingBalancePercentage =
    originalAmount > 0
      ? (account.totalAmountRemaining.amount / originalAmount) * 100
      : 0;

  // Estimate payoff date (simplified - assumes fixed monthly payments)
  let estimatedPayoffDate: Date | undefined;
  if (
    account.monthlyPayment.amount > 0 &&
    account.totalAmountRemaining.amount > 0
  ) {
    const monthsRemaining = Math.ceil(
      account.totalAmountRemaining.amount / account.monthlyPayment.amount
    );
    estimatedPayoffDate = new Date(nextDueDate);
    estimatedPayoffDate.setMonth(
      estimatedPayoffDate.getMonth() + monthsRemaining
    );
  }

  return {
    daysRemainingToDueDate: daysRemaining,
    nextDueDateMonth,
    monthlyCapital,
    monthlyInterest,
    totalAmountsByCurrency,
    totalPaid,
    remainingBalancePercentage,
    estimatedPayoffDate,
    totalInterestPaid: totalInterestPaidAmount,
    totalCapitalPaid: totalCapitalPaidAmount,
  };
}

/**
 * Get account with all calculated fields
 *
 * @param account - Financial account document
 * @returns Account with calculated fields
 */
export function getAccountWithCalculated(
  account: FinancialAccount
): FinancialAccount & FinancialAccountCalculated {
  const calculated = calculateAccountFields(account);
  return {
    ...account,
    ...calculated,
  };
}

/**
 * Validate a financial account document
 *
 * @param account - Account to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateFinancialAccount(
  account: Partial<FinancialAccount>
): string[] {
  const errors: string[] = [];

  if (!account.accountNumber) {
    errors.push('accountNumber is required');
  }

  if (!account.accountName) {
    errors.push('accountName is required');
  }

  if (!account.accountType) {
    errors.push('accountType is required');
  }

  if (!account.status) {
    errors.push('status is required');
  }

  if (!account.totalAmountRemaining) {
    errors.push('totalAmountRemaining is required');
  } else {
    if (typeof account.totalAmountRemaining.amount !== 'number') {
      errors.push('totalAmountRemaining.amount must be a number');
    }
    if (!account.totalAmountRemaining.currency) {
      errors.push('totalAmountRemaining.currency is required');
    }
  }

  if (!account.monthlyPayment) {
    errors.push('monthlyPayment is required');
  } else {
    if (typeof account.monthlyPayment.amount !== 'number') {
      errors.push('monthlyPayment.amount must be a number');
    }
    if (!account.monthlyPayment.currency) {
      errors.push('monthlyPayment.currency is required');
    }
  }

  if (typeof account.rate !== 'number') {
    errors.push('rate must be a number');
  }

  if (!account.nextDueDate) {
    errors.push('nextDueDate is required');
  }

  if (!account.userId) {
    errors.push('userId is required');
  }

  if (!Array.isArray(account.paymentLog)) {
    errors.push('paymentLog must be an array');
  }

  return errors;
}

/**
 * Create a new payment log entry
 *
 * @param valuePaid - Amount paid
 * @param currency - Currency code
 * @param datePaid - Date of payment (defaults to now)
 * @param notes - Optional notes
 * @returns Payment log entry
 */
export function createPaymentLogEntry(
  valuePaid: number,
  currency: CurrencyCode,
  datePaid: Date = new Date(),
  notes?: string
): PaymentLogEntry {
  return {
    monthPaid: getMonthString(datePaid),
    datePaid,
    valuePaid,
    currency,
    notes,
    createdAt: new Date(),
  };
}

/**
 * Convert currency amount to another currency
 * Note: This is a placeholder - you'll need to implement actual exchange rate logic
 *
 * @param amount - Currency amount to convert
 * @param targetCurrency - Target currency code
 * @param exchangeRate - Exchange rate (amount in target currency per 1 unit of source currency)
 * @returns Converted currency amount
 */
export function convertCurrency(
  amount: CurrencyAmount,
  targetCurrency: CurrencyCode,
  exchangeRate: number
): CurrencyAmount {
  return {
    amount: amount.amount * exchangeRate,
    currency: targetCurrency,
  };
}
