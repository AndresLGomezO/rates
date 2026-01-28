/**
 * Migration script to import initial accounts from spreadsheet data
 */

import type { CreateFinancialAccountInput } from '@rates/firebase-client';
import {
  createFinancialAccount,
  getFinancialAccount,
} from '../services/financialAccounts';
import {
  getPaymentPeriods,
  logPaymentToPeriod,
} from '../services/paymentPeriods';
import { parseMonthYear } from './paymentUtils';
import type { PaymentFrequency, PaymentPeriod } from '@rates/firebase-client';

/**
 * Raw account data from spreadsheet
 */
interface RawAccountData {
  due_date: string; // YYYY-MM-DD format
  name: string;
  start_date: string; // YYYY-MM-DD format
  frequency: string; // "Mensual", "Bimestral", "Unico pago"
  total_periods: number | 'periodic'; // Number of periods or "periodic" for bills
  initial_amount: number;
  current_amount: number | null;
  principal: number | null; // Capital portion of payment
  interest: number | null; // Interest portion of payment
  payment: number; // Total payment amount
  interest_rate: number; // Interest rate as decimal (e.g., 0.0084 = 0.84%)
}

/**
 * Parse date from YYYY-MM-DD format
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get payment interval in months based on frequency
 */
function getPaymentIntervalMonths(frequency: string): number {
  const freq = frequency.toLowerCase();
  if (freq.includes('mensual') || freq.includes('monthly')) {
    return 1;
  }
  if (freq.includes('bimestral') || freq.includes('bimonthly')) {
    return 2;
  }
  if (freq.includes('trimestral') || freq.includes('quarterly')) {
    return 3;
  }
  if (freq.includes('semestral') || freq.includes('semiannual')) {
    return 6;
  }
  if (freq.includes('anual') || freq.includes('annual')) {
    return 12;
  }
  // Default to monthly
  return 1;
}

/**
 * Get payment frequency enum from frequency string
 */
function getPaymentFrequency(frequency: string): PaymentFrequency {
  const freq = frequency.toLowerCase();

  if (freq.includes('semanal') || freq.includes('weekly')) {
    return 'weekly';
  }
  if (freq.includes('quincenal') || freq.includes('biweekly')) {
    return 'biweekly';
  }
  if (freq.includes('trimestral') || freq.includes('quarterly')) {
    return 'quarterly';
  }
  if (freq.includes('semestral') || freq.includes('semiannual')) {
    return 'semi_annually';
  }
  if (freq.includes('anual') || freq.includes('annual')) {
    return 'annually';
  }

  // Default to monthly (includes 'mensual', 'bimestral', etc. until supported)
  return 'monthly';
}

/**
 * Map account name to account type
 */
function mapAccountType(
  accountName: string
):
  | 'loan'
  | 'credit_card'
  | 'bill'
  | 'mortgage'
  | 'personal_loan'
  | 'auto_loan'
  | 'other' {
  const name = accountName.toLowerCase();

  if (name.includes('hipotecario')) {
    return 'mortgage';
  }
  if (name.includes('tc ') || name.includes('tarjeta')) {
    return 'credit_card';
  }
  if (name.includes('auto') || name.includes('prestamo auto')) {
    return 'auto_loan';
  }
  if (name.includes('prestamo')) {
    return 'personal_loan';
  }
  if (name.includes('ahorro') || name.includes('scaleno')) {
    return 'other'; // Savings accounts
  }
  if (
    name.includes('planilla') ||
    name.includes('administracion') ||
    name.includes('agua') ||
    name.includes('luz') ||
    name.includes('gas') ||
    name.includes('internet') ||
    name.includes('cel')
  ) {
    return 'bill';
  }
  if (name.includes('crediservice')) {
    return 'loan';
  }

  return 'other';
}

/**
 * Generate account number from account name
 */
function generateAccountNumber(accountName: string, index: number): string {
  // Create a sanitized version of the account name
  const sanitized = accountName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${sanitized}-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Convert raw account data to CreateFinancialAccountInput (without userId)
 */
function convertToAccountInput(
  raw: RawAccountData,
  index: number
): Omit<CreateFinancialAccountInput, 'userId'> {
  const accountType = mapAccountType(raw.name);
  const accountNumber = generateAccountNumber(raw.name, index);

  // Parse amounts (already numbers in new format)
  const totalAmount = raw.current_amount ?? 0;
  const monthlyPaymentAmount = raw.payment ?? 0;
  const capitalPortion = raw.principal ?? 0;
  const interestPortion = raw.interest ?? 0;

  // Convert interest rate from decimal to percentage (e.g., 0.0084 -> 0.84)
  const rate = (raw.interest_rate ?? 0) * 100;

  // Determine status
  let status: 'active' | 'paid_off' | 'closed' | 'defaulted' | 'on_hold' =
    'active';
  if (totalAmount === 0 && monthlyPaymentAmount === 0) {
    status = 'paid_off';
  } else if (totalAmount === 0 && monthlyPaymentAmount > 0) {
    status = 'active'; // Bill with no balance but recurring payment
  }

  const account: Omit<CreateFinancialAccountInput, 'userId'> = {
    accountNumber,
    accountName: raw.name,
    accountDescription: `${raw.name} - Migrated from initial data`,
    accountType,
    status,
    totalAmountRemaining: {
      amount: totalAmount,
      currency: 'COP',
    },
    paymentAmount: {
      amount: monthlyPaymentAmount,
      currency: 'COP',
    },
    paymentFrequency: getPaymentFrequency(raw.frequency),
    rate, // Interest rate as percentage
    nextDueDate: parseDate(raw.due_date),
    paymentLog: [],
  };

  // Set start date if available
  if (raw.start_date) {
    account.startDate = parseDate(raw.start_date);
  }

  // Set number of payments if not periodic
  if (
    raw.total_periods !== 'periodic' &&
    typeof raw.total_periods === 'number'
  ) {
    account.numberOfPayments = raw.total_periods;
  }

  // Set original amount if available
  if (raw.initial_amount > 0) {
    account.originalAmount = {
      amount: raw.initial_amount,
      currency: 'COP',
    };
  }

  // Add optional fields if available
  if (capitalPortion > 0 || interestPortion > 0) {
    // Store capital and interest breakdown in metadata
    account.metadata = {
      capitalPortion,
      interestPortion,
      paymentIntervalMonths: getPaymentIntervalMonths(raw.frequency),
      isPeriodic: raw.total_periods === 'periodic',
    };
  }

  // For bills with no balance, set minimum payment
  if (accountType === 'bill' && totalAmount === 0 && monthlyPaymentAmount > 0) {
    account.minimumPayment = {
      amount: monthlyPaymentAmount,
      currency: 'COP',
    };
  }

  // For savings accounts (ahorro/scaleno), mark as other type
  if (
    raw.name.toLowerCase().includes('ahorro') ||
    raw.name.toLowerCase().includes('scaleno')
  ) {
    // These might be savings accounts, not debts
    account.metadata = {
      ...account.metadata,
      isSavings: true,
    };
  }

  return account;
}

/**
 * Raw account data from the spreadsheet
 * New format with direct numeric values and YYYY-MM-DD dates
 */
const rawAccounts: RawAccountData[] = [
  {
    due_date: '2026-01-19',
    name: 'Hipotecario 2',
    start_date: '2024-08-20',
    frequency: 'Mensual',
    total_periods: 240,
    initial_amount: 361000000,
    current_amount: 356464928,
    principal: 700695,
    interest: 2994305,
    payment: 3695000,
    interest_rate: 0.0084,
  },
  {
    due_date: '2026-01-04',
    name: 'Hipotecario',
    start_date: '2022-03-04',
    frequency: 'Mensual',
    total_periods: 180,
    initial_amount: 210000000,
    current_amount: 188263631,
    principal: 955370,
    interest: 1449630,
    payment: 2405000,
    interest_rate: 0.0077,
  },
  {
    due_date: '2026-01-08',
    name: 'TC Signature',
    start_date: '2026-01-08',
    frequency: 'Mensual',
    total_periods: 20,
    initial_amount: 11730523,
    current_amount: 11560451,
    principal: 251832,
    interest: 138725,
    payment: 390557,
    interest_rate: 0.012,
  },
  {
    due_date: '2026-01-03',
    name: 'Prestamo Personal Conmigo mismo',
    start_date: '2024-10-03',
    frequency: 'Mensual',
    total_periods: 12,
    initial_amount: 60000000,
    current_amount: 60000000,
    principal: 4709500,
    interest: 600000,
    payment: 5309500,
    interest_rate: 0.01,
  },
  {
    due_date: '2026-01-28',
    name: 'Ahorro Apartamento Scaleno 17',
    start_date: '2025-02-28',
    frequency: 'Mensual',
    total_periods: 20,
    initial_amount: 157321000,
    current_amount: 62940840,
    principal: 86526660,
    interest: 0,
    payment: 7866060,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-11',
    name: 'Scaleno Rentabilidad',
    start_date: '2025-12-11',
    frequency: 'Mensual',
    total_periods: 10,
    initial_amount: 8000000,
    current_amount: 8000000,
    principal: 800000,
    interest: 0,
    payment: 800000,
    interest_rate: 0.01,
  },
  {
    due_date: '2025-12-27',
    name: 'Scaleno Proyecto Constructora',
    start_date: '2022-06-27',
    frequency: 'Mensual',
    total_periods: 45,
    initial_amount: 64057500,
    current_amount: 6769460,
    principal: 57288040,
    interest: 0,
    payment: 754838,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-15',
    name: 'TC Davivienda',
    start_date: '2026-01-15',
    frequency: 'Mensual',
    total_periods: 1,
    initial_amount: 2950000,
    current_amount: 0,
    principal: 0,
    interest: 0,
    payment: 0,
    interest_rate: 0.0229,
  },
  {
    due_date: '2026-02-12',
    name: 'Crediservice',
    start_date: '2025-12-12',
    frequency: 'Mensual',
    total_periods: 1,
    initial_amount: 4500000,
    current_amount: 4500000,
    principal: 4401000,
    interest: 99000,
    payment: 4500000,
    interest_rate: 0.022,
  },
  {
    due_date: '2026-01-08',
    name: 'Planilla Salud/Pension Mia',
    start_date: '2025-09-08',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 471700,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-08',
    name: 'Planilla Salud/Pension Ginna',
    start_date: '2025-11-08',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 471700,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-16',
    name: 'Administracion Granada',
    start_date: '2022-06-16',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 455600,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-10',
    name: 'Administracion Altavista',
    start_date: '2024-09-10',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 366700,
    interest_rate: 0,
  },
  {
    due_date: '2026-02-09',
    name: 'Agua',
    start_date: '2024-10-09',
    frequency: 'Bimestral',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 75000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-13',
    name: 'Luz',
    start_date: '2024-09-13',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 180000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-18',
    name: 'Gas Natural',
    start_date: '2024-08-18',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 25000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-10',
    name: 'Internet Altavista',
    start_date: '2022-06-10',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 55000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-24',
    name: 'Cel Mama',
    start_date: '2022-06-24',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 50000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-19',
    name: 'Cel Leo',
    start_date: '2022-06-19',
    frequency: 'Mensual',
    total_periods: 'periodic',
    initial_amount: 0,
    current_amount: 0,
    principal: null,
    interest: null,
    payment: 56000,
    interest_rate: 0,
  },
  {
    due_date: '2026-01-19',
    name: 'Prestamo Fidel',
    start_date: '2025-11-19',
    frequency: 'Mensual',
    total_periods: 1,
    initial_amount: 8144200,
    current_amount: null,
    principal: null,
    interest: null,
    payment: 15000000,
    interest_rate: 0,
  },
];

/**
 * Run the migration
 */
export async function runMigration(): Promise<void> {
  console.log('🚀 Starting account migration...');
  console.log(`📊 Found ${rawAccounts.length} accounts to migrate`);

  const results = {
    success: [] as string[],
    errors: [] as { account: string; error: string }[],
  };

  for (let i = 0; i < rawAccounts.length; i++) {
    const raw = rawAccounts[i];
    try {
      console.log(
        `\n📝 Processing account ${i + 1}/${rawAccounts.length}: ${raw.name}`
      );

      const accountInput = convertToAccountInput(raw, i);
      console.log('✅ Converted to account input:', {
        accountNumber: accountInput.accountNumber,
        accountName: accountInput.accountName,
        accountType: accountInput.accountType,
        totalAmount: accountInput.totalAmountRemaining.amount,
        paymentAmount: accountInput.paymentAmount.amount,
      });

      const accountId = await createFinancialAccount(accountInput);
      console.log(`✅ Successfully created account: ${accountId}`);
      results.success.push(accountId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to create account "${raw.name}":`, errorMessage);
      results.errors.push({
        account: raw.name,
        error: errorMessage,
      });
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${results.success.length} accounts`);
  console.log(`❌ Failed: ${results.errors.length} accounts`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ account, error }) => {
      console.log(`  - ${account}: ${error}`);
    });
  }

  if (results.success.length > 0) {
    console.log('\n✅ Successfully migrated accounts:');
    results.success.forEach((accountId) => {
      console.log(`  - ${accountId}`);
    });
  }
}

/**
 * Preview the migration without actually creating accounts
 */
export function previewMigration(): void {
  console.log('👀 Migration Preview:');
  console.log(`📊 Will migrate ${rawAccounts.length} accounts\n`);

  rawAccounts.forEach((raw, index) => {
    const accountInput = convertToAccountInput(raw, index);
    // nextDueDate is always a Date from parseDate, but handle both cases for type safety
    let dueDate: Date;
    if (accountInput.nextDueDate instanceof Date) {
      dueDate = accountInput.nextDueDate;
    } else if (
      accountInput.nextDueDate &&
      typeof accountInput.nextDueDate === 'object' &&
      'toDate' in accountInput.nextDueDate
    ) {
      // Firestore Timestamp
      dueDate = (accountInput.nextDueDate as { toDate: () => Date }).toDate();
    } else {
      dueDate = new Date(accountInput.nextDueDate as string | number);
    }

    console.log(`\n${index + 1}. ${accountInput.accountName}`);
    console.log(`   Account Number: ${accountInput.accountNumber}`);
    console.log(`   Type: ${accountInput.accountType}`);
    console.log(`   Status: ${accountInput.status}`);
    console.log(
      `   Total Remaining: ${accountInput.totalAmountRemaining.amount.toLocaleString('es-CO')} ${accountInput.totalAmountRemaining.currency}`
    );
    console.log(
      `   Payment Amount: ${accountInput.paymentAmount.amount.toLocaleString('es-CO')} ${accountInput.paymentAmount.currency}`
    );
    console.log(`   Rate: ${accountInput.rate}%`);
    console.log(`   Next Due Date: ${dueDate.toLocaleDateString('es-CO')}`);
  });
}

/**
 * Historical payment data structure
 */
export interface HistoricalPaymentData {
  id: string;
  payments: Array<{
    date?: string; // YYYY-MM format (optional, can use period/month instead)
    period?: string; // YYYY-MM format (optional, can use date/month instead)
    month?: string; // YYYY-MM format (optional, can use date/period instead)
    amount: number | string; // Can be a number or string (e.g., "500.000" with dots as thousand separators)
  }>;
}

/**
 * Parse amount from string or number
 * Handles strings with dots as thousand separators (e.g., "500.000" -> 500000)
 */
function parseAmount(amount: number | string): number {
  if (typeof amount === 'number') {
    return amount;
  }
  if (typeof amount === 'string') {
    // Remove dots (thousand separators) and commas (decimal separators in some locales)
    // Then parse as float and convert to integer (assuming amounts are in whole currency units)
    const cleaned = amount.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      throw new Error(`Invalid amount format: ${amount}`);
    }
    return Math.round(parsed);
  }
  throw new Error(`Amount must be a number or string, got: ${typeof amount}`);
}

/**
 * Match a payment date (YYYY-MM) to a payment period based on due date
 */
function findMatchingPeriod(
  periods: PaymentPeriod[],
  paymentDate: string
): PaymentPeriod | null {
  // Parse the payment date (YYYY-MM) to get year and month
  const paymentDateObj = parseMonthYear(paymentDate);
  const paymentYear = paymentDateObj.getFullYear();
  const paymentMonth = paymentDateObj.getMonth();

  // Find the period whose due date matches the payment month/year
  for (const period of periods) {
    const dueDate =
      period.dueDate instanceof Date ? period.dueDate : period.dueDate.toDate();
    const dueYear = dueDate.getFullYear();
    const dueMonth = dueDate.getMonth();

    // Match if year and month are the same
    if (dueYear === paymentYear && dueMonth === paymentMonth) {
      return period;
    }
  }

  return null;
}

/**
 * Migrate historical payments for accounts
 *
 * @param accountsData - Array of account payment data
 * @returns Migration results
 */
export async function migrateHistoricalPayments(
  accountsData: HistoricalPaymentData[]
): Promise<{
  success: Array<{ accountId: string; paymentsLogged: number }>;
  errors: Array<{ accountId: string; error: string }>;
  warnings: Array<{ accountId: string; paymentDate: string; message: string }>;
}> {
  console.log('🚀 Starting historical payments migration...');
  console.log(`📊 Found ${accountsData.length} accounts to process\n`);

  const results = {
    success: [] as Array<{ accountId: string; paymentsLogged: number }>,
    errors: [] as Array<{ accountId: string; error: string }>,
    warnings: [] as Array<{
      accountId: string;
      paymentDate: string;
      message: string;
    }>,
  };

  for (const accountData of accountsData) {
    try {
      console.log(`\n📝 Processing account: ${accountData.id}`);
      console.log(`   Payments to migrate: ${accountData.payments.length}`);

      // Get the account to verify it exists and get currency
      const account = await getFinancialAccount(accountData.id);
      if (!account) {
        const errorMsg = `Account ${accountData.id} not found`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push({
          accountId: accountData.id,
          error: errorMsg,
        });
        continue;
      }

      // Get all payment periods for this account
      const periods = await getPaymentPeriods(accountData.id);
      if (periods.length === 0) {
        const errorMsg = `No payment periods found for account ${accountData.id}. Please generate the amortization plan first.`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push({
          accountId: accountData.id,
          error: errorMsg,
        });
        continue;
      }

      console.log(`   Found ${periods.length} payment periods`);

      // Check if there are any payments to process
      if (accountData.payments.length === 0) {
        console.log(
          `   ℹ️  No payments to migrate for account ${accountData.id} (empty payments array)`
        );
        results.success.push({
          accountId: accountData.id,
          paymentsLogged: 0,
        });
        continue;
      }

      // Process each payment
      let paymentsLogged = 0;
      for (const payment of accountData.payments) {
        try {
          // Get the date/period/month field (support "date", "period", and "month")
          const paymentDateStr =
            payment.date ?? payment.period ?? payment.month;
          if (!paymentDateStr) {
            const warningMsg =
              'Payment missing "date", "period", or "month" field';
            console.warn(`⚠️  ${warningMsg}`);
            results.warnings.push({
              accountId: accountData.id,
              paymentDate: 'unknown',
              message: warningMsg,
            });
            continue;
          }

          // Parse amount (handle both number and string formats)
          let paymentAmount: number;
          try {
            paymentAmount = parseAmount(payment.amount);
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            console.error(
              `   ❌ Failed to parse amount for ${paymentDateStr}: ${errorMsg}`
            );
            results.warnings.push({
              accountId: accountData.id,
              paymentDate: paymentDateStr,
              message: `Failed to parse amount: ${errorMsg}`,
            });
            continue;
          }

          // Skip payments with zero amount
          if (paymentAmount === 0) {
            console.log(
              `   ⏭️  Skipping payment for ${paymentDateStr} (amount is 0)`
            );
            continue;
          }

          // Find matching period
          const matchingPeriod = findMatchingPeriod(periods, paymentDateStr);
          if (!matchingPeriod) {
            const warningMsg = `No matching period found for date ${paymentDateStr}`;
            console.warn(`⚠️  ${warningMsg}`);
            results.warnings.push({
              accountId: accountData.id,
              paymentDate: paymentDateStr,
              message: warningMsg,
            });
            continue;
          }

          // Log payment to the period
          // Use the first day of the payment month as the payment date
          const paymentDate = parseMonthYear(paymentDateStr);
          await logPaymentToPeriod(
            accountData.id,
            matchingPeriod.periodNumber,
            {
              datePaid: paymentDate,
              amount: paymentAmount,
              currency: account.paymentAmount.currency,
              notes: `Historical payment migrated for ${paymentDateStr}`,
            }
          );

          paymentsLogged++;
          console.log(
            `   ✅ Logged payment ${paymentAmount.toLocaleString('es-CO')} ${account.paymentAmount.currency} for ${paymentDateStr} (Period ${matchingPeriod.periodNumber})`
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          const paymentDateStr =
            payment.date ?? payment.period ?? payment.month ?? 'unknown';
          console.error(
            `   ❌ Failed to log payment for ${paymentDateStr}: ${errorMsg}`
          );
          results.warnings.push({
            accountId: accountData.id,
            paymentDate: paymentDateStr,
            message: `Failed to log payment: ${errorMsg}`,
          });
        }
      }

      console.log(
        `✅ Successfully processed account ${accountData.id}: ${paymentsLogged}/${accountData.payments.length} payments logged`
      );
      results.success.push({
        accountId: accountData.id,
        paymentsLogged,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Failed to process account "${accountData.id}": ${errorMessage}`
      );
      results.errors.push({
        accountId: accountData.id,
        error: errorMessage,
      });
    }
  }

  console.log('\n📊 Historical Payments Migration Summary:');
  console.log(`✅ Successfully processed: ${results.success.length} accounts`);
  console.log(`❌ Failed: ${results.errors.length} accounts`);
  console.log(`⚠️  Warnings: ${results.warnings.length} issues`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ accountId, error }) => {
      console.log(`  - ${accountId}: ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(({ accountId, paymentDate, message }) => {
      console.log(`  - ${accountId} (${paymentDate}): ${message}`);
    });
  }

  if (results.success.length > 0) {
    console.log('\n✅ Successfully processed accounts:');
    results.success.forEach(({ accountId, paymentsLogged }) => {
      console.log(`  - ${accountId}: ${paymentsLogged} payments logged`);
    });
  }

  return results;
}

/**
 * Preview historical payments migration without actually logging payments
 */
export function previewHistoricalPaymentsMigration(
  accountsData: HistoricalPaymentData[]
): void {
  console.log('👀 Historical Payments Migration Preview:');
  console.log(`📊 Will process ${accountsData.length} accounts\n`);

  accountsData.forEach((accountData) => {
    console.log(`\n📝 Account: ${accountData.id}`);
    console.log(`   Payments to migrate: ${accountData.payments.length}`);
    accountData.payments.forEach((payment) => {
      const paymentDateStr =
        payment.date ?? payment.period ?? payment.month ?? 'unknown';
      try {
        const amount = parseAmount(payment.amount);
        console.log(
          `   - ${paymentDateStr}: ${amount.toLocaleString('es-CO')} COP`
        );
      } catch {
        console.log(
          `   - ${paymentDateStr}: ${String(payment.amount)} COP (parse error)`
        );
      }
    });
  });
}
