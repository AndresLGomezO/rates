import React from 'react';
import { useBillInsights } from '../../hooks/useBillInsights';
import { FinancialAccount } from '@rates/firebase-client';
import { MonthlyBillCalendarWidget } from './MonthlyBillCalendarWidget';
import { AnnualCostBreakdownWidget } from './AnnualCostBreakdownWidget';
import { VariableBillTrackerWidget } from './VariableBillTrackerWidget';

interface BillsDashboardProps {
  accounts: FinancialAccount[];
}

export const BillsDashboard: React.FC<BillsDashboardProps> = ({ accounts }) => {
  const { monthlyCalendar, annualBreakdown, variableTrends, hasBills } =
    useBillInsights(accounts);

  if (!hasBills) {
    return (
      <div className="py-10 text-center text-white/50">
        No active bill accounts found. Add a bill to see insights.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Column 1: Monthly Calendar (Wider on mobile?) - Actually grid-cols-3 means 3 cols on LG, 1 on mobile */}
      <div className="lg:col-span-1">
        <MonthlyBillCalendarWidget data={monthlyCalendar} />
      </div>

      {/* Column 2: Annual Cost */}
      <div className="lg:col-span-1">
        <AnnualCostBreakdownWidget data={annualBreakdown} />
      </div>

      {/* Column 3: Variable Trends */}
      <div className="lg:col-span-1">
        <VariableBillTrackerWidget trends={variableTrends} />
      </div>
    </div>
  );
};
