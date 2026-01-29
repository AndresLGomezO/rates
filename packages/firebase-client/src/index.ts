/**
 * Firebase Client SDK
 *
 * Centralized Firebase initialization and service exports.
 * Supports both emulator and live mode based on environment configuration.
 * Cloud Build trigger entry point
 */

export { initializeFirebase } from './initialize';
export { getAuth, getFirestore, getStorage, getFunctions } from './services';
export type { FirebaseConfig, FirebaseServices } from './types';

// Financial Accounts Schema
export type {
  CurrencyCode,
  AccountType,
  AccountStatus,
  PaymentFrequency,
  PaymentLogEntry,
  CurrencyAmount,
  PaymentBreakdown,
  // New subtype enums
  InstallmentLoanSubtype,
  RevolvingCreditSubtype,
  BillSubtype,
  // Base and specialized interfaces
  BaseAccount,
  InstallmentLoanAccount,
  RevolvingCreditAccount,
  BillAccount,
  OtherAccount,
  // Discriminated union
  FinancialAccount,
  FinancialAccountCalculated,
  FinancialAccountWithCalculated,
  CreateFinancialAccountInput,
  UpdateFinancialAccountInput,
  AddPaymentLogInput,
} from './financial-accounts';

// Type guards
export {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
  isOther,
} from './financial-accounts';

export {
  calculatePaymentBreakdown,
  calculateDaysRemaining,
  getMonthString,
  calculateAccountFields,
  getAccountWithCalculated,
  validateFinancialAccount,
  createPaymentLogEntry,
  convertCurrency,
} from './financial-accounts-utils';

// Payment Periods Schema
export type {
  PaymentPeriodStatus,
  PaymentPeriod,
  PaymentPeriodPayment,
  CreatePaymentPeriodInput,
  UpdatePaymentPeriodInput,
  LogPaymentToPeriodInput,
} from './payment-periods';

// Amortization Plan Generator
export {
  generateAmortizationPlan,
  calculateRemainingPrincipal,
} from './amortization';

// Loan Calculations
export type { AmortizationPayment, LoanProjection } from './loan-calculations';

export {
  calculateScheduledPayment,
  generateAmortizationSchedule,
  projectInstallmentLoan,
} from './loan-calculations';

// Credit Calculations
export type { RevolvingPayoffProjection } from './credit-calculations';

export {
  projectRevolvingPayoff,
  suggestPaymentForTargetMonths,
} from './credit-calculations';

// Bill Calculations
export { generateBillDueDates } from './bill-calculations';
