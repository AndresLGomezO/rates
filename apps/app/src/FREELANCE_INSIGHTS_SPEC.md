# Freelance/Gig Income Insights

## Meaningful Insights That Provide Real Value

---

## Design Philosophy for Freelance/Gig

**Unique challenges freelancers face:**

| Challenge                 | How Insights Can Help                           |
| ------------------------- | ----------------------------------------------- |
| Income unpredictability   | Reveal patterns, set realistic expectations     |
| No tax withholding        | Calculate and remind about tax obligations      |
| Client concentration risk | Visualize dependency, encourage diversification |
| Feast or famine cycles    | Identify patterns, plan for slow periods        |
| Underpricing services     | Show effective rate, encourage rate increases   |
| No benefits/PTO           | Calculate true cost of time off                 |
| Cash flow timing gaps     | Track invoice-to-payment lag                    |

---

## Insight #1: Income Volatility Analysis

### Why It's Valuable

Freelancers often _feel_ like their income is unpredictable, but they rarely see the **actual pattern**. This insight quantifies volatility, identifies trends, and helps set realistic expectations for budgeting.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Your Income Volatility                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LAST 12 MONTHS                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  $6k ┤                    ╭─╮                       │   │
│  │      │              ╭─╮   │ │   ╭─╮                │   │
│  │  $5k ┤        ╭─╮   │ │   │ │   │ │                │   │
│  │      │  ╭─╮   │ │   │ │   │ │   │ │   ╭─╮         │   │
│  │  $4k ┤  │ │   │ │   │ │   │ │   │ │   │ │   ╭─╮   │   │
│  │      │  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │
│  │  $3k ┤  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │
│  │      │  │ │   │ │   │ ├───┤ │   │ │   │ │   │ │   │   │
│  │  $2k ┤──┤ ├───┤ ├───┤ │   │ ├───┤ ├───┤ ├───┤ ├───│   │
│  │      │  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │
│  │  $1k ┤  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │
│  │      │  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │
│  │   $0 ┴──┴─┴───┴─┴───┴─┴───┴─┴───┴─┴───┴─┴───┴─┴───│   │
│  │      Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan   │
│  │                                                     │   │
│  │      ─── Actual    ─ ─ Average                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 YOUR NUMBERS                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Average monthly income:        $4,250              │   │
│  │                                                     │   │
│  │  Best month:                    $6,200 (Jul)        │   │
│  │  Worst month:                   $2,100 (Feb)        │   │
│  │                                                     │   │
│  │  Range:                         $4,100 spread       │   │
│  │                                                     │   │
│  │  Volatility score:              38% variation       │   │
│  │                                 (Moderate)          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 WHAT THIS MEANS FOR BUDGETING                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your income swings by ~$2,000 around average.      │   │
│  │                                                     │   │
│  │  SAFE BUDGETING APPROACH:                           │   │
│  │                                                     │   │
│  │  Budget based on:   $3,200/month                    │   │
│  │  (Your 25th percentile - the "floor")               │   │
│  │                                                     │   │
│  │  This way, 75% of months you'll have extra,         │   │
│  │  and only 25% of months you'll need to dip          │   │
│  │  into reserves.                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 TREND                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈 Your income is trending UP                      │   │
│  │                                                     │   │
│  │  First 6 months avg:    $3,800/month                │   │
│  │  Last 6 months avg:     $4,700/month                │   │
│  │                                                     │   │
│  │  Growth:                +24% 🎉                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function analyzeIncomeVolatility(
  monthlyIncomes: MonthlyIncome[] // Last 12+ months
): VolatilityAnalysis {
  const amounts = monthlyIncomes.map((m) => m.amount);

  const average = mean(amounts);
  const stdDev = standardDeviation(amounts);
  const volatilityPercent = (stdDev / average) * 100;

  const sorted = [...amounts].sort((a, b) => a - b);
  const percentile25 = sorted[Math.floor(sorted.length * 0.25)];
  const percentile75 = sorted[Math.floor(sorted.length * 0.75)];

  const bestMonth = monthlyIncomes.reduce((best, m) =>
    m.amount > best.amount ? m : best
  );
  const worstMonth = monthlyIncomes.reduce((worst, m) =>
    m.amount < worst.amount ? m : worst
  );

  // Trend analysis
  const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
  const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
  const firstHalfAvg = mean(firstHalf);
  const secondHalfAvg = mean(secondHalf);
  const trendPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  // Volatility classification
  let volatilityLevel: 'low' | 'moderate' | 'high';
  if (volatilityPercent < 20) volatilityLevel = 'low';
  else if (volatilityPercent < 40) volatilityLevel = 'moderate';
  else volatilityLevel = 'high';

  return {
    average,
    stdDev,
    volatilityPercent,
    volatilityLevel,
    bestMonth,
    worstMonth,
    range: bestMonth.amount - worstMonth.amount,
    percentile25, // Safe budgeting floor
    percentile75,
    safeBudgetAmount: percentile25,
    trend: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable',
    trendPercent,
    firstHalfAvg,
    secondHalfAvg,
  };
}
```

### When to Show

- On freelance income dashboard
- Monthly review
- When planning major expenses

---

## Insight #2: Tax Set-Aside Calculator

### Why It's Valuable

Freelancers are responsible for their own taxes, including **self-employment tax (15.3%)** plus income tax. Many freelancers are caught off guard at tax time. This insight calculates exactly how much to set aside from each payment.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏛️ Tax Set-Aside Guide                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR TAX OBLIGATION                                        │
│                                                             │
│  As a freelancer, you're responsible for:                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Self-employment tax:       15.3%                   │   │
│  │  (Social Security + Medicare - you pay both halves) │   │
│  │                                                     │   │
│  │  Estimated income tax:      ~12-22%                 │   │
│  │  (Based on your income level)                       │   │
│  │                                                     │   │
│  │  State income tax:          ~5%                     │   │
│  │  (Varies by state)                                  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  TOTAL TO SET ASIDE:        ~30%                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 THIS MONTH'S TAX SET-ASIDE                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  January freelance income:    $4,800                │   │
│  │  Business expenses:           -$400                 │   │
│  │  Net self-employment income:  $4,400                │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 Set aside for taxes:      $1,320                │   │
│  │     (30% of $4,400)                                 │   │
│  │                                                     │   │
│  │  💵 You keep (for now):       $3,080                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YEAR-TO-DATE TAX TRACKING                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  YTD freelance income:        $4,800                │   │
│  │  YTD business expenses:       $400                  │   │
│  │  YTD net income:              $4,400                │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Should have set aside:       $1,320                │   │
│  │  Actually set aside:          $1,000                │   │
│  │                                                     │   │
│  │  ⚠️ You're $320 behind on tax savings               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 QUARTERLY TAX DEADLINES                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Q1 (Jan-Mar) due:    April 15, 2025                │   │
│  │                       ~62 days away                 │   │
│  │                                                     │   │
│  │  At your current pace, you'll owe:                  │   │
│  │  Estimated Q1 tax:    ~$4,000                       │   │
│  │  Currently saved:     $1,000                        │   │
│  │  Gap:                 $3,000 ⚠️                     │   │
│  │                                                     │   │
│  │  To catch up: Save $1,500/month in Feb & Mar        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦  Set up automatic 30% transfer                  │   │
│  │      Move to tax savings each time you get paid     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Remind me before April 15                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface TaxSetAsideCalculation {
  grossIncome: number;
  businessExpenses: number;
  netIncome: number;
  selfEmploymentTax: number;
  estimatedIncomeTax: number;
  stateTax: number;
  totalTaxRate: number;
  amountToSetAside: number;
  takeHomeAfterTaxSavings: number;
}

function calculateTaxSetAside(
  grossIncome: number,
  businessExpenses: number,
  annualIncomeEstimate: number,
  state: string
): TaxSetAsideCalculation {
  const netIncome = grossIncome - businessExpenses;

  // Self-employment tax (15.3% on 92.35% of net income)
  const seTaxableAmount = netIncome * 0.9235;
  const selfEmploymentTax = seTaxableAmount * 0.153;

  // Estimated federal income tax bracket
  const federalTaxRate = estimateFederalTaxBracket(annualIncomeEstimate);

  // Deduct half of SE tax from income for income tax calculation
  const incomeForTax = netIncome - selfEmploymentTax / 2;
  const estimatedIncomeTax = incomeForTax * federalTaxRate;

  // State tax
  const stateTaxRate = getStateTaxRate(state);
  const stateTax = netIncome * stateTaxRate;

  const totalTax = selfEmploymentTax + estimatedIncomeTax + stateTax;
  const totalTaxRate = (totalTax / netIncome) * 100;

  return {
    grossIncome,
    businessExpenses,
    netIncome,
    selfEmploymentTax,
    estimatedIncomeTax,
    stateTax,
    totalTaxRate,
    amountToSetAside: totalTax,
    takeHomeAfterTaxSavings: netIncome - totalTax,
  };
}

function getQuarterlyTaxDeadlines(year: number): QuarterlyDeadline[] {
  return [
    { quarter: 'Q1', period: 'Jan-Mar', dueDate: new Date(year, 3, 15) },
    { quarter: 'Q2', period: 'Apr-May', dueDate: new Date(year, 5, 15) },
    { quarter: 'Q3', period: 'Jun-Aug', dueDate: new Date(year, 8, 15) },
    { quarter: 'Q4', period: 'Sep-Dec', dueDate: new Date(year + 1, 0, 15) },
  ];
}
```

### When to Show

- After each income entry
- Monthly summary
- 2 weeks before quarterly tax deadlines
- When tax savings are behind target

---

## Insight #3: Client/Platform Concentration Risk

### Why It's Valuable

Just like depending on a single employer is risky, depending on a single client or platform is risky for freelancers. This insight visualizes concentration and encourages **healthy diversification**.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚖️ Client Concentration Analysis                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  INCOME BY SOURCE (Last 6 months)                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ████████████████████████████████████  62%         │   │
│  │  Acme Corp (retainer client)                        │   │
│  │  $15,800                                            │   │
│  │                                                     │   │
│  │  ████████████  21%                                 │   │
│  │  Upwork projects                                    │   │
│  │  $5,400                                             │   │
│  │                                                     │   │
│  │  ██████  10%                                       │   │
│  │  Smith & Co (project)                               │   │
│  │  $2,600                                             │   │
│  │                                                     │   │
│  │  ███  7%                                           │   │
│  │  Direct clients (misc)                              │   │
│  │  $1,700                                             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️  HIGH CONCENTRATION WARNING                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  62% of your income comes from Acme Corp.           │   │
│  │                                                     │   │
│  │  If they ended the contract tomorrow:               │   │
│  │                                                     │   │
│  │  Current monthly income:     $4,250                 │   │
│  │  Without Acme Corp:          $1,600                 │   │
│  │  Income drop:                -62% 😰                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 CONCENTRATION SCORE                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your score:  HIGH RISK                             │   │
│  │                                                     │   │
│  │  ██████████████████░░░░░░░░░░░░  62%               │   │
│  │  ◀─ Diversified    │    Concentrated ─▶            │   │
│  │                                                     │   │
│  │  Target: No single client > 30% of income          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 DIVERSIFICATION STRATEGIES                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  To reduce Acme Corp to 30% of income:              │   │
│  │                                                     │   │
│  │  You'd need:  ~$8,800/month total                   │   │
│  │  Currently:   $4,250/month                          │   │
│  │  More needed: $4,550/month from other sources       │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  OR keep income the same but reduce Acme:           │   │
│  │                                                     │   │
│  │  Reduce Acme to: $1,275/month (30%)                 │   │
│  │  Replace with:   $1,360/month from other clients    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 ACTION ITEM                                             │
│                                                             │
│  Could you take on 1-2 more small clients this quarter?     │
│  Even $500-1,000/month from new sources would improve       │
│  your risk profile significantly.                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ➕  Add a new client/income source                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface ConcentrationAnalysis {
  sources: IncomeSource[];
  topSource: IncomeSource;
  concentrationScore: number; // 0-100, higher = more concentrated
  riskLevel: 'low' | 'medium' | 'high';
  incomeWithoutTopSource: number;
  incomeDrop: number;
  targetToReduceConcentration: number;
}

function analyzeClientConcentration(
  incomes: FreelanceIncome[],
  periodMonths: number = 6
): ConcentrationAnalysis {
  // Group by source/client
  const bySource = groupBy(incomes, (i) => i.sourceName || 'Unknown');

  const sources: IncomeSource[] = Object.entries(bySource).map(
    ([name, items]) => {
      const total = sum(items.map((i) => i.amount));
      return { name, total, percentage: 0 }; // percentage calculated below
    }
  );

  const totalIncome = sum(sources.map((s) => s.total));
  sources.forEach((s) => {
    s.percentage = (s.total / totalIncome) * 100;
  });

  // Sort by percentage descending
  sources.sort((a, b) => b.percentage - a.percentage);

  const topSource = sources[0];

  // Herfindahl-Hirschman Index (HHI) for concentration
  // Sum of squared market shares
  const hhi = sum(sources.map((s) => Math.pow(s.percentage, 2)));
  // Normalize: 10000 = complete concentration, 0 = perfect distribution
  const concentrationScore = hhi / 100;

  // Risk levels
  let riskLevel: 'low' | 'medium' | 'high';
  if (topSource.percentage > 50) riskLevel = 'high';
  else if (topSource.percentage > 30) riskLevel = 'medium';
  else riskLevel = 'low';

  const monthlyIncome = totalIncome / periodMonths;
  const incomeWithoutTop = (totalIncome - topSource.total) / periodMonths;

  // To get top source to 30%: total needed = topSource.monthly / 0.30
  const targetTotal = topSource.total / periodMonths / 0.3;

  return {
    sources,
    topSource,
    concentrationScore,
    riskLevel,
    incomeWithoutTopSource: incomeWithoutTop,
    incomeDrop: topSource.percentage,
    targetToReduceConcentration: targetTotal,
  };
}
```

### When to Show

- Monthly/quarterly review
- When single client exceeds 40% of income
- When adding or losing a client

---

## Insight #4: Effective Hourly Rate

### Why It's Valuable

Freelancers often quote project rates or track hours loosely. This insight reveals their **true hourly rate** after accounting for unpaid time (admin, marketing, invoicing) and business expenses.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ Your True Hourly Rate                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WHAT YOU THINK YOU MAKE                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your quoted rate:           $75/hour               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WHAT YOU ACTUALLY MAKE                                     │
│                                                             │
│  Let's look at last month:                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  INCOME                                             │   │
│  │                                                     │   │
│  │  Gross income (January):     $4,800                 │   │
│  │  Business expenses:          -$450                  │   │
│  │  Net before taxes:           $4,350                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  TIME SPENT                                         │   │
│  │                                                     │   │
│  │  Billable hours:             42 hrs                 │   │
│  │  (Logged to clients)                                │   │
│  │                                                     │   │
│  │  Non-billable work hours:    ~18 hrs (estimated)    │   │
│  │  ├── Admin & invoicing:      4 hrs                  │   │
│  │  ├── Marketing/pitching:     6 hrs                  │   │
│  │  ├── Learning/upskilling:    3 hrs                  │   │
│  │  ├── Client communication:   3 hrs                  │   │
│  │  └── Other business tasks:   2 hrs                  │   │
│  │                                                     │   │
│  │  Total work hours:           60 hrs                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR RATES COMPARED                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Quoted rate:                $75.00/hour            │   │
│  │  Actual billable rate:       $114.29/hour           │   │
│  │  ($4,800 ÷ 42 billable hrs)                         │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  TRUE EFFECTIVE RATE:        $72.50/hour            │   │
│  │  ($4,350 net ÷ 60 total hrs)                        │   │
│  │                                                     │   │
│  │  After taxes (~30%):         $50.75/hour            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 INSIGHTS                                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ⏱️ Billable efficiency:     70%                    │   │
│  │     (42 billable of 60 total hours)                 │   │
│  │                                                     │   │
│  │     Industry benchmark: 60-70%                      │   │
│  │     You're: At the high end ✅                      │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 Expense ratio:           9.4%                   │   │
│  │     ($450 of $4,800 gross)                          │   │
│  │                                                     │   │
│  │     This is reasonable for your work type.          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 TO INCREASE YOUR EFFECTIVE RATE                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Option 1: Raise your rates by 10%                  │   │
│  │  New effective rate: $79.75/hour (+10%)             │   │
│  │                                                     │   │
│  │  Option 2: Reduce non-billable time by 5 hrs        │   │
│  │  New effective rate: $79.09/hour (+9%)              │   │
│  │                                                     │   │
│  │  Option 3: Reduce expenses by $150/month            │   │
│  │  New effective rate: $75.00/hour (+3%)              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Collection (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ Track Your True Hourly Rate                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Last month, approximately how many hours did you spend on: │
│                                                             │
│  Billable client work:                                      │
│  ┌────────────────────────────────┐                        │
│  │ 42                             │  hours                  │
│  └────────────────────────────────┘                        │
│                                                             │
│  Admin, invoicing, bookkeeping:                             │
│  ┌────────────────────────────────┐                        │
│  │ 4                              │  hours                  │
│  └────────────────────────────────┘                        │
│                                                             │
│  Marketing, pitching, proposals:                            │
│  ┌────────────────────────────────┐                        │
│  │ 6                              │  hours                  │
│  └────────────────────────────────┘                        │
│                                                             │
│  Learning, skill development:                               │
│  ┌────────────────────────────────┐                        │
│  │ 3                              │  hours                  │
│  └────────────────────────────────┘                        │
│                                                             │
│  Other business-related work:                               │
│  ┌────────────────────────────────┐                        │
│  │ 5                              │  hours                  │
│  └────────────────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateEffectiveHourlyRate(
  grossIncome: number,
  businessExpenses: number,
  billableHours: number,
  nonBillableHours: number,
  taxRate: number = 0.3
): EffectiveRateAnalysis {
  const netBeforeTax = grossIncome - businessExpenses;
  const totalHours = billableHours + nonBillableHours;

  const quotedRate = grossIncome / billableHours;
  const effectiveRate = netBeforeTax / totalHours;
  const afterTaxRate = effectiveRate * (1 - taxRate);

  const billableEfficiency = (billableHours / totalHours) * 100;
  const expenseRatio = (businessExpenses / grossIncome) * 100;

  // Improvement scenarios
  const rateIncreaseImpact = (percentage: number) => {
    const newGross = grossIncome * (1 + percentage / 100);
    const newNet = newGross - businessExpenses;
    return newNet / totalHours;
  };

  const reducedNonBillableImpact = (hoursReduced: number) => {
    const newTotal = totalHours - hoursReduced;
    return netBeforeTax / newTotal;
  };

  const reducedExpenseImpact = (expenseReduction: number) => {
    const newNet = netBeforeTax + expenseReduction;
    return newNet / totalHours;
  };

  return {
    grossIncome,
    netBeforeTax,
    billableHours,
    nonBillableHours,
    totalHours,
    quotedRate,
    actualBillableRate: grossIncome / billableHours,
    effectiveRate,
    afterTaxRate,
    billableEfficiency,
    expenseRatio,
    improvements: {
      rateIncrease10: rateIncreaseImpact(10),
      reducedNonBillable5hrs: reducedNonBillableImpact(5),
      reducedExpenses150: reducedExpenseImpact(150),
    },
  };
}
```

### When to Show

- Monthly review
- When setting rates for new projects
- Quarterly deep-dive

---

## Insight #5: Seasonal Income Patterns

### Why It's Valuable

Many freelancers experience **predictable seasonal patterns** but don't recognize them. Identifying these patterns helps plan for slow periods and capitalize on busy seasons.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 Your Seasonal Income Patterns                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  INCOME BY MONTH (2-Year Average)                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │       Jan  Feb  Mar  Apr  May  Jun                  │   │
│  │  $6k │      ░░░  ███  ███                           │   │
│  │  $5k │      ░░░  ███  ███  ███       ███            │   │
│  │  $4k │ ███  ░░░  ███  ███  ███  ███  ███       ░░░  │   │
│  │  $3k │ ███  ░░░  ███  ███  ███  ███  ███  ███  ░░░  │   │
│  │  $2k │ ███  ░░░  ███  ███  ███  ███  ███  ███  ░░░  │   │
│  │  $1k │ ███  ░░░  ███  ███  ███  ███  ███  ███  ░░░  │   │
│  │   $0 └──────────────────────────────────────────────│   │
│  │                                                     │   │
│  │       Jul  Aug  Sep  Oct  Nov  Dec                  │   │
│  │  $6k │                ███  ███                      │   │
│  │  $5k │      ███       ███  ███                      │   │
│  │  $4k │ ███  ███       ███  ███  ░░░                │   │
│  │  $3k │ ███  ███  ███  ███  ███  ░░░  ░░░            │   │
│  │  $2k │ ███  ███  ███  ███  ███  ░░░  ░░░            │   │
│  │  $1k │ ███  ███  ███  ███  ███  ░░░  ░░░            │   │
│  │   $0 └──────────────────────────────────────────────│   │
│  │                                                     │   │
│  │       ███ Above avg   ░░░ Below avg   ─── Average   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 PATTERN DETECTED                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔥 STRONG MONTHS (>20% above average)              │   │
│  │     October, November, March, April                 │   │
│  │     Average: $5,400/month                           │   │
│  │                                                     │   │
│  │  ✅ NORMAL MONTHS (within 20% of average)           │   │
│  │     May, June, July, August, January                │   │
│  │     Average: $4,100/month                           │   │
│  │                                                     │   │
│  │  ❄️ SLOW MONTHS (>20% below average)                │   │
│  │     February, December, September                   │   │
│  │     Average: $2,800/month                           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 INSIGHTS FOR YOUR BUSINESS                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📉 Your February dip (-35%)                        │   │
│  │     Many clients may have budget hangovers from     │   │
│  │     Q4. Consider offering Q1 planning services      │   │
│  │     or running a February promotion.                │   │
│  │                                                     │   │
│  │  📈 Your Oct-Nov surge (+28%)                       │   │
│  │     Likely year-end budget spending. Be ready       │   │
│  │     to take on extra projects - consider raising    │   │
│  │     rates for Q4 rush work.                         │   │
│  │                                                     │   │
│  │  📉 Your December dip (-30%)                        │   │
│  │     Holiday slowdown is normal. Perfect time for    │   │
│  │     your own projects, learning, or vacation.       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 PLANNING RECOMMENDATIONS                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  During strong months (Oct-Nov, Mar-Apr):           │   │
│  │  • Save extra to cover slow months                  │   │
│  │  • Set aside: $1,300/month extra                    │   │
│  │    (Difference between strong and slow)             │   │
│  │                                                     │   │
│  │  This builds a $5,200 buffer for slow seasons       │   │
│  │  over your 4 strong months.                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 UPCOMING                                                │
│                                                             │
│  ⚠️ February is typically a slow month for you.            │
│     Based on your pattern, expect ~$2,800.                 │
│     Make sure you have reserves to cover the gap.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface SeasonalPattern {
  month: number; // 1-12
  averageIncome: number;
  percentFromOverallAverage: number;
  category: 'strong' | 'normal' | 'slow';
  sampleSize: number; // How many data points
}

function analyzeSeasonalPatterns(
  monthlyIncomes: MonthlyIncome[] // 12+ months of data
): SeasonalAnalysis {
  // Group by month
  const byMonth = groupBy(monthlyIncomes, (m) => m.date.getMonth() + 1);

  const monthlyAverages: SeasonalPattern[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthData = byMonth[month] || [];
    if (monthData.length > 0) {
      const avg = mean(monthData.map((m) => m.amount));
      monthlyAverages.push({
        month,
        averageIncome: avg,
        percentFromOverallAverage: 0, // Calculated below
        category: 'normal',
        sampleSize: monthData.length,
      });
    }
  }

  const overallAverage = mean(monthlyAverages.map((m) => m.averageIncome));

  // Calculate percent from average and categorize
  monthlyAverages.forEach((m) => {
    m.percentFromOverallAverage =
      ((m.averageIncome - overallAverage) / overallAverage) * 100;

    if (m.percentFromOverallAverage > 20) m.category = 'strong';
    else if (m.percentFromOverallAverage < -20) m.category = 'slow';
    else m.category = 'normal';
  });

  const strongMonths = monthlyAverages.filter((m) => m.category === 'strong');
  const slowMonths = monthlyAverages.filter((m) => m.category === 'slow');

  // Calculate recommended savings during strong months
  const strongAvg = mean(strongMonths.map((m) => m.averageIncome));
  const slowAvg = mean(slowMonths.map((m) => m.averageIncome));
  const recommendedExtraSavings = strongAvg - slowAvg;

  return {
    overallAverage,
    monthlyPatterns: monthlyAverages,
    strongMonths: strongMonths.map((m) => m.month),
    slowMonths: slowMonths.map((m) => m.month),
    strongMonthsAverage: strongAvg,
    slowMonthsAverage: slowAvg,
    seasonalSwing: strongAvg - slowAvg,
    recommendedMonthlySavings: recommendedExtraSavings,
    hasSignificantPattern: (strongAvg - slowAvg) / overallAverage > 0.3,
  };
}
```

### When to Show

- After 12+ months of data
- Before historically slow months (2 weeks warning)
- During planning/goal setting

---

## Insight #6: Income Stability Score

### Why It's Valuable

Combines multiple factors into a **single score** that reflects overall freelance income health. Helps freelancers understand their financial stability at a glance and identify areas for improvement.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Your Freelance Income Health Score                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │                    72                               │   │
│  │                   ────                              │   │
│  │                  / 100                              │   │
│  │                                                     │   │
│  │            ████████████████░░░░░░                  │   │
│  │                                                     │   │
│  │                  GOOD                               │   │
│  │           (Up from 65 last quarter)                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  SCORE BREAKDOWN                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  FACTOR                    SCORE    STATUS          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📈 Income Trend           18/20    ✅ Strong       │   │
│  │     +24% over 6 months                              │   │
│  │                                                     │   │
│  │  📊 Income Consistency     12/20    ⚠️ Moderate     │   │
│  │     38% volatility                                  │   │
│  │                                                     │   │
│  │  ⚖️ Client Diversification  8/20    ⚠️ Needs work   │   │
│  │     62% from single client                          │   │
│  │                                                     │   │
│  │  🏦 Tax Preparedness       15/20    ✅ Good         │   │
│  │     On track with set-asides                        │   │
│  │                                                     │   │
│  │  💰 Emergency Buffer       19/20    ✅ Excellent    │   │
│  │     4.5 months runway                               │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  TOTAL                     72/100                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 TOP PRIORITY TO IMPROVE SCORE                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ⚖️ Client Diversification (8/20)                   │   │
│  │                                                     │   │
│  │  62% of your income comes from one client.          │   │
│  │  This is your biggest risk factor.                  │   │
│  │                                                     │   │
│  │  🎯 Goal: Get any single client below 40%           │   │
│  │                                                     │   │
│  │  Impact: +6 points → Score would be 78              │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │  📝  See strategies to diversify              │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 SCORE HISTORY                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Q2 2024:    58  ░░░░░░░░░░░░░░░░                  │   │
│  │  Q3 2024:    65  ████████████████░░░░              │   │
│  │  Q4 2024:    72  ██████████████████████░░          │   │
│  │                                                     │   │
│  │  You've improved 14 points over 6 months! 🎉       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  SCORE RANGES                                               │
│                                                             │
│  90-100  Excellent    Highly stable freelance income        │
│  75-89   Very Good    Solid foundation with minor risks     │
│  60-74   Good         Decent stability, room for improvement│
│  40-59   Fair         Some significant risks to address     │
│  0-39    Needs Work   Income stability is a major concern   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface IncomeHealthScore {
  totalScore: number;
  maxScore: number;
  rating: 'excellent' | 'very_good' | 'good' | 'fair' | 'needs_work';
  factors: ScoreFactor[];
  topPriorityFactor: ScoreFactor;
  historicalScores: { period: string; score: number }[];
}

interface ScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs_work';
  description: string;
  improvementPotential: number;
}

function calculateIncomeHealthScore(
  incomes: FreelanceIncome[],
  expenses: Expense[],
  savings: number
): IncomeHealthScore {
  const factors: ScoreFactor[] = [];

  // 1. Income Trend (0-20 points)
  const trend = calculateTrendScore(incomes);
  factors.push({
    name: 'Income Trend',
    score: trend.score,
    maxScore: 20,
    status: trend.status,
    description: trend.description,
    improvementPotential: 20 - trend.score,
  });

  // 2. Income Consistency (0-20 points)
  const consistency = calculateConsistencyScore(incomes);
  factors.push({
    name: 'Income Consistency',
    score: consistency.score,
    maxScore: 20,
    status: consistency.status,
    description: consistency.description,
    improvementPotential: 20 - consistency.score,
  });

  // 3. Client Diversification (0-20 points)
  const diversification = calculateDiversificationScore(incomes);
  factors.push({
    name: 'Client Diversification',
    score: diversification.score,
    maxScore: 20,
    status: diversification.status,
    description: diversification.description,
    improvementPotential: 20 - diversification.score,
  });

  // 4. Tax Preparedness (0-20 points)
  const taxPrep = calculateTaxPreparednessScore(incomes);
  factors.push({
    name: 'Tax Preparedness',
    score: taxPrep.score,
    maxScore: 20,
    status: taxPrep.status,
    description: taxPrep.description,
    improvementPotential: 20 - taxPrep.score,
  });

  // 5. Emergency Buffer (0-20 points)
  const buffer = calculateBufferScore(incomes, expenses, savings);
  factors.push({
    name: 'Emergency Buffer',
    score: buffer.score,
    maxScore: 20,
    status: buffer.status,
    description: buffer.description,
    improvementPotential: 20 - buffer.score,
  });

  const totalScore = sum(factors.map((f) => f.score));
  const maxScore = sum(factors.map((f) => f.maxScore));

  // Find top priority (biggest gap with most impact)
  const topPriority = factors
    .filter((f) => f.score < f.maxScore * 0.75) // Less than 75% of max
    .sort((a, b) => b.improvementPotential - a.improvementPotential)[0];

  return {
    totalScore,
    maxScore,
    rating: getRating(totalScore),
    factors,
    topPriorityFactor: topPriority,
    historicalScores: getHistoricalScores(),
  };
}

function getRating(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'very_good';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'needs_work';
}
```

### When to Show

- Dashboard (summary view)
- Monthly/quarterly review
- When significant changes occur

---

## Insight #7: Invoice-to-Payment Lag Analysis

### Why It's Valuable

Freelancers often have **cash flow problems** not because of income issues, but because of the **delay between invoicing and receiving payment**. This insight tracks payment patterns and helps predict actual cash arrival.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💸 Payment Timing Analysis                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  HOW LONG DOES IT TAKE TO GET PAID?                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your average payment lag:     18 days              │   │
│  │  (From invoice sent to payment received)            │   │
│  │                                                     │   │
│  │  Fastest payer:                3 days (Upwork)      │   │
│  │  Slowest payer:                45 days (Acme Corp)  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  PAYMENT SPEED BY CLIENT                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  CLIENT           AVG DAYS    RELIABILITY          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Upwork           3 days      ⚡ Instant            │   │
│  │  (Platform holds escrow)                            │   │
│  │                                                     │   │
│  │  Smith & Co       12 days     ✅ Reliable           │   │
│  │  (Net 15, usually early)                            │   │
│  │                                                     │   │
│  │  Direct clients   22 days     ⚠️ Variable          │   │
│  │  (Ranges 14-35 days)                                │   │
│  │                                                     │   │
│  │  Acme Corp        45 days     🐌 Slow               │   │
│  │  (Net 30, often late)                               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 CASH FLOW IMPACT                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  You currently have:                                │   │
│  │                                                     │   │
│  │  💵 $4,200 in outstanding invoices                  │   │
│  │                                                     │   │
│  │  Expected to arrive:                                │   │
│  │                                                     │   │
│  │  This week:       $800   (Upwork project)           │   │
│  │  Next week:       $1,200 (Smith & Co)               │   │
│  │  In 2-3 weeks:    $700   (Direct clients)           │   │
│  │  In 4+ weeks:     $1,500 (Acme Corp)                │   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 CASH FLOW IMPACT                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  You currently have:                                │   │
│  │                                                     │   │
│  │  💵 $4,200 in outstanding invoices                  │   │
│  │                                                     │   │
│  │  Expected to arrive:                                │   │
│  │                                                     │   │
│  │  This week:       $800   (Upwork project)           │   │
│  │  Next week:       $1,200 (Smith & Co)               │   │
│  │  In 2-3 weeks:    $700   (Direct clients)           │   │
│  │  In 4+ weeks:     $1,500 (Acme Corp)                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ CASH FLOW WARNING                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your bills due in the next 2 weeks:    $2,800      │   │
│  │  Cash expected in the next 2 weeks:     $2,000      │   │
│  │                                                     │   │
│  │  Potential shortfall:                   $800 ⚠️     │   │
│  │                                                     │   │
│  │  However, Acme Corp's $1,500 could arrive early     │   │
│  │  if you follow up.                                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 THE "ACME CORP PROBLEM"                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Acme Corp represents 62% of your income but        │   │
│  │  takes 45 days to pay (3x your average).            │   │
│  │                                                     │   │
│  │  This means you're essentially giving them a        │   │
│  │  $2,600 interest-free loan at any given time.       │   │
│  │                                                     │   │
│  │  Annual cost of this float: ~$78                    │   │
│  │  (At 3% savings rate on $2,600)                     │   │
│  │                                                     │   │
│  │  More importantly: This creates cash flow stress    │   │
│  │  and forces you to keep larger reserves.            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 RECOMMENDATIONS                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  1️⃣ Negotiate better terms with Acme Corp           │   │
│  │     Ask for Net 15 instead of Net 30                │   │
│  │     Or: Request 50% upfront on large projects       │   │
│  │                                                     │   │
│  │  2️⃣ Invoice earlier                                 │   │
│  │     You typically invoice 3 days after work ends    │   │
│  │     Invoice same-day to reduce lag by 3 days        │   │
│  │                                                     │   │
│  │  3️⃣ Maintain a larger float                         │   │
│  │     Given your 18-day average lag, keep at least    │   │
│  │     $2,500 buffer (≈18 days of expenses)            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR PAYMENT LAG TREND                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Q2 2024:    22 days average                        │   │
│  │  Q3 2024:    20 days average                        │   │
│  │  Q4 2024:    18 days average                        │   │
│  │                                                     │   │
│  │  📈 Improving! Down 4 days over 6 months            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface PaymentLagAnalysis {
  averageLagDays: number;
  medianLagDays: number;
  fastestPayer: ClientPaymentStats;
  slowestPayer: ClientPaymentStats;
  clientBreakdown: ClientPaymentStats[];
  outstandingInvoices: OutstandingInvoice[];
  totalOutstanding: number;
  expectedCashFlow: ExpectedPayment[];
  cashFlowWarning?: CashFlowWarning;
  recommendations: string[];
}

interface ClientPaymentStats {
  clientName: string;
  averageDays: number;
  reliability: 'instant' | 'reliable' | 'variable' | 'slow';
  invoiceCount: number;
  totalPaid: number;
  currentOutstanding: number;
}

function analyzePaymentLag(
  invoices: Invoice[],
  payments: Payment[],
  upcomingBills: Bill[]
): PaymentLagAnalysis {
  // Match payments to invoices
  const paidInvoices = invoices.filter((i) => i.paidDate);

  // Calculate lag for each paid invoice
  const lags = paidInvoices.map((inv) => ({
    invoice: inv,
    lagDays: differenceInDays(inv.paidDate!, inv.sentDate),
  }));

  const averageLagDays = mean(lags.map((l) => l.lagDays));
  const medianLagDays = median(lags.map((l) => l.lagDays));

  // Group by client
  const byClient = groupBy(lags, (l) => l.invoice.clientName);

  const clientBreakdown: ClientPaymentStats[] = Object.entries(byClient)
    .map(([clientName, clientLags]) => {
      const avgDays = mean(clientLags.map((l) => l.lagDays));
      const stdDev = standardDeviation(clientLags.map((l) => l.lagDays));

      let reliability: ClientPaymentStats['reliability'];
      if (avgDays <= 5) reliability = 'instant';
      else if (avgDays <= 15 && stdDev < 5) reliability = 'reliable';
      else if (avgDays <= 30) reliability = 'variable';
      else reliability = 'slow';

      return {
        clientName,
        averageDays: avgDays,
        reliability,
        invoiceCount: clientLags.length,
        totalPaid: sum(clientLags.map((l) => l.invoice.amount)),
        currentOutstanding: getOutstandingForClient(invoices, clientName),
      };
    })
    .sort((a, b) => a.averageDays - b.averageDays);

  // Outstanding invoices with expected arrival
  const outstandingInvoices = invoices
    .filter((i) => !i.paidDate)
    .map((inv) => {
      const clientStats = clientBreakdown.find(
        (c) => c.clientName === inv.clientName
      );
      const expectedDays = clientStats?.averageDays || averageLagDays;
      const expectedDate = addDays(inv.sentDate, expectedDays);

      return {
        invoice: inv,
        daysSinceSent: differenceInDays(new Date(), inv.sentDate),
        expectedPaymentDate: expectedDate,
        isOverdue:
          differenceInDays(new Date(), inv.sentDate) > expectedDays * 1.5,
      };
    });

  // Cash flow projection
  const expectedCashFlow = projectCashFlow(outstandingInvoices);

  // Check for upcoming cash crunch
  const cashFlowWarning = checkCashFlowWarning(
    expectedCashFlow,
    upcomingBills,
    14 // Look 14 days ahead
  );

  return {
    averageLagDays,
    medianLagDays,
    fastestPayer: clientBreakdown[0],
    slowestPayer: clientBreakdown[clientBreakdown.length - 1],
    clientBreakdown,
    outstandingInvoices,
    totalOutstanding: sum(outstandingInvoices.map((o) => o.invoice.amount)),
    expectedCashFlow,
    cashFlowWarning,
    recommendations: generateLagRecommendations(
      clientBreakdown,
      averageLagDays
    ),
  };
}
```

### When to Show

- When cash flow gaps are detected
- Monthly cash flow review
- When invoices are overdue

---

## Insight #8: Rate Increase Opportunity Detector

### Why It's Valuable

Many freelancers **undercharge** because they're afraid to raise rates. This insight identifies signals that suggest it's time for a rate increase, giving users confidence to ask for more.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Rate Increase Opportunity                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 SIGNALS SUGGESTING YOU SHOULD RAISE YOUR RATES          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ✅ HIGH DEMAND                                     │   │
│  │     You've been at 95% capacity for 3 months        │   │
│  │     (Working 38+ billable hours/week)               │   │
│  │                                                     │   │
│  │  ✅ HIGH WIN RATE                                   │   │
│  │     You're winning 80% of proposals you send        │   │
│  │     (Industry avg: 30-40%)                          │   │
│  │                                                     │   │
│  │  ✅ NO RECENT INCREASE                              │   │
│  │     It's been 14 months since your last rate bump   │   │
│  │     Inflation alone: +6% since then                 │   │
│  │                                                     │   │
│  │  ✅ CLIENT RETENTION                                │   │
│  │     All 3 of your retainer clients have renewed     │   │
│  │     without negotiating down                        │   │
│  │                                                     │   │
│  │  ✅ EXPERTISE GROWTH                                │   │
│  │     You've completed 24 more projects since         │   │
│  │     your last rate increase                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 RATE INCREASE READINESS SCORE                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     ████████████████████████████░░░░░░  85%        │   │
│  │                                                     │   │
│  │     Strong indicators suggest you can               │   │
│  │     increase rates by 10-20%                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 WHAT A RATE INCREASE WOULD MEAN                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Current average rate:        $75/hour              │   │
│  │                                                     │   │
│  │  WITH 10% INCREASE ($82.50/hr):                     │   │
│  │  Additional monthly income:   +$425                 │   │
│  │  Additional annual income:    +$5,100               │   │
│  │                                                     │   │
│  │  WITH 15% INCREASE ($86.25/hr):                     │   │
│  │  Additional monthly income:   +$637                 │   │
│  │  Additional annual income:    +$7,650               │   │
│  │                                                     │   │
│  │  WITH 20% INCREASE ($90/hr):                        │   │
│  │  Additional monthly income:   +$850                 │   │
│  │  Additional annual income:    +$10,200              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 STRATEGIES FOR RAISING RATES                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  FOR NEW CLIENTS:                                   │   │
│  │  Start quoting the new rate immediately.            │   │
│  │  No explanation needed.                             │   │
│  │                                                     │   │
│  │  FOR EXISTING CLIENTS:                              │   │
│  │                                                     │   │
│  │  "As of [date], my rate will be $85/hour.           │   │
│  │  This reflects my increased experience and          │   │
│  │  the value I bring to projects like yours.          │   │
│  │  I'm happy to discuss how we can continue           │   │
│  │  working together."                                 │   │
│  │                                                     │   │
│  │  Give 30-60 days notice for retainer clients.       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ IF A CLIENT PUSHES BACK                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Based on your 80% win rate, some pushback is       │   │
│  │  actually healthy - it means you're not             │   │
│  │  underpricing.                                      │   │
│  │                                                     │   │
│  │  If you lose a client over a 15% increase,          │   │
│  │  that frees up capacity for higher-paying work.     │   │
│  │                                                     │   │
│  │  At your current utilization (95%), you could       │   │
│  │  lose 1 client and still come out ahead             │   │
│  │  with increased rates on the remaining work.        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  I raised my rate! Update it now                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰  Remind me in 2 weeks to follow up              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface RateIncreaseAnalysis {
  readinessScore: number; // 0-100
  signals: RateSignal[];
  suggestedIncreasePercent: number;
  impactAnalysis: RateIncreaseImpact;
  lastRateIncrease?: Date;
  monthsSinceIncrease: number;
}

interface RateSignal {
  name: string;
  isPositive: boolean;
  description: string;
  weight: number;
}

function analyzeRateIncreaseOpportunity(
  incomes: FreelanceIncome[],
  proposals: Proposal[],
  timeTracking: TimeEntry[],
  currentRate: number,
  lastRateIncreaseDate?: Date
): RateIncreaseAnalysis {
  const signals: RateSignal[] = [];

  // 1. Capacity utilization
  const recentWeeks = getLast12Weeks(timeTracking);
  const avgBillableHours = mean(recentWeeks.map((w) => w.billableHours));
  const utilizationRate = avgBillableHours / 40;

  signals.push({
    name: 'High Demand',
    isPositive: utilizationRate > 0.85,
    description:
      utilizationRate > 0.85
        ? `You've been at ${Math.round(utilizationRate * 100)}% capacity`
        : `Capacity is ${Math.round(utilizationRate * 100)}%, build demand first`,
    weight: 25,
  });

  // 2. Proposal win rate
  const recentProposals = getLastNMonths(proposals, 3);
  const wonProposals = recentProposals.filter((p) => p.status === 'won');
  const winRate = wonProposals.length / recentProposals.length;

  signals.push({
    name: 'High Win Rate',
    isPositive: winRate > 0.5,
    description: `You're winning ${Math.round(winRate * 100)}% of proposals`,
    weight: 20,
  });

  // 3. Time since last increase
  const monthsSinceIncrease = lastRateIncreaseDate
    ? differenceInMonths(new Date(), lastRateIncreaseDate)
    : 24; // Assume 2 years if unknown

  signals.push({
    name: 'Time Since Increase',
    isPositive: monthsSinceIncrease >= 12,
    description: `${monthsSinceIncrease} months since last rate increase`,
    weight: 20,
  });

  // 4. Client retention
  const retainerClients = getRetainerClients(incomes);
  const renewedCount = retainerClients.filter((c) => c.hasRenewed).length;
  const retentionRate = renewedCount / retainerClients.length;

  signals.push({
    name: 'Client Retention',
    isPositive: retentionRate >= 0.8,
    description: `${Math.round(retentionRate * 100)}% client retention`,
    weight: 20,
  });

  // 5. Experience growth (projects completed)
  const projectsSinceLastIncrease = countProjectsSince(
    incomes,
    lastRateIncreaseDate
  );

  signals.push({
    name: 'Expertise Growth',
    isPositive: projectsSinceLastIncrease >= 10,
    description: `${projectsSinceLastIncrease} projects completed since last increase`,
    weight: 15,
  });

  // Calculate readiness score
  const readinessScore = signals
    .filter((s) => s.isPositive)
    .reduce((sum, s) => sum + s.weight, 0);

  // Suggest increase percentage based on score
  let suggestedIncreasePercent: number;
  if (readinessScore >= 80) suggestedIncreasePercent = 20;
  else if (readinessScore >= 60) suggestedIncreasePercent = 15;
  else if (readinessScore >= 40) suggestedIncreasePercent = 10;
  else suggestedIncreasePercent = 5;

  // Calculate impact
  const monthlyBillableHours = avgBillableHours * 4.33;
  const currentMonthlyIncome = currentRate * monthlyBillableHours;

  const impactAnalysis = {
    currentRate,
    suggestedNewRate: currentRate * (1 + suggestedIncreasePercent / 100),
    additionalMonthlyIncome:
      currentMonthlyIncome * (suggestedIncreasePercent / 100),
    additionalAnnualIncome:
      currentMonthlyIncome * (suggestedIncreasePercent / 100) * 12,
  };

  return {
    readinessScore,
    signals,
    suggestedIncreasePercent,
    impactAnalysis,
    lastRateIncrease: lastRateIncreaseDate,
    monthsSinceIncrease,
  };
}
```

### When to Show

- Quarterly review
- When utilization exceeds 90% for 2+ months
- 12 months after last rate increase
- When win rate exceeds 60%

---

## Insight #9: Slow Period Early Warning

### Why It's Valuable

Freelancers often don't realize a slow period is coming until it hits. This insight uses **leading indicators** to predict upcoming income dips, giving time to take action.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ Slow Period Early Warning                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📉 WARNING: Income may dip in 4-6 weeks                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LEADING INDICATORS                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ⚠️ PIPELINE THINNING                               │   │
│  │     Active projects ending soon: 2 of 3             │   │
│  │     Projects in pipeline: Only 1 proposal out       │   │
│  │                                                     │   │
│  │  ⚠️ INQUIRY VOLUME DOWN                             │   │
│  │     Inbound inquiries (last 30 days): 2             │   │
│  │     Your 6-month average: 5/month                   │   │
│  │     Down 60%                                        │   │
│  │                                                     │   │
│  │  ⚠️ SEASONAL PATTERN                                │   │
│  │     February is historically your slowest month     │   │
│  │     (-35% vs average based on 2 years data)         │   │
│  │                                                     │   │
│  │  ✅ RETAINER STABLE                                 │   │
│  │     Your Acme Corp retainer ($2,600/mo) continues   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 INCOME PROJECTION                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Current month (Jan):       $4,800 (actual)         │   │
│  │                                                     │   │
│  │  February projection:       $3,100 ⚠️               │   │
│  │  (Retainer + estimated project work)                │   │
│  │                                                     │   │
│  │  vs. your 6-month average:  $4,250                  │   │
│  │  Expected drop:             -27%                    │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Worst case (retainer only): $2,600                 │   │
│  │  Best case (if proposals win): $4,100               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 FINANCIAL IMPACT                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your monthly expenses:          $3,200             │   │
│  │  Projected February income:      $3,100             │   │
│  │                                                     │   │
│  │  Potential shortfall:            -$100 ⚠️           │   │
│  │                                                     │   │
│  │  Your current buffer:            $8,500             │   │
│  │  You can cover 2.6 months at current expenses       │   │
│  │                                                     │   │
│  │  ✅ You're okay - but a longer slow period          │   │
│  │     would stress your reserves.                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 ACTIONS TO TAKE NOW                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  1️⃣ Boost outreach (high priority)                  │   │
│  │     Send 5 follow-ups to past clients this week     │   │
│  │     Reach out to 3 new prospects                    │   │
│  │                                                     │   │
│  │  2️⃣ Accelerate proposals                            │   │
│  │     You have 1 pending proposal - follow up today   │   │
│  │     Can you offer a quick-start discount?           │   │
│  │                                                     │   │
│  │  3️⃣ Reduce discretionary spending                   │   │
│  │     Consider pausing $200/mo in subscriptions       │   │
│  │     until pipeline improves                         │   │
│  │                                                     │   │
│  │  4️⃣ Use downtime productively                       │   │
│  │     Update portfolio, write content, take a course  │   │
│  │     These pay off when busy season returns          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋  Create outreach task list                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔕  Dismiss - I have work lined up                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
interface SlowPeriodWarning {
  isWarningActive: boolean;
  warningLevel: 'low' | 'medium' | 'high';
  indicators: SlowPeriodIndicator[];
  projectedIncome: number;
  projectedShortfall: number;
  weeksUntilImpact: number;
  recommendations: string[];
}

interface SlowPeriodIndicator {
  name: string;
  status: 'good' | 'warning' | 'critical';
  current: string;
  benchmark: string;
  description: string;
}

function predictSlowPeriod(
  currentProjects: Project[],
  pipeline: Proposal[],
  inquiries: Inquiry[],
  historicalIncomes: MonthlyIncome[],
  retainerIncome: number,
  monthlyExpenses: number,
  currentSavings: number
): SlowPeriodWarning {
  const indicators: SlowPeriodIndicator[] = [];

  // 1. Pipeline health
  const endingSoonCount = currentProjects.filter(
    (p) => differenceInWeeks(p.expectedEndDate, new Date()) <= 4
  ).length;
  const activeProposals = pipeline.filter((p) => p.status === 'pending').length;

  indicators.push({
    name: 'Pipeline Health',
    status:
      activeProposals >= 3
        ? 'good'
        : activeProposals >= 1
          ? 'warning'
          : 'critical',
    current: `${activeProposals} active proposals`,
    benchmark: '3+ proposals in pipeline',
    description: `${endingSoonCount} projects ending soon with ${activeProposals} in pipeline`,
  });

  // 2. Inquiry volume
  const recentInquiries = inquiries.filter(
    (i) => differenceInDays(new Date(), i.date) <= 30
  ).length;
  const avgInquiries = getAverageMonthlyInquiries(inquiries);
  const inquiryChange = (recentInquiries - avgInquiries) / avgInquiries;

  indicators.push({
    name: 'Inquiry Volume',
    status:
      inquiryChange >= 0
        ? 'good'
        : inquiryChange >= -0.3
          ? 'warning'
          : 'critical',
    current: `${recentInquiries} this month`,
    benchmark: `${avgInquiries}/month average`,
    description: `${inquiryChange > 0 ? 'Up' : 'Down'} ${Math.abs(Math.round(inquiryChange * 100))}%`,
  });

  // 3. Seasonal pattern
  const nextMonth = addMonths(new Date(), 1).getMonth();
  const seasonalPattern = getSeasonalPattern(historicalIncomes);
  const nextMonthPattern = seasonalPattern.find((p) => p.month === nextMonth);

  if (nextMonthPattern && nextMonthPattern.percentFromAverage < -20) {
    indicators.push({
      name: 'Seasonal Pattern',
      status: 'warning',
      current: monthNames[nextMonth],
      benchmark: 'Historical data',
      description: `${Math.abs(nextMonthPattern.percentFromAverage)}% below average historically`,
    });
  }

  // 4. Retainer stability
  indicators.push({
    name: 'Retainer Income',
    status: retainerIncome > 0 ? 'good' : 'warning',
    current: `$${retainerIncome}/month guaranteed`,
    benchmark: 'Stable recurring income',
    description:
      retainerIncome > 0 ? 'Retainer provides baseline' : 'No retainer income',
  });

  // Calculate projected income
  const projectIncome = estimateProjectIncome(currentProjects, pipeline);
  const projectedIncome = retainerIncome + projectIncome;
  const projectedShortfall = Math.max(0, monthlyExpenses - projectedIncome);

  // Determine warning level
  const criticalCount = indicators.filter(
    (i) => i.status === 'critical'
  ).length;
  const warningCount = indicators.filter((i) => i.status === 'warning').length;

  let warningLevel: 'low' | 'medium' | 'high';
  let isWarningActive = false;

  if (criticalCount >= 2 || (criticalCount >= 1 && warningCount >= 2)) {
    warningLevel = 'high';
    isWarningActive = true;
  } else if (criticalCount >= 1 || warningCount >= 2) {
    warningLevel = 'medium';
    isWarningActive = true;
  } else if (warningCount >= 1) {
    warningLevel = 'low';
    isWarningActive = projectedIncome < monthlyExpenses;
  } else {
    warningLevel = 'low';
    isWarningActive = false;
  }

  return {
    isWarningActive,
    warningLevel,
    indicators,
    projectedIncome,
    projectedShortfall,
    weeksUntilImpact: 4, // Typically 4-6 weeks lead time
    recommendations: generateSlowPeriodRecommendations(
      indicators,
      projectedShortfall
    ),
  };
}
```

### When to Show

- When warning indicators trigger
- 4-6 weeks before historically slow periods
- When pipeline thins significantly

---

## Summary: Freelance/Gig Income Insights

| #   | Insight                        | Value Provided                                             | When to Show                               |
| --- | ------------------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| 1   | **Income Volatility Analysis** | Quantifies variability, sets realistic budget expectations | Monthly, quarterly review                  |
| 2   | **Tax Set-Aside Calculator**   | Prevents tax surprises, tracks quarterly obligations       | After each payment, before tax deadlines   |
| 3   | **Client Concentration Risk**  | Visualizes dependency, encourages diversification          | Monthly, when single client >40%           |
| 4   | **Effective Hourly Rate**      | Reveals true earnings after overhead and unpaid time       | Monthly, when setting rates                |
| 5   | **Seasonal Patterns**          | Identifies predictable cycles, enables planning            | After 12+ months data, before slow periods |
| 6   | **Income Health Score**        | Single metric combining all stability factors              | Dashboard, quarterly review                |
| 7   | **Invoice-to-Payment Lag**     | Predicts cash flow timing, identifies slow payers          | Monthly, when cash flow is tight           |
| 8   | **Rate Increase Opportunity**  | Identifies when to raise rates with confidence             | Quarterly, when utilization is high        |
| 9   | **Slow Period Early Warning**  | Predicts income dips before they happen                    | When leading indicators trigger            |

---

## Key Differences: Salary vs Freelance Insights

| Aspect             | Salary Insights Focus            | Freelance Insights Focus             |
| ------------------ | -------------------------------- | ------------------------------------ |
| **Predictability** | Extra paycheck timing, alignment | Volatility analysis, patterns        |
| **Risk**           | Single employer dependency       | Client concentration                 |
| **Tax**            | Already handled by employer      | Self-managed, quarterly estimates    |
| **Cash Flow**      | Paycheck-to-bills timing         | Invoice lag, payment delays          |
| **Growth**         | Raise impact calculator          | Rate increase opportunities          |
| **Planning**       | Year-to-date tracking            | Slow period warnings                 |
| **Metrics**        | Real hourly rate                 | Effective rate + billable efficiency |
