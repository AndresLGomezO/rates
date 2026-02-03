/**
 * Benefits Insights Service
 *
 * Provides logic for calculating meaningful insights specifically for benefits income.
 */

import { BenefitsIncome, Income } from '../incomes.js';

export interface IncomeCliffAnalysis {
  hasEarningsLimit: boolean;
  benefitType?: string;
  monthlyBenefit?: number;
  annualLimit?: number;
  monthlyLimit?: number;
  currentEarnedIncome?: number;
  buffer?: number;
  monthlyBuffer?: number;
  percentOfLimit?: number;
  status?: 'safe' | 'caution' | 'danger' | 'over';
  impactIfOver?: {
    type: 'reduction' | 'cliff';
    formula: string;
    currentReduction?: number;
    potentialLoss?: number;
  };
  safeToEarnMonthly?: number;
  limitDisappearsAt?: string;
}

export interface BenefitsTaxAnalysis {
  byBenefit: Array<{
    benefit: BenefitsIncome;
    taxablePercentage: number;
    monthlyTaxable: number;
    monthlyTax: number;
    afterTax: number;
    explanation: string;
  }>;
  totalGross: number;
  totalTax: number;
  totalAfterTax: number;
  keepPercentage: number;
  combinedIncome: number;
}

export interface BenefitDurationAnalysis {
  isTemporary: boolean;
  endDate?: Date;
  totalDuration?: number; // months or weeks
  elapsed?: number;
  remaining?: number;
  remainingValue?: number;
  percentComplete?: number;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  monthlyAmount?: number;
  incomeDropAmount?: number;
}

export interface COLARecord {
  year: number;
  percentage: number;
}

export interface COLAAnalysis {
  hasCOLA: boolean;
  latestCOLA?: number;
  currentMonthlyBenefit?: number;
  previousMonthlyBenefit?: number;
  monthlyIncrease?: number;
  annualIncrease?: number;
  history?: Array<{
    year: number;
    percentage: number;
    benefitAmount: number;
    increase: number;
  }>;
  keepingPaceWithInflation?: boolean;
}

export interface BenefitsTaxProfile {
  marginalRate: number;
}

export class BenefitsInsightsService {
  /**
   * Analyzes if earned income is approaching limits that would reduce benefits.
   */
  static calculateIncomeCliffWarning(
    benefit: BenefitsIncome,
    otherIncome: Income[]
  ): IncomeCliffAnalysis {
    // Get relevant earnings limits based on benefit type
    // Using 2025 values as per spec
    const limits = this.getBenefitEarningsLimits(benefit);

    if (!limits) {
      return { hasEarningsLimit: false };
    }

    // Calculate earned income (exclude investment income for most benefits)
    const earnedIncome = otherIncome
      .filter((i) => ['salary', 'freelance'].includes(i.type))
      .reduce((sum, i) => sum + this.getAnnualIncomeAmount(i), 0);

    const annualLimit = limits.annualLimit;
    const monthlyLimit = annualLimit / 12;

    const buffer = annualLimit - earnedIncome;
    const monthlyBuffer = monthlyLimit - earnedIncome / 12;
    const percentOfLimit = (earnedIncome / annualLimit) * 100;

    // Determine status
    let status: 'safe' | 'caution' | 'danger' | 'over';
    if (earnedIncome > annualLimit) {
      status = 'over';
    } else if (percentOfLimit > 90) {
      status = 'danger';
    } else if (percentOfLimit > 75) {
      status = 'caution';
    } else {
      status = 'safe';
    }

    // Calculate impact if over
    let impactIfOver: IncomeCliffAnalysis['impactIfOver'];
    if (limits.reductionType === 'gradual') {
      const amountOver = Math.max(0, earnedIncome - annualLimit);
      impactIfOver = {
        type: 'reduction',
        formula: '$1 withheld for every $2 over limit',
        currentReduction: amountOver / 2,
      };
    } else {
      impactIfOver = {
        type: 'cliff',
        formula: 'Entire benefit at risk',
        potentialLoss: this.getAnnualIncomeAmount(benefit),
      };
    }

    return {
      hasEarningsLimit: true,
      benefitType: benefit.benefitSubtype,
      monthlyBenefit: this.getAnnualIncomeAmount(benefit) / 12,
      annualLimit,
      monthlyLimit,
      currentEarnedIncome: earnedIncome,
      buffer,
      monthlyBuffer,
      percentOfLimit,
      status,
      impactIfOver,
      safeToEarnMonthly: Math.max(0, monthlyBuffer),
      limitDisappearsAt: limits.expirationCondition,
    };
  }

  /**
   * Calculates the estimated after-tax value of benefits.
   */
  static calculateBenefitsTaxReality(
    benefits: BenefitsIncome[],
    otherIncome: Income[],
    userTaxProfile: BenefitsTaxProfile
  ): BenefitsTaxAnalysis {
    const { marginalRate } = userTaxProfile;

    // Calculate other income for SS combined income calculation
    const otherAnnualIncome = otherIncome
      .filter((i) => i.type !== 'benefits')
      .reduce((sum, i) => sum + this.getAnnualIncomeAmount(i), 0);

    const benefitAnalysis = benefits.map((benefit) => {
      let taxablePercentage = 0;
      let explanation = '';

      switch (benefit.benefitSubtype) {
        case 'social_security':
        case 'social_security_disability': {
          const ssAnnual = this.getAnnualIncomeAmount(benefit);
          const combinedIncome = otherAnnualIncome + ssAnnual * 0.5;

          // Determine taxable percentage (2025 single filer thresholds - simplified)
          if (combinedIncome < 25000) {
            taxablePercentage = 0;
            explanation = 'Below threshold - tax-free';
          } else if (combinedIncome < 34000) {
            taxablePercentage = 0.5;
            explanation = '50% taxable based on combined income';
          } else {
            taxablePercentage = 0.85;
            explanation = '85% taxable based on combined income';
          }
          break;
        }

        case 'pension_government':
        case 'pension_military':
        case 'pension_private':
          taxablePercentage = 1.0;
          explanation = 'Fully taxable as ordinary income';
          break;

        case 'va_benefits':
        case 'ssi':
        case 'workers_comp':
          taxablePercentage = 0;
          explanation = 'Tax-free';
          break;

        case 'unemployment':
          taxablePercentage = 1.0;
          explanation = 'Fully taxable as ordinary income';
          break;

        case 'child_support':
          taxablePercentage = 0;
          explanation = 'Tax-free to recipient';
          break;

        case 'alimony': {
          // Simplified: check divorceDate if provided, else assume modern rules (tax-free)
          const divorceDate = this.toDate(benefit.divorceDate);
          if (divorceDate && divorceDate.getFullYear() < 2019) {
            taxablePercentage = 1.0;
            explanation = 'Taxable (pre-2019 divorce)';
          } else {
            taxablePercentage = 0;
            explanation = 'Tax-free (post-2018 divorce)';
          }
          break;
        }

        default:
          taxablePercentage = 0;
          explanation = 'Assumed tax-free or custom handling';
      }

      const monthlyGross = this.getAnnualIncomeAmount(benefit) / 12;
      const monthlyTaxable = monthlyGross * taxablePercentage;
      const monthlyTax = monthlyTaxable * marginalRate;
      const afterTax = monthlyGross - monthlyTax;

      return {
        benefit,
        taxablePercentage,
        monthlyTaxable,
        monthlyTax,
        afterTax,
        explanation,
      };
    });

    const totalGross = benefitAnalysis.reduce(
      (sum, b) => sum + this.getAnnualIncomeAmount(b.benefit) / 12,
      0
    );
    const totalTax = benefitAnalysis.reduce((sum, b) => sum + b.monthlyTax, 0);
    const totalAfterTax = totalGross - totalTax;
    const keepPercentage =
      totalGross > 0 ? (totalAfterTax / totalGross) * 100 : 100;

    const ssIncome = benefits
      .filter(
        (b) =>
          b.benefitSubtype === 'social_security' ||
          b.benefitSubtype === 'social_security_disability'
      )
      .reduce((sum, b) => sum + this.getAnnualIncomeAmount(b), 0);

    return {
      byBenefit: benefitAnalysis,
      totalGross,
      totalTax,
      totalAfterTax,
      keepPercentage,
      combinedIncome: otherAnnualIncome + ssIncome * 0.5,
    };
  }

  /**
   * Tracks benefit duration and remaining value for temporary benefits.
   */
  static calculateBenefitDuration(
    benefit: BenefitsIncome
  ): BenefitDurationAnalysis {
    if (benefit.isPermanent) {
      return { isTemporary: false };
    }

    const today = new Date();
    let endDate = this.toDate(benefit.benefitEndDate);
    let remainingValue = 0;
    let elapsed = 0;
    let remaining = 0;
    let totalDuration = 0;
    let unit: 'months' | 'weeks' = 'months';

    if (benefit.benefitSubtype === 'unemployment') {
      unit = 'weeks';
      const startDate = this.toDate(benefit.benefitStartDate) || today;
      remaining = benefit.weeksRemaining || 0;
      elapsed = Math.max(
        0,
        Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
        )
      );
      totalDuration = elapsed + remaining;

      if (!endDate && remaining > 0) {
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + remaining * 7);
      }
    } else if (benefit.benefitSubtype === 'child_support') {
      const childBirthDate = this.toDate(benefit.childBirthDate);
      const endAge = benefit.endAge || 18;
      if (childBirthDate) {
        endDate = new Date(childBirthDate);
        endDate.setFullYear(endDate.getFullYear() + endAge);
      }
      unit = 'months';
    }

    if (!endDate) return { isTemporary: true };

    const startDate = this.toDate(benefit.benefitStartDate) || today;

    if (unit === 'weeks') {
      remaining = Math.max(
        0,
        Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
        )
      );
      totalDuration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      elapsed = totalDuration - remaining;
    } else {
      remaining = Math.max(
        0,
        (endDate.getFullYear() - today.getFullYear()) * 12 +
          (endDate.getMonth() - today.getMonth())
      );
      totalDuration =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      elapsed = totalDuration - remaining;
    }

    const monthlyAmount = this.getAnnualIncomeAmount(benefit) / 12;
    remainingValue =
      unit === 'weeks'
        ? (monthlyAmount / 4.33) * remaining
        : monthlyAmount * remaining;

    const percentComplete =
      totalDuration > 0 ? (elapsed / totalDuration) * 100 : 100;

    let urgency: BenefitDurationAnalysis['urgency'] = 'low';
    if (remaining <= (unit === 'weeks' ? 4 : 1)) urgency = 'critical';
    else if (remaining <= (unit === 'weeks' ? 12 : 3)) urgency = 'high';
    else if (remaining <= (unit === 'weeks' ? 24 : 6)) urgency = 'medium';

    return {
      isTemporary: true,
      endDate,
      totalDuration,
      elapsed,
      remaining,
      remainingValue,
      percentComplete,
      urgency,
      monthlyAmount,
      incomeDropAmount: monthlyAmount,
    };
  }

  /**
   * Internal helper to converting Income to annual amount.
   */
  private static getAnnualIncomeAmount(income: Income): number {
    switch (income.type) {
      case 'salary':
        return (
          income.annualSalary?.amount ||
          (income.takeHomePay?.amount || 0) *
            this.getFrequencyMultiplier(income.paymentFrequency)
        );
      case 'freelance':
        if (income.estimatedMonthlyIncome)
          return income.estimatedMonthlyIncome.amount * 12;
        if (income.retainerAmount && income.retainerFrequency) {
          return (
            income.retainerAmount.amount *
            this.getFrequencyMultiplier(income.retainerFrequency)
          );
        }
        return 0;
      case 'rental':
        return (
          (income.rentalAmount?.amount || 0) *
          this.getFrequencyMultiplier(income.rentalFrequency)
        );
      case 'investments':
        return (
          (income.incomeAmount?.amount || 0) *
          this.getFrequencyMultiplier(
            income.paymentFrequency === 'irregular'
              ? 'monthly'
              : income.paymentFrequency
          )
        );
      case 'benefits':
        return (
          (income.benefitAmount?.amount || 0) *
          this.getFrequencyMultiplier(income.paymentFrequency)
        );
      case 'other':
        return (
          (income.incomeAmount?.amount || 0) *
          this.getFrequencyMultiplier(
            income.paymentFrequency === 'irregular'
              ? 'monthly'
              : income.paymentFrequency
          )
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

  private static toDate(date: unknown): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (
      typeof date === 'object' &&
      'toDate' in date &&
      typeof date.toDate === 'function'
    ) {
      return (date as { toDate: () => Date }).toDate();
    }
    return new Date(date as string | number);
  }

  private static getBenefitEarningsLimits(benefit: BenefitsIncome) {
    // 2025 Values
    if (benefit.benefitSubtype === 'social_security') {
      // Assuming Early Retirement for warning purposes
      return {
        annualLimit: 22320,
        reductionType: 'gradual' as const,
        expirationCondition: 'Full Retirement Age (67)',
      };
    }
    if (benefit.benefitSubtype === 'social_security_disability') {
      return {
        annualLimit: 1550 * 12, // SGA Limit
        reductionType: 'cliff' as const,
        expirationCondition: 'Eligibility Status Change',
      };
    }
    return null;
  }
}
