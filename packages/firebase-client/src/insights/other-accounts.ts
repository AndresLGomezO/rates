import { OtherAccount } from '../financial-accounts';
import {
  getAvailableAccountDirection,
  calculateAccountAgeInDays,
  getAgingBucket,
  getOtherAccountInsightStatus,
  OtherAccountInsightStatus,
  AgingBucket,
} from '../other-account-utils';

// --- Types ---

export interface ObligationsInsight {
  totalOutstanding: number;
  liabilityCount: number;
  totalPaid: number;
  progressPercentage: number; // Overall progress
  items: Array<{
    accountId: string; // Using accountName as ID if real ID missing for now
    name: string;
    amount: number;
    status: OtherAccountInsightStatus;
    nextDate?: Date;
    progress: number;
  }>;
}

export interface CommitmentInsight {
  totalCommitments: number; // Active liabilities with plans
  onTimeStreakMonths: number; // Mocked or calculated
  overallStatus: 'great' | 'good' | 'needs_improvement';
  commitments: Array<{
    accountId: string;
    name: string;
    streak: number;
    status: OtherAccountInsightStatus;
    nextDue?: Date;
    hasPlan: boolean;
  }>;
}

export interface MoneyOwedInsight {
  totalReceivable: number;
  count: number;
  agingBuckets: Record<AgingBucket, number>; // Count per bucket
  items: Array<{
    accountId: string;
    name: string;
    amount: number;
    ageDays: number;
    agingBucket: AgingBucket;
    status: OtherAccountInsightStatus; // overdue here means "long outstanding"
    notes?: string;
  }>;
  actionableItems: number; // Count of items needing follow-up
}

export interface OtherAccountsInsights {
  obligations: ObligationsInsight;
  commitments: CommitmentInsight;
  moneyOwed: MoneyOwedInsight;
}

// --- Generators ---

export function generateOtherAccountsInsights(
  accounts: OtherAccount[]
): OtherAccountsInsights {
  const liabilities = accounts.filter(
    (a) => getAvailableAccountDirection(a) === 'liability'
  );
  const assets = accounts.filter(
    (a) => getAvailableAccountDirection(a) === 'asset'
  );

  // 1. Obligations Overview
  const obligations = generateObligationsInsight(liabilities);

  // 2. Commitment Tracker (Subset of liabilities, typically)
  const commitments = generateCommitmentInsight(liabilities);

  // 3. Money Owed to You
  const moneyOwed = generateMoneyOwedInsight(assets);

  return {
    obligations,
    commitments,
    moneyOwed,
  };
}

function generateObligationsInsight(
  accounts: OtherAccount[]
): ObligationsInsight {
  let totalOutstanding = 0;
  let totalPaid = 0;
  let totalOriginal = 0;

  const items = accounts.map((acc) => {
    const current = acc.currentAmount?.amount ?? 0;
    const paid = acc.paymentLog?.reduce((sum, p) => sum + p.valuePaid, 0) ?? 0;

    // Estimate original if not stored: current + paid
    // Ideally we'd have originalAmount in schema
    const original =
      (acc as { originalAmount?: { amount: number } }).originalAmount?.amount ??
      current + paid;

    totalOutstanding += current;
    totalPaid += paid;
    totalOriginal += original;

    const progress = original > 0 ? (paid / original) * 100 : 0;

    // Handle date conversion
    let nextDate: Date | undefined;
    if (acc.nextRelevantDate) {
      // @ts-expect-error - handle firestore timestamp
      nextDate = acc.nextRelevantDate.toDate
        ? (acc.nextRelevantDate as { toDate: () => Date }).toDate()
        : acc.nextRelevantDate;
    }

    return {
      accountId: acc.accountName, // TODO: Use real ID when available
      name: acc.accountName,
      amount: current,
      status: getOtherAccountInsightStatus(acc),
      nextDate,
      progress: Math.min(progress, 100),
    };
  });

  const overallProgress =
    totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  return {
    totalOutstanding,
    liabilityCount: accounts.length,
    totalPaid,
    progressPercentage: Math.min(overallProgress, 100),
    items,
  };
}

function generateCommitmentInsight(
  accounts: OtherAccount[]
): CommitmentInsight {
  const commitments = accounts.map((acc) => {
    // Logic for streaks would go here. For now, we simulate simple "has plan" checks
    const hasPlan = !!(acc.metadata as { paymentPlan?: unknown })?.paymentPlan;
    const status = getOtherAccountInsightStatus(acc);

    // Mock streak based on payment log count for now
    // Real logic needs expected dates
    const streak = acc.paymentLog?.length || 0;

    let nextDue: Date | undefined;
    if (acc.nextRelevantDate) {
      // @ts-expect-error - handle firestore timestamp
      nextDue = acc.nextRelevantDate.toDate
        ? (acc.nextRelevantDate as { toDate: () => Date }).toDate()
        : acc.nextRelevantDate;
    }

    return {
      accountId: acc.accountName,
      name: acc.accountName,
      streak: hasPlan ? streak : 0,
      status,
      nextDue,
      hasPlan,
    };
  });

  const activeCommitments = commitments.filter(
    (c) => c.status === 'on_track' || c.status === 'due_soon'
  );
  // Simple heuristic for overall status
  const overallStatus =
    activeCommitments.length === commitments.length && commitments.length > 0
      ? 'great'
      : commitments.some(
            (c) => c.status === 'overdue' || c.status === 'needs_attention'
          )
        ? 'needs_improvement'
        : 'good';

  return {
    totalCommitments: commitments.length,
    onTimeStreakMonths: 0, // Placeholder for aggregate streak
    overallStatus,
    commitments,
  };
}

function generateMoneyOwedInsight(accounts: OtherAccount[]): MoneyOwedInsight {
  let totalReceivable = 0;
  const bucketCounts: Record<AgingBucket, number> = {
    '0-30': 0,
    '30-60': 0,
    '60-90': 0,
    '90+': 0,
  };

  const items = accounts.map((acc) => {
    const amount = acc.currentAmount?.amount ?? 0;
    totalReceivable += amount;

    const ageDays = calculateAccountAgeInDays(acc);
    const bucket = getAgingBucket(ageDays);
    bucketCounts[bucket]++;

    return {
      accountId: acc.accountName,
      name: acc.accountName,
      amount,
      ageDays,
      agingBucket: bucket,
      status: getOtherAccountInsightStatus(acc),
      notes: (acc.metadata as { notes?: string })?.notes, // Hypothetical
    };
  });

  // Actionable: >30 days old OR overdue
  const actionableItems = items.filter(
    (i) =>
      i.ageDays > 30 || i.status === 'overdue' || i.status === 'needs_attention'
  ).length;

  return {
    totalReceivable,
    count: accounts.length,
    agingBuckets: bucketCounts,
    items,
    actionableItems,
  };
}
