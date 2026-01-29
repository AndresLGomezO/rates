/**
 * Utility to generate amortization plans for existing accounts
 *
 * This can be called to initialize payment periods for accounts that don't have them yet
 */

import { generateAmortizationPlanForAccount } from '../services/paymentPeriods';
import { getUserFinancialAccounts } from '../services/financialAccounts';
import {
  isInstallmentLoan,
  isBill,
  isRevolvingCredit,
} from '@rates/firebase-client';

/**
 * Generate amortization plan for a single account
 */
export async function generatePlanForAccount(
  accountNumber: string
): Promise<void> {
  await generateAmortizationPlanForAccount(accountNumber);
}

/**
 * Generate amortization plans for all accounts that don't have periods yet
 *
 * @param forceRegenerate - If true, regenerate even if periods exist
 */
export async function generatePlansForAllAccounts(
  forceRegenerate: boolean = false
): Promise<{
  success: string[];
  errors: Array<{ account: string; error: string }>;
}> {
  const accounts = await getUserFinancialAccounts();
  const success: string[] = [];
  const errors: Array<{ account: string; error: string }> = [];

  for (const account of accounts) {
    // Only generate for accounts with required fields based on type
    let shouldGenerate = false;

    if (isInstallmentLoan(account)) {
      // Installment loans need start date and term
      if (account.contractStartDate && account.termInPayments) {
        shouldGenerate = true;
      }
    } else if (isBill(account)) {
      // Bills generate if periodic (logic handled in service, but we can verify here)
      // or just let the service decide.
      shouldGenerate = true;
    } else if (isRevolvingCredit(account)) {
      // Revolving credit usually doesn't have a fixed amortization plan generated upfront
      // unless we implementing a specific "payoff plan" feature, but standard logic doesn't require it.
      // However, if we want to generate periods for "minimum payments" maybe?
      // For now, let's assume NO for revolving credit unless specified.
      shouldGenerate = false;
    }

    if (!shouldGenerate || !account.accountNumber) {
      continue;
    }

    // Check if periods already exist (unless force regenerate)
    if (!forceRegenerate) {
      try {
        const { getPaymentPeriods } =
          await import('../services/paymentPeriods');
        const existingPeriods = await getPaymentPeriods(account.accountNumber);
        if (existingPeriods.length > 0) {
          // Periods already exist, skip
          continue;
        }
      } catch (error) {
        // If error checking, try to generate anyway
        console.warn(
          `Error checking periods for ${account.accountNumber}:`,
          error
        );
      }
    }

    try {
      await generateAmortizationPlanForAccount(account.accountNumber);
      success.push(account.accountNumber);
    } catch (error) {
      // Log but don't fail entire batch
      errors.push({
        account: account.accountNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { success, errors };
}
