/**
 * Firebase Client SDK
 *
 * Centralized Firebase initialization and service exports.
 * Supports both emulator and live mode based on environment configuration.
 * Cloud Build trigger entry point
 */

export { initializeFirebase } from './initialize.js';
export { getAuth, getFirestore, getStorage, getFunctions } from './services.js';
export type { FirebaseConfig, FirebaseServices } from './types.js';

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
} from './financial-accounts.js';

// Type guards
export {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
  isOther,
} from './financial-accounts.js';

export {
  calculatePaymentBreakdown,
  calculateDaysRemaining,
  getMonthString,
  calculateAccountFields,
  getAccountWithCalculated,
  validateFinancialAccount,
  createPaymentLogEntry,
  convertCurrency,
} from './financial-accounts-utils.js';

// AI Task Schemas
export * from './ai-tasks.js';
export * from './incomes.js';
export * from './logic/salary-insights.js';

// Payment Periods Schema
export type {
  PaymentPeriodStatus,
  PaymentPeriod,
  PaymentPeriodPayment,
  CreatePaymentPeriodInput,
  UpdatePaymentPeriodInput,
  LogPaymentToPeriodInput,
} from './payment-periods.js';

// Amortization Plan Generator
export {
  generateAmortizationPlan,
  calculateRemainingPrincipal,
} from './amortization.js';

// Loan Calculations
export type {
  AmortizationPayment,
  LoanProjection,
} from './loan-calculations.js';

export {
  calculateScheduledPayment,
  generateAmortizationSchedule,
  projectInstallmentLoan,
} from './loan-calculations.js';

// Credit Calculations
export type { RevolvingPayoffProjection } from './credit-calculations.js';

export {
  projectRevolvingPayoff,
  suggestPaymentForTargetMonths,
} from './credit-calculations.js';

// Bill Calculations
export { generateBillDueDates } from './bill-calculations.js';

// Financial Insights
export * from './financial-insights.js';

// Bill Insights Logic
export { BillInsightsService } from './logic/bill-insights.js';
export type {
  MonthlyCalendarView,
  AnnualCostView,
  VariableBillTrend,
} from './logic/bill-insights.js';

// Other Accounts Utilities
export * from './other-account-utils.js';

// Other Accounts Insights
export * from './insights/other-accounts.js';

// Financial Profile
export * from './financial-profile.js';

// Dashboard Insights
export { DashboardInsightsService } from './logic/dashboard-insights.js';
export type {
  FinancialHealthScore,
  DashboardView,
  AttentionItem,
  MonthlyMoneyFlow,
  TotalFinancialPicture,
  ProgressMetrics,
  QuickAction,
} from './logic/dashboard-insights.js';
// Incomes
export type {
  IncomeType,
  SalarySubtype,
  FreelanceGigSubtype,
  RateType,
  IncomePredictability,
  GigPlatformType,
  IncomeStatus,
  PayDayPattern,
  BenefitSubtype,
  BeneficiaryType,
  SSPaymentSchedule,
  BaseIncome,
  SalaryIncome,
  FreelanceGigIncome,
  RentalIncome,
  RentalSubtype,
  RentalPlatformType,
  InvestmentIncome,
  InvestmentIncomeSubtype,
  InvestmentAccountType,
  BenefitsIncome,
  OtherIncome,
  OtherIncomeSubtype,
  Income,
  CreateIncomeInput,
  UpdateIncomeInput,
} from './incomes.js';

export { validateIncome } from './incomes.js';
