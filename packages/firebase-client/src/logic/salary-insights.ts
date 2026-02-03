/**
 * Salary Insights Service
 *
 * Provides logic for calculating meaningful insights specifically for salary/wages income.
 */

import { SalaryIncome, Income } from '../incomes.js';
import { FinancialAccount } from '../financial-accounts.js';
import { getMonthString } from '../financial-accounts-utils.js';
import { CurrencyAmount, PaymentFrequency } from '../financial-accounts.js';

export interface ExtraPaycheckMonth {
  month: string; // YYYY-MM
  paycheckCount: number;
  extraAmount: number;
  dates: Date[];
}

export interface RealHourlyRateAnalysis {
  nominalHourlyRate: number;
  realHourlyRate: number;
  percentageDifference: number;
  totalHoursPerYear: number;
  netIncomeAfterWorkCosts: number;
  hoursPerHundredDollars: number;
}

export interface JobLossRunway {
  runwayMonths: number;
  totalMonthlyExpenses: number;
  passiveIncomeMonthly: number;
  burnRate: number;
  totalLiquidity: number;
}

export class SalaryInsightsService {
  /**
   * Identifies months with "extra" paychecks for weekly or biweekly earners.
   * Weekly: 4 months have 5 paychecks.
   * Biweekly: 2 months have 3 paychecks.
   */
  static getExtraPaycheckMonths(
    salary: SalaryIncome,
    year: number
  ): ExtraPaycheckMonth[] {
    const frequency = salary.paymentFrequency;
    if (frequency !== 'weekly' && frequency !== 'biweekly') {
      return [];
    }

    const firstPayDate = this.toDate(salary.nextPayDate) || new Date();

    // Adjust firstPayDate to the start of the year or back in time to cover the whole year
    const startDate = new Date(firstPayDate);
    while (startDate.getFullYear() >= year) {
      startDate.setDate(
        startDate.getDate() - (frequency === 'weekly' ? 7 : 14)
      );
    }
    // Now move forward to the first pay date of the target year
    while (startDate.getFullYear() < year) {
      startDate.setDate(
        startDate.getDate() + (frequency === 'weekly' ? 7 : 14)
      );
    }

    const payDates: Date[] = [];
    const current = new Date(startDate);
    while (current.getFullYear() === year) {
      payDates.push(new Date(current));
      current.setDate(current.getDate() + (frequency === 'weekly' ? 7 : 14));
    }

    const monthGroups: Record<string, Date[]> = {};
    payDates.forEach((date) => {
      const m = getMonthString(date);
      if (!monthGroups[m]) monthGroups[m] = [];
      monthGroups[m].push(date);
    });

    const normalCount = frequency === 'weekly' ? 4 : 2;
    const payAmount =
      salary.takeHomePay?.amount ||
      (salary.grossPay ? salary.grossPay.amount * 0.7 : 0);

    return Object.entries(monthGroups)
      .filter(([_, dates]) => dates.length > normalCount)
      .map(([month, dates]) => ({
        month,
        paycheckCount: dates.length,
        extraAmount: payAmount,
        dates,
      }));
  }

  /**
   * Calculates the real hourly rate by accounting for commute and work-related expenses.
   */
  static calculateRealHourlyRate(salary: SalaryIncome): RealHourlyRateAnalysis {
    const annualSalary = this.getAnnualAmountFromSalary(salary);
    const typicalHours = salary.typicalHoursPerWeek || 40;

    // Nominal calculation
    // For hourly workers, their nominal rate is their actual rate.
    // For others, it's annual gross / (hours * 52)
    const nominalHourlyRate =
      salary.hourlyRate?.amount || annualSalary / (typicalHours * 52);

    // Real calculation (Using defaults if not provided in salary object)
    const commuteMinutesPerDay = 0;
    const monthlyWorkCosts = 0;

    const workDaysPerWeek = 5;
    const weeksPerYear = 52;

    const commuteHoursPerWeek = (commuteMinutesPerDay * workDaysPerWeek) / 60;
    const totalHoursPerWeek = typicalHours + commuteHoursPerWeek;
    const totalHoursPerYear = totalHoursPerWeek * weeksPerYear;

    const annualWorkCosts = monthlyWorkCosts * 12;
    const annualNet = this.getAnnualTakeHome(salary);
    const netIncome = annualNet - annualWorkCosts;

    const realHourlyRate =
      totalHoursPerYear > 0 ? netIncome / totalHoursPerYear : 0;

    // Robust currency-aware benchmark logic
    const currency = (salary.currency || '').trim().toUpperCase();
    const benchmarkAmount = currency === 'COP' ? 400000 : 100;

    return {
      nominalHourlyRate,
      realHourlyRate,
      percentageDifference:
        nominalHourlyRate > 0
          ? ((realHourlyRate - nominalHourlyRate) / nominalHourlyRate) * 100
          : 0,
      totalHoursPerYear,
      netIncomeAfterWorkCosts: netIncome,
      hoursPerHundredDollars:
        realHourlyRate > 0 ? benchmarkAmount / realHourlyRate : 0,
    };
  }

  /**
   * Estimates how long a user can survive if this specific salary income is lost.
   */
  static calculateJobLossRunway(
    targetSalary: SalaryIncome,
    allIncomes: Income[],
    accounts: FinancialAccount[]
  ): JobLossRunway {
    // 1. Calculate total monthly expenses from all bill/loan accounts
    const totalMonthlyExpenses = accounts.reduce((sum, acc) => {
      if (acc.accountType === 'bill' && acc.recurringAmount) {
        return sum + acc.recurringAmount.amount;
      }
      if (acc.accountType === 'installment_loan' && acc.scheduledPayment) {
        return sum + acc.scheduledPayment.amount;
      }
      if (acc.accountType === 'revolving_credit' && acc.currentMinimumPayment) {
        return sum + acc.currentMinimumPayment.amount;
      }
      return sum;
    }, 0);

    // 2. Calculate remaining monthly income if target salary is lost
    const remainingMonthlyIncomes = allIncomes
      .filter((inc) => inc.id !== targetSalary.id)
      .reduce((sum, inc) => {
        return sum + this.getMonthlyIncomeAmount(inc);
      }, 0);

    // 3. Calculate Liquidity (Checking, Savings, Cash, etc.)
    const totalLiquidity = accounts.reduce((sum, acc) => {
      // Include checking/savings/other accounts with positive balances
      if (
        (acc.accountType === 'other' || acc.accountType === 'bill') &&
        'currentAmount' in acc &&
        acc.currentAmount
      ) {
        return sum + acc.currentAmount.amount;
      }
      // For now, assume 'other' includes liquidity.
      // Better: Check subtype if available or current balance for revolving credit (if positive, rare)
      return sum;
    }, 0);

    const burnRate = Math.max(
      0,
      totalMonthlyExpenses - remainingMonthlyIncomes
    );
    const runwayMonths =
      burnRate > 0 ? totalLiquidity / burnRate : totalLiquidity > 0 ? 999 : 0;

    return {
      runwayMonths,
      totalMonthlyExpenses,
      passiveIncomeMonthly: remainingMonthlyIncomes,
      burnRate,
      totalLiquidity,
    };
  }

  /**
   * Calculates income dependency.
   */
  static calculateIncomeDependency(
    targetIncome: Income,
    allIncomes: Income[]
  ): number {
    const totalIncome = allIncomes.reduce((sum, inc) => {
      const monthly = inc.type === 'salary' ? inc.takeHomePay?.amount || 0 : 0;
      return sum + monthly;
    }, 0);

    const targetMonthly =
      targetIncome.type === 'salary'
        ? targetIncome.takeHomePay?.amount || 0
        : 0;

    return totalIncome > 0 ? (targetMonthly / totalIncome) * 100 : 0;
  }

  /**
   * Projects the impact of a raise on annual and monthly income.
   */
  static calculateRaiseImpact(salary: SalaryIncome, raisePercentage: number) {
    const currentAnnual =
      salary.annualSalary?.amount ||
      (salary.grossPay ? salary.grossPay.amount * 12 : 0);
    const newAnnual = currentAnnual * (1 + raisePercentage / 100);
    const annualIncrease = newAnnual - currentAnnual;

    const currentMonthly =
      salary.takeHomePay?.amount || (currentAnnual * 0.7) / 12;
    const newMonthly = currentMonthly + (annualIncrease * 0.7) / 12;

    return {
      currentAnnual,
      newAnnual,
      annualIncrease,
      currentMonthly,
      newMonthly,
      monthlyIncrease: newMonthly - currentMonthly,
    };
  }

  /**
   * Calculates earnings to date and predicts full-year income.
   */
  static getSalaryYTDAndProjection(salary: SalaryIncome, year: number) {
    const today = new Date();
    const isCurrentYear = today.getFullYear() === year;

    const monthlyPay = this.getMonthlyIncomeAmount(salary);

    let monthsPassed = 12;
    if (isCurrentYear) {
      monthsPassed = today.getMonth() + 1;
    }

    const ytdEarnings = monthsPassed * monthlyPay;
    const projectedFullYear = 12 * monthlyPay;

    return {
      ytdEarnings,
      projectedFullYear,
      remainingMonths: 12 - monthsPassed,
      progressPercentage:
        projectedFullYear > 0 ? (ytdEarnings / projectedFullYear) * 100 : 0,
    };
  }

  /**
   * Detects cash flow gaps between paychecks and bills.
   */
  static analyzePaycheckBillsAlignment(
    salary: SalaryIncome,
    accounts: FinancialAccount[],
    month: Date
  ) {
    const monthStr = getMonthString(month);
    const obligations = accounts
      .filter(
        (acc) =>
          acc.accountType === 'bill' || acc.accountType === 'installment_loan'
      )
      .map((acc) => {
        let amount = 0;
        let dueDate: Date | null = null;

        if (acc.accountType === 'bill' && acc.recurringAmount) {
          amount = acc.recurringAmount.amount;
        } else if (
          acc.accountType === 'installment_loan' &&
          acc.scheduledPayment
        ) {
          amount = acc.scheduledPayment.amount;
        }

        if (acc.nextDueDate) {
          const d = this.toDate(acc.nextDueDate);
          if (d && getMonthString(d) === monthStr) {
            dueDate = d;
          }
        }

        return { name: acc.accountName, amount, dueDate };
      })
      .filter((o) => o.amount > 0 && o.dueDate);

    const payDates = this.getPayDatesForYear(
      salary,
      month.getFullYear()
    ).filter((d) => getMonthString(d) === monthStr);

    const paycheckAmount = salary.takeHomePay?.amount || 0;
    const periods: Array<{
      start: Date;
      end: Date;
      totalBills: number;
      pay: number;
    }> = [];

    for (let i = 0; i < payDates.length; i++) {
      const start = payDates[i];
      const nextPayDate = payDates[i + 1];
      const end =
        nextPayDate || new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const billsInPeriod = obligations.filter(
        (o) =>
          o.dueDate >= start &&
          (nextPayDate ? o.dueDate < nextPayDate : o.dueDate <= end)
      );
      const totalBills = billsInPeriod.reduce((sum, b) => sum + b.amount, 0);

      periods.push({
        start,
        end,
        totalBills,
        pay: paycheckAmount,
      });
    }

    return {
      periods,
      totalMonthlyPay: payDates.length * paycheckAmount,
      totalBills: obligations.reduce((sum, o) => sum + o.amount, 0),
      isAligned: periods.every((p) => p.pay >= p.totalBills),
    };
  }

  // ===== HELPERS =====

  /**
   * Gets the multiplier to convert a frequency to an annual amount.
   */
  private static getFrequencyMultiplier(
    frequency?: PaymentFrequency | 'irregular'
  ): number {
    switch (frequency) {
      case 'daily':
        return 260; // Assumes work days for salary
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
      case 'irregular':
        return 0; // Or some other heuristic
      default:
        return 12; // Default to monthly if unknown
    }
  }

  /**
   * Robust conversion of any amount/frequency to annual.
   */
  private static toAnnual(
    amount?: CurrencyAmount,
    frequency?: PaymentFrequency | 'irregular'
  ): number {
    if (!amount) return 0;
    return amount.amount * this.getFrequencyMultiplier(frequency);
  }

  /**
   * Finds the best annual gross for a salary income.
   */
  private static getAnnualAmountFromSalary(salary: SalaryIncome): number {
    if (salary.annualSalary?.amount) return salary.annualSalary.amount;
    if (salary.grossPay)
      return this.toAnnual(salary.grossPay, salary.paymentFrequency);
    if (salary.hourlyRate && salary.typicalHoursPerWeek) {
      return salary.hourlyRate.amount * salary.typicalHoursPerWeek * 52;
    }
    return 0;
  }

  /**
   * Finds the best annual take-home for a salary income.
   */
  private static getAnnualTakeHome(salary: SalaryIncome): number {
    if (salary.takeHomePay)
      return this.toAnnual(salary.takeHomePay, salary.paymentFrequency);
    const annualGross = this.getAnnualAmountFromSalary(salary);
    return annualGross * 0.7; // Fallback to 70% if net is unknown
  }

  /**
   * Gets the monthly amount for any income type.
   */
  private static getMonthlyIncomeAmount(income: Income): number {
    switch (income.type) {
      case 'salary':
        return this.getAnnualTakeHome(income) / 12;
      case 'freelance':
        if (income.estimatedMonthlyIncome)
          return income.estimatedMonthlyIncome.amount;
        if (income.rateAmount) {
          const multiplier =
            income.typicalPaymentFrequency === 'weekly'
              ? 4.33
              : income.typicalPaymentFrequency === 'biweekly'
                ? 2.16
                : 1;
          return (
            income.rateAmount.amount *
            (income.typicalHoursPerMonth ||
              (income.typicalHoursPerWeek
                ? income.typicalHoursPerWeek * multiplier
                : 0))
          );
        }
        return 0;
      case 'rental': {
        const rentalMult =
          income.rentalFrequency === 'monthly'
            ? 1
            : income.rentalFrequency === 'weekly'
              ? 4.33
              : 1 / 12;
        return (income.rentalAmount?.amount || 0) * rentalMult;
      }
      case 'investments':
        return this.toAnnual(income.incomeAmount, income.paymentFrequency) / 12;
      case 'benefits':
        return (
          this.toAnnual(income.benefitAmount, income.paymentFrequency) / 12
        );
      case 'other':
        return this.toAnnual(income.incomeAmount, income.paymentFrequency) / 12;
      default:
        return 0;
    }
  }

  private static toDate(date: unknown): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (
      date &&
      typeof date === 'object' &&
      'toDate' in date &&
      typeof (date as { toDate: unknown }).toDate === 'function'
    ) {
      return (date as { toDate: () => Date }).toDate();
    }
    return new Date(date as string | number);
  }

  private static getPayDatesForYear(
    salary: SalaryIncome,
    year: number
  ): Date[] {
    const frequency = salary.paymentFrequency;
    if (frequency !== 'weekly' && frequency !== 'biweekly') return [];

    const firstPayDate = this.toDate(salary.nextPayDate) || new Date();

    const startDate = new Date(firstPayDate);
    while (startDate.getFullYear() >= year) {
      startDate.setDate(
        startDate.getDate() - (frequency === 'weekly' ? 7 : 14)
      );
    }
    while (startDate.getFullYear() < year) {
      startDate.setDate(
        startDate.getDate() + (frequency === 'weekly' ? 7 : 14)
      );
    }

    const payDates: Date[] = [];
    const current = new Date(startDate);
    while (current.getFullYear() === year) {
      payDates.push(new Date(current));
      current.setDate(current.getDate() + (frequency === 'weekly' ? 7 : 14));
    }
    return payDates;
  }
}
