import { InvestmentIncome } from '../incomes.js';

// ==========================================
// Investment Insight Types
// ==========================================

export type ReliabilityCategory =
  | 'very_high'
  | 'high'
  | 'moderate'
  | 'low'
  | 'very_low';

export interface ReliabilityConcern {
  type: 'concentration' | 'rate_sensitivity' | 'recent_cuts';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact?: number;
  sources?: string[];
}

export interface InvestmentReliabilityAnalysis {
  overallScore: number;
  scoreCategory: ReliabilityCategory;
  bySource: {
    name: string;
    amount: number;
    reliabilityScore: number;
    percentageOfTotal: number;
    type: string;
  }[];
  concerns: ReliabilityConcern[];
  recommendations: string[];
}

export interface TaxProfile {
  marginalRate: number; // e.g., 0.22
  capitalGainsRate: number; // e.g., 0.15
  stateRate: number; // e.g., 0.05
}

export interface TaxCategoryBreakdown {
  gross: number;
  rate: number;
  tax: number;
}

export interface TaxOptimization {
  type: 'account_location' | 'tax_exempt_alternative';
  description: string;
  potentialSavings: number;
}

export interface TaxAdjustedAnalysis {
  totalGross: number;
  totalTax: number;
  afterTax: number;
  effectiveRate: number;
  keepRate: number;
  byCategory: Record<string, TaxCategoryBreakdown>;
  comparisonToOrdinary: {
    ordinaryTax: number;
    actualTax: number;
    savings: number;
  };
  opportunities: TaxOptimization[];
}

export interface ScheduledPayment {
  source: string;
  sourceType: string;
  amount: number;
  expectedDate: Date;
}

export interface MonthlyIncome {
  month: Date;
  payments: ScheduledPayment[];
  total: number;
}

export interface DividendCalendarAnalysis {
  calendar: MonthlyIncome[];
  yearlyPattern: number[];
  peakMonths: number[];
  lightMonths: number[];
  avgMonthly: number;
  maxMonth: number;
  minMonth: number;
  variability: number;
  variabilityPercentage: number;
  suggestions: string[];
}

export interface FinancialIndependenceAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  coveragePercentage: number;
  daysCovered: number;
  milestones: {
    label: string;
    amount: number;
    isAchieved: boolean;
    remainingAmount?: number;
    yearsToAchieve?: number;
  }[];
  coveredCategories: {
    label: string;
    amount: number;
    isFullyCovered: boolean;
    coveragePercentage: number;
  }[];
}

// ==========================================
// Service Logic
// ==========================================

export class InvestmentInsightsService {
  /**
   * Calculates a reliability score based on investment types and diversification
   */
  static calculateReliabilityScore(
    investments: InvestmentIncome[]
  ): InvestmentReliabilityAnalysis {
    if (investments.length === 0) {
      return {
        overallScore: 0,
        scoreCategory: 'very_low',
        bySource: [],
        concerns: [],
        recommendations: [
          'Add investment income sources to see your reliability score.',
        ],
      };
    }

    const reliabilityFactors: Record<string, number> = {
      savings: 95,
      cd: 90,
      interest: 85,
      dividends: 75,
      distributions: 70,
      reit: 65,
      royalties: 60,
      capital_gains: 50,
      other: 50,
    };

    const totalIncome = investments.reduce(
      (sum, inv) => sum + (inv.incomeAmount?.amount || 0),
      0
    );

    if (totalIncome === 0) {
      return {
        overallScore: 0,
        scoreCategory: 'very_low',
        bySource: [],
        concerns: [],
        recommendations: [],
      };
    }

    let weightedScore = 0;
    const bySource = investments.map((inv) => {
      const amount = inv.incomeAmount?.amount || 0;
      const weight = amount / totalIncome;
      const sourceReliability = reliabilityFactors[inv.investmentSubtype] || 50;

      // Bonus for high predictability
      const predictabilityBonus =
        inv.predictability === 'highly_predictable' ? 5 : 0;

      weightedScore += weight * (sourceReliability + predictabilityBonus);

      return {
        name: inv.name,
        amount,
        reliabilityScore: sourceReliability + predictabilityBonus,
        percentageOfTotal: weight * 100,
        type: inv.investmentSubtype,
      };
    });

    const concerns: ReliabilityConcern[] = [];

    // Check concentration
    const largestSource = Math.max(...bySource.map((s) => s.amount));
    if (largestSource / totalIncome > 0.3) {
      concerns.push({
        type: 'concentration',
        severity: 'medium',
        description: `${Math.round((largestSource / totalIncome) * 100)}% from single source`,
        impact: largestSource,
      });
    }

    // Check rate sensitivity
    const rateSensitiveIncome = investments
      .filter((i) =>
        ['savings', 'reit', 'interest'].includes(i.investmentSubtype)
      )
      .reduce((sum, i) => sum + (i.incomeAmount?.amount || 0), 0);

    if (rateSensitiveIncome / totalIncome > 0.25) {
      concerns.push({
        type: 'rate_sensitivity',
        severity: 'low',
        description: `${Math.round((rateSensitiveIncome / totalIncome) * 100)}% is rate-sensitive`,
        impact: rateSensitiveIncome * 0.2, // Rough estimate
      });
    }

    const recommendations = this.generateReliabilityRecommendations(concerns);

    return {
      overallScore: Math.round(weightedScore),
      scoreCategory: this.getReliabilityCategory(weightedScore),
      bySource,
      concerns,
      recommendations,
    };
  }

  private static getReliabilityCategory(score: number): ReliabilityCategory {
    if (score >= 85) return 'very_high';
    if (score >= 70) return 'high';
    if (score >= 55) return 'moderate';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  private static generateReliabilityRecommendations(
    concerns: ReliabilityConcern[]
  ): string[] {
    const recommendations: string[] = [];
    if (concerns.some((c) => c.type === 'concentration')) {
      recommendations.push(
        'Consider diversifying across more assets or ETFs to reduce concentration risk.'
      );
    }
    if (concerns.some((c) => c.type === 'rate_sensitivity')) {
      recommendations.push(
        'A significant portion of your income is sensitive to interest rate changes.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Your investment income strategy appears well-balanced.'
      );
    }
    return recommendations;
  }

  /**
   * Estimates take-home income after accounting for potential taxes
   */
  static calculateTaxAdjustedIncome(
    investments: InvestmentIncome[],
    userTaxProfile?: TaxProfile
  ): TaxAdjustedAnalysis {
    const profile = userTaxProfile || {
      marginalRate: 0.22,
      capitalGainsRate: 0.15,
      stateRate: 0.05,
    };
    const { marginalRate, capitalGainsRate } = profile;

    const totalGross = investments.reduce(
      (sum, inv) => sum + (inv.incomeAmount?.amount || 0),
      0
    );

    const categories: Record<string, TaxCategoryBreakdown> = {
      qualified: { gross: 0, rate: capitalGainsRate, tax: 0 },
      ordinary: { gross: 0, rate: marginalRate, tax: 0 },
      taxExempt: { gross: 0, rate: 0, tax: 0 },
    };

    investments.forEach((inv) => {
      const amount = inv.incomeAmount?.amount || 0;
      if (inv.isTaxAdvantaged) {
        categories.taxExempt.gross += amount;
      } else if (
        inv.investmentSubtype === 'dividends' ||
        inv.investmentSubtype === 'capital_gains'
      ) {
        categories.qualified.gross += amount;
      } else {
        categories.ordinary.gross += amount;
      }
    });

    let totalTax = 0;
    Object.keys(categories).forEach((key) => {
      const cat = categories[key];
      cat.tax = cat.gross * cat.rate;
      totalTax += cat.tax;
    });

    const afterTax = totalGross - totalTax;
    const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
    const ifAllOrdinary = totalGross * marginalRate;

    const opportunities: TaxOptimization[] = [];
    if (categories.ordinary.gross > totalGross * 0.3) {
      opportunities.push({
        type: 'account_location',
        description: 'Move fixed-income assets to tax-advantaged accounts',
        potentialSavings:
          categories.ordinary.gross * (marginalRate - capitalGainsRate),
      });
    }

    return {
      totalGross,
      totalTax,
      afterTax,
      effectiveRate,
      keepRate: totalGross > 0 ? (afterTax / totalGross) * 100 : 0,
      byCategory: categories,
      comparisonToOrdinary: {
        ordinaryTax: ifAllOrdinary,
        actualTax: totalTax,
        savings: ifAllOrdinary - totalTax,
      },
      opportunities,
    };
  }

  /**
   * Generates an expected payment schedule for future months
   */
  static generateDividendCalendar(
    investments: InvestmentIncome[],
    startDate: Date = new Date(),
    monthsAhead: number = 3
  ): DividendCalendarAnalysis {
    const calendar: MonthlyIncome[] = [];
    const yearlyPattern: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let m = 0; m < 12; m++) {
      const monthIndex = (startDate.getMonth() + m) % 12;
      const monthDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + m,
        1
      );
      const monthPayments: ScheduledPayment[] = [];

      investments.forEach((inv) => {
        const isPaymentMonth =
          !inv.paymentMonths ||
          inv.paymentMonths.length === 0 ||
          inv.paymentMonths.includes(monthIndex + 1);

        if (isPaymentMonth && inv.incomeAmount) {
          let amount = inv.incomeAmount.amount;

          // Adjust amount based on frequency
          if (inv.paymentFrequency === 'quarterly') {
            // If paymentMonths is set, it only pays in those months
            if (
              inv.paymentMonths &&
              inv.paymentMonths.length > 0 &&
              !inv.paymentMonths.includes(monthIndex + 1)
            ) {
              return;
            }
          } else if (inv.paymentFrequency === 'annually') {
            if (
              inv.paymentMonths &&
              inv.paymentMonths.length > 0 &&
              !inv.paymentMonths.includes(monthIndex + 1)
            ) {
              return;
            }
          } else if (inv.paymentFrequency === 'irregular') {
            amount = amount / 12; // Spread irregular over year if no better data
          }

          const payment: ScheduledPayment = {
            source: inv.name,
            sourceType: inv.investmentSubtype,
            amount: amount,
            expectedDate: new Date(
              monthDate.getFullYear(),
              monthDate.getMonth(),
              15
            ), // Approximation
          };

          if (m < monthsAhead) {
            monthPayments.push(payment);
          }
          yearlyPattern[monthIndex] += amount;
        }
      });

      if (m < monthsAhead) {
        calendar.push({
          month: monthDate,
          payments: monthPayments,
          total: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        });
      }
    }

    const avgMonthly = yearlyPattern.reduce((s, a) => s + a, 0) / 12;
    const maxMonth = Math.max(...yearlyPattern);
    const minMonth = Math.min(...yearlyPattern);
    const variability = maxMonth - minMonth;

    return {
      calendar,
      yearlyPattern,
      peakMonths: yearlyPattern
        .map((v, i) => (v > avgMonthly * 1.2 ? i : -1))
        .filter((i) => i !== -1),
      lightMonths: yearlyPattern
        .map((v, i) => (v < avgMonthly * 0.8 ? i : -1))
        .filter((i) => i !== -1),
      avgMonthly,
      maxMonth,
      minMonth,
      variability,
      variabilityPercentage:
        avgMonthly > 0 ? (variability / avgMonthly) * 100 : 0,
      suggestions:
        variability > avgMonthly * 0.5
          ? ['Consider monthly dividend payers to smooth out cash flow.']
          : [],
    };
  }

  /**
   * Tracks progress toward Financial Independence (FI)
   */
  static calculateFinancialIndependence(
    afterTaxInvestmentIncome: number,
    monthlyExpenses: number
  ): FinancialIndependenceAnalysis {
    const coveragePercentage =
      monthlyExpenses > 0
        ? (afterTaxInvestmentIncome / monthlyExpenses) * 100
        : 0;
    const daysCovered = (coveragePercentage / 100) * 30;

    const milestones = [
      { label: 'Starter (10%)', amount: monthlyExpenses * 0.1 },
      { label: 'Security (25%)', amount: monthlyExpenses * 0.25 },
      { label: 'Flexibility (50%)', amount: monthlyExpenses * 0.5 },
      { label: 'Independence (100%)', amount: monthlyExpenses },
    ].map((m) => ({
      ...m,
      isAchieved: afterTaxInvestmentIncome >= m.amount,
      remainingAmount: Math.max(0, m.amount - afterTaxInvestmentIncome),
    }));

    // Example categories if we had expense data, but we'll use generic ones for now
    const coveredCategories = [
      { label: 'Utilities', amount: 200 },
      { label: 'Groceries', amount: 500 },
      { label: 'Housing', amount: 1500 },
    ].map((c) => {
      const coverage = Math.min(
        100,
        Math.max(0, (afterTaxInvestmentIncome / c.amount) * 100)
      );
      return {
        ...c,
        isFullyCovered: afterTaxInvestmentIncome >= c.amount,
        coveragePercentage: coverage,
      };
    });

    return {
      monthlyIncome: afterTaxInvestmentIncome,
      monthlyExpenses,
      coveragePercentage,
      daysCovered,
      milestones,
      coveredCategories,
    };
  }
}
