/**
 * Migration script to import initial accounts from spreadsheet data
 */

import type { CreateFinancialAccountInput } from '@rates/firebase-client';
import { createFinancialAccount } from '../services/financialAccounts';

/**
 * Raw account data from spreadsheet
 */
interface RawAccountData {
  fechaMaxima: string; // DD-MM-YYYY format
  accountName: string;
  total: string; // Total remaining (with dots as thousands separators, e.g., "95.057")
  capital: string; // Capital portion (with dots, e.g., "356.464.928")
  interest: string; // Interest portion (with dots, e.g., "700.695")
  cuota: string; // Monthly payment capital portion (with dots, e.g., "2.994.305")
  totalPayment: string; // Total monthly payment (with dots, e.g., "3.695.000")
  rate: string; // Interest rate as percentage string (e.g., "0,84%" or "0.84%")
}

/**
 * Parse European number format (dots as thousands separators)
 * Examples: "95.057" -> 95057, "356.464.928" -> 356464928
 */
function parseEuropeanNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0;
  // Remove dots (thousands separators) and replace comma with dot for decimals
  const cleaned = numStr.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Parse interest rate from string (e.g., "0,84%" -> 0.84)
 */
function parseRate(rateStr: string): number {
  if (!rateStr || rateStr.trim() === '') return 0;
  // Remove % and replace comma with dot
  const cleaned = rateStr.replace('%', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Parse date from DD-MM-YYYY format
 */
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const accountType = mapAccountType(raw.accountName);
  const accountNumber = generateAccountNumber(raw.accountName, index);

  // Parse all amounts from European format
  // Total is in thousands, so multiply by 1000
  const totalInThousands = parseEuropeanNumber(raw.total);
  const totalAmount = totalInThousands * 1000;

  // Use totalPayment if available, otherwise use cuota
  const monthlyPaymentAmount = raw.totalPayment
    ? parseEuropeanNumber(raw.totalPayment)
    : parseEuropeanNumber(raw.cuota);

  const capitalPortion = parseEuropeanNumber(raw.cuota); // Capital portion of payment
  const interestPortion = parseEuropeanNumber(raw.interest); // Interest portion of payment
  const rate = parseRate(raw.rate);

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
    accountName: raw.accountName,
    accountDescription: `${raw.accountName} - Migrated from initial data`,
    accountType,
    status,
    totalAmountRemaining: {
      amount: totalAmount,
      currency: 'COP',
    },
    monthlyPayment: {
      amount: monthlyPaymentAmount,
      currency: 'COP',
    },
    rate, // Interest rate as percentage
    nextDueDate: parseDate(raw.fechaMaxima),
    paymentLog: [],
  };

  // Add optional fields if available
  if (capitalPortion > 0 || interestPortion > 0) {
    // Store capital and interest breakdown in metadata
    account.metadata = {
      capitalPortion,
      interestPortion,
      totalCapitalPaid: parseEuropeanNumber(raw.capital), // Total capital paid (if that's what it represents)
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
    raw.accountName.toLowerCase().includes('ahorro') ||
    raw.accountName.toLowerCase().includes('scaleno')
  ) {
    // These might be savings accounts, not debts
    // You may want to handle these differently
    account.metadata = {
      ...account.metadata,
      isSavings: true,
    };
  }

  return account;
}

/**
 * Raw account data from the spreadsheet
 * Numbers are in European format (dots as thousands separators)
 */
const rawAccounts: RawAccountData[] = [
  {
    fechaMaxima: '19-01-2026',
    accountName: 'Hipotecario 2',
    total: '95.057',
    capital: '356.464.928',
    interest: '700.695',
    cuota: '2.994.305',
    totalPayment: '3.695.000',
    rate: '0,84%',
  },
  {
    fechaMaxima: '04-01-2026',
    accountName: 'Hipotecario',
    total: '50.204',
    capital: '188.263.631',
    interest: '955.370',
    cuota: '1.449.630',
    totalPayment: '2.405.000',
    rate: '0,77%',
  },
  {
    fechaMaxima: '08-01-2026',
    accountName: 'TC Signature',
    total: '3.083',
    capital: '11.560.451',
    interest: '251.832',
    cuota: '138.725',
    totalPayment: '390.557',
    rate: '1,20%',
  },
  {
    fechaMaxima: '03-01-2026',
    accountName: 'AutoPrestamo',
    total: '16.000',
    capital: '60.000.000',
    interest: '4.709.500',
    cuota: '600.000',
    totalPayment: '5.309.500',
    rate: '1,00%',
  },
  {
    fechaMaxima: '28-01-2026',
    accountName: 'Ahorro Scaleno 17',
    total: '16.784',
    capital: '62.940.840',
    interest: '86.526.660',
    cuota: '0',
    totalPayment: '7.866.060',
    rate: '0,00%',
  },
  {
    fechaMaxima: '11-01-2026',
    accountName: 'Scaleno Rentabilidad',
    total: '2.133',
    capital: '8.000.000',
    interest: '800.000',
    cuota: '0',
    totalPayment: '800.000',
    rate: '1,00%',
  },
  {
    fechaMaxima: '27-12-2025',
    accountName: 'Scaleno Proyecto',
    total: '1.805',
    capital: '6.769.460',
    interest: '57.288.040',
    cuota: '0',
    totalPayment: '754.838',
    rate: '0,00%',
  },
  {
    fechaMaxima: '15-01-2026',
    accountName: 'TC Davivienda',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '0',
    rate: '2,29%',
  },
  {
    fechaMaxima: '12-02-2026',
    accountName: 'Crediservice',
    total: '1.200',
    capital: '4.500.000',
    interest: '4.401.000',
    cuota: '99.000',
    totalPayment: '4.500.000',
    rate: '2,20%',
  },
  {
    fechaMaxima: '08-01-2026',
    accountName: 'Planilla Salud/Pension',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '471.700',
    rate: '0,00%',
  },
  {
    fechaMaxima: '08-01-2026',
    accountName: 'Planilla Salud/Pension Ginna',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '471.700',
    rate: '0,00%',
  },
  {
    fechaMaxima: '16-01-2026',
    accountName: 'Administracion',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '455.600',
    rate: '0,00%',
  },
  {
    fechaMaxima: '10-01-2026',
    accountName: 'Administracion Altavista',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '366.700',
    rate: '0,00%',
  },
  {
    fechaMaxima: '09-02-2026',
    accountName: 'Agua',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '75.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '13-01-2026',
    accountName: 'Luz',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '180.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '18-01-2026',
    accountName: 'Gas Natural',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '25.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '10-01-2026',
    accountName: 'Internet Altavista',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '55.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '24-01-2026',
    accountName: 'Cel Mama',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '50.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '19-01-2026',
    accountName: 'Cel Leo',
    total: '0',
    capital: '0',
    interest: '0',
    cuota: '0',
    totalPayment: '56.000',
    rate: '0,00%',
  },
  {
    fechaMaxima: '19-01-2026',
    accountName: 'Prestamo Fidel',
    total: '2.172',
    capital: '8.144.200',
    interest: '0',
    cuota: '0',
    totalPayment: '15.000.000',
    rate: '0,00%',
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
        `\n📝 Processing account ${i + 1}/${rawAccounts.length}: ${raw.accountName}`
      );

      const accountInput = convertToAccountInput(raw, i);
      console.log('✅ Converted to account input:', {
        accountNumber: accountInput.accountNumber,
        accountName: accountInput.accountName,
        accountType: accountInput.accountType,
        totalAmount: accountInput.totalAmountRemaining.amount,
        monthlyPayment: accountInput.monthlyPayment.amount,
      });

      const accountId = await createFinancialAccount(accountInput);
      console.log(`✅ Successfully created account: ${accountId}`);
      results.success.push(accountId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Failed to create account "${raw.accountName}":`,
        errorMessage
      );
      results.errors.push({
        account: raw.accountName,
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
      `   Monthly Payment: ${accountInput.monthlyPayment.amount.toLocaleString('es-CO')} ${accountInput.monthlyPayment.currency}`
    );
    console.log(`   Rate: ${accountInput.rate}%`);
    console.log(`   Next Due Date: ${dueDate.toLocaleDateString('es-CO')}`);
  });
}
