import type { OtherAccount } from './financial-accounts';

export type AccountDirection = 'liability' | 'asset' | 'tracking';

/**
 * Infers the direction of an Other account (Asset vs Liability)
 * based on metadata or category heuristics.
 */
export function getAvailableAccountDirection(
  account: OtherAccount
): AccountDirection {
  // 1. Check metadata (if we add this field explicitly later)
  const metaDir = (account.metadata as { direction?: AccountDirection })
    ?.direction;
  if (
    metaDir === 'liability' ||
    metaDir === 'asset' ||
    metaDir === 'tracking'
  ) {
    return metaDir;
  }

  // 2. Check heuristics based on category or name
  const textToSearch = [
    account.category,
    account.accountName,
    account.accountDescription,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const assetKeywords = [
    'deposit',
    'owed to me',
    'receivable',
    'lent',
    'asset',
    'saving',
    'refund',
    'reimbursement',
  ];

  const trackingKeywords = ['reminder', 'date', 'tracking', 'event'];

  if (assetKeywords.some((k) => textToSearch.includes(k))) {
    return 'asset';
  }

  if (
    trackingKeywords.some((k) => textToSearch.includes(k)) &&
    (!account.currentAmount || account.currentAmount.amount === 0)
  ) {
    return 'tracking';
  }

  // Default to liability (Safe assumption for "Other", usually debts/plans)
  return 'liability';
}

/**
 * Calculates the age of an account in days (since tracking start or creation).
 */
export function calculateAccountAgeInDays(account: OtherAccount): number {
  let startDate: Date | undefined;

  if (account.trackingStartDate) {
    if (account.trackingStartDate instanceof Date) {
      startDate = account.trackingStartDate;
    } else {
      // Safe casting for Date handling
      const ts = account.trackingStartDate as { toDate?: () => Date };
      startDate =
        ts.toDate?.() ?? (account.trackingStartDate as unknown as Date);
    }
  } else if (account.createdAt) {
    // Safe casting for Date handling
    startDate =
      (account.createdAt as { toDate?: () => Date }).toDate?.() ??
      (account.createdAt as unknown as Date);
  }

  if (!startDate) return 0;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type AgingBucket = '0-30' | '30-60' | '60-90' | '90+';

export function getAgingBucket(days: number): AgingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '30-60';
  if (days <= 90) return '60-90';
  return '90+';
}

/**
 * Normalized status for Other accounts specifically for insights
 */
export type OtherAccountInsightStatus =
  | 'completed' // Balance is 0 or status is paid_off
  | 'overdue' // Past nextRelevantDate
  | 'due_soon' // Within 7 days of nextRelevantDate
  | 'on_track' // Default active state
  | 'needs_attention' // No plan or stalled
  | 'tracking_only'; // No amount

export function getOtherAccountInsightStatus(
  account: OtherAccount
): OtherAccountInsightStatus {
  if (account.status === 'paid_off' || account.status === 'closed')
    return 'completed';
  if (account.currentAmount && account.currentAmount.amount <= 0)
    return 'completed';

  const direction = getAvailableAccountDirection(account);
  if (direction === 'tracking') return 'tracking_only';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextDate = account.nextRelevantDate;
  // Handle Firestore Timestamp conversion
  if (nextDate && (nextDate as { toDate?: () => Date }).toDate) {
    nextDate = (nextDate as { toDate: () => Date }).toDate();
  }

  if (!nextDate) {
    return 'needs_attention'; // No date set often means "forgotten"
  }

  const nextDateObj = new Date(nextDate as Date);
  nextDateObj.setHours(0, 0, 0, 0);

  // Check if past (overdue)
  if (nextDateObj.getTime() < today.getTime()) {
    return 'overdue';
  }

  // Check if due soon (within 7 days)
  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);

  if (nextDateObj.getTime() <= inSevenDays.getTime()) {
    return 'due_soon';
  }

  return 'on_track';
}
