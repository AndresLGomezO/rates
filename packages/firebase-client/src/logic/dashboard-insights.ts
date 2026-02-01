import {
  FinancialAccount,
  isBill,
  isInstallmentLoan,
  isRevolvingCredit,
} from '../financial-accounts.js';
import { FinancialProfile } from '../financial-profile.js';
import {
  calculateAccountFields,
  calculateDaysRemaining,
} from '../financial-accounts-utils.js';
import {
  getCreditUtilizationInsight,
  getLoanPayoffInsight,
} from '../financial-insights.js';

// ==========================================
// Dashboard Types
// ==========================================

export interface FinancialHealthScore {
  totalScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'needs_work' | 'critical';
  trend: {
    direction: 'up' | 'down' | 'flat';
    change: number; // e.g. +3
  };
  components: {
    paymentHabits: { score: number; weight: number };
    debtLevel: { score: number; weight: number };
    creditHealth: { score: number; weight: number };
    progressMomentum: { score: number; weight: number };
  };
}

export type AttentionPriority = 'urgent' | 'warning' | 'info';

export interface AttentionItem {
  id: string; // Unique ID for the item
  accountId: string;
  accountName: string;
  type: 'payment_due' | 'utilization' | 'milestone' | 'anomaly';
  priority: AttentionPriority;
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  actionLabel: string;
  actionLink: string; // Internal routing link
  metadata?: Record<string, unknown>;
}

export interface MonthlyMoneyFlow {
  month: string;
  totalObligations: number;
  totalPaid: number;
  remainingDue: number;
  percentComplete: number;
  next7DaysDue: number;
  isHeavyWeek: boolean;
}

export interface TotalFinancialPicture {
  totalDebt: number;
  totalMonthlyOutflow: number;
  debtChange: number; // Change from last month
  breakdown: {
    housing: { amount: number; percentage: number };
    consumerDebt: { amount: number; percentage: number };
    bills: { amount: number; percentage: number };
  };
}

export interface ProgressMetrics {
  debtPaidSinceStart: number;
  accountsPaidOff: number;
  streakMonths: number;
  nextMilestone: {
    name: string;
    remaining: number;
    percentComplete: number;
    estimatedDate: Date | null;
  } | null;
}

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  action: string;
  priority: number; // Higher is better
}

export interface DashboardView {
  healthScore: FinancialHealthScore;
  attentionItems: AttentionItem[];
  moneyFlow: MonthlyMoneyFlow;
  totalPicture: TotalFinancialPicture;
  progress: ProgressMetrics;
  quickActions: QuickAction[];
}

// ==========================================
// Service Logic
// ==========================================

export class DashboardInsightsService {
  /**
   * getDashboardView
   * Aggregates all insights into a single view model for the UI.
   */
  static getDashboardView(
    accounts: FinancialAccount[],
    profile: FinancialProfile | null
  ): DashboardView {
    // 0. Pre-calculation / data prep
    // Ensure all accounts have robust calculated fields
    // (Actual app usage likely has these, but good to ensure)
    // const enhancedAccounts = accounts.map(getAccountWithCalculated);
    // ^ Assuming inputs are already clean or we calculate on fly.
    // For performance, we'll calculate on the fly only what we need.

    // 1. Health Score
    const healthScore = this.calculateHealthScore(accounts, profile);

    // 2. Attention Items
    const attentionItems = this.getAttentionItems(accounts);

    // 3. Money Flow
    const moneyFlow = this.calculateMoneyFlow(accounts);

    // 4. Total Picture
    const totalPicture = this.calculateTotalPicture(accounts);

    // 5. Progress
    const progress = this.calculateProgressMetrics(accounts);

    // 6. Quick Actions
    const quickActions = this.getQuickActions(accounts, attentionItems);

    return {
      healthScore,
      attentionItems,
      moneyFlow,
      totalPicture,
      progress,
      quickActions,
    };
  }

  // ==========================================
  // 1. Health Score Calculation
  // ==========================================
  private static calculateHealthScore(
    accounts: FinancialAccount[],
    profile: FinancialProfile | null
  ): FinancialHealthScore {
    // defaults
    const weights = profile?.healthScoreWeights ?? {
      paymentHabits: 30,
      debtLevel: 25,
      creditHealth: 25,
      progressMomentum: 20,
    };

    // --- A. Payment Habits (30%) ---
    // Look at payment logs. Are they consistent? Missed payments?
    // MVP Heuristic: If no "overdue" accounts -> 100.
    // If overdue > 30 days -> 50.
    // If defaulted -> 0.
    let habitScore = 100;
    const overdueCount = accounts.filter(
      (a) => calculateDaysRemaining(this.getNextDueDate(a) ?? new Date()) < 0
    ).length;
    if (overdueCount > 0) habitScore = 70;
    if (overdueCount > 2) habitScore = 40;

    // --- B. Debt Level (25%) ---
    // Debt-to-Income Ratio
    let debtScore = 50; // Neutral start
    if (profile?.monthlyNetIncome) {
      const monthlyDebtParams = this.calculateTotalPicture(accounts);
      const dti =
        monthlyDebtParams.totalMonthlyOutflow / profile.monthlyNetIncome;
      // DTI scoring: < 30% = 100, 30-40% = 80, 40-50% = 60, >50% = 40
      if (dti < 0.3) debtScore = 100;
      else if (dti < 0.4) debtScore = 80;
      else if (dti < 0.5) debtScore = 60;
      else debtScore = 40;
    } else {
      // Fallback if no income: Ratio of Debt Payments vs Total Bills?
      // Or just neutral '75' to not penalize?
      debtScore = 75;
    }

    // --- C. Credit Health (25%) ---
    // Utilization
    let creditScore = 100;
    const revolving = accounts.filter(isRevolvingCredit);
    if (revolving.length > 0) {
      let totalLimit = 0;
      let totalBal = 0;
      revolving.forEach((r) => {
        totalLimit += r.creditLimit?.amount ?? 0;
        totalBal += r.currentBalance.amount;
      });

      const util = totalLimit > 0 ? totalBal / totalLimit : 0;
      if (util > 0.8) creditScore = 40;
      else if (util > 0.5) creditScore = 60;
      else if (util > 0.3) creditScore = 75;
      else if (util > 0.1) creditScore = 90;
      else creditScore = 100;
    }

    // --- D. Momentum (20%) ---
    // Are balances going down?
    // MVP: Check if totalPaid in last 30 days > interest accrued?
    // Hard to calc perfectly without history.
    // Proxy: If (Total Paid Last Month) > 0 -> 80. If > Scheduled -> 100.
    const momentumScore = 75; // Assume getting by

    // Weighted Total
    const totalScore = Math.round(
      (habitScore * weights.paymentHabits +
        debtScore * weights.debtLevel +
        creditScore * weights.creditHealth +
        momentumScore * weights.progressMomentum) /
        100
    );

    let status: FinancialHealthScore['status'] = 'good';
    if (totalScore >= 90) status = 'excellent';
    else if (totalScore >= 75) status = 'good';
    else if (totalScore >= 60) status = 'fair';
    else if (totalScore >= 40) status = 'needs_work';
    else status = 'critical';

    return {
      totalScore,
      status,
      trend: { direction: 'flat', change: 0 }, // TODO: Persist score to track this
      components: {
        paymentHabits: { score: habitScore, weight: weights.paymentHabits },
        debtLevel: { score: debtScore, weight: weights.debtLevel },
        creditHealth: { score: creditScore, weight: weights.creditHealth },
        progressMomentum: {
          score: momentumScore,
          weight: weights.progressMomentum,
        },
      },
    };
  }

  // ==========================================
  // 2. Attention Items
  // ==========================================
  private static getAttentionItems(
    accounts: FinancialAccount[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];

    for (const acc of accounts) {
      // A. Due Dates
      const nextDue = this.getNextDueDate(acc);
      if (nextDue) {
        const days = calculateDaysRemaining(nextDue);
        const amountDue = this.getAmountDue(acc); // Helper needed

        if (days < 0) {
          items.push({
            id: `due-${acc.accountNumber ?? acc.accountName}`,
            accountId: acc.accountNumber ?? acc.accountName,
            accountName: acc.accountName,
            type: 'payment_due',
            priority: 'urgent',
            title: 'Payment Overdue',
            message: `Overdue by ${Math.abs(days)} days`,
            amount: amountDue,
            currency: acc.currency,
            actionLabel: 'Pay Now',
            actionLink: `/accounts/${acc.accountType}/${acc.accountNumber ?? 'details'}`,
          });
        } else if (days <= 3) {
          items.push({
            id: `due-${acc.accountNumber ?? acc.accountName}`,
            accountId: acc.accountNumber ?? acc.accountName,
            accountName: acc.accountName,
            type: 'payment_due',
            priority: days <= 1 ? 'urgent' : 'warning',
            title: days === 0 ? 'Due Today' : `Due in ${days} days`,
            message: '', // We will construct the display in UI or leave empty if mostly amount
            amount: amountDue,
            currency: acc.currency,
            actionLabel: 'Pay Now',
            actionLink: `/accounts/${acc.accountType}/${acc.accountNumber ?? 'details'}`,
          });
        }
      }

      // B. Utilization (Credit Cards)
      if (isRevolvingCredit(acc)) {
        const util = getCreditUtilizationInsight(acc);
        if (util && util.currentUtilization > 50) {
          items.push({
            id: `util-${acc.accountNumber}`,
            accountId: acc.accountNumber ?? '',
            accountName: acc.accountName,
            type: 'utilization',
            priority: util.currentUtilization > 80 ? 'urgent' : 'warning',
            title: 'High Utilization',
            message: `Currently at ${util.currentUtilization.toFixed(0)}%`,
            actionLabel: 'See Details',
            actionLink: `/accounts/${acc.accountType}/${acc.accountNumber ?? 'details'}`,
          });
        }
      }
    }

    // Sort: Urgent first, then Warning, then Info
    const sortMap = { urgent: 0, warning: 1, info: 2 };
    return items.sort((a, b) => sortMap[a.priority] - sortMap[b.priority]);
  }

  // ==========================================
  // 3. Money Flow
  // ==========================================
  private static calculateMoneyFlow(
    accounts: FinancialAccount[]
  ): MonthlyMoneyFlow {
    // Reuse Bill Calendar Logic for the month view
    // const calendar = BillInsightsService.getMonthlyBillCalendar(accounts);

    // Also need to sum up Loan/Credit payments if not captured by "Bill flow"
    // (BillInsightsService currently only checks 'isBill' | 'isFrequent', may need expanding or wrapping)
    // Actually BillInsightsService checks accounts.filter(isBill), so we need to extend it
    // OR just calculate manually here.
    //
    // Let's implement a simpler aggregation here that includes Loans + Credit Min Payments.

    let totalObligations = 0;
    let totalPaid = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    accounts.forEach((acc) => {
      // Determine expected payment this month
      // 1. Check if paid this month
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const paidEntry = acc.paymentLog.find((p) => p.monthPaid === monthStr);

      let amount = 0;
      if (isInstallmentLoan(acc)) amount = acc.scheduledPayment?.amount ?? 0;
      else if (isBill(acc))
        amount = acc.recurringAmount?.amount ?? 0; // simplistic
      else if (isRevolvingCredit(acc))
        amount = acc.currentMinimumPayment?.amount ?? 0;

      totalObligations += amount;
      if (paidEntry) totalPaid += amount; // Assume they paid full amount logic for simplicity or use paidEntry.valuePaid
    });

    const remainingDue = totalObligations - totalPaid;

    return {
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalObligations,
      totalPaid,
      remainingDue,
      percentComplete:
        totalObligations > 0 ? (totalPaid / totalObligations) * 100 : 0,
      next7DaysDue: 0, // TODO: Implement day-level filter
      isHeavyWeek: false,
    };
  }

  // ==========================================
  // 4. Total Picture
  // ==========================================
  private static calculateTotalPicture(
    accounts: FinancialAccount[]
  ): TotalFinancialPicture {
    let totalDebt = 0;
    let housing = 0;
    let consumer = 0;
    let bills = 0;

    accounts.forEach((acc) => {
      // Debt Totals
      if (isInstallmentLoan(acc) || isRevolvingCredit(acc)) {
        let bal = 0;
        if (isInstallmentLoan(acc)) bal = acc.currentPrincipal?.amount ?? 0;
        if (isRevolvingCredit(acc)) bal = acc.currentBalance.amount;

        totalDebt += bal;

        if (
          acc.accountName.toLowerCase().includes('mortgage') ||
          acc.accountName.toLowerCase().includes('rent')
        ) {
          // Categorize as housing debt (Mortgage)
        } else {
          // Only consumer debt?
        }
      }

      // Monthly Outflow (Obligation)
      let monthly = 0;
      if (isInstallmentLoan(acc)) monthly = acc.scheduledPayment?.amount ?? 0;
      else if (isRevolvingCredit(acc))
        monthly =
          acc.userPlannedPayment?.amount ??
          acc.currentMinimumPayment?.amount ??
          0;
      else if (isBill(acc)) monthly = acc.recurringAmount?.amount ?? 0;

      // Classify
      const name = acc.accountName.toLowerCase();
      const type = acc.accountType;

      if (name.includes('mortgage') || name.includes('rent')) {
        housing += monthly;
      } else if (type === 'bill') {
        bills += monthly;
      } else {
        consumer += monthly;
      }
    });

    const totalMonthly = housing + consumer + bills;

    return {
      totalDebt,
      totalMonthlyOutflow: totalMonthly,
      debtChange: 0, // Needs history snapshot
      breakdown: {
        housing: {
          amount: housing,
          percentage: totalMonthly > 0 ? housing / totalMonthly : 0,
        },
        consumerDebt: {
          amount: consumer,
          percentage: totalMonthly > 0 ? consumer / totalMonthly : 0,
        },
        bills: {
          amount: bills,
          percentage: totalMonthly > 0 ? bills / totalMonthly : 0,
        },
      },
    };
  }

  // ==========================================
  // 5. Progress Metrics
  // ==========================================
  private static calculateProgressMetrics(
    accounts: FinancialAccount[]
  ): ProgressMetrics {
    // Principal Paid Down (Lifetime or Last 12mo)
    // We can sum 'totalCapitalPaid' calculated field
    let debtPaidSinceStart = 0;
    let accountsPaidOff = 0;
    let nextMilestone: ProgressMetrics['nextMilestone'] = null;

    let minRemaining = Infinity;

    accounts.forEach((acc) => {
      if (acc.status === 'paid_off') accountsPaidOff++;

      const calc = calculateAccountFields(acc);
      debtPaidSinceStart += calc.totalCapitalPaid.amount;

      // Find next milestone (smallest remaining balance)
      if (isInstallmentLoan(acc) && acc.status === 'active') {
        const remaining = acc.currentPrincipal?.amount ?? 0;
        if (remaining > 0 && remaining < minRemaining) {
          minRemaining = remaining;
          const payoff = getLoanPayoffInsight(acc);

          nextMilestone = {
            name: acc.accountName,
            remaining,
            percentComplete: payoff?.progressPercentage ?? 0,
            estimatedDate: payoff?.estimatedPayoffDate ?? null,
          };
        }
      }
      // Revolvings are harder as milestones (pay to zero)
      if (isRevolvingCredit(acc) && acc.status === 'active') {
        const remaining = acc.currentBalance.amount;
        if (remaining > 0 && remaining < minRemaining) {
          minRemaining = remaining;
          nextMilestone = {
            name: acc.accountName,
            remaining,
            percentComplete: 0, // Hard to define "complete" without original balance
            estimatedDate: null,
          };
        }
      }
    });

    return {
      debtPaidSinceStart,
      accountsPaidOff,
      streakMonths: 0, // Needs generic payment log analysis for streaks
      nextMilestone,
    };
  }

  // ==========================================
  // 6. Quick Actions
  // ==========================================
  private static getQuickActions(
    accounts: FinancialAccount[],
    items: AttentionItem[]
  ): QuickAction[] {
    const actions: QuickAction[] = [];

    // 1. If Urgent item
    const urgent = items.find((i) => i.priority === 'urgent');
    if (urgent) {
      actions.push({
        id: 'resolve-urgent',
        icon: 'alert-circle',
        label: `Pay ${urgent.accountName}`,
        action: urgent.actionLink,
        priority: 100,
      });
    }

    // 2. Log Payment (always useful)
    actions.push({
      id: 'log-payment',
      icon: 'plus-circle',
      label: 'Log a Payment',
      action: '/payments/new',
      priority: 50,
    });

    // 3. Add Account (if few accounts)
    if (accounts.length < 3) {
      actions.push({
        id: 'add-account',
        icon: 'wallet',
        label: 'Add Account',
        action: '/accounts/new',
        priority: 60,
      });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  // ==========================================
  // Helpers
  // ==========================================
  private static getNextDueDate(acc: FinancialAccount): Date | undefined {
    if (isInstallmentLoan(acc) || isRevolvingCredit(acc)) {
      return this.toDate(acc.nextDueDate);
    }
    if (isBill(acc)) return this.toDate(acc.nextDueDate);
    return undefined;
  }

  private static toDate(d: unknown): Date | undefined {
    if (!d) return undefined;
    if (d instanceof Date) return d;
    // Check for Firestore Timestamp-like object
    if (
      typeof d === 'object' &&
      d !== null &&
      'toDate' in d &&
      typeof (d as { toDate: () => Date }).toDate === 'function'
    ) {
      return (d as { toDate: () => Date }).toDate();
    }
    if (typeof d === 'string' || typeof d === 'number') {
      return new Date(d);
    }
    return undefined;
  }

  private static getAmountDue(acc: FinancialAccount): number {
    if (isInstallmentLoan(acc)) return acc.scheduledPayment?.amount ?? 0;
    if (isRevolvingCredit(acc)) return acc.currentMinimumPayment?.amount ?? 0;
    if (isBill(acc)) return acc.recurringAmount?.amount ?? 0;
    return 0;
  }
}
