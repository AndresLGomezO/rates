import {
  FinancialAccount,
  PaymentFrequency,
  BillAccount,
  isBill,
} from '../financial-accounts.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MonthlyCalendarView {
  month: string; // "January 2025"
  totalDue: number;
  totalPaid: number;
  remainingDue: number;
  bills: Array<{
    id: string;
    name: string;
    date: Date;
    amount: number;
    status: 'paid' | 'overdue' | 'due_soon' | 'upcoming';
    isVariable: boolean;
  }>;
  dailyCashFlow: Record<string, number>; // "YYYY-MM-DD" -> amount
}

export interface AnnualCostView {
  totalAnnualCost: number;
  monthlyBaseline: number; // total / 12
  categories: Array<{
    category: string;
    total: number;
    percentage: number;
    items: Array<{ name: string; annualCost: number }>;
  }>;
  subscriptionStats: {
    count: number;
    totalCost: number;
  };
}

export interface VariableBillTrend {
  accountId: string;
  name: string;
  currentAmount: number;
  averageAmount: number; // 12-month average
  trendDirection: 'up' | 'down' | 'steady';
  trendPercentage: number;
  history: Array<{ month: string; amount: number }>;
  anomaly: 'none' | 'high' | 'low';
}

// ============================================================================
// Service Logic
// ============================================================================

export class BillInsightsService {
  /**
   * Calculate the Monthly Calendar Insight
   */
  static getMonthlyBillCalendar(
    accounts: FinancialAccount[],
    targetDate: Date = new Date()
  ): MonthlyCalendarView {
    const bills = accounts.filter(isBill);
    const monthStr = targetDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    let totalDue = 0;
    let totalPaid = 0;
    const dailyCashFlow: Record<string, number> = {};
    const billItems: MonthlyCalendarView['bills'] = [];

    for (const bill of bills) {
      if (bill.status !== 'active') continue;

      // Determine due date for this month
      const nextDue = toDate(bill.nextDueDate);
      if (!nextDue) continue;

      // FILTER: If frequency is > monthly, check if it falls in this month
      const freq = bill.paymentFrequency ?? 'monthly';
      const isFrequent = ['daily', 'weekly', 'biweekly', 'monthly'].includes(
        freq
      );

      const dueDay = nextDue.getDate();

      if (!isFrequent) {
        // For longer periods (Quarterly, Annual), strictly check the month
        const dueMonth = nextDue.getMonth();
        const dueYear = nextDue.getFullYear();

        // Only show if due date falls in this target month/year exactly
        if (dueYear !== targetYear || dueMonth !== targetMonth) {
          continue;
        }
      }

      // Construct the due date for the TARGET month based on the bill's due day
      const instanceDate = new Date(targetYear, targetMonth, dueDay);

      // Amount logic: Recurring fixed OR Estimate
      const amount = this.getEstimatedAmount(bill);

      // Status logic
      const status = this.determineMonthlyStatus(bill, instanceDate);

      // Add to totals
      totalDue += amount;
      if (status === 'paid') {
        totalPaid += amount;
      }

      // Add to cash flow (if not paid, it's a future cash flow)
      // Actually, cash flow view usually shows when money leaves, so we show it on due date regardless?
      // Or only if remaining? specification says "Weekly and daily cash-flow visibility"
      // Usually signifies "Upcoming obligations".
      const dateKey = instanceDate.toISOString().split('T')[0];
      dailyCashFlow[dateKey] = (dailyCashFlow[dateKey] ?? 0) + amount;

      billItems.push({
        id: bill.accountNumber ?? bill.accountName, // Fallback ID
        name: bill.accountName,
        date: instanceDate,
        amount,
        status,
        isVariable: !!bill.isAmountVariable,
      });
    }

    return {
      month: monthStr,
      totalDue,
      totalPaid,
      remainingDue: totalDue - totalPaid,
      bills: billItems.sort((a, b) => a.date.getTime() - b.date.getTime()),
      dailyCashFlow,
    };
  }

  /**
   * Calculate Annual Cost Breakdown
   */
  static getAnnualCostBreakdown(accounts: FinancialAccount[]): AnnualCostView {
    const bills = accounts.filter(isBill);
    let totalAnnualCost = 0;
    const categoryMap: Record<string, typeof bills> = {};
    let subCount = 0;
    let subTotal = 0;

    const items: Array<{ name: string; annualCost: number; category: string }> =
      [];

    for (const bill of bills) {
      if (bill.status !== 'active') continue;

      const monthlyAmount = this.getEstimatedAmount(bill);
      const freq = bill.paymentFrequency ?? 'monthly';
      const multiplier = this.getAnnualMultiplier(freq);

      // If variable, maybe we should sum the last 12 months?
      // Plan said: "Variable: Sum of last 12 months actuals (if available) OR Average * 12"
      let annualCost = 0;
      if (bill.isAmountVariable && bill.paymentLog.length > 0) {
        // Sum last 12 months roughly
        // We'll just take the last 12 entries for simplicity or use the average * freq
        // Using average * multiplier ensures consistency if history is short
        annualCost = monthlyAmount * multiplier;
      } else {
        annualCost = monthlyAmount * multiplier;
      }

      totalAnnualCost += annualCost;

      const cat = bill.billSubtype || 'other';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(bill);

      items.push({ name: bill.accountName, annualCost, category: cat });

      if (cat === 'subscription') {
        subCount++;
        subTotal += annualCost;
      }
    }

    // Build categories
    const categories = Object.keys(categoryMap).map((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      const catTotal = catItems.reduce((sum, i) => sum + i.annualCost, 0);
      return {
        category: cat,
        total: catTotal,
        percentage:
          totalAnnualCost > 0 ? (catTotal / totalAnnualCost) * 100 : 0,
        items: catItems,
      };
    });

    return {
      totalAnnualCost,
      monthlyBaseline: totalAnnualCost / 12,
      categories: categories.sort((a, b) => b.total - a.total),
      subscriptionStats: {
        count: subCount,
        totalCost: subTotal,
      },
    };
  }

  /**
   * Calculate Variable Bill Trends
   */
  static getVariableBillTrends(
    accounts: FinancialAccount[]
  ): VariableBillTrend[] {
    const variableBills = accounts.filter(
      (a) => isBill(a) && a.isAmountVariable && a.status === 'active'
    ) as BillAccount[];

    return variableBills.map((bill) => {
      // Sort log by date desc
      const sortedLog = [...bill.paymentLog].sort((a, b) => {
        const da = toDate(a.datePaid);
        const db = toDate(b.datePaid);
        return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });

      // Current is latest paid
      const currentEntry = sortedLog[0];
      const currentAmount = currentEntry?.valuePaid || 0;

      // Average of last 12 (excluding current if we consider current as "this month being analyzed"?)
      // Actually standard is usually: Average of last N entries.
      // Let's take up to 12 entries to calculate average.
      const history12 = sortedLog.slice(0, 12);
      const avgAmount =
        history12.length > 0
          ? history12.reduce((sum, e) => sum + e.valuePaid, 0) /
            history12.length
          : 0;

      // Trend
      let trendDirection: VariableBillTrend['trendDirection'] = 'steady';
      let trendPercentage = 0;

      if (avgAmount > 0) {
        trendPercentage = ((currentAmount - avgAmount) / avgAmount) * 100;
      }

      if (trendPercentage > 5) trendDirection = 'up';
      else if (trendPercentage < -5) trendDirection = 'down';

      // Anomaly
      let anomaly: VariableBillTrend['anomaly'] = 'none';
      if (trendPercentage > 15) anomaly = 'high';
      else if (trendPercentage < -15) anomaly = 'low';

      // History formatted
      const history = history12.map((e) => ({
        month: e.monthPaid,
        amount: e.valuePaid,
      })); // already sorted desc

      return {
        accountId: bill.accountNumber ?? bill.accountName,
        name: bill.accountName,
        currentAmount,
        averageAmount: avgAmount,
        trendDirection,
        trendPercentage,
        history,
        anomaly,
      };
    });
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private static getEstimatedAmount(bill: BillAccount): number {
    if (!bill.isAmountVariable && bill.recurringAmount) {
      return bill.recurringAmount.amount;
    }

    // For variable, average last 3 payments
    if (bill.paymentLog.length > 0) {
      // sort desc
      const sorted = [...bill.paymentLog].sort((a, b) => {
        const da = toDate(a.datePaid);
        const db = toDate(b.datePaid);
        return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });
      const last3 = sorted.slice(0, 3);
      const sum = last3.reduce((acc, curr) => acc + curr.valuePaid, 0);
      return Math.round(sum / last3.length);
    }

    return 0; // fallback
  }

  private static determineMonthlyStatus(
    bill: BillAccount,
    instanceDate: Date
  ): MonthlyCalendarView['bills'][0]['status'] {
    // Check if paid in log for this month
    const monthStr = getMonthString(instanceDate); // YYYY-MM
    const isPaid = bill.paymentLog.some((e) => e.monthPaid === monthStr);

    if (isPaid) return 'paid';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // instanceDate should be set to start of day for comparison
    const target = new Date(instanceDate);
    target.setHours(0, 0, 0, 0);

    // Calc days diff
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'due_soon';
    return 'upcoming';
  }

  private static getAnnualMultiplier(freq: PaymentFrequency): number {
    switch (freq) {
      case 'daily':
        return 365;
      case 'weekly':
        return 52;
      case 'biweekly':
        return 26;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'semi_annually':
        return 2;
      case 'annually':
        return 1;
      default:
        return 12; // default assumption
    }
  }
}

// Helpers duplicated/adapted from paymentUtils to avoid circular deps if needed,
// but ideally we import shared simple utils.
// Implementing locally for purity of this logic file.

function toDate(
  date: Date | { toDate: () => Date } | undefined | null
): Date | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  if ('toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  return undefined;
}

function getMonthString(date: Date): string {
  const month = date.getMonth() + 1; // 0-indexed
  const year = date.getFullYear();
  return `${year}-${month.toString().padStart(2, '0')}`;
}
