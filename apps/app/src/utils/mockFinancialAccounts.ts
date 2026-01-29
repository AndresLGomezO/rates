/**
 * Mock data generator for Financial Accounts
 *
 * Generates fake financial account data for testing and development
 */

import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
  PaymentLogEntry,
} from '@rates/firebase-client';

const ACCOUNT_NAMES = [
  'Personal Loan - Bank ABC',
  'Credit Card - Visa',
  'Mortgage - Home Loan',
  'Auto Loan - Car Payment',
  'Credit Card - Mastercard',
  'Student Loan',
  'Personal Loan - Bank XYZ',
  'Credit Card - Amex',
];

const ACCOUNT_DESCRIPTIONS = [
  'Personal loan for home improvement',
  'Primary credit card for daily expenses',
  '30-year fixed mortgage',
  'Car loan for 2020 Honda Civic',
  'Business credit card',
  'Federal student loan',
  'Emergency personal loan',
  'Travel rewards credit card',
];

// Old types used for mapping index to new types
const MOCK_TYPES = [
  'personal_loan',
  'credit_card',
  'mortgage',
  'auto_loan',
  'credit_card',
  'loan',
  'personal_loan',
  'credit_card',
];

/**
 * Generate a random number between min and max (inclusive)
 */
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random date within the last year
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

/**
 * Generate a future due date (within next 60 days)
 */
function generateDueDate(): Date {
  const today = new Date();
  const daysAhead = randomNumber(1, 60);
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + daysAhead);
  return dueDate;
}

/**
 * Generate payment log entries for an account
 */
function generatePaymentLog(
  accountCreatedAt: Date,
  paymentAmount: number,
  currency: string,
  numberOfPayments: number
): PaymentLogEntry[] {
  const payments: PaymentLogEntry[] = [];
  const today = new Date();

  for (let i = 0; i < numberOfPayments; i++) {
    const paymentDate = new Date(accountCreatedAt);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    // Don't generate future payments
    if (paymentDate > today) {
      break;
    }

    // Add some randomness to payment amounts (±10%)
    const variance = randomNumber(-10, 10) / 100;
    const amount = paymentAmount * (1 + variance);

    payments.push({
      monthPaid: `${paymentDate.getFullYear()}-${String(
        paymentDate.getMonth() + 1
      ).padStart(2, '0')}`,
      datePaid: paymentDate,
      valuePaid: Math.round(amount),
      currency,
      notes: `Payment ${i + 1}`,
      createdAt: paymentDate,
    });
  }

  return payments;
}

/**
 * Generate a single mock financial account
 */
export function generateMockFinancialAccount(
  userId: string,
  index: number
): FinancialAccount {
  const mockType = MOCK_TYPES[index % MOCK_TYPES.length];
  const accountName = ACCOUNT_NAMES[index % ACCOUNT_NAMES.length];
  const accountDescription =
    ACCOUNT_DESCRIPTIONS[index % ACCOUNT_DESCRIPTIONS.length];

  // Map old types to new types
  let accountType: AccountType;
  switch (mockType) {
    case 'mortgage':
    case 'auto_loan':
    case 'personal_loan':
    case 'loan':
      accountType = 'installment_loan';
      break;
    case 'credit_card':
      accountType = 'revolving_credit';
      break;
    default:
      accountType = 'installment_loan';
  }

  // Generate account creation date (within last 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const accountCreatedAt = randomDate(twoYearsAgo, new Date());

  // Generate amounts based on account type
  let originalAmount: number;
  let paymentAmount: number;
  let rate: number;

  switch (mockType) {
    case 'mortgage':
      originalAmount = randomNumber(200000000, 500000000); // 200M - 500M COP
      paymentAmount = randomNumber(2000000, 5000000); // 2M - 5M COP
      rate = randomNumber(8, 12); // 8% - 12%
      break;
    case 'auto_loan':
      originalAmount = randomNumber(30000000, 80000000); // 30M - 80M COP
      paymentAmount = randomNumber(1500000, 3000000); // 1.5M - 3M COP
      rate = randomNumber(10, 15); // 10% - 15%
      break;
    case 'credit_card':
      originalAmount = randomNumber(5000000, 20000000); // 5M - 20M COP
      paymentAmount = randomNumber(200000, 1000000); // 200K - 1M COP
      rate = randomNumber(18, 28); // 18% - 28%
      break;
    default:
      originalAmount = randomNumber(10000000, 50000000); // 10M - 50M COP
      paymentAmount = randomNumber(500000, 2000000); // 500K - 2M COP
      rate = randomNumber(12, 20); // 12% - 20%
      break;
  }

  // Calculate USD equivalent (roughly 4000 COP = 1 USD)
  // Calculate USD equivalent (roughly 4000 COP = 1 USD)
  // const usdAmount = Math.round(totalAmountRemaining / 4000); // Unused for now in new schema

  // Generate payment log (number of payments made)
  const monthsSinceCreation =
    (new Date().getTime() - accountCreatedAt.getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  const numberOfPayments = Math.max(0, Math.floor(monthsSinceCreation) - 1);
  const paymentLog = generatePaymentLog(
    accountCreatedAt,
    paymentAmount,
    'COP',
    numberOfPayments
  );

  // Calculate total paid from payment log
  const totalPaid = paymentLog.reduce(
    (sum, payment) => sum + payment.valuePaid,
    0
  );

  // Adjust total amount remaining based on payments
  const adjustedTotalRemaining = Math.max(0, originalAmount - totalPaid);

  // Generate status based on remaining amount
  let status: AccountStatus;
  if (adjustedTotalRemaining <= 0) {
    status = 'paid_off';
  } else if (adjustedTotalRemaining < originalAmount * 0.1) {
    status = 'active';
  } else {
    status = randomNumber(0, 10) > 8 ? 'on_hold' : 'active';
  }

  // Generate next due date
  const nextDueDate = generateDueDate();

  const baseAccount = {
    accountNumber: `ACC-${String(index + 1).padStart(4, '0')}`,
    accountName,
    accountDescription,
    status,
    currency: 'COP',
    paymentLog,
    userId,
    createdAt: accountCreatedAt,
    updatedAt: new Date(),
  };

  if (accountType === 'installment_loan') {
    return {
      ...baseAccount,
      accountType: 'installment_loan',
      loanSubtype:
        mockType === 'mortgage'
          ? 'mortgage'
          : mockType === 'auto_loan'
            ? 'auto'
            : 'personal',
      originalPrincipal: { amount: originalAmount, currency: 'COP' },
      currentPrincipal: { amount: adjustedTotalRemaining, currency: 'COP' },
      annualInterestRate: rate,
      paymentFrequency: 'monthly',
      nextDueDate,
      termInPayments: 60,
      scheduledPayment: { amount: paymentAmount, currency: 'COP' },
      contractStartDate: accountCreatedAt,
    };
  } else if (accountType === 'revolving_credit') {
    return {
      ...baseAccount,
      accountType: 'revolving_credit',
      creditSubtype: 'credit_card',
      creditLimit: { amount: originalAmount, currency: 'COP' },
      currentBalance: { amount: adjustedTotalRemaining, currency: 'COP' },
      purchaseApr: rate,
      currentMinimumPayment: { amount: paymentAmount, currency: 'COP' },
      nextDueDate,
    };
  }

  // Fallback
  return {
    ...baseAccount,
    accountType: 'installment_loan',
    loanSubtype: 'personal',
    originalPrincipal: { amount: originalAmount, currency: 'COP' },
    currentPrincipal: { amount: adjustedTotalRemaining, currency: 'COP' },
    annualInterestRate: rate,
    paymentFrequency: 'monthly',
    nextDueDate,
    termInPayments: 60,
    scheduledPayment: { amount: paymentAmount, currency: 'COP' },
    contractStartDate: accountCreatedAt,
  };
}

/**
 * Generate multiple mock financial accounts
 */
export function generateMockFinancialAccounts(
  userId: string,
  count: number = 5
): FinancialAccount[] {
  return Array.from({ length: count }, (_, index) =>
    generateMockFinancialAccount(userId, index)
  );
}
