import { useMemo } from 'react';
import {
  FinancialAccount,
  isOther,
  generateOtherAccountsInsights,
  OtherAccountsInsights,
} from '@rates/firebase-client';

export interface OtherAccountInsightsResult {
  insights: OtherAccountsInsights | null;
  hasOtherAccounts: boolean;
  isLoading: boolean; // Placeholder if we add async later
}

export function useOtherAccountInsights(
  accounts: FinancialAccount[]
): OtherAccountInsightsResult {
  const result = useMemo(() => {
    // 1. Filter Other accounts
    const otherAccounts = accounts.filter(isOther);
    const hasOtherAccounts = otherAccounts.length > 0;

    if (!hasOtherAccounts) {
      return {
        insights: null,
        hasOtherAccounts: false,
        isLoading: false,
      };
    }

    // 2. Generate insights
    const insights = generateOtherAccountsInsights(otherAccounts);

    return {
      insights,
      hasOtherAccounts: true,
      isLoading: false,
    };
  }, [accounts]);

  return result;
}
