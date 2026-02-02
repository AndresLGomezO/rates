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
 * Freelance/Gig subtypes
 */
export type FreelanceGigSubtype =
  | 'freelance'
  | 'consulting'
  | 'gig_platform'
  | 'creative'
  | 'side_hustle'
  | 'other';

/**
 * Rate types for freelance/gig work
 */
export type RateType =
  | 'hourly'
  | 'per_project'
  | 'per_task'
  | 'retainer'
  | 'commission'
  | 'variable';

/**
 * Predictability of income
 */
export type IncomePredictability =
  | 'highly_predictable'
  | 'somewhat_predictable'
  | 'variable'
  | 'unpredictable';

/**
 * Common gig platforms
 */
export type GigPlatformType =
  | 'uber'
  | 'lyft'
  | 'doordash'
  | 'instacart'
  | 'upwork'
  | 'fiverr'
  | 'taskrabbit'
  | 'etsy'
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
 * Freelance/Gig Income specific fields
 */
export interface FreelanceGigIncome extends BaseIncome {
  type: 'freelance';
  subtype: FreelanceGigSubtype;

  /** Client, platform, or business name */
  sourceName?: string;

  /** How predictable is this income? */
  predictability: IncomePredictability;

  // ===== RATE-BASED FIELDS =====

  /** How the user charges for work */
  rateType?: RateType;

  /** Rate amount (hourly, per project, per task) */
  rateAmount?: CurrencyAmount;

  /** For hourly: typical hours per week/month */
  typicalHoursPerWeek?: number;
  typicalHoursPerMonth?: number;

  /** For project-based: typical projects per month */
  typicalProjectsPerMonth?: number;

  /** For gig/task-based: typical tasks per week */
  typicalTasksPerWeek?: number;

  // ===== ESTIMATE-BASED FIELDS =====

  /** User's estimate of typical monthly income */
  estimatedMonthlyIncome?: CurrencyAmount;

  /** For variable income: typical range */
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;

  // ===== RETAINER FIELDS (for predictable contracts) =====

  /** Is this a retainer/recurring contract? */
  isRetainer?: boolean;

  /** Retainer amount per period */
  retainerAmount?: CurrencyAmount;

  /** Retainer payment frequency */
  retainerFrequency?: PaymentFrequency;

  // ===== TIMING =====

  /** How often they typically receive payments */
  typicalPaymentFrequency?: PaymentFrequency | 'irregular';

  /** Next expected payment (if known) */
  nextExpectedPayment?: Timestamp | Date;

  /** When this income stream started */
  startDate?: Timestamp | Date;

  /** When this ends (for contracts with end dates) */
  endDate?: Timestamp | Date;

  // ===== FLAGS =====

  /** Is this a side income (not primary)? */
  isSideIncome?: boolean;

  /** Platform-specific identifier (for gig platforms) */
  platformType?: GigPlatformType;
}

/**
 * Rental Income specific fields
 */
export interface RentalIncome extends BaseIncome {
  type: 'rental';
  rentalSubtype: RentalSubtype;

  // ===== PROPERTY IDENTIFICATION =====

  /** Property name or address for reference */
  propertyName?: string;

  /** Full address (optional, for records) */
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  /** Number of units (for multi-family) */
  numberOfUnits?: number;

  // ===== RENTAL DETAILS =====

  /** Rental amount per period */
  rentalAmount: CurrencyAmount;

  /** How often rent is collected */
  rentalFrequency: PaymentFrequency;

  /** Day of month rent is due (for monthly) */
  rentDueDay?: number;

  /** For long-term: tenant information */
  tenantName?: string;

  /** Lease start date */
  leaseStartDate?: Timestamp | Date;

  /** Lease end date */
  leaseEndDate?: Timestamp | Date;

  /** Is lease auto-renewing? */
  isLeaseAutoRenewing?: boolean;

  // ===== SHORT-TERM RENTAL FIELDS =====

  /** Platform used (Airbnb, VRBO, etc.) */
  platformType?: RentalPlatformType;

  /** Nightly/weekly rate */
  nightlyRate?: CurrencyAmount;
  weeklyRate?: CurrencyAmount;

  /** Expected occupancy percentage (0-100) */
  expectedOccupancyPercent?: number;

  /** Average nights booked per month */
  averageNightsPerMonth?: number;

  // ===== EXPENSE TRACKING =====

  /** Does user want to track net income? */
  trackNetIncome: boolean;

  /** Link to existing mortgage account (if any) */
  linkedMortgageAccountId?: string;

  /** Monthly mortgage payment (if not linked) */
  mortgagePayment?: CurrencyAmount;

  /** Property management fee (% or fixed) */
  propertyManagementFee?: {
    type: 'percentage' | 'fixed';
    value: number;
  };

  /** Other monthly expenses */
  otherMonthlyExpenses?: CurrencyAmount;

  /** Expense breakdown (optional detail) */
  expenseBreakdown?: {
    insurance?: CurrencyAmount;
    propertyTax?: CurrencyAmount;
    hoa?: CurrencyAmount;
    utilities?: CurrencyAmount;
    maintenance?: CurrencyAmount;
    other?: CurrencyAmount;
  };

  // ===== CALCULATED FIELDS =====

  /** Gross monthly income */
  grossMonthlyIncome?: CurrencyAmount;

  /** Net monthly income (after expenses) */
  netMonthlyIncome?: CurrencyAmount;

  /** Total monthly expenses */
  totalMonthlyExpenses?: CurrencyAmount;

  // ===== FLAGS =====

  /** Is this the user's primary residence? (house hacking) */
  isPrimaryResidence?: boolean;

  /** Does user live in one unit? */
  ownerOccupied?: boolean;

  /** Is property currently vacant? */
  isCurrentlyVacant?: boolean;

  /** Expected vacancy date (if tenant leaving) */
  expectedVacancyDate?: Timestamp | Date;
}

export type RentalSubtype =
  | 'long_term' // Traditional yearly lease
  | 'short_term' // Airbnb, VRBO, vacation rental
  | 'room_rental' // Renting a room in primary residence
  | 'commercial' // Commercial property rental
  | 'other';

export type RentalPlatformType =
  | 'airbnb'
  | 'vrbo'
  | 'booking_com'
  | 'direct' // Direct booking, no platform
  | 'property_manager' // Managed by PM company
  | 'other';

/**
 * Discriminated union of all income types
 */
export type Income = SalaryIncome | FreelanceGigIncome | RentalIncome;

/**
 * Helper to omit properties from a union type distributively
 */
type DistributiveOmit<T, K extends string | number | symbol> = T extends unknown
  ? Omit<T, K>
  : never;

/**
 * Input for creating a new income
 */
export type CreateIncomeInput = DistributiveOmit<
  Income,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
> & {
  userId?: string;
};

/**
 * Input for updating an income
 */
export type UpdateIncomeInput = (Income extends unknown
  ? Partial<Omit<Income, 'id' | 'userId' | 'createdAt'>>
  : never) & {
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

  if (income.type === 'freelance') {
    const freelance = income as FreelanceGigIncome;
    if (!freelance.subtype) errors.push('Freelance subtype is required');
    if (!freelance.predictability)
      errors.push('Predictability level is required');

    if (freelance.isRetainer) {
      if (!freelance.retainerAmount) errors.push('Retainer amount is required');
      if (!freelance.retainerFrequency)
        errors.push('Retainer frequency is required');
    } else {
      const hasAmount = !!(
        freelance.estimatedMonthlyIncome ||
        freelance.rateAmount ||
        (freelance.incomeRangeLow && freelance.incomeRangeHigh)
      );
      if (!hasAmount)
        errors.push('At least one income estimate, rate, or range is required');

      if (
        freelance.rateType === 'hourly' &&
        freelance.rateAmount &&
        freelance.typicalHoursPerWeek === undefined
      ) {
        errors.push('Typical hours per week is required for hourly work');
      }
    }
  }

  if (income.type === 'rental') {
    const rental = income as RentalIncome;
    if (!rental.rentalSubtype) errors.push('Rental subtype is required');
    if (!rental.rentalAmount) errors.push('Rental amount is required');
    if (!rental.rentalFrequency) errors.push('Rental frequency is required');

    if (rental.rentalSubtype === 'short_term') {
      if (!rental.platformType) errors.push('Platform type is required');
    }
  }

  return errors;
}
