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

const ACCOUNT_TYPES: AccountType[] = [
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
  monthlyPayment: number,
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
    const paymentAmount = monthlyPayment * (1 + variance);

    payments.push({
      monthPaid: `${paymentDate.getFullYear()}-${String(
        paymentDate.getMonth() + 1
      ).padStart(2, '0')}`,
      datePaid: paymentDate,
      valuePaid: Math.round(paymentAmount),
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
  const accountType = ACCOUNT_TYPES[index % ACCOUNT_TYPES.length];
  const accountName = ACCOUNT_NAMES[index % ACCOUNT_NAMES.length];
  const accountDescription =
    ACCOUNT_DESCRIPTIONS[index % ACCOUNT_DESCRIPTIONS.length];

  // Generate account creation date (within last 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const accountCreatedAt = randomDate(twoYearsAgo, new Date());

  // Generate amounts based on account type
  let originalAmount: number;
  let totalAmountRemaining: number;
  let monthlyPayment: number;
  let rate: number;

  switch (accountType) {
    case 'mortgage':
      originalAmount = randomNumber(200000000, 500000000); // 200M - 500M COP
      totalAmountRemaining = randomNumber(
        originalAmount * 0.3,
        originalAmount * 0.8
      );
      monthlyPayment = randomNumber(2000000, 5000000); // 2M - 5M COP
      rate = randomNumber(8, 12); // 8% - 12%
      break;
    case 'auto_loan':
      originalAmount = randomNumber(30000000, 80000000); // 30M - 80M COP
      totalAmountRemaining = randomNumber(
        originalAmount * 0.2,
        originalAmount * 0.7
      );
      monthlyPayment = randomNumber(1500000, 3000000); // 1.5M - 3M COP
      rate = randomNumber(10, 15); // 10% - 15%
      break;
    case 'credit_card':
      originalAmount = randomNumber(5000000, 20000000); // 5M - 20M COP
      totalAmountRemaining = randomNumber(
        originalAmount * 0.1,
        originalAmount * 0.9
      );
      monthlyPayment = randomNumber(200000, 1000000); // 200K - 1M COP
      rate = randomNumber(18, 28); // 18% - 28%
      break;
    case 'personal_loan':
    case 'loan':
    default:
      originalAmount = randomNumber(10000000, 50000000); // 10M - 50M COP
      totalAmountRemaining = randomNumber(
        originalAmount * 0.2,
        originalAmount * 0.8
      );
      monthlyPayment = randomNumber(500000, 2000000); // 500K - 2M COP
      rate = randomNumber(12, 20); // 12% - 20%
      break;
  }

  // Calculate USD equivalent (roughly 4000 COP = 1 USD)
  const exchangeRate = 4000;
  const usdAmount = Math.round(totalAmountRemaining / exchangeRate);

  // Generate payment log (number of payments made)
  const monthsSinceCreation =
    (new Date().getTime() - accountCreatedAt.getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  const numberOfPayments = Math.max(0, Math.floor(monthsSinceCreation) - 1);
  const paymentLog = generatePaymentLog(
    accountCreatedAt,
    monthlyPayment,
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

  return {
    accountNumber: `ACC-${String(index + 1).padStart(4, '0')}`,
    accountName,
    accountDescription,
    accountType,
    status,
    totalAmountRemaining: {
      amount: adjustedTotalRemaining,
      currency: 'COP',
    },
    monthlyPayment: {
      amount: monthlyPayment,
      currency: 'COP',
    },
    rate,
    nextDueDate: nextDueDate,
    paymentLog,
    originalAmount: {
      amount: originalAmount,
      currency: 'COP',
    },
    additionalAmounts: [
      {
        amount: usdAmount,
        currency: 'USD',
      },
    ],
    startDate: accountCreatedAt,
    userId,
    createdAt: accountCreatedAt,
    updatedAt: new Date(),
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
