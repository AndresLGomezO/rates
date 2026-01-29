/**
 * Financial Accounts Utilities
 *
 * Helper functions for calculating derived fields, validating accounts,
 * and managing payment logs.
 */

import type {
  FinancialAccount,
  InstallmentLoanAccount,
  RevolvingCreditAccount,
  BillAccount,
  CurrencyAmount,
  PaymentLogEntry,
  PaymentBreakdown,
  CurrencyCode,
  FinancialAccountCalculated,
} from './financial-accounts';

/**
 * Calculate capital and interest split for a payment based on rate
 *
 * @param principal - Remaining principal amount
 * @param rate - Monthly interest rate (as percentage, e.g., 0.77 for 0.77% per month)
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
  // Convert percentage rate to decimal (e.g., 0.77% -> 0.0077)
  const monthlyRate = rate / 100;

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
  // Get next due date based on account type
  let nextDueDate: Date | undefined;
  if (
    account.accountType === 'installment_loan' ||
    account.accountType === 'revolving_credit'
  ) {
    if (account.nextDueDate) {
      nextDueDate =
        account.nextDueDate instanceof Date
          ? account.nextDueDate
          : account.nextDueDate.toDate();
    }
  } else if (account.accountType === 'bill') {
    nextDueDate =
      account.nextDueDate instanceof Date
        ? account.nextDueDate
        : account.nextDueDate.toDate();
  } else if (account.accountType === 'other' && account.nextRelevantDate) {
    nextDueDate =
      account.nextRelevantDate instanceof Date
        ? account.nextRelevantDate
        : account.nextRelevantDate.toDate();
  }

  const daysRemaining = nextDueDate ? calculateDaysRemaining(nextDueDate) : 0;
  const nextDueDatePeriod = nextDueDate ? getMonthString(nextDueDate) : '';

  // Calculate periodic capital and interest breakdown (for loans only)
  let periodicCapital: CurrencyAmount = {
    amount: 0,
    currency: account.currency,
  };
  let periodicInterest: CurrencyAmount = {
    amount: 0,
    currency: account.currency,
  };

  if (account.accountType === 'installment_loan') {
    const principal =
      account.currentPrincipal?.amount ??
      account.originalPrincipal?.amount ??
      0;
    const payment = account.scheduledPayment?.amount ?? 0;

    if (principal > 0 && payment > 0) {
      const breakdown = calculatePaymentBreakdown(
        principal,
        account.annualInterestRate / 12, // Convert annual to monthly
        payment,
        account.currency
      );
      periodicCapital = {
        amount: breakdown.capital,
        currency: breakdown.currency,
      };
      periodicInterest = {
        amount: breakdown.interest,
        currency: breakdown.currency,
      };
    }
  }

  // Calculate total amounts by currency
  const totalAmountsByCurrency: Record<CurrencyCode, number> = {};

  switch (account.accountType) {
    case 'installment_loan': {
      const loanAmount =
        account.currentPrincipal?.amount ??
        account.originalPrincipal?.amount ??
        0;
      totalAmountsByCurrency[account.currency] = loanAmount;
      break;
    }
    case 'revolving_credit':
      totalAmountsByCurrency[account.currency] = account.currentBalance.amount;
      break;
    case 'other':
      if (account.currentAmount) {
        totalAmountsByCurrency[account.currency] = account.currentAmount.amount;
      }
      break;
    case 'bill':
      // Bills don't have a "total amount remaining" concept
      if (account.recurringAmount) {
        totalAmountsByCurrency[account.currency] =
          account.recurringAmount.amount;
      }
      break;
  }

  // Calculate total paid from payment log
  const primaryCurrency = account.currency;
  let totalPaidAmount = 0;
  let totalInterestPaid = 0;
  let totalCapitalPaid = 0;

  account.paymentLog.forEach((entry) => {
    if (entry.currency === primaryCurrency) {
      totalPaidAmount += entry.valuePaid;

      // Estimate interest vs capital for each payment (for loans only)
      if (account.accountType === 'installment_loan') {
        const originalAmount =
          account.originalPrincipal?.amount ??
          (account.currentPrincipal?.amount ?? 0) + totalPaidAmount;
        const entryBreakdown = calculatePaymentBreakdown(
          originalAmount,
          account.annualInterestRate / 12, // Convert annual to monthly
          entry.valuePaid,
          entry.currency
        );
        totalInterestPaid += entryBreakdown.interest;
        totalCapitalPaid += entryBreakdown.capital;
      } else {
        // For non-loans, all payment is "capital"
        totalCapitalPaid += entry.valuePaid;
      }
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
  let remainingBalancePercentage = 0;
  if (account.accountType === 'installment_loan') {
    const originalAmount =
      account.originalPrincipal?.amount ??
      (account.currentPrincipal?.amount ?? 0) + totalPaidAmount;
    const currentAmount = account.currentPrincipal?.amount ?? 0;
    remainingBalancePercentage =
      originalAmount > 0 ? (currentAmount / originalAmount) * 100 : 0;
  } else if (
    account.accountType === 'revolving_credit' &&
    account.creditLimit
  ) {
    // For credit, show utilization percentage
    remainingBalancePercentage =
      account.creditLimit.amount > 0
        ? (account.currentBalance.amount / account.creditLimit.amount) * 100
        : 0;
  }

  // Estimate payoff date
  let estimatedPayoffDate: Date | undefined;
  if (account.accountType === 'installment_loan' && nextDueDate) {
    const payment = account.scheduledPayment?.amount ?? 0;
    const currentAmount = account.currentPrincipal?.amount ?? 0;
    if (payment > 0 && currentAmount > 0) {
      const monthsRemaining = Math.ceil(currentAmount / payment);
      estimatedPayoffDate = new Date(nextDueDate);
      estimatedPayoffDate.setMonth(
        estimatedPayoffDate.getMonth() + monthsRemaining
      );
    }
  } else if (account.accountType === 'revolving_credit' && nextDueDate) {
    const payment =
      account.userPlannedPayment?.amount ??
      account.currentMinimumPayment?.amount ??
      0;
    const balance = account.currentBalance.amount;
    if (payment > 0 && balance > 0) {
      // Simplified estimate (doesn't account for interest)
      const monthsRemaining = Math.ceil(balance / payment);
      estimatedPayoffDate = new Date(nextDueDate);
      estimatedPayoffDate.setMonth(
        estimatedPayoffDate.getMonth() + monthsRemaining
      );
    }
  }

  return {
    daysRemainingToDueDate: daysRemaining,
    nextDueDatePeriod,
    periodicCapital,
    periodicInterest,
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

  // Common fields
  if (!account.accountName) {
    errors.push('accountName is required');
  }

  if (!account.accountType) {
    errors.push('accountType is required');
    return errors; // Can't validate further without account type
  }

  if (!account.status) {
    errors.push('status is required');
  }

  if (!account.currency) {
    errors.push('currency is required');
  }

  if (!account.userId) {
    errors.push('userId is required');
  }

  if (!Array.isArray(account.paymentLog)) {
    errors.push('paymentLog must be an array');
  }

  // Type-specific validation
  switch (account.accountType) {
    case 'installment_loan': {
      const loan = account as Partial<InstallmentLoanAccount>;

      if (!loan.loanSubtype) {
        errors.push('loanSubtype is required for installment loans');
      }

      if (typeof loan.annualInterestRate !== 'number') {
        errors.push(
          'annualInterestRate must be a number for installment loans'
        );
      }

      if (!loan.paymentFrequency) {
        errors.push('paymentFrequency is required for installment loans');
      }

      // Either originalPrincipal or currentPrincipal required
      if (!loan.originalPrincipal && !loan.currentPrincipal) {
        errors.push(
          'Either originalPrincipal or currentPrincipal is required for installment loans'
        );
      }

      // Validate CurrencyAmount fields
      if (loan.originalPrincipal) {
        if (typeof loan.originalPrincipal.amount !== 'number') {
          errors.push('originalPrincipal.amount must be a number');
        }
        if (!loan.originalPrincipal.currency) {
          errors.push('originalPrincipal.currency is required');
        }
      }

      if (loan.currentPrincipal) {
        if (typeof loan.currentPrincipal.amount !== 'number') {
          errors.push('currentPrincipal.amount must be a number');
        }
        if (!loan.currentPrincipal.currency) {
          errors.push('currentPrincipal.currency is required');
        }
      }

      if (loan.scheduledPayment) {
        if (typeof loan.scheduledPayment.amount !== 'number') {
          errors.push('scheduledPayment.amount must be a number');
        }
        if (!loan.scheduledPayment.currency) {
          errors.push('scheduledPayment.currency is required');
        }
      }
      break;
    }

    case 'revolving_credit': {
      const credit = account as Partial<RevolvingCreditAccount>;

      if (!credit.creditSubtype) {
        errors.push('creditSubtype is required for revolving credit');
      }

      if (!credit.currentBalance) {
        errors.push('currentBalance is required for revolving credit');
      } else {
        if (typeof credit.currentBalance.amount !== 'number') {
          errors.push('currentBalance.amount must be a number');
        }
        if (!credit.currentBalance.currency) {
          errors.push('currentBalance.currency is required');
        }
      }

      if (typeof credit.purchaseApr !== 'number') {
        errors.push('purchaseApr must be a number for revolving credit');
      }

      // Either nextDueDate or statementDayOfMonth required
      if (!credit.nextDueDate && !credit.statementDayOfMonth) {
        errors.push(
          'Either nextDueDate or statementDayOfMonth is required for revolving credit'
        );
      }
      break;
    }

    case 'bill': {
      const bill = account as Partial<BillAccount>;

      if (!bill.billSubtype) {
        errors.push('billSubtype is required for bills');
      }

      if (typeof bill.isRecurring !== 'boolean') {
        errors.push('isRecurring must be a boolean for bills');
      }

      if (!bill.nextDueDate) {
        errors.push('nextDueDate is required for bills');
      }

      if (bill.isRecurring && !bill.isAmountVariable) {
        // Fixed recurring bills need recurringAmount
        if (!bill.recurringAmount) {
          errors.push('recurringAmount is required for fixed recurring bills');
        } else {
          if (typeof bill.recurringAmount.amount !== 'number') {
            errors.push('recurringAmount.amount must be a number');
          }
          if (!bill.recurringAmount.currency) {
            errors.push('recurringAmount.currency is required');
          }
        }

        if (!bill.paymentFrequency) {
          errors.push('paymentFrequency is required for recurring bills');
        }
      }
      break;
    }

    case 'other': {
      // Other accounts have minimal requirements
      // All common fields are already validated above
      break;
    }

    default: {
      // Exhaustive check
      const _exhaustiveCheck: never = account.accountType;
      errors.push(`Unknown account type: ${_exhaustiveCheck}`);
    }
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
