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
 * Investment income subtypes
 */
export type InvestmentIncomeSubtype =
  | 'dividends'
  | 'interest'
  | 'capital_gains'
  | 'distributions'
  | 'royalties'
  | 'reit'
  | 'other';

/**
 * Investment account types
 */
export type InvestmentAccountType =
  | 'taxable'
  | 'traditional_ira'
  | 'roth_ira'
  | '401k'
  | 'hsa'
  | 'savings'
  | 'cd'
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
 * Benefit subtypes
 */
export type BenefitSubtype =
  | 'social_security' // Social Security retirement
  | 'social_security_disability' // SSDI
  | 'ssi' // Supplemental Security Income
  | 'pension_government' // Government pension (federal, state, local)
  | 'pension_military' // Military retirement
  | 'pension_private' // Private company pension
  | 'va_benefits' // Veterans Affairs benefits
  | 'disability_private' // Private disability insurance
  | 'workers_comp' // Workers' compensation
  | 'unemployment' // Unemployment benefits
  | 'child_support' // Court-ordered child support
  | 'alimony' // Court-ordered alimony/spousal support
  | 'welfare' // TANF, general assistance
  | 'other';

/**
 * Beneficiary types
 */
export type BeneficiaryType =
  | 'self'
  | 'spouse'
  | 'child'
  | 'other_dependent'
  | 'household'; // Benefit for entire household

/**
 * Social Security payment schedules
 */
export type SSPaymentSchedule =
  | 'second_wednesday' // Birth dates 1-10
  | 'third_wednesday' // Birth dates 11-20
  | 'fourth_wednesday' // Birth dates 21-31
  | 'third_of_month'; // For those receiving before May 1997

/**
 * Other Income subtypes
 */
export type OtherIncomeSubtype =
  | 'gift' // Cash gift from family/friends
  | 'inheritance' // Inherited money
  | 'prize_lottery' // Lottery, contest, sweepstakes
  | 'sale_personal_items' // Selling personal belongings
  | 'insurance_settlement' // Insurance payout
  | 'legal_settlement' // Legal award or settlement
  | 'tax_refund' // Tax refund
  | 'rebate_cashback' // Rebates, cash back rewards
  | 'odd_jobs' // Informal work, odd jobs
  | 'crypto_airdrop' // Cryptocurrency airdrops/rewards
  | 'found_money' // Found money, unclaimed property
  | 'stipend' // Stipend (non-employment)
  | 'allowance' // Allowance from family
  | 'reimbursement' // Reimbursement received
  | 'other'; // Anything else

/**
 * Income log entry for tracking received payments
 */
export interface IncomeLogEntry {
  /** Month when income was received (YYYY-MM format) */
  monthReceived: string;
  /** Exact date when income was received */
  dateReceived: Timestamp | Date;
  /** Amount received in the income's currency */
  valueReceived: number;
  /** Currency of the payment */
  currency: CurrencyCode;
  /** Client or source name (especially for freelance) */
  sourceName?: string;
  /** Invoice reference if applicable */
  invoiceId?: string;
  /** Date when invoice was sent (for lag analysis) */
  invoiceSentDate?: Timestamp | Date;
  /** Optional notes about this income entry */
  notes?: string;
  /** Timestamp when this log entry was created */
  createdAt: Timestamp | Date;
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
  /** Historical log of received payments */
  incomeLog?: IncomeLogEntry[];
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

  /** Estimated market value of the property */
  propertyValue?: CurrencyAmount;

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
 * Investment Income specific fields
 */
export interface InvestmentIncome extends BaseIncome {
  type: 'investments';
  investmentSubtype: InvestmentIncomeSubtype;

  // ===== ACCOUNT IDENTIFICATION =====
  accountName?: string;
  institutionName?: string;
  accountType?: InvestmentAccountType;
  holdings?: string;

  // ===== INCOME DETAILS =====
  predictability: IncomePredictability;
  incomeAmount?: CurrencyAmount;
  paymentFrequency: PaymentFrequency | 'irregular';

  /** For interest: Annual rate (%) */
  annualRate?: number;
  /** For interest: Principal/balance amount */
  principalAmount?: CurrencyAmount;

  /** For dividends: Annual yield (%) */
  dividendYield?: number;
  /** For dividends: Portfolio value */
  portfolioValue?: CurrencyAmount;

  /** For capital gains: Is this one-time or recurring? */
  isOneTime?: boolean;

  // ===== CASH FLOW =====
  isReinvested: boolean;
  cashPercentage?: number;

  // ===== TIMING =====
  nextPaymentDate?: Timestamp | Date;
  paymentMonths?: number[];

  // ===== VARIABILITY =====
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;
  expectedGrowthRate?: number;

  // ===== FLAGS =====
  isTaxAdvantaged?: boolean;
  isRMD?: boolean;
}

/**
 * Benefits Income specific fields
 */
export interface BenefitsIncome extends BaseIncome {
  type: 'benefits';
  benefitSubtype: BenefitSubtype;

  // ===== BENEFIT IDENTIFICATION =====

  /** Source agency or organization */
  benefitSource?: string;

  /** Specific program name (if applicable) */
  programName?: string;

  /** Who receives this benefit */
  beneficiary: BeneficiaryType;

  /** Beneficiary name (if not self) */
  beneficiaryName?: string;

  // ===== INCOME DETAILS =====

  /** Benefit amount per period */
  benefitAmount: CurrencyAmount;

  /** Payment frequency */
  paymentFrequency: PaymentFrequency;

  /** Specific payment day (varies by program) */
  paymentDayOfMonth?: number;

  /** For Social Security: based on birth date */
  paymentScheduleType?: SSPaymentSchedule;

  // ===== DURATION =====

  /** When benefits started */
  benefitStartDate?: Timestamp | Date;

  /** When benefits end (for temporary benefits) */
  benefitEndDate?: Timestamp | Date;

  /** Is this a permanent/ongoing benefit? */
  isPermanent: boolean;

  /** For unemployment: weeks remaining */
  weeksRemaining?: number;

  // ===== ADJUSTMENTS =====

  /** Expected annual COLA percentage */
  expectedColaPercent?: number;

  /** Date of next expected adjustment */
  nextAdjustmentDate?: Timestamp | Date;

  // ===== TAX TREATMENT =====

  /** Is this benefit taxable? */
  isTaxable?: boolean;

  /** Is tax withheld from payments? */
  hasTaxWithholding?: boolean;

  /** Withholding amount (if applicable) */
  withholdingAmount?: CurrencyAmount;

  // ===== FLAGS =====

  /** Is this benefit means-tested? */
  isMeansTested?: boolean;

  /** Is this a survivor benefit? */
  isSurvivorBenefit?: boolean;

  /** Is this a spousal benefit? */
  isSpousalBenefit?: boolean;
}

/**
 * Other Income specific fields
 */
export interface OtherIncome extends BaseIncome {
  type: 'other';
  subtype: OtherIncomeSubtype;

  // ===== IDENTIFICATION =====

  /** Source of the income (e.g., "Grandma", "IRS", "Apartment Sale") */
  incomeSource?: string;

  // ===== INCOME DETAILS =====

  /** Income amount */
  incomeAmount: CurrencyAmount;

  /** Is this a one-time or recurring income? */
  isOneTime: boolean;

  /** For recurring: payment frequency */
  paymentFrequency?: PaymentFrequency | 'irregular';

  /** For one-time: date received or expected */
  incomeDate?: Timestamp | Date;

  /** For recurring: expected next payment */
  nextPaymentDate?: Timestamp | Date;

  // ===== PREDICTABILITY =====

  /** How predictable is this income? (for recurring) */
  predictability?: IncomePredictability;

  /** For variable recurring: typical range */
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;

  // ===== DURATION =====

  /** For recurring: does it have an end date? */
  hasEndDate?: boolean;

  /** End date if applicable */
  endDate?: Timestamp | Date;

  // ===== TAX =====

  /** Is this income taxable? */
  isTaxable?: boolean;

  // ===== FLAGS =====

  /** Is this income already received? (for one-time) */
  isReceived?: boolean;

  /** Should this be included in regular projections? */
  includeInProjections: boolean;
}

/**
 * Discriminated union of all income types
 */
export type Income =
  | SalaryIncome
  | FreelanceGigIncome
  | RentalIncome
  | InvestmentIncome
  | BenefitsIncome
  | OtherIncome;

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

  if (income.type === 'investments') {
    const investment = income as InvestmentIncome;
    if (!investment.investmentSubtype)
      errors.push('Investment subtype is required');
    if (!investment.paymentFrequency)
      errors.push('Payment frequency is required');
    if (!investment.predictability)
      errors.push('Predictability level is required');

    if (investment.isReinvested === undefined) {
      errors.push('Reinvestment status is required');
    }

    const hasAmount = !!(
      investment.incomeAmount ||
      (investment.annualRate && investment.principalAmount) ||
      (investment.dividendYield && investment.portfolioValue) ||
      (investment.incomeRangeLow && investment.incomeRangeHigh)
    );

    if (!hasAmount) {
      errors.push(
        'At least one income amount, rate/principal, yield/portfolio, or range is required'
      );
    }
  }

  if (income.type === 'benefits') {
    const benefits = income as BenefitsIncome;
    if (!benefits.benefitSubtype) errors.push('Benefit subtype is required');
    if (!benefits.beneficiary) errors.push('Beneficiary is required');
    if (!benefits.benefitAmount) errors.push('Benefit amount is required');
    if (!benefits.paymentFrequency)
      errors.push('Payment frequency is required');

    if (benefits.isPermanent === undefined) {
      errors.push('Permanence status is required');
    }

    if (
      benefits.isPermanent === false &&
      !benefits.benefitEndDate &&
      !benefits.weeksRemaining
    ) {
      errors.push(
        'End date or weeks remaining is required for temporary benefits'
      );
    }
  }

  if (income.type === 'other') {
    const other = income as OtherIncome;
    if (!other.subtype) errors.push('Subtype is required');
    if (!other.incomeAmount) errors.push('Income amount is required');

    if (other.isOneTime) {
      if (!other.incomeDate) errors.push('Income date is required');
    } else {
      if (!other.paymentFrequency) errors.push('Payment frequency is required');
      if (!other.predictability)
        errors.push('Predictability level is required');
    }
  }

  return errors;
}
