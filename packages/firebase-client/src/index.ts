/**
 * Firebase Client SDK
 *
 * Centralized Firebase initialization and service exports.
 * Supports both emulator and live mode based on environment configuration.
 */

export { initializeFirebase } from './initialize';
export { getAuth, getFirestore, getStorage, getFunctions } from './services';
export type { FirebaseConfig, FirebaseServices } from './types';

// Financial Accounts Schema
export type {
  CurrencyCode,
  AccountType,
  AccountStatus,
  PaymentLogEntry,
  CurrencyAmount,
  PaymentBreakdown,
  FinancialAccount,
  FinancialAccountCalculated,
  FinancialAccountWithCalculated,
  CreateFinancialAccountInput,
  UpdateFinancialAccountInput,
  AddPaymentLogInput,
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
