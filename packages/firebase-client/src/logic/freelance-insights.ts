import { FreelanceGigIncome, IncomeLogEntry, Income } from '../incomes.js';

// ==========================================
// Freelance Insight Types
// ==========================================

export interface VolatilityAnalysis {
  volatilityScore: number; // 0-100 (Higher is more volatile)
  averageMonthlyIncome: number;
  medianMonthlyIncome: number;
  p25Income: number; // 25th percentile for conservative budgeting
  monthlyData: { month: string; amount: number; isEstimate: boolean }[];
  trend: 'up' | 'down' | 'stable';
}

export interface TaxSetAside {
  suggestedPercentage: number;
  estimatedMonthlyTax: number;
  totalYearlyTaxProjection: number;
  ytdTaxSetAsideRequired: number;
}

export interface ClientConcentration {
  topClientName?: string;
  topClientPercentage: number;
  riskLevel: 'low' | 'moderate' | 'high';
  clientBreakdown: { name: string; percentage: number; amount: number }[];
}

export interface EffectiveHourlyRate {
  averageHourlyRate: number;
  targetHourlyRate?: number;
  gap?: number;
  bySource: { name: string; rate: number }[];
}

export interface SeasonalPatterns {
  strongMonths: number[]; // 1-12
  slowMonths: number[]; // 1-12
  hasSignificantPattern: boolean;
  recommendedMonthlySavings: number; // Extra to save during strong months
}

export interface FreelanceStabilityScore {
  score: number; // 0-100
  rating: 'excellent' | 'good' | 'fair' | 'needs_work' | 'critical';
  components: {
    category: string;
    score: number;
    maxScore: number;
    status: 'good' | 'fair' | 'poor';
    message: string;
  }[];
}

export interface FreelanceInsights {
  volatility: VolatilityAnalysis;
  tax: TaxSetAside;
  concentration: ClientConcentration;
  hourlyRate: EffectiveHourlyRate;
  seasonality: SeasonalPatterns;
  stability: FreelanceStabilityScore;
}

// ==========================================
// Service Logic
// ==========================================

export class FreelanceInsightsService {
  /**
   * Main entry point for calculating insights for a freelance income stream.
   */
  static calculateInsights(
    freelance: FreelanceGigIncome,
    _allIncomes: Income[] = []
  ): FreelanceInsights {
    const log = freelance.incomeLog || [];

    // 1. Volatility
    const volatility = this.calculateVolatility(freelance, log);

    // 2. Tax
    const tax = this.calculateTaxSetAside(
      freelance,
      volatility.averageMonthlyIncome
    );

    // 3. Concentration
    const concentration = this.calculateConcentration(log);

    // 4. Hourly Rate
    const hourlyRate = this.calculateEffectiveHourlyRate(freelance, log);

    // 5. Seasonality
    const seasonality = this.calculateSeasonality(log);

    // 6. Stability Score
    const stability = this.calculateStabilityScore(
      freelance,
      volatility,
      concentration,
      tax
    );

    return {
      volatility,
      tax,
      concentration,
      hourlyRate,
      seasonality,
      stability,
    };
  }

  // ------------------------------------------
  // Volatility Analysis
  // ------------------------------------------
  private static calculateVolatility(
    freelance: FreelanceGigIncome,
    log: IncomeLogEntry[]
  ): VolatilityAnalysis {
    const monthlyTotals: Record<string, number> = {};
    const months: string[] = [];

    // Group by month
    log.forEach((entry) => {
      const month = entry.monthReceived;
      monthlyTotals[month] = (monthlyTotals[month] || 0) + entry.valueReceived;
      if (!months.includes(month)) months.push(month);
    });

    months.sort();

    // If no log, use estimates
    if (months.length === 0) {
      const estimate = freelance.estimatedMonthlyIncome?.amount || 0;
      return {
        volatilityScore:
          freelance.predictability === 'highly_predictable' ? 10 : 40,
        averageMonthlyIncome: estimate,
        medianMonthlyIncome: estimate,
        p25Income: estimate * 0.8,
        monthlyData: [],
        trend: 'stable',
      };
    }

    const values = months.map((m) => monthlyTotals[m]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Sort for median and p25
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)];

    // Variance calculation for volatility score
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0; // Coefficient of Variation

    // Volatility score 0-100 (CV of 0.5 is high/50, 1.0 is very high/100)
    const volatilityScore = Math.min(100, Math.round(cv * 100));

    return {
      volatilityScore,
      averageMonthlyIncome: avg,
      medianMonthlyIncome: median,
      p25Income: p25,
      monthlyData: months
        .map((m) => ({
          month: m,
          amount: monthlyTotals[m],
          isEstimate: false,
        }))
        .slice(-12),
      trend: this.calculateTrend(values),
    };
  }

  private static calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 3) return 'stable';
    const recent = values.slice(-3);
    const prev = values.slice(-6, -3);
    if (prev.length < 3) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / 3;
    const prevAvg = prev.reduce((a, b) => a + b, 0) / 3;

    const diff = (recentAvg - prevAvg) / prevAvg;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'stable';
  }

  // ------------------------------------------
  // Tax Set-Aside
  // ------------------------------------------
  private static calculateTaxSetAside(
    freelance: FreelanceGigIncome,
    avgIncome: number
  ): TaxSetAside {
    // Basic heuristic: 25% for most, 30% for higher income
    // In a real app, this would use tax brackets.
    let suggestedPercentage = 25;
    if (avgIncome > 10000000) suggestedPercentage = 30; // COP example

    const estimatedMonthlyTax = avgIncome * (suggestedPercentage / 100);
    const totalYearlyTaxProjection = estimatedMonthlyTax * 12;

    return {
      suggestedPercentage,
      estimatedMonthlyTax,
      totalYearlyTaxProjection,
      ytdTaxSetAsideRequired: estimatedMonthlyTax * (new Date().getMonth() + 1),
    };
  }

  // ------------------------------------------
  // Client Concentration
  // ------------------------------------------
  private static calculateConcentration(
    log: IncomeLogEntry[]
  ): ClientConcentration {
    const clientTotals: Record<string, number> = {};
    let total = 0;

    log.forEach((entry) => {
      const source = entry.sourceName || 'Other/Misc';
      clientTotals[source] = (clientTotals[source] || 0) + entry.valueReceived;
      total += entry.valueReceived;
    });

    if (total === 0) {
      return {
        topClientPercentage: 0,
        riskLevel: 'low',
        clientBreakdown: [],
      };
    }

    const breakdown = Object.entries(clientTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: (amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const top = breakdown[0];
    let riskLevel: ClientConcentration['riskLevel'] = 'low';
    if (top.percentage > 50) riskLevel = 'high';
    else if (top.percentage > 30) riskLevel = 'moderate';

    return {
      topClientName: top.name,
      topClientPercentage: top.percentage,
      riskLevel,
      clientBreakdown: breakdown,
    };
  }

  // ------------------------------------------
  // Effective Hourly Rate
  // ------------------------------------------
  private static calculateEffectiveHourlyRate(
    freelance: FreelanceGigIncome,
    _log: IncomeLogEntry[]
  ): EffectiveHourlyRate {
    // Current stated rate
    const currentRate = freelance.rateAmount?.amount || 0;

    // If we have history, we could calculate actual vs expected
    // But usually hourly workers log hours * rate.
    // For project based, we'd need to know hours per project.

    return {
      averageHourlyRate: currentRate,
      bySource: [], // Would need more granular logging
    };
  }

  // ------------------------------------------
  // Seasonal Patterns
  // ------------------------------------------
  private static calculateSeasonality(log: IncomeLogEntry[]): SeasonalPatterns {
    if (log.length < 6) {
      return {
        strongMonths: [],
        slowMonths: [],
        hasSignificantPattern: false,
        recommendedMonthlySavings: 0,
      };
    }

    const monthTotals = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);

    log.forEach((entry) => {
      const date =
        entry.dateReceived instanceof Date
          ? entry.dateReceived
          : (entry.dateReceived as { toDate: () => Date }).toDate();
      const m = date.getMonth(); // 0-11
      monthTotals[m] = (monthTotals[m] as number) + entry.valueReceived;
      monthCounts[m] = (monthCounts[m] as number) + 1;
    });

    const monthAverages = monthTotals.map((total, i) =>
      monthCounts[i] > 0 ? total / monthCounts[i] : 0
    );
    const overallAvg = monthAverages.reduce((a, b) => a + b, 0) / 12;

    const strongMonths: number[] = [];
    const slowMonths: number[] = [];

    monthAverages.forEach((avg, i) => {
      if (avg > overallAvg * 1.25) strongMonths.push(i + 1);
      if (avg < overallAvg * 0.75 && avg > 0) slowMonths.push(i + 1);
    });

    const maxMonth = Math.max(...monthAverages);

    return {
      strongMonths,
      slowMonths,
      hasSignificantPattern: strongMonths.length > 0 || slowMonths.length > 0,
      recommendedMonthlySavings:
        strongMonths.length > 0 ? (maxMonth - overallAvg) / 2 : 0,
    };
  }

  // ------------------------------------------
  // Stability Score
  // ------------------------------------------
  private static calculateStabilityScore(
    freelance: FreelanceGigIncome,
    volatility: VolatilityAnalysis,
    concentration: ClientConcentration,
    tax: TaxSetAside
  ): FreelanceStabilityScore {
    const components: FreelanceStabilityScore['components'] = [];
    let totalScore = 0;

    // 1. Predictability (30 pts)
    let predScore = 0;
    if (freelance.predictability === 'highly_predictable') predScore = 30;
    else if (freelance.predictability === 'somewhat_predictable')
      predScore = 20;
    else if (freelance.predictability === 'variable') predScore = 15;
    else predScore = 10;

    components.push({
      category: 'Predictability',
      score: predScore,
      maxScore: 30,
      status: predScore >= 25 ? 'good' : predScore >= 15 ? 'fair' : 'poor',
      message: freelance.predictability.replace('_', ' '),
    });
    totalScore += predScore;

    // 2. Volatility (30 pts)
    const volInvScore = Math.max(0, 30 - volatility.volatilityScore * 0.3);
    components.push({
      category: 'Consistency',
      score: Math.round(volInvScore),
      maxScore: 30,
      status: volInvScore >= 25 ? 'good' : volInvScore >= 15 ? 'fair' : 'poor',
      message:
        volatility.volatilityScore < 20
          ? 'Very consistent'
          : volatility.volatilityScore > 50
            ? 'Highly volatile'
            : 'Moderate variation',
    });
    totalScore += volInvScore;

    // 3. Concentration (20 pts)
    let concScore = 20;
    if (concentration.topClientPercentage > 70) concScore = 5;
    else if (concentration.topClientPercentage > 50) concScore = 10;
    else if (concentration.topClientPercentage > 30) concScore = 15;

    components.push({
      category: 'Diversification',
      score: concScore,
      maxScore: 20,
      status: concScore >= 18 ? 'good' : concScore >= 12 ? 'fair' : 'poor',
      message:
        concentration.riskLevel === 'high'
          ? 'High dependency risk'
          : 'Well diversified',
    });
    totalScore += concScore;

    // 4. Tenure (20 pts)
    // Placeholder - would check startDate
    const tenureScore = 15;
    components.push({
      category: 'Tenure',
      score: tenureScore,
      maxScore: 20,
      status: 'good',
      message: 'Established stream',
    });
    totalScore += tenureScore;

    // 5. Tax Readiness (10 pts)
    const taxScore = tax.suggestedPercentage > 0 ? 10 : 5;
    components.push({
      category: 'Tax Preparedness',
      score: taxScore,
      maxScore: 10,
      status: taxScore >= 8 ? 'good' : 'fair',
      message: `${tax.suggestedPercentage}% target`,
    });
    totalScore += taxScore;

    totalScore = Math.round(totalScore);

    let rating: FreelanceStabilityScore['rating'] = 'good';
    if (totalScore >= 90) rating = 'excellent';
    else if (totalScore >= 75) rating = 'good';
    else if (totalScore >= 60) rating = 'fair';
    else if (totalScore >= 40) rating = 'needs_work';
    else rating = 'critical';

    return {
      score: totalScore,
      rating,
      components,
    };
  }
}
