import React from 'react';
import { FinancialAccount } from '@rates/firebase-client';
import { useOtherAccountInsights } from '../../hooks/useOtherAccountInsights';
import { ObligationsOverviewWidget } from './ObligationsOverviewWidget';
import { CommitmentTrackerWidget } from './CommitmentTrackerWidget';
import { MoneyOwedWidget } from './MoneyOwedWidget';

interface OtherInsightsContainerProps {
  accounts: FinancialAccount[];
}

export const OtherInsightsContainer: React.FC<OtherInsightsContainerProps> = ({
  accounts,
}) => {
  const { insights, hasOtherAccounts } = useOtherAccountInsights(accounts);

  if (!hasOtherAccounts || !insights) return null;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 1. Obligations Overview */}
      <ObligationsOverviewWidget insight={insights.obligations} />

      {/* 2. Commitment Tracker */}
      <CommitmentTrackerWidget insight={insights.commitments} />

      {/* 3. Money Owed to You */}
      <MoneyOwedWidget insight={insights.moneyOwed} />
    </div>
  );
};
