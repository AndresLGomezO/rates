/**
 * Other Income Insights Service
 *
 * Provides logic for calculating meaningful insights specifically for "Other" income types
 * (gifts, windfalls, tax refunds, etc.).
 */

import { OtherIncome, Income, OtherIncomeSubtype } from '../incomes.js';

export interface WindfallAllocation {
  category:
    | 'emergency_fund'
    | 'debt_payoff'
    | 'mortgage_principal'
    | 'invest'
    | 'enjoy';
  amount: number;
  reason: string;
  targetDebt?: string;
  priority: number;
}

export interface WindfallSuggestions {
  totalAmount: number;
  suggestions: WindfallAllocation[];
  isLargeWindfall: boolean;
}

export interface ExpectedIncomeAnalysis {
  pending: OtherIncome[];
  upcoming: OtherIncome[];
  overdue: OtherIncome[];
  recentlyReceived: OtherIncome[];
  totalExpected: number;
  nearestArrival?: OtherIncome;
  daysUntilNearest: number | null;
  hasOverdue: boolean;
}

export interface TaxGuidance {
  likelyTaxable: boolean | 'depends' | 'unknown';
  explanation: string;
  exception?: string;
  details?: string;
}

export interface OtherIncomeTaxAnalysis {
  taxable: Array<{ income: OtherIncome; guidance: TaxGuidance }>;
  nonTaxable: Array<{ income: OtherIncome; guidance: TaxGuidance }>;
  depends: Array<{ income: OtherIncome; guidance: TaxGuidance }>;
  totalTaxable: number;
  totalNonTaxable: number;
  estimatedTaxRange: { low: number; high: number };
}

export interface OtherIncomeContextAnalysis {
  recurring: {
    total: number;
    reliable: number;
    variable: number;
    reliablePercentage: number;
    daysCovered: number;
  };
  oneTime: {
    received: number;
    expected: number;
    total: number;
    monthsCovered: number;
  };
  context: {
    totalMonthlyIncome: number;
    otherAsPercentOfTotal: number;
    recommendation: string;
  };
}

export interface UserFinancialSnapshot {
  totalMonthlyExpenses: number;
  emergencyFundBalance?: number;
  debts?: Array<{
    name: string;
    balance: number;
    apr: number;
    type: 'loan' | 'credit';
  }>;
  mortgage?: { name: string; balance: number; apr: number };
}

export class OtherInsightsService {
  /**
   * Insight #1: Windfall Decision Helper
   * Guides intentional use of unexpected money.
   */
  static generateWindfallSuggestions(
    amount: number,
    userFinancials: UserFinancialSnapshot
  ): WindfallSuggestions {
    const suggestions: WindfallAllocation[] = [];
    let remainingAmount = amount;

    // Priority 1: Emergency fund gap (if under 6 months)
    const monthlyExpenses = userFinancials.totalMonthlyExpenses;
    const targetEmergencyFund = monthlyExpenses * 6;
    const currentEmergencyFund = userFinancials.emergencyFundBalance || 0;
    const emergencyFundGap = Math.max(
      0,
      targetEmergencyFund - currentEmergencyFund
    );

    if (emergencyFundGap > 0 && remainingAmount > 0) {
      const allocation = Math.min(emergencyFundGap, remainingAmount * 0.5); // Cap at 50%
      const newBalance = currentEmergencyFund + allocation;
      const runway = monthlyExpenses > 0 ? newBalance / monthlyExpenses : 0;

      suggestions.push({
        category: 'emergency_fund',
        amount: allocation,
        reason: `Reach ${runway.toFixed(1)} months runway`,
        priority: 1,
      });
      remainingAmount -= allocation;
    }

    // Priority 2: High-interest debt (>15% APR)
    const highInterestDebt = userFinancials.debts
      ?.filter((d) => d.apr > 15)
      .sort((a, b) => b.apr - a.apr);

    if (
      highInterestDebt &&
      highInterestDebt.length > 0 &&
      remainingAmount > 0
    ) {
      const topDebt = highInterestDebt[0];
      const allocation = Math.min(topDebt.balance, remainingAmount * 0.4);
      const interestSaved = allocation * (topDebt.apr / 100); // Estimated annual savings

      suggestions.push({
        category: 'debt_payoff',
        amount: allocation,
        reason: `Save ~$${Math.round(interestSaved)}/year in interest`,
        targetDebt: topDebt.name,
        priority: 2,
      });
      remainingAmount -= allocation;
    }

    // Priority 3: Mortgage principal (if applicable)
    if (userFinancials.mortgage && remainingAmount > 1000) {
      const allocation = Math.min(remainingAmount * 0.3, 10000);
      // Rough estimate: $1 towards principal saves ~$1.50-$3.00 over 30 years depending on rate
      const lifetimeSavings = allocation * 1.5;

      suggestions.push({
        category: 'mortgage_principal',
        amount: allocation,
        reason: `Save ~$${Math.round(lifetimeSavings)} lifetime interest`,
        priority: 3,
      });
      remainingAmount -= allocation;
    }

    // Priority 4: Invest the rest
    if (remainingAmount > 0) {
      // Rule of 72/FV logic: grow to ~2x in 10 years at 7%
      const futureValue = remainingAmount * Math.pow(1.07, 10);

      suggestions.push({
        category: 'invest',
        amount: remainingAmount,
        reason: `Could grow to $${Math.round(futureValue).toLocaleString()} in 10 years`,
        priority: 4,
      });
    }

    return {
      totalAmount: amount,
      suggestions: suggestions.sort((a, b) => a.priority - b.priority),
      isLargeWindfall: amount > 5000,
    };
  }

  /**
   * Insight #2: Expected Income Tracker
   * Tracks pending income, prompts follow-up.
   */
  static getExpectedIncomeStatus(
    otherIncomes: OtherIncome[]
  ): ExpectedIncomeAnalysis {
    const now = new Date();

    // Filter to one-time, not-yet-received
    const pending = otherIncomes.filter(
      (inc) => inc.isOneTime && !inc.isReceived && inc.incomeDate
    );

    // Categorize by timing
    const upcoming = pending
      .filter((inc) => this.toDate(inc.incomeDate) > now)
      .sort(
        (a, b) =>
          this.toDate(a.incomeDate).getTime() -
          this.toDate(b.incomeDate).getTime()
      );

    const overdue = pending
      .filter((inc) => this.toDate(inc.incomeDate) <= now)
      .sort(
        (a, b) =>
          this.toDate(a.incomeDate).getTime() -
          this.toDate(b.incomeDate).getTime()
      );

    // Recently received (last 30 days)
    const recentlyReceived = otherIncomes.filter((inc) => {
      if (!inc.isOneTime || !inc.isReceived || !inc.incomeDate) return false;
      const date = this.toDate(inc.incomeDate);
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30 && diffDays >= 0;
    });

    const totalExpected = pending.reduce(
      (sum, p) => sum + p.incomeAmount.amount,
      0
    );
    const nearestArrival = upcoming[0];

    return {
      pending,
      upcoming,
      overdue,
      recentlyReceived,
      totalExpected,
      nearestArrival,
      daysUntilNearest: nearestArrival
        ? Math.ceil(
            (this.toDate(nearestArrival.incomeDate).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      hasOverdue: overdue.length > 0,
    };
  }

  /**
   * Insight #3: Other Income Tax Summary
   * Clarifies what's taxable vs. not.
   */
  static getTaxSummary(otherIncomes: OtherIncome[]): OtherIncomeTaxAnalysis {
    const TAX_TREATMENT_BY_SUBTYPE: Record<OtherIncomeSubtype, TaxGuidance> = {
      gift: {
        likelyTaxable: false,
        explanation: 'Gifts under $18,000 (2024) are not taxable to recipient',
        exception: 'If gift is from employer, may be taxable',
      },
      inheritance: {
        likelyTaxable: false,
        explanation: 'Inheritances are generally not taxable income',
        exception:
          'Estate tax may apply to very large estates; inherited retirement accounts have special rules',
      },
      prize_lottery: {
        likelyTaxable: true,
        explanation: 'Prizes and lottery winnings are fully taxable',
        exception:
          'Small prizes under $600 may not generate a 1099 but are still taxable',
      },
      sale_personal_items: {
        likelyTaxable: false,
        explanation: 'Selling personal items at a loss is not taxable',
        exception: 'If sold for more than you paid, the gain may be taxable',
      },
      insurance_settlement: {
        likelyTaxable: 'depends',
        explanation: 'Depends on the type of settlement',
        details:
          'Property damage reimbursement: usually not taxable. Lost wages: usually taxable.',
      },
      legal_settlement: {
        likelyTaxable: 'depends',
        explanation: 'Depends on what the settlement is for',
        details:
          'Physical injury: usually not taxable. Emotional distress or punitive damages: usually taxable.',
      },
      tax_refund: {
        likelyTaxable: false,
        explanation: 'Tax refunds are not taxable income',
        exception:
          'If you deducted state taxes and got a refund, that refund may be taxable federally',
      },
      rebate_cashback: {
        likelyTaxable: false,
        explanation:
          'Rebates and cash back are considered price reductions, not income',
        exception: 'Credit card sign-up bonuses may be taxable',
      },
      odd_jobs: {
        likelyTaxable: true,
        explanation: 'Income from odd jobs is self-employment income',
        details:
          'Report on Schedule C if over $400. May owe self-employment tax.',
      },
      crypto_airdrop: {
        likelyTaxable: true,
        explanation:
          'Crypto airdrops are taxable as ordinary income at fair market value when received',
      },
      found_money: {
        likelyTaxable: false,
        explanation: 'Small amounts of found money are generally not taxable',
        exception: 'Large amounts or treasure trove may be taxable',
      },
      stipend: {
        likelyTaxable: 'depends',
        explanation: 'Depends on the type of stipend',
        details:
          'Educational stipends for tuition: not taxable. Living expense stipends: often taxable.',
      },
      allowance: {
        likelyTaxable: false,
        explanation: 'Allowances from family are typically gifts, not taxable',
      },
      reimbursement: {
        likelyTaxable: false,
        explanation: 'Reimbursements for expenses are not income',
        exception: 'Must be for actual expenses incurred',
      },
      other: {
        likelyTaxable: 'unknown',
        explanation:
          'Tax treatment varies — consider consulting a tax professional',
      },
    };

    const taxable: Array<{ income: OtherIncome; guidance: TaxGuidance }> = [];
    const nonTaxable: Array<{ income: OtherIncome; guidance: TaxGuidance }> =
      [];
    const depends: Array<{ income: OtherIncome; guidance: TaxGuidance }> = [];

    let totalTaxable = 0;
    let totalNonTaxable = 0;

    otherIncomes.forEach((inc) => {
      const guidance = TAX_TREATMENT_BY_SUBTYPE[inc.subtype];
      const amount = inc.incomeAmount.amount;

      if (guidance.likelyTaxable === true) {
        taxable.push({ income: inc, guidance });
        totalTaxable += amount;
      } else if (guidance.likelyTaxable === false) {
        nonTaxable.push({ income: inc, guidance });
        totalNonTaxable += amount;
      } else {
        depends.push({ income: inc, guidance });
        // We don't add to totals for "depends" as it's unsure
      }
    });

    // Estimate tax at 22-27% combined federal + state as per spec
    const estimatedTaxLow = totalTaxable * 0.22;
    const estimatedTaxHigh = totalTaxable * 0.27;

    return {
      taxable,
      nonTaxable,
      depends,
      totalTaxable,
      totalNonTaxable,
      estimatedTaxRange: { low: estimatedTaxLow, high: estimatedTaxHigh },
    };
  }

  /**
   * Insight #4: Other Income in Context
   * Shows how other income fits the whole picture.
   */
  static analyzeOtherIncomeInContext(
    otherIncomes: OtherIncome[],
    allIncomes: Income[],
    monthlyExpenses: number
  ): OtherIncomeContextAnalysis {
    // Separate one-time vs recurring
    const oneTime = otherIncomes.filter((i) => i.isOneTime);
    const recurring = otherIncomes.filter((i) => !i.isOneTime);

    // Calculate recurring monthly total
    const recurringMonthly = recurring.reduce((sum, inc) => {
      return sum + this.getMonthlyAmount(inc);
    }, 0);

    // Separate reliable vs variable recurring
    const reliableRecurring = recurring.filter(
      (i) =>
        i.predictability === 'highly_predictable' ||
        i.predictability === 'somewhat_predictable'
    );
    const variableRecurring = recurring.filter(
      (i) =>
        i.predictability === 'variable' ||
        i.predictability === 'unpredictable' ||
        i.paymentFrequency === 'irregular'
    );

    const reliableMonthly = reliableRecurring.reduce(
      (sum, i) => sum + this.getMonthlyAmount(i),
      0
    );
    const variableMonthly = variableRecurring.reduce(
      (sum, i) => sum + this.getMonthlyAmount(i),
      0
    );

    // Calculate one-time totals for current year
    const currentYear = new Date().getFullYear();
    const oneTimeThisYear = oneTime.filter((i) => {
      const date = this.toDate(i.incomeDate);
      return date && date.getFullYear() === currentYear;
    });

    const receivedOneTime = oneTimeThisYear
      .filter((i) => i.isReceived)
      .reduce((sum, i) => sum + i.incomeAmount.amount, 0);

    const expectedOneTime = oneTimeThisYear
      .filter((i) => !i.isReceived)
      .reduce((sum, i) => sum + i.incomeAmount.amount, 0);

    // Total income context
    const totalMonthlyIncome = allIncomes.reduce((sum, inc) => {
      if (inc.type !== 'other' || !inc.isOneTime) {
        return sum + this.getMonthlyAmount(inc);
      }
      return sum;
    }, 0);

    const otherAsPercentOfTotal =
      totalMonthlyIncome > 0
        ? (recurringMonthly / totalMonthlyIncome) * 100
        : 0;

    // How many days of expenses does recurring other cover?
    const dailyExpenses = monthlyExpenses / 30;
    const daysCovered =
      dailyExpenses > 0 ? recurringMonthly / dailyExpenses : 0;

    // How many months does one-time cover?
    const totalOneTime = receivedOneTime + expectedOneTime;
    const monthsCovered =
      monthlyExpenses > 0 ? totalOneTime / monthlyExpenses : 0;

    return {
      recurring: {
        total: recurringMonthly,
        reliable: reliableMonthly,
        variable: variableMonthly,
        reliablePercentage:
          recurringMonthly > 0 ? (reliableMonthly / recurringMonthly) * 100 : 0,
        daysCovered,
      },
      oneTime: {
        received: receivedOneTime,
        expected: expectedOneTime,
        total: totalOneTime,
        monthsCovered,
      },
      context: {
        totalMonthlyIncome,
        otherAsPercentOfTotal,
        recommendation:
          reliableMonthly > variableMonthly
            ? 'Budget based on reliable portion; treat variable as bonus'
            : 'This income is mostly variable; budget conservatively',
      },
    };
  }

  /**
   * Helper to convert various date formats to Date object
   */
  private static toDate(date: unknown): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (
      typeof date === 'object' &&
      date !== null &&
      'toDate' in date &&
      typeof (date as { toDate?: unknown }).toDate === 'function'
    ) {
      return (date as { toDate: () => Date }).toDate();
    }
    return new Date(date as string | number);
  }

  /**
   * Helper to get monthly amount for any income type
   */
  private static getMonthlyAmount(income: Income): number {
    switch (income.type) {
      case 'salary':
        if (income.annualSalary) return income.annualSalary.amount / 12;
        if (income.takeHomePay) {
          return (
            (income.takeHomePay.amount *
              this.getFrequencyMultiplier(income.paymentFrequency)) /
            12
          );
        }
        return 0;
      case 'freelance':
        if (income.estimatedMonthlyIncome)
          return income.estimatedMonthlyIncome.amount;
        if (income.retainerAmount && income.retainerFrequency) {
          return (
            (income.retainerAmount.amount *
              this.getFrequencyMultiplier(income.retainerFrequency)) /
            12
          );
        }
        return 0;
      case 'rental':
        return (
          (income.rentalAmount.amount *
            this.getFrequencyMultiplier(income.rentalFrequency)) /
          12
        );
      case 'investments':
        if (!income.incomeAmount) return 0;
        return (
          (income.incomeAmount.amount *
            this.getFrequencyMultiplier(
              income.paymentFrequency === 'irregular'
                ? 'monthly'
                : income.paymentFrequency
            )) /
          12
        );
      case 'benefits':
        return (
          (income.benefitAmount.amount *
            this.getFrequencyMultiplier(income.paymentFrequency)) /
          12
        );
      case 'other':
        if (income.isOneTime) return 0; // One-time doesn't have a monthly amount in this context
        return (
          (income.incomeAmount.amount *
            this.getFrequencyMultiplier(
              income.paymentFrequency === 'irregular'
                ? 'monthly'
                : income.paymentFrequency || 'monthly'
            )) /
          12
        );
      default:
        return 0;
    }
  }

  private static getFrequencyMultiplier(frequency?: string): number {
    switch (frequency) {
      case 'weekly':
        return 52;
      case 'biweekly':
        return 26;
      case 'semi_monthly':
        return 24;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'semi_annually':
        return 2;
      case 'annually':
        return 1;
      case 'daily':
        return 260;
      default:
        return 12;
    }
  }
}
