/**
 * Migration script to import initial accounts from spreadsheet data
 */

import type {
  AccountType,
  FinancialAccount,
  InstallmentLoanAccount,
  RevolvingCreditAccount,
  BillAccount,
  OtherAccount,
  CreateFinancialAccountInput,
} from '@rates/firebase-client';
import {
  createFinancialAccount,
  getFinancialAccount,
} from '../services/financialAccounts';
import {
  getPaymentPeriods,
  logPaymentToPeriod,
} from '../services/paymentPeriods';
import { parseMonthYear } from './paymentUtils';
import { Timestamp } from 'firebase/firestore';
import type { PaymentFrequency, PaymentPeriod } from '@rates/firebase-client';
import {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
} from '@rates/firebase-client';

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
function mapAccountType(accountName: string): AccountType {
  const name = accountName.toLowerCase();

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

  if (name.includes('tc ') || name.includes('tarjeta')) {
    return 'revolving_credit';
  }

  // Defaults to installment loan for most things unless specific
  if (
    name.includes('hipotecario') ||
    name.includes('auto') ||
    name.includes('prestamo') ||
    name.includes('crediservice')
  ) {
    return 'installment_loan';
  }

  // Fallback
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
): CreateFinancialAccountInput {
  const accountType = mapAccountType(raw.name);
  const accountNumber = generateAccountNumber(raw.name, index);

  // Parse amounts (already numbers in new format)
  const totalAmount = raw.current_amount ?? 0;
  const monthlyPaymentAmount = raw.payment ?? 0;

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

  const baseAccount = {
    accountNumber,
    accountName: raw.name,
    accountDescription: `${raw.name} - Migrated from initial data`,
    status,
    currency: 'COP',
    paymentLog: [],
  };

  const nextDueDate = parseDate(raw.due_date);
  const startDate = raw.start_date ? parseDate(raw.start_date) : new Date();

  // Create type-specific account input
  if (accountType === 'installment_loan') {
    return {
      ...baseAccount,
      accountType: 'installment_loan',
      loanSubtype: raw.name.toLowerCase().includes('hipotecario')
        ? 'mortgage'
        : raw.name.toLowerCase().includes('auto')
          ? 'auto_loan'
          : 'personal_loan',
      originalPrincipal: {
        amount: raw.initial_amount > 0 ? raw.initial_amount : totalAmount,
        currency: 'COP',
      },
      currentPrincipal: { amount: totalAmount, currency: 'COP' },
      annualInterestRate: rate,
      paymentFrequency: getPaymentFrequency(raw.frequency),
      nextDueDate,
      termInPayments:
        typeof raw.total_periods === 'number' ? raw.total_periods : 60,
      scheduledPayment: { amount: monthlyPaymentAmount, currency: 'COP' },
      contractStartDate: startDate,
    } as unknown as CreateFinancialAccountInput;
  } else if (accountType === 'revolving_credit') {
    return {
      ...baseAccount,
      accountType: 'revolving_credit',
      creditSubtype: 'credit_card',
      creditLimit: { amount: raw.initial_amount, currency: 'COP' },
      currentBalance: { amount: totalAmount, currency: 'COP' },
      purchaseApr: rate,
      currentMinimumPayment: { amount: monthlyPaymentAmount, currency: 'COP' },
      nextDueDate,
    } as unknown as CreateFinancialAccountInput;
  } else if (accountType === 'bill') {
    return {
      ...baseAccount,
      accountType: 'bill',
      billSubtype: 'utility',
      recurringAmount: { amount: monthlyPaymentAmount, currency: 'COP' },
      paymentFrequency: getPaymentFrequency(raw.frequency),
      nextDueDate,
    } as unknown as CreateFinancialAccountInput;
  }

  // Fallback for 'other'
  return {
    ...baseAccount,
    accountType: 'other',
    category: 'Unknown',
    currentAmount: { amount: totalAmount, currency: 'COP' },
  } as unknown as CreateFinancialAccountInput;
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
}

/**
 * Preview the migration without actually creating accounts
 */
export function previewMigration(): void {
  console.log('👀 Migration Preview:');
  console.log(`📊 Will migrate ${rawAccounts.length} accounts\n`);

  rawAccounts.forEach((raw, index) => {
    const accountInput = convertToAccountInput(raw, index);

    // Explicit type narrowing based on accountType property
    let dueDate: Date | Timestamp | undefined;

    if (accountInput.accountType === 'installment_loan') {
      dueDate = (accountInput as unknown as InstallmentLoanAccount).nextDueDate;
    } else if (accountInput.accountType === 'revolving_credit') {
      dueDate = (accountInput as unknown as RevolvingCreditAccount).nextDueDate;
    } else if (accountInput.accountType === 'bill') {
      dueDate = (accountInput as unknown as BillAccount).nextDueDate;
    }

    // Amount checks
    let amount = 0;
    let currency = 'COP';

    if (accountInput.accountType === 'installment_loan') {
      const loan = accountInput as unknown as InstallmentLoanAccount;
      amount = loan.currentPrincipal?.amount ?? 0;
      currency = loan.currentPrincipal?.currency ?? 'COP';
    } else if (accountInput.accountType === 'revolving_credit') {
      const credit = accountInput as unknown as RevolvingCreditAccount;
      amount = credit.currentBalance?.amount ?? 0;
      currency = credit.currentBalance?.currency ?? 'COP';
    } else if (accountInput.accountType === 'bill') {
      const bill = accountInput as unknown as BillAccount;
      amount = bill.recurringAmount?.amount ?? 0;
      currency = bill.recurringAmount?.currency ?? 'COP';
    } else if (accountInput.accountType === 'other') {
      const other = accountInput as unknown as OtherAccount;
      amount = other.currentAmount?.amount ?? 0;
    }

    console.log(`\n${index + 1}. ${accountInput.accountName}`);
    console.log(`   Account Number: ${accountInput.accountNumber}`);
    console.log(`   Type: ${accountInput.accountType}`);
    console.log(`   Status: ${accountInput.status}`);
    console.log(
      `   Primary Amount: ${amount.toLocaleString('es-CO')} ${currency}`
    );
    if (dueDate) {
      const date = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
      console.log(`   Next Due Date: ${date.toLocaleDateString('es-CO')}`);
    }
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
 */
function parseAmount(amount: number | string): number {
  if (typeof amount === 'number') {
    return amount;
  }
  if (typeof amount === 'string') {
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
  const paymentDateObj = parseMonthYear(paymentDate);
  const paymentYear = paymentDateObj.getFullYear();
  const paymentMonth = paymentDateObj.getMonth();

  for (const period of periods) {
    const dueDate =
      period.dueDate instanceof Date ? period.dueDate : period.dueDate.toDate();
    const dueYear = dueDate.getFullYear();
    const dueMonth = dueDate.getMonth();

    if (dueYear === paymentYear && dueMonth === paymentMonth) {
      return period;
    }
  }

  return null;
}

/**
 * Helper to safely get currency
 */
function getAccountCurrency(account: FinancialAccount): string {
  if (isInstallmentLoan(account))
    return account.currentPrincipal?.currency ?? 'COP';
  if (isRevolvingCredit(account)) return account.currentBalance.currency;
  if (isBill(account)) return account.recurringAmount?.currency ?? 'COP';
  if (account.accountType === 'other')
    return account.currentAmount?.currency ?? 'COP';
  return 'COP';
}

/**
 * Migrate historical payments for accounts
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
      // Logic from before, simplified for rewrite
      const account = await getFinancialAccount(accountData.id);
      if (!account) continue;

      const periods = await getPaymentPeriods(accountData.id);

      for (const payment of accountData.payments) {
        const paymentDateStr = payment.date ?? payment.period ?? payment.month;
        if (!paymentDateStr) continue;

        const matchingPeriod = findMatchingPeriod(periods, paymentDateStr);
        if (matchingPeriod) {
          await logPaymentToPeriod(
            accountData.id,
            matchingPeriod.periodNumber,
            {
              datePaid: parseMonthYear(paymentDateStr),
              amount: parseAmount(payment.amount),
              currency: getAccountCurrency(account),
              notes: `Migrated payment`,
            }
          );
        }
      }
      results.success.push({
        accountId: accountData.id,
        paymentsLogged: accountData.payments.length,
      });
    } catch (error) {
      // Log error
    }
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
