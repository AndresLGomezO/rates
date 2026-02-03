# Investment Income Insights

## Meaningful Insights That Provide Real Value

---

## Design Philosophy (Applied to Investment Income)

| ✅ Valuable Insight                           | ❌ Not Valuable               |
| --------------------------------------------- | ----------------------------- |
| Shows if income is reliable or at risk        | Just listing dividend amounts |
| Reveals tax drag on actual take-home          | Showing gross income only     |
| Tracks progress toward financial independence | Simple totals without context |
| Identifies concentration risk                 | Just listing sources          |
| Projects growth trajectory                    | Static point-in-time numbers  |

---

## Investment Income Subtypes Context

Investment income comes in several forms with different characteristics:

| Subtype           | Characteristics                           | Key Concerns                       |
| ----------------- | ----------------------------------------- | ---------------------------------- |
| **Dividends**     | Quarterly/monthly, can be cut, tax varies | Reliability, growth, tax treatment |
| **Interest**      | Predictable, rate-sensitive               | Rate changes, inflation erosion    |
| **Capital Gains** | Irregular, realized on sale               | Timing, tax impact                 |
| **Distributions** | From funds/REITs/partnerships, varies     | Consistency, tax complexity        |

---

## Insight #1: Investment Income Reliability Score

### Why It's Valuable

Unlike a salary, investment income can **disappear or shrink without warning**. Dividends get cut, interest rates drop, distributions vary. This insight helps users understand **how dependable their investment income actually is** — critical for anyone relying on it for expenses.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🛡️ Investment Income Reliability                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How stable is your investment income?                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR RELIABILITY SCORE                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │            ┌───────────────────────┐               │   │
│  │            │                       │               │   │
│  │            │         72            │               │   │
│  │            │        /100           │               │   │
│  │            │                       │               │   │
│  │            │      MODERATE         │               │   │
│  │            └───────────────────────┘               │   │
│  │                                                     │   │
│  │  Your investment income is reasonably stable,       │   │
│  │  but has some vulnerability to market conditions.   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 RELIABILITY BY SOURCE                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  SOURCE              AMOUNT    RELIABILITY          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  🏦 High-yield savings  $125/mo                     │   │
│  │     Bank of America                                 │   │
│  │     ████████████████████  95  Very High            │   │
│  │     ✓ FDIC insured, stable                         │   │
│  │                                                     │   │
│  │  📈 Index fund dividends  $180/mo                   │   │
│  │     VTI, SCHD                                       │   │
│  │     ████████████████░░░░  80  High                 │   │
│  │     ✓ Diversified, historically stable             │   │
│  │                                                     │   │
│  │  🏢 REIT distributions  $95/mo                      │   │
│  │     Realty Income (O)                               │   │
│  │     ██████████████░░░░░░  70  Moderate             │   │
│  │     ⚠ Single company, rate-sensitive               │   │
│  │                                                     │   │
│  │  💼 Individual stock dividends  $150/mo             │   │
│  │     AAPL, JNJ, KO                                   │   │
│  │     ████████████░░░░░░░░  60  Moderate             │   │
│  │     ⚠ Company-specific risk                        │   │
│  │                                                     │   │
│  │  📊 Bond fund interest  $85/mo                      │   │
│  │     BND                                             │   │
│  │     ██████████████████░░  85  High                 │   │
│  │     ✓ Diversified, relatively stable               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ RELIABILITY CONCERNS                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  1. CONCENTRATION RISK                              │   │
│  │     24% of income from individual stocks            │   │
│  │     Single company issues could significantly       │   │
│  │     impact your income.                             │   │
│  │                                                     │   │
│  │  2. INTEREST RATE SENSITIVITY                       │   │
│  │     33% of income ($210/mo) is rate-sensitive       │   │
│  │     (savings interest + REIT distributions)         │   │
│  │     A 1% rate drop could reduce income by ~$50/mo   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 TO IMPROVE RELIABILITY                                  │
│                                                             │
│  • Shift from individual stocks to dividend ETFs            │
│  • Diversify across more dividend-paying companies          │
│  • Consider I-bonds or TIPS for inflation protection        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateReliabilityScore(
  investments: InvestmentIncome[]
): ReliabilityAnalysis {
  // Reliability factors by source type
  const reliabilityFactors: Record<string, number> = {
    fdic_savings: 95, // FDIC insured, very safe
    treasury_bonds: 95, // Government backed
    cd: 90, // FDIC insured, locked rate
    bond_fund: 85, // Diversified bonds
    index_dividend_etf: 80, // Diversified stocks
    reit: 70, // Rate sensitive, company risk
    individual_stock: 60, // Single company risk
    mlp_partnership: 55, // Complex, variable
    crypto_yield: 30, // High volatility, platform risk
  };

  // Calculate weighted reliability score
  const totalIncome = sum(investments.map((i) => i.monthlyAmount));

  const weightedScore = investments.reduce((score, inv) => {
    const weight = inv.monthlyAmount / totalIncome;
    const sourceReliability = reliabilityFactors[inv.sourceType] || 50;

    // Adjust for diversification within source
    const diversificationBonus = inv.isMultipleHoldings ? 5 : 0;

    // Adjust for track record
    const trackRecordBonus =
      inv.yearsOfConsistentPayments > 5
        ? 5
        : inv.yearsOfConsistentPayments > 2
          ? 3
          : 0;

    return (
      score +
      weight * (sourceReliability + diversificationBonus + trackRecordBonus)
    );
  }, 0);

  // Identify concerns
  const concerns: ReliabilityConcern[] = [];

  // Check concentration
  const largestSource = Math.max(...investments.map((i) => i.monthlyAmount));
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
    .filter((i) => ['fdic_savings', 'reit', 'bond_fund'].includes(i.sourceType))
    .reduce((sum, i) => sum + i.monthlyAmount, 0);

  if (rateSensitiveIncome / totalIncome > 0.25) {
    const estimatedImpactPer1Percent = rateSensitiveIncome * 0.2; // Rough estimate
    concerns.push({
      type: 'rate_sensitivity',
      severity: 'low',
      description: `${Math.round((rateSensitiveIncome / totalIncome) * 100)}% is rate-sensitive`,
      impact: estimatedImpactPer1Percent,
    });
  }

  // Check for recent cuts (if history available)
  const recentCuts = investments.filter((i) =>
    i.paymentHistory?.some((p) => p.wasReduced)
  );

  if (recentCuts.length > 0) {
    concerns.push({
      type: 'recent_cuts',
      severity: 'high',
      description: `${recentCuts.length} source(s) reduced payments recently`,
      sources: recentCuts.map((i) => i.sourceName),
    });
  }

  return {
    overallScore: Math.round(weightedScore),
    scoreCategory:
      weightedScore >= 85
        ? 'very_high'
        : weightedScore >= 70
          ? 'high'
          : weightedScore >= 55
            ? 'moderate'
            : weightedScore >= 40
              ? 'low'
              : 'very_low',
    bySource: investments.map((inv) => ({
      ...inv,
      reliabilityScore: reliabilityFactors[inv.sourceType] || 50,
      percentageOfTotal: (inv.monthlyAmount / totalIncome) * 100,
    })),
    concerns,
    recommendations: generateReliabilityRecommendations(concerns),
  };
}
```

### When to Show

- Dashboard overview
- When adding new investment income
- Quarterly review
- When market volatility is high

---

## Insight #2: What You Actually Keep (Tax-Adjusted Income)

### Why It's Valuable

Investment income is taxed **very differently** depending on the type. Qualified dividends get favorable rates, ordinary dividends and interest are taxed as regular income, and some distributions have complex tax treatment. This insight shows users their **real after-tax income** — often significantly less than they think.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 What You Actually Keep                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Investment income is taxed differently than salary.        │
│  Here's what you really take home.                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR INVESTMENT INCOME SUMMARY                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Total gross income:           $635/month           │   │
│  │                                 $7,620/year         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 TAX TREATMENT BREAKDOWN                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  TYPE                 AMOUNT    TAX RATE   TAX      │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Qualified dividends  $280/mo   15%       $42      │   │
│  │  (AAPL, VTI, SCHD)    ████████████████░░░░         │   │
│  │  ✓ Favorable rate                                   │   │
│  │                                                     │   │
│  │  Ordinary dividends   $70/mo    22%       $15      │   │
│  │  (REITs, some funds)  ████████████████████░░       │   │
│  │  ⚠ Taxed as regular income                         │   │
│  │                                                     │   │
│  │  Interest income      $210/mo   22%       $46      │   │
│  │  (Savings, bonds)     ████████████████████░░       │   │
│  │  ⚠ Taxed as regular income                         │   │
│  │                                                     │   │
│  │  Tax-exempt interest  $75/mo    0%        $0       │   │
│  │  (Muni bonds)         ░░░░░░░░░░░░░░░░░░░░░░       │   │
│  │  ✓ Federal tax-free                                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💵 YOUR AFTER-TAX REALITY                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Gross investment income:      $635/month           │   │
│  │  Estimated taxes:              −$103/month          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  After-tax income:             $532/month           │   │
│  │                                                     │   │
│  │  ════════════════════════════════════════════      │   │
│  │                                                     │   │
│  │  Effective tax rate:           16.2%                │   │
│  │                                                     │   │
│  │  You keep 84¢ of every $1 earned                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 TAX EFFICIENCY COMPARISON                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your investment income     ████████████████  84%  │   │
│  │  (16.2% effective rate)     kept                    │   │
│  │                                                     │   │
│  │  If all was salary          ████████████░░░░  78%  │   │
│  │  (22% marginal rate)        kept                    │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Your tax-efficient investing saves you             │   │
│  │  ~$38/month compared to regular income.            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 TAX OPTIMIZATION OPPORTUNITIES                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📍 Your REIT dividends ($70/mo) are taxed at 22%  │   │
│  │     Consider holding REITs in a tax-advantaged      │   │
│  │     account (IRA/401k) to defer taxes.              │   │
│  │                                                     │   │
│  │  📍 Your savings interest ($125/mo) is fully taxed │   │
│  │     I-Bonds or Treasury bills have state tax        │   │
│  │     exemption (saves ~$6/mo if in high-tax state).  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateTaxAdjustedIncome(
  investments: InvestmentIncome[],
  userTaxProfile: TaxProfile
): TaxAdjustedAnalysis {
  const { marginalRate, capitalGainsRate, stateRate } = userTaxProfile;

  // Categorize income by tax treatment
  const categories = {
    qualifiedDividends: investments.filter(
      (i) => i.taxTreatment === 'qualified_dividend'
    ),
    ordinaryDividends: investments.filter(
      (i) => i.taxTreatment === 'ordinary_dividend'
    ),
    interest: investments.filter((i) => i.taxTreatment === 'interest'),
    taxExempt: investments.filter((i) => i.taxTreatment === 'tax_exempt'),
    capitalGains: investments.filter((i) => i.taxTreatment === 'capital_gains'),
  };

  // Calculate tax for each category
  const taxCalculations = {
    qualifiedDividends: {
      gross: sum(categories.qualifiedDividends.map((i) => i.monthlyAmount)),
      rate: capitalGainsRate, // Qualified dividends use capital gains rates
      tax: 0,
    },
    ordinaryDividends: {
      gross: sum(categories.ordinaryDividends.map((i) => i.monthlyAmount)),
      rate: marginalRate,
      tax: 0,
    },
    interest: {
      gross: sum(categories.interest.map((i) => i.monthlyAmount)),
      rate: marginalRate,
      tax: 0,
    },
    taxExempt: {
      gross: sum(categories.taxExempt.map((i) => i.monthlyAmount)),
      rate: 0,
      tax: 0,
    },
    capitalGains: {
      gross: sum(categories.capitalGains.map((i) => i.monthlyAmount)),
      rate: capitalGainsRate,
      tax: 0,
    },
  };

  // Calculate taxes
  Object.keys(taxCalculations).forEach((key) => {
    const cat = taxCalculations[key];
    cat.tax = cat.gross * cat.rate;
  });

  const totalGross = Object.values(taxCalculations).reduce(
    (sum, c) => sum + c.gross,
    0
  );
  const totalTax = Object.values(taxCalculations).reduce(
    (sum, c) => sum + c.tax,
    0
  );
  const afterTax = totalGross - totalTax;
  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  // Compare to if all was ordinary income
  const ifAllOrdinary = totalGross * marginalRate;
  const taxSavings = ifAllOrdinary - totalTax;

  // Identify optimization opportunities
  const opportunities: TaxOptimization[] = [];

  // REITs in taxable accounts
  const taxableReits = investments.filter(
    (i) => i.sourceType === 'reit' && !i.isInTaxAdvantaged
  );
  if (taxableReits.length > 0) {
    opportunities.push({
      type: 'account_location',
      description: 'Move REITs to tax-advantaged accounts',
      potentialSavings:
        sum(taxableReits.map((i) => i.monthlyAmount)) * marginalRate * 0.5,
    });
  }

  // High interest in taxable
  const taxableInterest = investments.filter(
    (i) => i.taxTreatment === 'interest' && !i.isInTaxAdvantaged
  );
  if (sum(taxableInterest.map((i) => i.monthlyAmount)) > 100) {
    opportunities.push({
      type: 'tax_exempt_alternative',
      description: 'Consider municipal bonds or I-bonds',
      potentialSavings:
        sum(taxableInterest.map((i) => i.monthlyAmount)) * stateRate,
    });
  }

  return {
    totalGross,
    totalTax,
    afterTax,
    effectiveRate,
    byCategory: taxCalculations,
    comparisonToOrdinary: {
      ordinaryTax: ifAllOrdinary,
      actualTax: totalTax,
      savings: taxSavings,
    },
    opportunities,
    keepRate: (afterTax / totalGross) * 100,
  };
}
```

### When to Show

- Dashboard (simplified version)
- Detailed view on request
- Tax planning season (Q4, Q1)
- When adding new investment income

---

## Insight #3: Dividend Calendar & Cash Flow Timing

### Why It's Valuable

Unlike a salary that arrives predictably, investment income comes in **irregular intervals** — some stocks pay quarterly on different schedules, some monthly, some annually. This insight maps out **when money actually arrives**, helping users plan cash flow and identify "dividend-heavy" months.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 Your Investment Income Calendar                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When does your investment income arrive?                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  NEXT 3 MONTHS                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  MARCH 2025                              Total: $485│   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Mar 1   🏦 High-yield savings interest    $125    │   │
│  │  Mar 10  📈 VTI dividend                   $95     │   │
│  │  Mar 12  📈 SCHD dividend                  $85     │   │
│  │  Mar 15  💼 AAPL dividend                  $45     │   │
│  │  Mar 15  💼 JNJ dividend                   $60     │   │
│  │  Mar 28  🏢 Realty Income (O) dividend     $75     │   │
│  │                                                     │   │
│  │  ═════════════════════════════════════════════════  │   │
│  │                                                     │   │
│  │  APRIL 2025                              Total: $200│   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Apr 1   🏦 High-yield savings interest    $125    │   │
│  │  Apr 28  🏢 Realty Income (O) dividend     $75     │   │
│  │                                                     │   │
│  │  ⚠️ Light month - most dividends are quarterly     │   │
│  │                                                     │   │
│  │  ═════════════════════════════════════════════════  │   │
│  │                                                     │   │
│  │  MAY 2025                                Total: $235│   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  May 1   🏦 High-yield savings interest    $125    │   │
│  │  May 15  💼 KO dividend                    $35     │   │
│  │  May 28  🏢 Realty Income (O) dividend     $75     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 MONTHLY INCOME PATTERN                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  $700 ┤                                             │   │
│  │       │  ██                    ██                   │   │
│  │  $500 ┤  ██                    ██                   │   │
│  │       │  ██    ░░    ░░        ██    ░░    ░░      │   │
│  │  $300 ┤  ██    ░░    ░░        ██    ░░    ░░      │   │
│  │       │  ██    ░░    ░░    ░░  ██    ░░    ░░      │   │
│  │  $100 ┤  ██    ░░    ░░    ░░  ██    ░░    ░░      │   │
│  │       └──────────────────────────────────────────   │   │
│  │        Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  ...  │   │
│  │                                                     │   │
│  │  ██ = Dividend months (Mar, Jun, Sep, Dec)         │   │
│  │  ░░ = Base income only (savings interest)          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 INCOME TIMING INSIGHTS                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈 PEAK MONTHS                                     │   │
│  │     March, June, September, December                │   │
│  │     Average: $635/month                             │   │
│  │                                                     │   │
│  │  📉 LIGHT MONTHS                                    │   │
│  │     January, February, April, May, July, etc.       │   │
│  │     Average: $200/month                             │   │
│  │                                                     │   │
│  │  ⚠️ VARIABILITY                                     │   │
│  │     Your income swings by $435 month-to-month.      │   │
│  │     Plan expenses around lighter months.            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 WANT MORE CONSISTENT INCOME?                            │
│                                                             │
│  Monthly dividend payers like Realty Income (O),            │
│  STAG Industrial, or monthly dividend ETFs can              │
│  smooth out your cash flow.                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function generateDividendCalendar(
  investments: InvestmentIncome[],
  startDate: Date,
  monthsAhead: number = 3
): DividendCalendarAnalysis {
  const calendar: MonthlyIncome[] = [];

  for (let m = 0; m < monthsAhead; m++) {
    const monthDate = addMonths(startDate, m);
    const monthPayments: ScheduledPayment[] = [];

    investments.forEach((inv) => {
      const payments = getExpectedPaymentsForMonth(inv, monthDate);
      monthPayments.push(...payments);
    });

    // Sort by date
    monthPayments.sort(
      (a, b) => a.expectedDate.getTime() - b.expectedDate.getTime()
    );

    calendar.push({
      month: monthDate,
      payments: monthPayments,
      total: sum(monthPayments.map((p) => p.amount)),
    });
  }

  // Calculate yearly pattern
  const yearlyPattern: number[] = [];
  for (let m = 0; m < 12; m++) {
    const monthDate = setMonth(startDate, m);
    let monthTotal = 0;

    investments.forEach((inv) => {
      const payments = getExpectedPaymentsForMonth(inv, monthDate);
      monthTotal += sum(payments.map((p) => p.amount));
    });

    yearlyPattern.push(monthTotal);
  }

  // Identify peak and light months
  const avgMonthly = sum(yearlyPattern) / 12;
  const peakMonths = yearlyPattern
    .map((amount, index) => ({ month: index, amount }))
    .filter((m) => m.amount > avgMonthly * 1.3)
    .map((m) => m.month);

  const lightMonths = yearlyPattern
    .map((amount, index) => ({ month: index, amount }))
    .filter((m) => m.amount < avgMonthly * 0.7)
    .map((m) => m.month);

  // Calculate variability
  const maxMonth = Math.max(...yearlyPattern);
  const minMonth = Math.min(...yearlyPattern);
  const variability = maxMonth - minMonth;

  return {
    calendar,
    yearlyPattern,
    peakMonths,
    lightMonths,
    avgMonthly,
    maxMonth,
    minMonth,
    variability,
    variabilityPercentage: (variability / avgMonthly) * 100,
    suggestions:
      variability > avgMonthly
        ? ['Consider monthly dividend payers to smooth income']
        : [],
  };
}

function getExpectedPaymentsForMonth(
  inv: InvestmentIncome,
  monthDate: Date
): ScheduledPayment[] {
  const payments: ScheduledPayment[] = [];

  if (inv.paymentFrequency === 'monthly') {
    payments.push({
      source: inv.sourceName,
      sourceType: inv.sourceType,
      amount: inv.monthlyAmount,
      expectedDate: inv.paymentDayOfMonth
        ? setDate(monthDate, inv.paymentDayOfMonth)
        : startOfMonth(monthDate),
    });
  } else if (inv.paymentFrequency === 'quarterly') {
    // Check if this is a payment month
    if (inv.quarterlyPaymentMonths?.includes(getMonth(monthDate))) {
      payments.push({
        source: inv.sourceName,
        sourceType: inv.sourceType,
        amount: inv.quarterlyAmount || inv.monthlyAmount * 3,
        expectedDate: inv.paymentDayOfMonth
          ? setDate(monthDate, inv.paymentDayOfMonth)
          : setDate(monthDate, 15),
      });
    }
  }
  // Add other frequencies as needed

  return payments;
}
```

### When to Show

- Dashboard widget
- Monthly planning view
- Cash flow forecasting
- When user has multiple dividend sources

---

## Insight #4: Path to Financial Independence

### Why It's Valuable

Many people investing for income have a dream: **earning enough from investments to cover living expenses**. This insight tracks progress toward that goal, showing how much of their expenses are currently covered and projecting when they might reach full coverage.

This is deeply motivating and helps users see the "big picture" of their investment strategy.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎯 Path to Financial Independence                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much of your life is funded by investments?            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR PROGRESS                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Monthly investment income:     $532 (after tax)    │   │
│  │  Monthly essential expenses:    $3,200              │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  16.6% of expenses covered by investments          │   │
│  │                                                     │   │
│  │  Your investments pay for about 5 days             │   │
│  │  of each month.                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 WHAT YOUR INVESTMENTS COVER                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your $532/month could fully cover:                 │   │
│  │                                                     │   │
│  │  ✅ Utilities           $180    ███████████████    │   │
│  │  ✅ Internet + Phone    $120    ██████████         │   │
│  │  ✅ Subscriptions       $85     ███████            │   │
│  │  ◐  Groceries (partial) $147    ████████████░░░░   │   │
│  │     (of $400)                                       │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💡 You've achieved "utility independence" —        │   │
│  │     your investments pay for all your utilities!    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🚀 MILESTONES                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ✅ ACHIEVED                                        │   │
│  │                                                     │   │
│  │  • Utilities covered         ($180)  ✓ Done        │   │
│  │  • Phone + Internet covered  ($120)  ✓ Done        │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  🎯 NEXT MILESTONES                                 │   │
│  │                                                     │   │
│  │  • Groceries covered         ($400)                 │   │
│  │    Need: $268 more/month                            │   │
│  │    At 7% growth: ~3.5 years                         │   │
│  │                                                     │   │
│  │  • Car payment covered       ($450)                 │   │
│  │    Need: $318 more/month (after groceries)          │   │
│  │    At 7% growth: ~5 years (cumulative)              │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  🏆 FULL INDEPENDENCE                               │   │
│  │                                                     │   │
│  │  To cover all $3,200 in expenses:                   │   │
│  │  Need: $2,668 more/month                            │   │
│  │                                                     │   │
│  │  With current trajectory: ~18 years                 │   │
│  │  If you increase investments 20%: ~14 years         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 YOUR GROWTH TRAJECTORY                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  $3,200 ┤                            ════════════  │   │
│  │  (goal) │                        ∗∗∗∗              │   │
│  │         │                    ∗∗∗∗                  │   │
│  │  $2,000 ┤                ∗∗∗∗                      │   │
│  │         │            ∗∗∗∗                          │   │
│  │  $1,000 ┤        ∗∗∗∗                              │   │
│  │         │    ∗∗∗∗                                  │   │
│  │   $532 ─┼─∗∗∗                                      │   │
│  │  (now)  └──────────────────────────────────────    │   │
│  │         Now   5yr   10yr   15yr   20yr             │   │
│  │                                                     │   │
│  │  Assumes 7% annual income growth                    │   │
│  │  (dividend growth + reinvestment)                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 ACCELERATION OPTIONS                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈 Reinvest all dividends instead of taking cash:  │   │
│  │     Reduces time to goal by ~4 years                │   │
│  │                                                     │   │
│  │  💰 Add $200/month to investments:                  │   │
│  │     Reduces time to goal by ~6 years                │   │
│  │                                                     │   │
│  │  📉 Reduce expenses by $500/month:                  │   │
│  │     Reduces time to goal by ~3 years                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateFIProgress(
  investmentIncome: InvestmentIncome[],
  expenses: Expense[],
  assumptions: FIAssumptions
): FIProgressAnalysis {
  const { incomeGrowthRate, inflationRate } = assumptions;

  // Current state
  const monthlyInvestmentIncome = sum(
    investmentIncome.map((i) => i.afterTaxAmount)
  );
  const monthlyExpenses = sum(expenses.map((e) => e.monthlyAmount));
  const essentialExpenses = sum(
    expenses.filter((e) => e.isEssential).map((e) => e.monthlyAmount)
  );

  // Coverage
  const coveragePercentage =
    (monthlyInvestmentIncome / essentialExpenses) * 100;
  const daysPerMonthCovered = (coveragePercentage / 100) * 30;

  // What expenses are covered?
  const expensesCovered: ExpenseCoverage[] = [];
  let remainingIncome = monthlyInvestmentIncome;

  // Sort expenses by amount (cover smaller ones first for more "wins")
  const sortedExpenses = [...expenses].sort(
    (a, b) => a.monthlyAmount - b.monthlyAmount
  );

  for (const expense of sortedExpenses) {
    if (remainingIncome >= expense.monthlyAmount) {
      expensesCovered.push({
        expense,
        status: 'fully_covered',
        amountCovered: expense.monthlyAmount,
      });
      remainingIncome -= expense.monthlyAmount;
    } else if (remainingIncome > 0) {
      expensesCovered.push({
        expense,
        status: 'partially_covered',
        amountCovered: remainingIncome,
      });
      remainingIncome = 0;
    } else {
      expensesCovered.push({
        expense,
        status: 'not_covered',
        amountCovered: 0,
      });
    }
  }

  // Calculate milestones
  const milestones = generateMilestones(
    expenses,
    monthlyInvestmentIncome,
    incomeGrowthRate
  );

  // Project time to full FI
  const gap = essentialExpenses - monthlyInvestmentIncome;
  const yearsToFI =
    gap > 0
      ? calculateYearsToTarget(
          monthlyInvestmentIncome,
          essentialExpenses,
          incomeGrowthRate,
          inflationRate
        )
      : 0;

  // Growth projection
  const projection = projectIncome(
    monthlyInvestmentIncome,
    incomeGrowthRate,
    25
  );

  // Acceleration scenarios
  const scenarios = [
    {
      name: 'Reinvest all dividends',
      yearsToFI: calculateYearsToTarget(
        monthlyInvestmentIncome,
        essentialExpenses,
        incomeGrowthRate + 0.02,
        inflationRate
      ),
      yearsSaved:
        yearsToFI -
        calculateYearsToTarget(
          monthlyInvestmentIncome,
          essentialExpenses,
          incomeGrowthRate + 0.02,
          inflationRate
        ),
    },
    {
      name: 'Add $200/month to investments',
      yearsToFI: calculateYearsWithContributions(
        monthlyInvestmentIncome,
        essentialExpenses,
        incomeGrowthRate,
        200
      ),
      yearsSaved:
        yearsToFI -
        calculateYearsWithContributions(
          monthlyInvestmentIncome,
          essentialExpenses,
          incomeGrowthRate,
          200
        ),
    },
    {
      name: 'Reduce expenses by $500/month',
      yearsToFI: calculateYearsToTarget(
        monthlyInvestmentIncome,
        essentialExpenses - 500,
        incomeGrowthRate,
        inflationRate
      ),
      yearsSaved:
        yearsToFI -
        calculateYearsToTarget(
          monthlyInvestmentIncome,
          essentialExpenses - 500,
          incomeGrowthRate,
          inflationRate
        ),
    },
  ];

  return {
    monthlyInvestmentIncome,
    monthlyExpenses: essentialExpenses,
    coveragePercentage,
    daysPerMonthCovered,
    expensesCovered,
    achievedMilestones: milestones.filter((m) => m.achieved),
    nextMilestones: milestones.filter((m) => !m.achieved).slice(0, 3),
    yearsToFI,
    projection,
    accelerationScenarios: scenarios,
  };
}

function calculateYearsToTarget(
  currentIncome: number,
  targetIncome: number,
  growthRate: number,
  inflationRate: number
): number {
  // Real growth rate (growth minus inflation)
  const realGrowth = growthRate - inflationRate;

  if (realGrowth <= 0 || currentIncome >= targetIncome) {
    return currentIncome >= targetIncome ? 0 : Infinity;
  }

  // Years = ln(target/current) / ln(1 + realGrowth)
  return Math.log(targetIncome / currentIncome) / Math.log(1 + realGrowth);
}
```

### When to Show

- Dashboard (summary version)
- Full detail in dedicated "FI Progress" section
- Monthly/quarterly updates
- When investment income changes significantly

---

## Insight #5: Dividend Growth Tracker

### Why It's Valuable

For dividend investors, **growth** is as important as current yield. A stock that consistently raises its dividend is building an income stream that outpaces inflation. This insight tracks whether your income sources are **growing, stagnant, or at risk** of cuts.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Dividend Growth Tracker                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Are your income sources growing?                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  OVERALL INCOME GROWTH                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your investment income has grown:                  │   │
│  │                                                     │   │
│  │  Last 12 months:     +8.3%    ($587 → $635)        │   │
│  │  Since tracking:     +24.5%   (18 months)           │   │
│  │                                                     │   │
│  │  ✅ Outpacing inflation (3.2%)                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 GROWTH BY SOURCE                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  SOURCE              LAST YEAR   GROWTH   STREAK   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💼 Johnson & Johnson (JNJ)                         │   │
│  │     $52 → $57/mo      +9.6%     62 years 🏆        │   │
│  │     ████████████████████████  Dividend King        │   │
│  │                                                     │   │
│  │  💼 Apple (AAPL)                                    │   │
│  │     $40 → $45/mo      +12.5%    12 years           │   │
│  │     ███████████████████████████  Strong grower     │   │
│  │                                                     │   │
│  │  📈 Schwab Dividend ETF (SCHD)                      │   │
│  │     $78 → $85/mo      +9.0%     11 years           │   │
│  │     ████████████████████████  Consistent           │   │
│  │                                                     │   │
│  │  📈 Vanguard Total Stock (VTI)                      │   │
│  │     $88 → $95/mo      +8.0%     Varies             │   │
│  │     ███████████████████████  Market-linked         │   │
│  │                                                     │   │
│  │  🏢 Realty Income (O)                               │   │
│  │     $72 → $75/mo      +4.2%     29 years           │   │
│  │     ████████████████░░░░░░  Steady but slow        │   │
│  │                                                     │   │
│  │  🏦 High-yield savings                              │   │
│  │     $110 → $125/mo    +13.6%    Rate-dependent     │   │
│  │     ██████████████████████████████  ⚠️ Can drop   │   │
│  │                                                     │   │
│  │  💼 Coca-Cola (KO)                                  │   │
│  │     $35 → $35/mo      +0%       62 years           │   │
│  │     ░░░░░░░░░░░░░░░░░░░░  Stagnant this year      │   │
│  │     (Raised in Feb - next raise expected soon)      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🏆 YOUR INCOME GROWERS VS LAGGERS                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  TOP GROWERS (above 8%)                             │   │
│  │  • High-yield savings    +13.6%  (rate-dependent)   │   │
│  │  • Apple                 +12.5%                     │   │
│  │  • Johnson & Johnson     +9.6%                      │   │
│  │  • SCHD                  +9.0%                      │   │
│  │                                                     │   │
│  │  LAGGERS (below inflation)                          │   │
│  │  • Coca-Cola             +0% (awaiting raise)       │   │
│  │                                                     │   │
│  │  ⚠️ AT RISK                                         │   │
│  │  • None currently                                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 UPCOMING DIVIDEND ANNOUNCEMENTS                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Companies typically announce raises around:        │   │
│  │                                                     │   │
│  │  • Coca-Cola (KO):     February (expected soon!)    │   │
│  │  • Apple (AAPL):       April/May                    │   │
│  │  • Realty Income (O):  Monthly increases            │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  🔔  Notify me of dividend changes          │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 IF GROWTH CONTINUES                                     │
│                                                             │
│  At your current 8.3% income growth rate:                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Today:        $635/month                           │   │
│  │  In 5 years:   $945/month    (+49%)                │   │
│  │  In 10 years:  $1,407/month  (+122%)               │   │
│  │  In 20 years:  $3,115/month  (+391%)               │   │
│  │                                                     │   │
│  │  Your income would double in ~9 years              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function analyzeDividendGrowth(
  investments: InvestmentIncome[],
  incomeHistory: IncomeHistoryRecord[]
): DividendGrowthAnalysis {
  // Calculate overall growth
  const twelveMonthsAgo = subMonths(new Date(), 12);
  const pastIncome = getIncomeForMonth(incomeHistory, twelveMonthsAgo);
  const currentIncome = sum(investments.map((i) => i.monthlyAmount));

  const yearOverYearGrowth =
    pastIncome > 0 ? ((currentIncome - pastIncome) / pastIncome) * 100 : null;

  // Growth by source
  const sourceGrowth = investments.map((inv) => {
    const pastAmount =
      inv.incomeHistory?.find((h) => isSameMonth(h.date, twelveMonthsAgo))
        ?.amount || inv.monthlyAmount;

    const growth =
      pastAmount > 0
        ? ((inv.monthlyAmount - pastAmount) / pastAmount) * 100
        : 0;

    return {
      source: inv,
      pastAmount,
      currentAmount: inv.monthlyAmount,
      growthPercentage: growth,
      streakYears: inv.dividendStreakYears || null,
      status: classifyGrowthStatus(growth, inv),
    };
  });

  // Sort into categories
  const topGrowers = sourceGrowth
    .filter((s) => s.growthPercentage > 8)
    .sort((a, b) => b.growthPercentage - a.growthPercentage);

  const laggers = sourceGrowth.filter(
    (s) => s.growthPercentage < 3 && s.growthPercentage >= 0
  );

  const atRisk = sourceGrowth.filter(
    (s) => s.growthPercentage < 0 || s.source.hasCutHistory
  );

  // Calculate future projections
  const avgGrowthRate = yearOverYearGrowth || 7;
  const projections = [5, 10, 20].map((years) => ({
    years,
    projectedMonthly: currentIncome * Math.pow(1 + avgGrowthRate / 100, years),
  }));

  const yearsToDouble =
    avgGrowthRate > 0
      ? Math.log(2) / Math.log(1 + avgGrowthRate / 100)
      : Infinity;

  // Inflation comparison
  const inflationRate = 3.2; // Could be dynamic
  const beatsInflation = (yearOverYearGrowth || 0) > inflationRate;

  return {
    currentMonthlyIncome: currentIncome,
    yearOverYearGrowth,
    beatsInflation,
    inflationRate,
    bySource: sourceGrowth,
    topGrowers,
    laggers,
    atRisk,
    projections,
    yearsToDouble,
    upcomingAnnouncements: getUpcomingDividendAnnouncements(investments),
  };
}

function classifyGrowthStatus(
  growth: number,
  source: InvestmentIncome
): string {
  if (growth < 0) return 'declining';
  if (growth === 0) return 'stagnant';
  if (growth < 3) return 'below_inflation';
  if (growth < 8) return 'moderate';
  if (source.sourceType === 'fdic_savings') return 'rate_dependent';
  return 'strong';
}
```

### When to Show

- Quarterly review
- When dividends are received (compare to previous)
- When dividend announcements occur
- Annual review

---

## Insight #6: Concentration Risk Alert

### Why It's Valuable

Diversification is easy to forget when things are going well. This insight alerts users when **too much of their investment income depends on a single source** — whether a single stock, a single sector, or a single type of income. It quantifies the risk in terms of actual income impact.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ Income Concentration Analysis                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How diversified is your investment income?                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  CONCENTRATION BY SOURCE                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏦 High-yield savings      $125    20%            │   │
│  │     ████████████████████░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  📈 VTI (Index fund)        $95     15%            │   │
│  │     ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  📈 SCHD (Dividend ETF)     $85     13%            │   │
│  │     █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  🏢 Realty Income (O)       $75     12%            │   │
│  │     ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  💼 JNJ                     $60     9%             │   │
│  │     █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  💼 AAPL                    $45     7%             │   │
│  │     ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  (4 other sources)          $150    24%            │   │
│  │     ████████████████████████░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  ✅ No single source exceeds 25%                   │   │
```

│ │ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
│ ───────────────────────────────────────────────────────── │
│ │
│ 📊 CONCENTRATION BY SECTOR │
│ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ │ │
│ │ 🏦 Cash/Fixed Income $210 33% │ │
│ │ (Savings, bonds) │ │
│ │ █████████████████████████████████░░░░░░░░░░░ │ │
│ │ │ │
│ │ 📈 Broad Market $180 28% │ │
│ │ (VTI, SCHD) │ │
│ │ ████████████████████████████░░░░░░░░░░░░░░░░ │ │
│ │ │ │
│ │ 🏢 Real Estate $75 12% │ │
│ │ (Realty Income) │ │
│ │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ │ │
│ │ 💊 Healthcare $60 9% │ │
│ │ (JNJ) │ │
│ │ █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ │ │
│ │ 💻 Technology $45 7% │ │
│ │ (AAPL) │ │
│ │ ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ │ │
│ │ 🥤 Consumer Staples $65 10% │ │
│ │ (KO, etc.) │ │
│ │ ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
│ ───────────────────────────────────────────────────────── │
│ │
│ ⚠️ CONCENTRATION ALERTS │
│ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ │ │
│ │ 🟡 MODERATE: Interest Rate Exposure │ │
│ │ │ │
│ │ 33% of your income ($210/mo) comes from │ │
│ │ rate-sensitive sources (savings, bonds). │ │
│ │ │ │
│ │ IMPACT SCENARIO: │ │
│ │ If rates drop 1.5% (like in a recession): │ │
│ │ │ │
│ │ • Savings interest: $125 → ~$90 (−$35) │ │
│ │ • Bond yields: slight decrease (−$10) │ │
│ │ • Total impact: ~$45/month less income │ │
│ │ │ │
│ │ ───────────────────────────────────────────────── │ │
│ │ │ │
│ │ 🟢 HEALTHY: Single Stock Exposure │ │
│ │ │ │
│ │ No single stock exceeds 15% of income. │ │
│ │ Your largest single-stock position (JNJ) is 9%. │ │
│ │ │ │
│ │ ───────────────────────────────────────────────── │ │
│ │ │ │
│ │ 🟢 HEALTHY: Sector Diversification │ │
│ │ │ │
│ │ No single sector exceeds 35% of income. │ │
│ │ Your largest sector (Cash/Fixed) is 33%. │ │
│ │ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
│ ───────────────────────────────────────────────────────── │
│ │
│ 🎯 WHAT IF SCENARIOS │
│ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ │ │
│ │ What happens if something goes wrong? │ │
│ │ │ │
│ │ SCENARIO INCOME IMPACT │ │
│ │ ───────────────────────────────────────────────── │ │
│ │ │ │
│ │ 📉 Stock market drops 30% │ │
│ │ Dividends typically drop ~10-15% │ │
│ │ Your impact: −$25 to −$40/month │ │
│ │ (ETFs and quality stocks cushion the blow) │ │
│ │ │ │
│ │ 🏦 Fed cuts rates 1.5% │ │
│ │ Your impact: −$45/month │ │
│ │ (Savings and bonds affected) │ │
│ │ │ │
│ │ 🏢 Real estate sector crisis │ │
│ │ REIT dividends could be cut 20-50% │ │
│ │ Your impact: −$15 to −$38/month │ │
│ │ (Only 12% exposure limits damage) │ │
│ │ │ │
│ │ 💼 Single company crisis (e.g., JNJ) │ │
│ │ Dividend suspended entirely │ │
│ │ Your impact: −$60/month (9% of income) │ │
│ │ │ │
│ │ ───────────────────────────────────────────────── │ │
│ │ │ │
│ │ 🛡️ WORST REASONABLE CASE │ │
│ │ Multiple issues at once (recession scenario) │ │
│ │ Estimated impact: −$80 to −$120/month │ │
│ │ You'd still have: $515-$555/month (81-87%) │ │
│ │ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
│ ───────────────────────────────────────────────────────── │
│ │
│ 💡 DIVERSIFICATION SCORE │
│ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ │ │
│ │ ┌───────────────────────┐ │ │
│ │ │ │ │ │
│ │ │ 78 │ │ │
│ │ │ /100 │ │ │
│ │ │ │ │ │
│ │ │ WELL DIVERSIFIED │ │ │
│ │ └───────────────────────┘ │ │
│ │ │ │
│ │ ✅ Multiple income sources (10) │ │
│ │ ✅ No single source > 25% │ │
│ │ ✅ Mix of growth and stability │ │
│ │ 🟡 Moderate interest rate sensitivity │ │
│ │ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────┘

````

### Calculation Logic

```typescript
function analyzeConcentrationRisk(
  investments: InvestmentIncome[]
): ConcentrationAnalysis {
  const totalIncome = sum(investments.map(i => i.monthlyAmount));

  // By individual source
  const bySource = investments.map(inv => ({
    source: inv,
    amount: inv.monthlyAmount,
    percentage: (inv.monthlyAmount / totalIncome) * 100,
  })).sort((a, b) => b.percentage - a.percentage);

  // By sector
  const bySector = groupBy(investments, 'sector');
  const sectorConcentration = Object.entries(bySector).map(([sector, sources]) => ({
    sector,
    amount: sum(sources.map(s => s.monthlyAmount)),
    percentage: (sum(sources.map(s => s.monthlyAmount)) / totalIncome) * 100,
    sources: sources.map(s => s.sourceName),
  })).sort((a, b) => b.percentage - a.percentage);

  // By income type
  const byType = groupBy(investments, 'incomeType');
  const typeConcentration = Object.entries(byType).map(([type, sources]) => ({
    type,
    amount: sum(sources.map(s => s.monthlyAmount)),
    percentage: (sum(sources.map(s => s.monthlyAmount)) / totalIncome) * 100,
  }));

  // Identify alerts
  const alerts: ConcentrationAlert[] = [];

  // Single source > 25%
  const highSourceConcentration = bySource.filter(s => s.percentage > 25);
  if (highSourceConcentration.length > 0) {
    alerts.push({
      severity: 'high',
      type: 'single_source',
      message: `${highSourceConcentration[0].source.sourceName} represents ${highSourceConcentration[0].percentage.toFixed(0)}% of income`,
      impact: highSourceConcentration[0].amount,
    });
  }

  // Sector > 40%
  const highSectorConcentration = sectorConcentration.filter(s => s.percentage > 40);
  if (highSectorConcentration.length > 0) {
    alerts.push({
      severity: 'medium',
      type: 'sector',
      message: `${highSectorConcentration[0].sector} sector represents ${highSectorConcentration[0].percentage.toFixed(0)}% of income`,
      impact: highSectorConcentration[0].amount,
    });
  }

  // Interest rate sensitivity > 30%
  const rateSensitive = investments.filter(i =>
    ['fdic_savings', 'bond_fund', 'cd', 'money_market'].includes(i.sourceType)
  );
  const rateSensitiveAmount = sum(rateSensitive.map(i => i.monthlyAmount));
  const rateSensitivePercent = (rateSensitiveAmount / totalIncome) * 100;

  if (rateSensitivePercent > 30) {
    alerts.push({
      severity: 'medium',
      type: 'rate_sensitivity',
      message: `${rateSensitivePercent.toFixed(0)}% of income is interest-rate sensitive`,
      impact: rateSensitiveAmount,
      scenario: {
        trigger: '1.5% rate drop',
        estimatedLoss: rateSensitiveAmount * 0.20,
      },
    });
  }

  // What-if scenarios
  const scenarios = generateWhatIfScenarios(investments, totalIncome);

  // Diversification score
  const diversificationScore = calculateDiversificationScore(
    bySource,
    sectorConcentration,
    typeConcentration,
    alerts
  );

  return {
    totalIncome,
    bySource,
    bySector: sectorConcentration,
    byType: typeConcentration,
    alerts,
    scenarios,
    diversificationScore,
    worstCaseRetention: scenarios.worstCase.retainedPercentage,
  };
}

function generateWhatIfScenarios(
  investments: InvestmentIncome[],
  totalIncome: number
): WhatIfScenarios {
  return {
    marketCrash: {
      name: 'Stock market drops 30%',
      description: 'Dividends typically drop 10-15%',
      affectedSources: investments.filter(i =>
        ['individual_stock', 'index_dividend_etf'].includes(i.sourceType)
      ),
      estimatedImpact: sum(investments
        .filter(i => ['individual_stock', 'index_dividend_etf'].includes(i.sourceType))
        .map(i => i.monthlyAmount * 0.12)
      ),
    },
    ratesCut: {
      name: 'Fed cuts rates 1.5%',
      description: 'Savings and bond yields decrease',
      affectedSources: investments.filter(i =>
        ['fdic_savings', 'bond_fund', 'cd'].includes(i.sourceType)
      ),
      estimatedImpact: sum(investments
        .filter(i => ['fdic_savings', 'bond_fund'].includes(i.sourceType))
        .map(i => i.monthlyAmount * 0.25)
      ),
    },
    sectorCrisis: {
      name: 'Real estate sector crisis',
      description: 'REIT dividends cut 20-50%',
      affectedSources: investments.filter(i => i.sector === 'real_estate'),
      estimatedImpact: sum(investments
        .filter(i => i.sector === 'real_estate')
        .map(i => i.monthlyAmount * 0.35)
      ),
    },
    worstCase: {
      name: 'Multiple issues (recession)',
      estimatedImpact: totalIncome * 0.15, // Rough estimate
      retainedAmount: totalIncome * 0.85,
      retainedPercentage: 85,
    },
  };
}

function calculateDiversificationScore(
  bySource: SourceConcentration[],
  bySector: SectorConcentration[],
  byType: TypeConcentration[],
  alerts: ConcentrationAlert[]
): number {
  let score = 100;

  // Deduct for source concentration
  const topSourcePercent = bySource[0]?.percentage || 0;
  if (topSourcePercent > 30) score -= 20;
  else if (topSourcePercent > 20) score -= 10;
  else if (topSourcePercent > 15) score -= 5;

  // Deduct for sector concentration
  const topSectorPercent = bySector[0]?.percentage || 0;
  if (topSectorPercent > 50) score -= 15;
  else if (topSectorPercent > 40) score -= 10;
  else if (topSectorPercent > 30) score -= 5;

  // Deduct for number of sources (fewer = less diversified)
  const sourceCount = bySource.length;
  if (sourceCount < 3) score -= 20;
  else if (sourceCount < 5) score -= 10;
  else if (sourceCount < 8) score -= 5;

  // Deduct for high-severity alerts
  const highAlerts = alerts.filter(a => a.severity === 'high').length;
  const mediumAlerts = alerts.filter(a => a.severity === 'medium').length;
  score -= highAlerts * 15;
  score -= mediumAlerts * 5;

  return Math.max(0, Math.min(100, score));
}
````

### When to Show

- Dashboard summary
- When adding new investment income
- Quarterly review
- When any single source exceeds 20% threshold

---

## Insight #7: Year-to-Date Income & Tax Projection

### Why It's Valuable

Investment income has tax implications that users often don't think about until tax season. This insight tracks **YTD income by tax category**, estimates the tax bill, and helps users avoid surprises. It also helps with estimated tax payments if required.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 2025 Investment Income Tracker                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YEAR-TO-DATE (through February 28)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Total received:             $1,420                 │   │
│  │  (January + February)                               │   │
│  │                                                     │   │
│  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │  $1,420 of projected $7,620 (19%)                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 YTD BY TAX CATEGORY                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  TAX TREATMENT          YTD        FULL YEAR (est) │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Qualified dividends    $380       $3,360          │   │
│  │  (15% tax rate)         ████████░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  Ordinary dividends     $140       $840            │   │
│  │  (22% tax rate)         ████████░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  Interest income        $420       $2,520          │   │
│  │  (22% tax rate)         ████████░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  Tax-exempt interest    $150       $900            │   │
│  │  (0% federal)           ████████░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  Capital gains          $330       Variable        │   │
│  │  (15% if long-term)     May vary based on sales    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 ESTIMATED TAX LIABILITY                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Based on YTD income + projections:                 │   │
│  │                                                     │   │
│  │  CATEGORY              INCOME     TAX (est)         │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Qualified dividends   $3,360     $504    (15%)    │   │
│  │  Ordinary dividends    $840       $185    (22%)    │   │
│  │  Interest income       $2,520     $554    (22%)    │   │
│  │  Tax-exempt            $900       $0      (0%)     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Estimated 2025 tax:              $1,243           │   │
│  │                                                     │   │
│  │  ════════════════════════════════════════════      │   │
│  │                                                     │   │
│  │  That's ~$104/month set aside for taxes            │   │
│  │  (16.3% effective rate on investment income)        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 ESTIMATED TAX PAYMENTS                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  If your investment income requires estimated       │   │
│  │  quarterly tax payments:                            │   │
│  │                                                     │   │
│  │  Q1 (Apr 15):   $311    ⏰ Coming up!              │   │
│  │  Q2 (Jun 15):   $311                                │   │
│  │  Q3 (Sep 15):   $311                                │   │
│  │  Q4 (Jan 15):   $310                                │   │
│  │                                                     │   │
│  │  💡 You may not need to pay estimated taxes if:     │   │
│  │  • Your withholding from salary covers it, OR       │   │
│  │  • Total tax owed is under $1,000                   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  📝  Talk to a tax professional              │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 MONTHLY INCOME LOG                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  MONTH      RECEIVED    vs EXPECTED    STATUS       │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  January    $485        $635          ⚠️ −$150     │   │
│  │             (Light dividend month - normal)         │   │
│  │                                                     │   │
│  │  February   $935        $635          ✅ +$300     │   │
│  │             (Extra capital gain distribution)       │   │
│  │                                                     │   │
│  │  March      —           $635          Upcoming      │   │
│  │             (Dividend month expected)               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 TAX PLANNING TIP                                        │
│                                                             │
│  You have $2,520 in taxable interest this year.             │
│  Consider moving some savings to:                           │
│                                                             │
│  • I-Bonds (state tax exempt)                               │
│  • Municipal bond fund (federal + state tax exempt)         │
│  • Tax-advantaged accounts (IRA/401k)                       │
│                                                             │
│  Potential tax savings: ~$150-200/year                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateYTDTaxProjection(
  investments: InvestmentIncome[],
  incomeHistory: IncomeHistoryRecord[],
  userTaxProfile: TaxProfile,
  currentDate: Date
): YTDTaxAnalysis {
  const yearStart = startOfYear(currentDate);

  // Get YTD income by category
  const ytdByCategory = {
    qualifiedDividends: 0,
    ordinaryDividends: 0,
    interest: 0,
    taxExempt: 0,
    capitalGains: 0,
  };

  // Sum up historical income for current year
  incomeHistory
    .filter((record) =>
      isWithinInterval(record.date, { start: yearStart, end: currentDate })
    )
    .forEach((record) => {
      switch (record.taxTreatment) {
        case 'qualified_dividend':
          ytdByCategory.qualifiedDividends += record.amount;
          break;
        case 'ordinary_dividend':
          ytdByCategory.ordinaryDividends += record.amount;
          break;
        case 'interest':
          ytdByCategory.interest += record.amount;
          break;
        case 'tax_exempt':
          ytdByCategory.taxExempt += record.amount;
          break;
        case 'capital_gains':
          ytdByCategory.capitalGains += record.amount;
          break;
      }
    });

  const ytdTotal = Object.values(ytdByCategory).reduce((a, b) => a + b, 0);

  // Project full year
  const monthsElapsed = differenceInMonths(currentDate, yearStart) + 1;
  const projectionMultiplier = 12 / monthsElapsed;

  const projectedByCategory = {
    qualifiedDividends: ytdByCategory.qualifiedDividends * projectionMultiplier,
    ordinaryDividends: ytdByCategory.ordinaryDividends * projectionMultiplier,
    interest: ytdByCategory.interest * projectionMultiplier,
    taxExempt: ytdByCategory.taxExempt * projectionMultiplier,
    capitalGains: ytdByCategory.capitalGains, // Don't project - too variable
  };

  // Calculate estimated taxes
  const { capitalGainsRate, marginalRate } = userTaxProfile;

  const estimatedTax = {
    qualifiedDividends:
      projectedByCategory.qualifiedDividends * capitalGainsRate,
    ordinaryDividends: projectedByCategory.ordinaryDividends * marginalRate,
    interest: projectedByCategory.interest * marginalRate,
    taxExempt: 0,
    capitalGains: projectedByCategory.capitalGains * capitalGainsRate,
  };

  const totalEstimatedTax = Object.values(estimatedTax).reduce(
    (a, b) => a + b,
    0
  );
  const projectedTotalIncome = Object.values(projectedByCategory).reduce(
    (a, b) => a + b,
    0
  );
  const effectiveRate =
    projectedTotalIncome > 0
      ? (totalEstimatedTax / projectedTotalIncome) * 100
      : 0;

  // Quarterly estimated payments
  const quarterlyPayment = totalEstimatedTax / 4;
  const estimatedPayments = [
    {
      quarter: 'Q1',
      dueDate: new Date(currentDate.getFullYear(), 3, 15),
      amount: quarterlyPayment,
    },
    {
      quarter: 'Q2',
      dueDate: new Date(currentDate.getFullYear(), 5, 15),
      amount: quarterlyPayment,
    },
    {
      quarter: 'Q3',
      dueDate: new Date(currentDate.getFullYear(), 8, 15),
      amount: quarterlyPayment,
    },
    {
      quarter: 'Q4',
      dueDate: new Date(currentDate.getFullYear() + 1, 0, 15),
      amount: quarterlyPayment,
    },
  ];

  // Monthly income log
  const monthlyLog = generateMonthlyLog(
    incomeHistory,
    investments,
    yearStart,
    currentDate
  );

  return {
    ytd: {
      byCategory: ytdByCategory,
      total: ytdTotal,
    },
    projected: {
      byCategory: projectedByCategory,
      total: projectedTotalIncome,
    },
    tax: {
      byCategory: estimatedTax,
      total: totalEstimatedTax,
      effectiveRate,
      monthlySetAside: totalEstimatedTax / 12,
    },
    estimatedPayments,
    monthlyLog,
    taxPlanningTips: generateTaxPlanningTips(
      projectedByCategory,
      userTaxProfile
    ),
  };
}
```

### When to Show

- Monthly summary
- Tax season (Q1, Q4)
- Before estimated tax payment deadlines
- Year-end review

---

## Summary: Investment Income Insights

| #   | Insight                                   | Value Provided                              | When to Show                   |
| --- | ----------------------------------------- | ------------------------------------------- | ------------------------------ |
| 1   | **Investment Income Reliability Score**   | Shows how dependable income sources are     | Dashboard, quarterly review    |
| 2   | **What You Actually Keep (Tax-Adjusted)** | Reveals true after-tax income               | Dashboard, tax season          |
| 3   | **Dividend Calendar & Cash Flow Timing**  | Maps when income arrives, identifies gaps   | Monthly planning, dashboard    |
| 4   | **Path to Financial Independence**        | Tracks progress toward expense coverage     | Dashboard, motivational        |
| 5   | **Dividend Growth Tracker**               | Monitors if income is growing vs. inflation | Quarterly, when dividends paid |
| 6   | **Concentration Risk Alert**              | Warns of over-reliance on single sources    | Dashboard, when adding sources |
| 7   | **YTD Income & Tax Projection**           | Tracks income and estimates tax liability   | Monthly, tax season            |

---

## Investment Income Insight Availability Matrix

| Data Available               | Insights Unlocked                                 |
| ---------------------------- | ------------------------------------------------- |
| Basic income sources         | Reliability Score (basic), Calendar, YTD tracking |
| + Tax treatment per source   | **Tax-Adjusted Income**, Tax Projection           |
| + Income history             | **Growth Tracker**, Trend analysis                |
| + Sector/type classification | **Concentration Risk**                            |
| + User's expenses            | **FI Progress**                                   |
| + Dividend streak data       | Enhanced Growth Tracker                           |
