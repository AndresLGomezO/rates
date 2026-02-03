import { RentalIncome } from '../incomes.js';
import {
  InstallmentLoanAccount,
  FinancialAccount,
} from '../financial-accounts.js';
import { generateAmortizationSchedule } from '../loan-calculations.js';

// ==========================================
// Rental Insight Types
// ==========================================

export interface TrueCashFlowAnalysis {
  grossRent: number;
  mortgagePayment: number;
  principalPortion: number;
  interestPortion: number;
  operatingExpenses: number;
  totalOutflows: number;
  monthlyCashFlow: number;
  cashFlowPercentage: number;
  principalBuildup: number;
  trueBenefit: number;
  annualCashFlow: number;
  annualTrueBenefit: number;
  currency: string;
}

export interface VacancyCostAnalysis {
  dailyRent: number;
  dailyCarryingCost: number;
  totalDailyCost: number;
  daysVacant: number;
  totalCostSoFar: number;
  monthsOfProfitLost: number;
  monthsToRecover: number;
  weeklyProjection: { week: number; cost: number }[];
  rentReductionAnalysis: {
    annualCost: number;
    equivalentVacancyDays: number;
  };
  currency: string;
}

export interface WealthBuildingAnalysis {
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthlyCashFlow: number;
  totalMonthlyBenefit: number;
  annualPrincipalPaydown: number;
  fiveYearPrincipalPaydown: number;
  currentEquity: number | null;
  equityPercentage: number | null;
  futureEquity: number | null;
  futureEquityPercentage: number | null;
  returnOnEquity: number | null;
  yearByYearProjection: { year: number; principal: number; equity: number }[];
  currency: string;
}

export interface InvestmentPerformanceAnalysis {
  equity: number;
  annualCashFlow: number;
  annualPrincipalPaydown: number;
  cashOnCashReturn: number;
  totalReturnWithoutAppreciation: number;
  totalROE: number;
  annualAppreciation: number;
  totalReturnWithAppreciation: number;
  totalROEWithAppreciation: number;
  saleScenario: {
    netProceeds: number;
    alternativeReturn: number;
    difference: number;
    recommendation: 'keep' | 'consider_selling';
  };
  benchmarks: {
    sp500: number;
    highYieldSavings: number;
    treasuryBonds: number;
  };
  currency: string;
}

export interface ExpenseHealthAnalysis {
  expenseRatio: number;
  monthlyRent: number;
  monthlyExpenses: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  trend: {
    month: string;
    amount: number;
  }[];
  isHealthy: boolean;
  benchmarkRange: { low: number; typical: number; high: number };
  statusMessage: string;
  currency: string;
}

export interface RentalInsights {
  trueCashFlow: TrueCashFlowAnalysis;
  vacancyCost: VacancyCostAnalysis | null;
  wealthBuilding: WealthBuildingAnalysis | null;
  performance: InvestmentPerformanceAnalysis | null;
  expenseHealth: ExpenseHealthAnalysis;
}

// ==========================================
// Service Logic
// ==========================================

export class RentalInsightsService {
  /**
   * Main entry point for calculating insights for a rental income stream.
   */
  static calculateInsights(
    rental: RentalIncome,
    accounts: FinancialAccount[] = []
  ): RentalInsights {
    // Attempt to find linked mortgage
    const mortgage = rental.linkedMortgageAccountId
      ? (accounts.find(
          (acc) => acc.id === rental.linkedMortgageAccountId
        ) as InstallmentLoanAccount)
      : null;

    return {
      trueCashFlow: this.calculateTrueCashFlow(rental, mortgage),
      vacancyCost: rental.isCurrentlyVacant
        ? this.calculateVacancyCost(rental)
        : null,
      wealthBuilding: mortgage
        ? this.calculateWealthBuilding(rental, mortgage)
        : null,
      performance: this.calculateInvestmentPerformance(rental, mortgage),
      expenseHealth: this.calculateExpenseHealth(rental),
    };
  }

  /**
   * Calculates the true cash flow reality of the property
   */
  static calculateTrueCashFlow(
    rental: RentalIncome,
    mortgage: InstallmentLoanAccount | null
  ): TrueCashFlowAnalysis {
    const grossRent = rental.rentalAmount.amount;
    const currency = rental.rentalAmount.currency;

    // Get mortgage breakdown
    let mortgagePayment = 0;
    let principalPortion = 0;
    let interestPortion = 0;

    if (mortgage) {
      mortgagePayment = mortgage.scheduledPayment?.amount || 0;
      const schedule = generateAmortizationSchedule(mortgage);
      if (schedule.length > 0) {
        // Use the first payment of the remaining schedule as current split
        const current = schedule[0];
        principalPortion = current.principalComponent.amount;
        interestPortion = current.interestComponent.amount;
      } else {
        // Generic estimate if no schedule (70/30)
        interestPortion = mortgagePayment * 0.7;
        principalPortion = mortgagePayment * 0.3;
      }
    } else if (rental.mortgagePayment) {
      mortgagePayment = rental.mortgagePayment.amount;
      interestPortion = mortgagePayment * 0.7;
      principalPortion = mortgagePayment * 0.3;
    }

    // Operating expenses
    const operatingExpenses = rental.totalMonthlyExpenses?.amount || 0;
    const totalOutflows = mortgagePayment + operatingExpenses;

    const monthlyCashFlow = grossRent - totalOutflows;
    const cashFlowPercentage = (monthlyCashFlow / grossRent) * 100;
    const trueBenefit = monthlyCashFlow + principalPortion;

    return {
      grossRent,
      mortgagePayment,
      principalPortion,
      interestPortion,
      operatingExpenses,
      totalOutflows,
      monthlyCashFlow,
      cashFlowPercentage,
      principalBuildup: principalPortion,
      trueBenefit,
      annualCashFlow: monthlyCashFlow * 12,
      annualTrueBenefit: trueBenefit * 12,
      currency,
    };
  }

  /**
   * Calculates high-impact vacancy costs
   */
  static calculateVacancyCost(rental: RentalIncome): VacancyCostAnalysis {
    const currency = rental.rentalAmount.currency;
    const dailyRent = rental.rentalAmount.amount / 30;

    const monthlyMortgage =
      rental.mortgagePayment?.amount ||
      (rental.linkedMortgageAccountId ? 0 : 0); // Need linked account logic ideally

    const monthlyExpenses = rental.totalMonthlyExpenses?.amount || 0;
    const dailyCarryingCost = (monthlyMortgage + monthlyExpenses) / 30;
    const totalDailyCost = dailyRent + dailyCarryingCost;

    // Days vacant calculation
    let daysVacant = 0;
    if (rental.expectedVacancyDate) {
      const start =
        rental.expectedVacancyDate instanceof Date
          ? rental.expectedVacancyDate
          : rental.expectedVacancyDate.toDate();
      const diff = new Date().getTime() - start.getTime();
      daysVacant = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    const totalCostSoFar = daysVacant * totalDailyCost;

    const monthlyProfit =
      rental.rentalAmount.amount - monthlyMortgage - monthlyExpenses;
    const profitLost =
      monthlyProfit > 0 ? totalCostSoFar / monthlyProfit : Infinity;

    const weeklyProjection = [1, 2, 3, 4, 8].map((week) => ({
      week,
      cost: totalDailyCost * 7 * week,
    }));

    return {
      dailyRent,
      dailyCarryingCost,
      totalDailyCost,
      daysVacant,
      totalCostSoFar,
      monthsOfProfitLost: profitLost,
      monthsToRecover: profitLost,
      weeklyProjection,
      rentReductionAnalysis: {
        annualCost: 100 * 12, // Example reduction
        equivalentVacancyDays: (100 * 12) / totalDailyCost,
      },
      currency,
    };
  }

  /**
   * Calculates wealth building via principal paydown
   */
  static calculateWealthBuilding(
    rental: RentalIncome,
    mortgage: InstallmentLoanAccount
  ): WealthBuildingAnalysis {
    const currency = rental.rentalAmount.currency;
    const schedule = generateAmortizationSchedule(mortgage);

    const currentPayment = schedule[0] || {
      principalComponent: { amount: 0 },
      interestComponent: { amount: 0 },
    };
    const principal = currentPayment.principalComponent.amount;
    const interest = currentPayment.interestComponent.amount;

    const monthlyExpenses = rental.totalMonthlyExpenses?.amount || 0;
    const mortgagePayment = mortgage.scheduledPayment?.amount || 0;
    const monthlyCashFlow =
      rental.rentalAmount.amount - mortgagePayment - monthlyExpenses;

    const totalMonthlyBenefit = monthlyCashFlow + principal;

    // 5-year projection
    const fiveYearPayments = Math.min(schedule.length, 60);
    const fiveYearPrincipal = schedule
      .slice(0, fiveYearPayments)
      .reduce((sum, p) => sum + p.principalComponent.amount, 0);

    // Equity (Placeholder as we don't have property value in RentalIncome model yet,
    // but the spec suggests using it. I'll check metadata or optional prop)
    const propertyValue = rental.propertyValue?.amount || null;
    const currentPrincipal = mortgage.currentPrincipal?.amount || 0;
    const currentEquity = propertyValue
      ? propertyValue - currentPrincipal
      : null;
    const equityPercentage = propertyValue
      ? (currentEquity / propertyValue) * 100
      : null;

    const returnOnEquity = currentEquity
      ? ((totalMonthlyBenefit * 12) / currentEquity) * 100
      : null;

    // Year by year projection
    const yearByYear: WealthBuildingAnalysis['yearByYearProjection'] = [];
    let accumulatedPrincipal = 0;
    for (let i = 1; i <= 5; i++) {
      const yearPayments = schedule.slice((i - 1) * 12, i * 12);
      const yearPrincipal = yearPayments.reduce(
        (sum, p) => sum + p.principalComponent.amount,
        0
      );
      accumulatedPrincipal += yearPrincipal;
      yearByYear.push({
        year: new Date().getFullYear() + i,
        principal: yearPrincipal,
        equity: (currentEquity || 0) + accumulatedPrincipal,
      });
    }

    return {
      monthlyPrincipal: principal,
      monthlyInterest: interest,
      monthlyCashFlow,
      totalMonthlyBenefit,
      annualPrincipalPaydown: principal * 12,
      fiveYearPrincipalPaydown: fiveYearPrincipal,
      currentEquity,
      equityPercentage,
      futureEquity: currentEquity ? currentEquity + fiveYearPrincipal : null,
      futureEquityPercentage: propertyValue
        ? ((currentEquity + fiveYearPrincipal) / propertyValue) * 100
        : null,
      returnOnEquity,
      yearByYearProjection: yearByYear,
      currency,
    };
  }

  /**
   * Compares property ROI against benchmarks
   */
  static calculateInvestmentPerformance(
    rental: RentalIncome,
    mortgage: InstallmentLoanAccount | null
  ): InvestmentPerformanceAnalysis | null {
    const propertyValue = rental.propertyValue?.amount;
    if (!propertyValue) return null;

    const currency = rental.rentalAmount.currency;
    const mortgageBalance = mortgage?.currentPrincipal?.amount || 0;
    const equity = propertyValue - mortgageBalance;

    const cashFlowAnalysis = this.calculateTrueCashFlow(rental, mortgage);
    const annualCashFlow = cashFlowAnalysis.annualCashFlow;
    const annualPrincipalPaydown = cashFlowAnalysis.principalBuildup * 12;

    const cashOnCashReturn = equity > 0 ? (annualCashFlow / equity) * 100 : 0;
    const totalReturnWithoutAppreciation =
      annualCashFlow + annualPrincipalPaydown;
    const totalROE =
      equity > 0 ? (totalReturnWithoutAppreciation / equity) * 100 : 0;

    const appreciationRate = 0.03; // Standard benchmark
    const annualAppreciation = propertyValue * appreciationRate;
    const totalReturnWithAppreciation =
      totalReturnWithoutAppreciation + annualAppreciation;
    const totalROEWithAppreciation =
      equity > 0 ? (totalReturnWithAppreciation / equity) * 100 : 0;

    // Sale Scenario
    const sellingCosts = propertyValue * 0.06;
    const netProceeds = propertyValue - mortgageBalance - sellingCosts;
    const alternativeReturn = netProceeds * 0.07; // 7% benchmark
    const difference = totalReturnWithoutAppreciation - alternativeReturn;

    return {
      equity,
      annualCashFlow,
      annualPrincipalPaydown,
      cashOnCashReturn,
      totalReturnWithoutAppreciation,
      totalROE,
      annualAppreciation,
      totalReturnWithAppreciation,
      totalROEWithAppreciation,
      saleScenario: {
        netProceeds,
        alternativeReturn,
        difference,
        recommendation: difference > 0 ? 'keep' : 'consider_selling',
      },
      benchmarks: {
        sp500: 10,
        highYieldSavings: 4.5,
        treasuryBonds: 4.2,
      },
      currency,
    };
  }

  /**
   * Benchmarks operating expense ratio
   */
  static calculateExpenseHealth(rental: RentalIncome): ExpenseHealthAnalysis {
    const currency = rental.rentalAmount.currency;
    const monthlyRent = rental.rentalAmount.amount;
    const monthlyExpenses = rental.totalMonthlyExpenses?.amount || 0;
    const expenseRatio = (monthlyExpenses / monthlyRent) * 100;

    const breakdown = [
      {
        category: 'Property Tax',
        amount: rental.expenseBreakdown?.propertyTax?.amount || 0,
        percentage: 0,
      },
      {
        category: 'Insurance',
        amount: rental.expenseBreakdown?.insurance?.amount || 0,
        percentage: 0,
      },
      {
        category: 'HOA',
        amount: rental.expenseBreakdown?.hoa?.amount || 0,
        percentage: 0,
      },
      {
        category: 'Maintenance',
        amount: rental.expenseBreakdown?.maintenance?.amount || 0,
        percentage: 0,
      },
      {
        category: 'Utilities',
        amount: rental.expenseBreakdown?.utilities?.amount || 0,
        percentage: 0,
      },
      {
        category: 'Other',
        amount: rental.expenseBreakdown?.other?.amount || 0,
        percentage: 0,
      },
    ].filter((item) => item.amount > 0);

    breakdown.forEach((item) => {
      item.percentage = (item.amount / monthlyExpenses) * 100;
    });

    const isHealthy = expenseRatio < 45; // Broad heuristic for typical units
    const benchmarkRange = { low: 30, typical: 40, high: 50 };

    return {
      expenseRatio,
      monthlyRent,
      monthlyExpenses,
      breakdown,
      trend: [], // Would need historical logs if available
      isHealthy,
      benchmarkRange,
      statusMessage: isHealthy
        ? 'Your expenses are within a healthy range.'
        : 'Your expenses are higher than average for this property type.',
      currency,
    };
  }
}
