import { useState, useMemo } from 'react';
import {
  FinancialAccount,
  DashboardInsightsService,
  FinancialProfile,
} from '@rates/firebase-client';

export function useDashboardInsights(accounts: FinancialAccount[]) {
  // In the future, fetch FinancialProfile here.
  const [profile] = useState<FinancialProfile | null>(null);

  const view = useMemo(() => {
    return DashboardInsightsService.getDashboardView(accounts, profile);
  }, [accounts, profile]);

  return view;
}
