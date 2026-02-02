import { useState, useEffect } from 'react';
import type { FinancialAccount } from '@rates/firebase-client';
import { getUserFinancialAccounts } from '../services/financialAccounts';

// New Architecture Imports
import { useDashboardInsights } from '../hooks/useDashboardInsights';
import { HealthScoreWidget } from '../components/Dashboard/HealthScoreWidget';
import { AttentionWidget } from '../components/Dashboard/AttentionWidget';
import { QuickActionsWidget } from '../components/Dashboard/QuickActionsWidget';

// Legacy components for lower section (can be refactored later)
// Keeping the imports to not break the build if we want to render charts below
// But for this step focusing on the top section
import { NewAccountWizard } from '../components/NewAccountWizard';
import { InlineInsights } from '../components/ai/InlineInsights';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAccountWizardOpen, setIsNewAccountWizardOpen] = useState(false);

  // Load Accounts
  const loadAccounts = async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    try {
      setLoading(true);
      setError(null);
      const allAccounts = await getUserFinancialAccounts();
      if (signal?.aborted) return;
      setAccounts(allAccounts);
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error loading accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    void loadAccounts(ac.signal);
    return () => ac.abort();
  }, []);

  // Use Insight Hook
  const insights = useDashboardInsights(accounts);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-600 border-t-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 pb-32">
      {/* Header */}
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Financial Center</h1>
          <p className="text-neutral-400">
            Your complete financial picture, analyzed.
          </p>
        </div>
      </div>

      {/* AI Inline Insights */}
      <div className="mb-5">
        <InlineInsights context="Dashboard" />
      </div>

      {/* Top Row: Health & Attention */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Health Score (1 col) */}
        <div className="lg:col-span-1">
          <HealthScoreWidget healthScore={insights.healthScore} />
        </div>

        {/* Attention (2 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Attention Required
          </h3>
          <AttentionWidget items={insights.attentionItems} />
        </div>
      </div>

      {/* Middle Row: Key Metrics Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        {/* Money Flow */}
        <div className="rounded-2xl border border-neutral-700/30 bg-neutral-900/40 p-6 backdrop-blur-xl">
          <h3 className="mb-2 text-sm font-medium uppercase text-neutral-400">
            Monthly Obligations
          </h3>
          <div className="mb-1 text-3xl font-bold text-white">
            {insights.moneyFlow.totalObligations.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </div>
          <div className="text-sm text-neutral-400">
            {Math.round(insights.moneyFlow.percentComplete)}% paid this month
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-700">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${insights.moneyFlow.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Total Debt */}
        <div className="rounded-2xl border border-neutral-700/30 bg-neutral-900/40 p-6 backdrop-blur-xl">
          <h3 className="mb-2 text-sm font-medium uppercase text-neutral-400">
            Total Debt
          </h3>
          <div className="mb-1 text-3xl font-bold text-white">
            {insights.totalPicture.totalDebt.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </div>
          <div className="text-sm text-neutral-400">
            Across {accounts.length} accounts
          </div>
          {/* Simple sparkline placeholder */}
          <div className="mt-4 flex gap-1">
            {insights.totalPicture.breakdown.housing.amount > 0 && (
              <div
                title="Housing"
                className="h-2 rounded-full bg-indigo-500"
                style={{
                  flex: insights.totalPicture.breakdown.housing.percentage,
                }}
              />
            )}
            {insights.totalPicture.breakdown.consumerDebt.amount > 0 && (
              <div
                title="Consumer"
                className="h-2 rounded-full bg-rose-500"
                style={{
                  flex: insights.totalPicture.breakdown.consumerDebt.percentage,
                }}
              />
            )}
            {insights.totalPicture.breakdown.bills.amount > 0 && (
              <div
                title="Bills"
                className="h-2 rounded-full bg-emerald-500"
                style={{
                  flex: insights.totalPicture.breakdown.bills.percentage,
                }}
              />
            )}
          </div>
        </div>

        {/* Progress / Next Milestone */}
        <div className="rounded-2xl border border-neutral-700/30 bg-neutral-900/40 p-6 backdrop-blur-xl">
          <h3 className="mb-2 text-sm font-medium uppercase text-neutral-400">
            Next Milestone
          </h3>
          {insights.progress.nextMilestone ? (
            <>
              <div className="mb-1 truncate text-lg font-bold text-white">
                Pay off {insights.progress.nextMilestone.name}
              </div>
              <div className="text-sm text-neutral-400">
                {insights.progress.nextMilestone.remaining.toLocaleString(
                  'en-US',
                  { style: 'currency', currency: 'USD' }
                )}{' '}
                remaining
              </div>
              <div className="mt-4 text-xs text-neutral-500">
                Est.{' '}
                {insights.progress.nextMilestone.estimatedDate
                  ? new Date(
                      insights.progress.nextMilestone.estimatedDate
                    ).toLocaleDateString()
                  : 'TBD'}
              </div>
            </>
          ) : (
            <div className="flex h-20 items-center justify-center text-sm text-neutral-500">
              No active milestones
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
          Quick Actions
        </h3>
        <QuickActionsWidget actions={insights.quickActions} />
      </div>

      {/* New Account Modal */}
      <NewAccountWizard
        isOpen={isNewAccountWizardOpen}
        onClose={() => setIsNewAccountWizardOpen(false)}
        onCreated={() => void loadAccounts()}
      />
    </div>
  );
}
