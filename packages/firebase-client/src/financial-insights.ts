/**
 * Financial Insights Generator
 *
 * logic for generating high-level financial insights from account data.
 */

import {
  FinancialAccount,
  CurrencyAmount,
  isInstallmentLoan,
} from './financial-accounts.js';
import { calculateLoanTerm } from './amortization.js';
import { calculateAccountFields } from './financial-accounts-utils.js';
import {
  generateAmortizationSchedule,
  AmortizationPayment,
} from './loan-calculations.js';
import {
  calculateUtilizationMetrics,
  simulateDecliningPaymentPayoff,
  projectRevolvingPayoff,
  DecliningPayoffProjection,
} from './credit-calculations.js';
import { isRevolvingCredit } from './financial-accounts.js';

// ==========================================
// Insight Types
// ==========================================

export interface LoanPayoffInsight {
  /** Percentage of the loan paid off (0-100) */
  progressPercentage: number;
  /** Total amount paid towards principal */
  principalPaid: CurrencyAmount;
  /** Remaining principal balance */
  remainingPrincipal: CurrencyAmount;
  /** Estimated date when the loan will be fully paid */
  estimatedPayoffDate: Date | null;
  /** Number of payments remaining */
  remainingPayments: number;
  /** Original loan amount (inferred or explicit) */
  originalPrincipal: CurrencyAmount;
}

export interface CreditUtilizationInsight {
  currentUtilization: number;
  utilizationZone: 'excellent' | 'good' | 'high' | 'very_high' | 'critical';
  availableCredit: CurrencyAmount;
  amountToReachZone: {
    good: number | null;
    excellent: number | null;
  };
}

// ==========================================
// Insight Generators
// ==========================================

/**
 * Generate Loan Payoff Progress insight
 * Answers: "Am I making progress?"
 */
export function getLoanPayoffInsight(
  account: FinancialAccount
): LoanPayoffInsight | null {
  if (!isInstallmentLoan(account)) {
    return null;
  }

  // Ensure we have up-to-date calculated fields (like estimatedPayoffDate)
  // Note: calculateAccountFields is lightweight, but consider if we should pass it in
  const calculated = calculateAccountFields(account);

  const currency = account.currency;
  const currentPrincipal = account.currentPrincipal?.amount ?? 0;

  // Determine original principal
  // Strategy: explicit > current + totalCapitalPaid > current
  let originalAmount = account.originalPrincipal?.amount ?? 0;
  const totalCapitalPaidVal = calculated.totalCapitalPaid.amount;

  if (
    originalAmount === 0 &&
    (currentPrincipal > 0 || totalCapitalPaidVal > 0)
  ) {
    originalAmount = currentPrincipal + totalCapitalPaidVal;
  }

  // Calculate progress
  // Avoid division by zero
  const progressPercentage =
    originalAmount > 0
      ? ((originalAmount - currentPrincipal) / originalAmount) * 100
      : 0;

  // Remaining payments
  // We can use the calculated Estimated Payoff Date to derive this,
  // or re-calculate using calculateLoanTerm.
  // Using calculateLoanTerm directly is safer as it's the raw math.
  const paymentAmount = account.scheduledPayment?.amount ?? 0;
  let remainingPayments = 0;
  if (currentPrincipal > 0 && paymentAmount > 0) {
    remainingPayments = calculateLoanTerm(
      currentPrincipal,
      account.annualInterestRate,
      paymentAmount
    );
    if (remainingPayments === Infinity) {
      remainingPayments = -1; // Indicate "Never" or "Interest Only"
    }
  }

  return {
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    principalPaid: {
      amount: originalAmount - currentPrincipal,
      currency,
    },
    remainingPrincipal: {
      amount: currentPrincipal,
      currency,
    },
    estimatedPayoffDate: calculated.estimatedPayoffDate ?? null,
    remainingPayments,
    originalPrincipal: {
      amount: originalAmount,
      currency,
    },
  };
}

/**
 * Generate Credit Utilization Insight
 * Answers: "How bad is it?"
 */
export function getCreditUtilizationInsight(
  account: FinancialAccount
): CreditUtilizationInsight | null {
  if (!isRevolvingCredit(account)) return null;
  return calculateUtilizationMetrics(account);
}

export interface PaymentAnatomyInsight {
  /** The current monthly payment amount */
  monthlyPayment: CurrencyAmount;
  /** Strategies portion of the payment going to principal */
  currentPrincipalPortion: CurrencyAmount;
  /** Strategies portion of the payment going to interest */
  currentInterestPortion: CurrencyAmount;
  /** Percentage of payment going to principal (0-100) */
  principalPercentage: number;
  /** Percentage of payment going to interest (0-100) */
  interestPercentage: number;
  /** Total interest that will be paid over the life of the loan (projected) */
  totalLifetimeInterest: CurrencyAmount;
  /** Total principal that will be paid (should equal original principal) */
  totalLifetimePrincipal: CurrencyAmount;
  /**
   * Ratio of Principal vs Interest for each future year.
   * Useful for "How this changes over time" charts.
   */
  yearlyBreakdown: Array<{
    year: number; // Relative year (1, 2, 3...) or absolute? Relative is usually safer for generic views.
    principalTotal: number;
    interestTotal: number;
    principalPercentage: number;
  }>;
}

export interface RevolvingCostInsight {
  currentMinPayment: CurrencyAmount;
  currentInterestCharged: CurrencyAmount;
  currentPrincipalPaid: CurrencyAmount;

  /** True if the minimum payment barely covers interest (or doesn't) */
  isTreadingWater: boolean;

  /** Projection if only minimum payment is made */
  minPayoffProjection: DecliningPayoffProjection;
}

/**
 * Generate Payment Anatomy Insight
 * Answers: "Where does my money go?"
 */
export function getPaymentAnatomyInsight(
  account: FinancialAccount
): PaymentAnatomyInsight | null {
  if (!isInstallmentLoan(account)) return null;

  // Use existing calculator to get the schedule
  // We need to ensure the account has enough info.
  // generateAmortizationSchedule handles defaults.

  const schedule = generateAmortizationSchedule(account, {
    includeDates: false,
    startFromToday: true,
  });

  if (schedule.length === 0) return null;

  const currency = account.currency;
  const firstPayment = schedule[0];

  const yearlyBreakdown: PaymentAnatomyInsight['yearlyBreakdown'] = [];

  let currentYearPrincipal = 0;
  let currentYearInterest = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;

  schedule.forEach((p: AmortizationPayment, index: number) => {
    // Accumulate lifetime
    totalInterest += p.interestComponent.amount;
    totalPrincipal += p.principalComponent.amount;

    // Accumulate year
    currentYearPrincipal += p.principalComponent.amount;
    currentYearInterest += p.interestComponent.amount;

    // Check if end of year (every 12 payments) or last payment
    if ((index + 1) % 12 === 0 || index === schedule.length - 1) {
      const yearNum = Math.ceil((index + 1) / 12);
      const yearTotal = currentYearPrincipal + currentYearInterest;
      yearlyBreakdown.push({
        year: yearNum,
        principalTotal: currentYearPrincipal,
        interestTotal: currentYearInterest,
        principalPercentage:
          yearTotal > 0 ? (currentYearPrincipal / yearTotal) * 100 : 0,
      });
      currentYearPrincipal = 0;
      currentYearInterest = 0;
    }
  });

  // Historic data
  const calculated = calculateAccountFields(account);
  const historicInterest = calculated.totalInterestPaid.amount;
  const historicPrincipal = calculated.totalCapitalPaid.amount;

  return {
    monthlyPayment: firstPayment.paymentAmount,
    currentPrincipalPortion: firstPayment.principalComponent,
    currentInterestPortion: firstPayment.interestComponent,
    principalPercentage:
      (firstPayment.principalComponent.amount /
        firstPayment.paymentAmount.amount) *
      100,
    interestPercentage:
      (firstPayment.interestComponent.amount /
        firstPayment.paymentAmount.amount) *
      100,
    totalLifetimeInterest: {
      amount: totalInterest + historicInterest,
      currency,
    },
    totalLifetimePrincipal: {
      amount: totalPrincipal + historicPrincipal,
      currency,
    },
    yearlyBreakdown,
  };
}

/**
 * Generate Revolving Cost Insight (The "Trap")
 * Answers: "What's this costing me?"
 */
export function getRevolvingCostInsight(
  account: FinancialAccount
): RevolvingCostInsight | null {
  if (!isRevolvingCredit(account)) return null;

  const balance = account.currentBalance.amount;
  const currency = account.currency;
  const monthlyRate = account.purchaseApr / 100 / 12;

  // 1. Current Month Snapshot
  const interestCharged = balance * monthlyRate;

  // Estimate current minimum payment if not provided
  // We use the same heuristic as the simulation or the user value
  let minPaymentAmount = account.currentMinimumPayment?.amount;
  if (!minPaymentAmount || minPaymentAmount === 0) {
    // Heuristic: Max($25, Balance * 2%)
    minPaymentAmount = Math.max(25, balance * 0.02);
  }

  const principalPaid = Math.max(0, minPaymentAmount - interestCharged);

  // Treading water check: is principal component very small (< 10% of payment)?
  const isTreadingWater = principalPaid < minPaymentAmount * 0.1;

  // 2. Payoff Trajectory (The "Trap" simulation)
  let minPaymentPercentage = 0.02; // default
  if (minPaymentAmount > 0 && balance > 0) {
    minPaymentPercentage = minPaymentAmount / balance;
  }
  const minPayoffProjection = simulateDecliningPaymentPayoff(account, {
    minPaymentPercentage,
  });

  return {
    currentMinPayment: { amount: minPaymentAmount, currency },
    currentInterestCharged: { amount: interestCharged, currency },
    currentPrincipalPaid: { amount: principalPaid, currency },
    isTreadingWater,
    minPayoffProjection,
  };
}

export interface PayoffAcceleratorScenario {
  extraPaymentAmount: number;
  payoffDate: Date;
  totalInterestPaid: number; // Future interest only for the scenario comparison usually, or total lifetime? logic implies "Savings", so Total Future Interest is key.
  monthsSaved: number;
  interestSaved: number;
}

export interface PayoffAcceleratorInsight {
  currentPayoffDate: Date;
  currentFutureInterest: number;
  scenarios: PayoffAcceleratorScenario[];
}

export interface RevolvingPayoffPath {
  paymentAmount: number;
  payoffDate: Date;
  totalInterest: number;
  totalPaid: number;
  monthsToPayoff: number; // Duration of this scenario
  savingsVsMinimum: number; // Interest saved vs minimum path
  monthsFaster: number; // Months saved vs minimum path
}

export interface RevolvingPayoffAcceleratorInsight {
  currentBalance: CurrencyAmount;
  minPayoffPath: DecliningPayoffProjection;
  scenarios: RevolvingPayoffPath[];
}

/**
 * Generate Payoff Accelerator Insight
 * Answers: "What if I paid more?"
 */
export function getPayoffAcceleratorInsight(
  account: FinancialAccount,
  scenarios?: number[]
): PayoffAcceleratorInsight | null {
  if (!isInstallmentLoan(account)) return null;

  // Baseline
  const baselineSchedule = generateAmortizationSchedule(account, {
    includeDates: true,
    startFromToday: true,
  });
  if (baselineSchedule.length === 0) return null;

  const baselineLast = baselineSchedule[baselineSchedule.length - 1];
  const baselineDate =
    baselineLast.date instanceof Date
      ? baselineLast.date
      : baselineLast.date?.toDate();
  if (!baselineDate) return null;

  const baselineInterest = baselineSchedule.reduce(
    (sum: number, p: AmortizationPayment) => sum + p.interestComponent.amount,
    0
  );
  const baselineMonths = baselineSchedule.length;

  const currentPayment = account.scheduledPayment?.amount ?? 0;

  // Determine scenarios to run
  let scenariosToRun = scenarios;
  if (!scenariosToRun || scenariosToRun.length === 0) {
    if (currentPayment > 0) {
      // Generate dynamic scenarios: 10%, 20%, 50%, 100% of monthly payment
      const rawScenarios = [
        currentPayment * 0.1,
        currentPayment * 0.2,
        currentPayment * 0.5,
        currentPayment * 1.0,
      ];

      // Round to nice numbers based on magnitude
      scenariosToRun = rawScenarios.map((val) => {
        if (val >= 100000) return Math.round(val / 10000) * 10000;
        if (val >= 10000) return Math.round(val / 1000) * 1000;
        if (val >= 1000) return Math.round(val / 100) * 100;
        if (val >= 100) return Math.round(val / 10) * 10;
        return Math.round(val);
      });

      // Deduplicate and filter invalid values
      scenariosToRun = [...new Set(scenariosToRun)]
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
    } else {
      // Fallback defaults
      scenariosToRun = [50, 100, 250, 500];
    }
  }

  const results: PayoffAcceleratorScenario[] = [];

  for (const extra of scenariosToRun) {
    // Create a scenario account with increased scheduled payment
    // We clone the account and override scheduledPayment
    const currentPayment = account.scheduledPayment?.amount ?? 0;
    if (currentPayment === 0) continue;

    const scenarioAccount = {
      ...account,
      scheduledPayment: {
        amount: currentPayment + extra,
        currency: account.currency,
      },
    };

    const simSchedule = generateAmortizationSchedule(scenarioAccount, {
      includeDates: true,
      startFromToday: true,
    });
    if (simSchedule.length === 0) continue;

    const simLast = simSchedule[simSchedule.length - 1];
    const simDate =
      simLast.date instanceof Date ? simLast.date : simLast.date?.toDate();
    if (!simDate) continue;

    const simInterest = simSchedule.reduce(
      (sum: number, p: AmortizationPayment) => sum + p.interestComponent.amount,
      0
    );
    const simMonths = simSchedule.length;

    results.push({
      extraPaymentAmount: extra,
      payoffDate: simDate,
      totalInterestPaid: simInterest,
      monthsSaved: Math.max(0, baselineMonths - simMonths),
      interestSaved: Math.max(0, baselineInterest - simInterest),
    });
  }

  return {
    currentPayoffDate: baselineDate,
    currentFutureInterest: baselineInterest,
    scenarios: results,
  };
}

/**
 * Generate Revolving Payoff Accelerator Insight
 * Answers: "How do I escape?"
 */
export function getRevolvingPayoffAcceleratorInsight(
  account: FinancialAccount,
  customAmounts?: number[]
): RevolvingPayoffAcceleratorInsight | null {
  if (!isRevolvingCredit(account)) return null;

  // 1. Baseline: Minimum Payment Path
  let minPaymentPercentage = 0.02; // default
  if (
    account.currentMinimumPayment?.amount &&
    account.currentBalance.amount > 0
  ) {
    minPaymentPercentage =
      account.currentMinimumPayment.amount / account.currentBalance.amount;
  }
  const minPath = simulateDecliningPaymentPayoff(account, {
    minPaymentPercentage,
  });

  // 2. Scenarios: Fixed Payments
  // Generate smart default options
  // - Moderate: 3 year payoff?
  // - Aggressive: 1.5 year payoff?
  // - 10% Rule: 10% of balance
  // - Round numbers: $50, $100, $200, $500 depending on balance

  const balance = account.currentBalance.amount;
  const currency = account.currency;

  let amountsToTest = customAmounts;
  if (!amountsToTest || amountsToTest.length === 0) {
    // Heuristics
    amountsToTest = [
      Math.max(50, Math.ceil(balance / 36)), // ~3 years
      Math.max(100, Math.ceil(balance / 18)), // ~1.5 years
      Math.ceil(balance * 0.1), // 10% rule
    ];

    // Add round numbers
    if (balance > 1000) amountsToTest.push(200, 300, 500);
    if (balance > 5000) amountsToTest.push(800, 1000);

    // Dedupe, sort, and ensure > minPayment
    const minPaymentEst = Math.max(25, balance * 0.02);
    amountsToTest = [...new Set(amountsToTest)]
      .filter((a) => a > minPaymentEst + 5) // Must be meaningfully more than min
      .sort((a, b) => a - b);
  }

  const scenarios: RevolvingPayoffPath[] = [];

  for (const amt of amountsToTest) {
    const proj = projectRevolvingPayoff(account, { amount: amt, currency });
    if (
      !proj.willPayoff ||
      !proj.totalInterestPaid ||
      !proj.monthsToPayoff ||
      !proj.projectedPayoffDate
    )
      continue;

    const totalPaid = balance + proj.totalInterestPaid.amount;
    const savings = Math.max(
      0,
      minPath.totalInterestPaid.amount - proj.totalInterestPaid.amount
    );
    const timeSaved = Math.max(0, minPath.monthsToPayoff - proj.monthsToPayoff);

    scenarios.push({
      paymentAmount: amt,
      payoffDate:
        proj.projectedPayoffDate instanceof Date
          ? proj.projectedPayoffDate
          : proj.projectedPayoffDate.toDate(),
      totalInterest: proj.totalInterestPaid.amount,
      totalPaid,
      monthsToPayoff: proj.monthsToPayoff,
      savingsVsMinimum: savings,
      monthsFaster: timeSaved,
    });
  }

  return {
    currentBalance: account.currentBalance,
    minPayoffPath: minPath,
    scenarios,
  };
}
