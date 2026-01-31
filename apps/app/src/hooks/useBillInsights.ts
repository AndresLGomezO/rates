import { useMemo } from 'react';
import {
  FinancialAccount,
  BillInsightsService,
  MonthlyCalendarView,
  AnnualCostView,
  VariableBillTrend,
  isBill,
} from '@rates/firebase-client';

export interface BillInsights {
  monthlyCalendar: MonthlyCalendarView;
  annualBreakdown: AnnualCostView;
  variableTrends: VariableBillTrend[];
  hasBills: boolean;
}

export function useBillInsights(accounts: FinancialAccount[]): BillInsights {
  const result = useMemo(() => {
    // 1. Filter only bills first to avoid unnecessary recalculations if other accounts change
    // actually service handles filtering, but good to check emptiness
    const bills = accounts.filter(isBill);
    const hasBills = bills.length > 0;

    if (!hasBills) {
      return {
        monthlyCalendar: {
          month: new Date().toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          }),
          totalDue: 0,
          totalPaid: 0,
          remainingDue: 0,
          bills: [],
          dailyCashFlow: {},
        },
        annualBreakdown: {
          totalAnnualCost: 0,
          monthlyBaseline: 0,
          categories: [],
          subscriptionStats: { count: 0, totalCost: 0 },
        },
        variableTrends: [],
        hasBills: false,
      };
    }

    // 2. Calculate Monthly Calendar (for current month)
    const monthlyCalendar =
      BillInsightsService.getMonthlyBillCalendar(accounts);

    // 3. Calculate Annual Breakdown
    const annualBreakdown =
      BillInsightsService.getAnnualCostBreakdown(accounts);

    // 4. Calculate Variable Trends
    const variableTrends = BillInsightsService.getVariableBillTrends(accounts);

    return {
      monthlyCalendar,
      annualBreakdown,
      variableTrends,
      hasBills: true,
    };
  }, [accounts]);

  return result;
}
