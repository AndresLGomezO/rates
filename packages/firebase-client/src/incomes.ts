import type { Timestamp } from 'firebase/firestore';
import type {
  CurrencyCode,
  CurrencyAmount,
  PaymentFrequency,
} from './financial-accounts.js';

/**
 * Income type classification
 */
export type IncomeType =
  | 'salary'
  | 'freelance'
  | 'rental'
  | 'investments'
  | 'benefits'
  | 'other';

/**
 * Salary/Wages subtypes
 */
export type SalarySubtype =
  | 'full_time'
  | 'part_time'
  | 'hourly'
  | 'contract'
  | 'other';

/**
 * Income status
 */
export type IncomeStatus = 'active' | 'inactive' | 'one_time';

/**
 * Payday recurrence pattern
 */
export interface PayDayPattern {
  type: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'custom';
  dayOfWeek?: number; // 0-6 (Sun-Sat)
  daysOfMonth?: number[]; // 1-31
  isLastDayOfMonth?: boolean;
}

/**
 * Base income interface
 */
export interface BaseIncome {
  id?: string;
  userId: string;
  name: string;
  type: IncomeType;
  status: IncomeStatus;
  currency: CurrencyCode;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Salary Income specific fields
 */
export interface SalaryIncome extends BaseIncome {
  type: 'salary';
  subtype: SalarySubtype;
  employerName?: string;

  // Amount fields
  takeHomePay?: CurrencyAmount; // Net
  grossPay?: CurrencyAmount; // Before taxes
  annualSalary?: CurrencyAmount; // Yearly

  // Timing
  paymentFrequency: PaymentFrequency;
  payDayPattern?: PayDayPattern;
  nextPayDate?: Timestamp | Date;

  // Employment period
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;

  // For hourly workers
  hourlyRate?: CurrencyAmount;
  typicalHoursPerWeek?: number;

  // Metadata for calculations
  isVariable: boolean;
}

/**
 * Discriminated union of all income types
 */
export type Income = SalaryIncome; // Add other types as they are implemented

/**
 * Input for creating a new income
 */
export type CreateIncomeInput = Omit<
  Income,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  userId?: string;
};

/**
 * Input for updating an income
 */
export type UpdateIncomeInput = Partial<
  Omit<Income, 'id' | 'userId' | 'createdAt'>
> & {
  updatedAt: Timestamp | Date;
};

/**
 * Simple validation for income data
 */
export function validateIncome(income: Partial<Income>): string[] {
  const errors: string[] = [];

  if (!income.name) errors.push('Name is required');
  if (!income.type) errors.push('Income type is required');
  if (!income.userId) errors.push('User ID is required');
  if (!income.currency) errors.push('Currency is required');

  if (income.type === 'salary') {
    const salary = income;
    if (!salary.subtype) errors.push('Salary subtype is required');
    if (!salary.paymentFrequency) errors.push('Payment frequency is required');

    // At least one amount field is required
    const hasAmount = !!(
      salary.takeHomePay ||
      salary.grossPay ||
      salary.annualSalary ||
      salary.hourlyRate
    );
    if (!hasAmount) errors.push('At least one pay amount is required');

    if (
      salary.subtype === 'hourly' &&
      !salary.hourlyRate &&
      !salary.takeHomePay &&
      !salary.grossPay
    ) {
      errors.push(
        'Hourly rate or regular pay amount is required for hourly workers'
      );
    }

    if (salary.hourlyRate && salary.typicalHoursPerWeek === undefined) {
      errors.push('Typical hours per week is required for hourly workers');
    }
  }

  return errors;
}
