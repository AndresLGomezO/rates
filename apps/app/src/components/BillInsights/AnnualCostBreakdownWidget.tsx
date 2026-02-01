import React from 'react';
import { AnnualCostView } from '@rates/firebase-client';

interface AnnualCostBreakdownWidgetProps {
  data: AnnualCostView;
}

export const AnnualCostBreakdownWidget: React.FC<
  AnnualCostBreakdownWidgetProps
> = ({ data }) => {
  const { totalAnnualCost, monthlyBaseline, categories, subscriptionStats } =
    data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'housing':
      case 'rent':
        return '🏠';
      case 'utility':
        return '💡';
      case 'subscription':
        return '📺';
      case 'insurance':
        return '🛡️';
      case 'tax':
        return '🏛️';
      default:
        return '💰';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'housing':
      case 'rent':
        return 'bg-blue-500';
      case 'utility':
        return 'bg-yellow-500';
      case 'insurance':
        return 'bg-green-500';
      case 'subscription':
        return 'bg-purple-500';
      default:
        return 'bg-neutral-500';
    }
  };

  // Sort categories by total desc
  const sortedCategories = [...categories].sort((a, b) => b.total - a.total);

  return (
    <div className="ds-card-light p-6">
      <div className="mb-6">
        <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-white/70">
          Annual Cost Breakdown
        </h3>
        <div className="mt-2 flex items-baseline gap-3">
          <p className="m-0 text-3xl font-bold text-white">
            {formatCurrency(totalAnnualCost)}
          </p>
          <span className="text-sm text-white/50">/ year</span>
        </div>
        <div className="text-sm text-white/60">
          ~{formatCurrency(monthlyBaseline)} / month avg
        </div>
      </div>

      <div className="space-y-4">
        {sortedCategories.map((cat) => (
          <div key={cat.category}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="flex items-center gap-2 text-white">
                <span>{getCategoryIcon(cat.category)}</span>
                <span className="capitalize">
                  {cat.category.replace('_', ' ')}
                </span>
              </span>
              <span className="font-medium text-white">
                {formatCurrency(cat.total)}{' '}
                <span className="ml-1 text-white/40">
                  ({cat.percentage.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-700/50">
              <div
                className={`h-full ${getCategoryColor(cat.category)}`}
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {subscriptionStats.count > 0 && (
        <div className="mt-6 rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
          <h4 className="m-0 mb-1 text-sm font-bold text-purple-300">
            Subscription Check
          </h4>
          <p className="m-0 text-xs text-purple-200/80">
            You have {subscriptionStats.count} active subscriptions costing{' '}
            {formatCurrency(subscriptionStats.totalCost)}/year.
          </p>
        </div>
      )}
    </div>
  );
};
