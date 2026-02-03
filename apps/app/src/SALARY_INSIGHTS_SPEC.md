# Salary Income Insights

## Meaningful Insights That Provide Real Value

---

## Design Philosophy

**What makes an insight valuable?**

| ✅ Valuable Insight                          | ❌ Not Valuable                              |
| -------------------------------------------- | -------------------------------------------- |
| Actionable - user can do something with it   | Just displaying data they entered            |
| Surprising - reveals something non-obvious   | Obvious calculations ($2,000 × 12 = $24,000) |
| Timely - relevant to their current situation | Generic information                          |
| Comparative - puts numbers in context        | Numbers without context                      |
| Forward-looking - helps with planning        | Only backward-looking                        |

---

## Insight #1: Extra Paycheck Months

### Why It's Valuable

For employees paid **weekly** or **biweekly**, most months have the "standard" number of paychecks, but **2-3 months per year have an extra paycheck**. This is essentially "bonus money" that can be strategically used for savings, debt payoff, or large purchases.

Most people don't realize this or plan for it.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎁 Extra Paycheck Months                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Since you're paid biweekly, you'll receive                 │
│  3 paychecks in 2 months this year:                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   💰 May 2025         3 paychecks    +$2,450       │   │
│  │      (May 2, 16, 30)                               │   │
│  │                                                     │   │
│  │   💰 October 2025     3 paychecks    +$2,450       │   │
│  │      (Oct 3, 17, 31)                               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 That's $4,900 in "extra" paychecks this year           │
│     beyond your normal monthly budget.                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  IDEAS FOR YOUR EXTRA PAYCHECKS                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦  Send to savings              $4,900/year       │   │
│  │  💳  Pay down credit card         Saves ~$X interest│   │
│  │  🎯  Build emergency fund         +2 months runway  │   │
│  │  🏠  Extra mortgage payment       Saves ~$X interest│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Remind me before May 2025                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function getExtraPaycheckMonths(
  frequency: 'weekly' | 'biweekly',
  firstPayDate: Date,
  year: number
): ExtraPaycheckMonth[] {
  // Weekly: 4 months will have 5 paychecks (52 weeks ÷ 12 ≈ 4.33)
  // Biweekly: 2 months will have 3 paychecks (26 pays ÷ 12 ≈ 2.17)

  const payDates = generatePayDatesForYear(firstPayDate, frequency, year);
  const monthCounts = groupByMonth(payDates);

  const normalCount = frequency === 'weekly' ? 4 : 2;

  return monthCounts
    .filter((m) => m.count > normalCount)
    .map((m) => ({
      month: m.month,
      paycheckCount: m.count,
      extraAmount: payAmount, // One extra paycheck
      dates: m.dates,
    }));
}
```

### When to Show

- Only for weekly or biweekly pay frequencies
- Show at start of year or when income is added
- Remind user 2 weeks before extra paycheck month

---

## Insight #2: Paycheck-to-Bills Alignment

### Why It's Valuable

Many people experience **cash flow crunches** not because they don't earn enough, but because their **bills cluster around dates that don't align with their paychecks**. This insight identifies timing mismatches that cause stress and potential overdrafts.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 Paycheck & Bills Alignment                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR PAY SCHEDULE                                          │
│  Paid every other Friday (~1st and 15th)                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  FEBRUARY 2025                                              │
│                                                             │
│    Paycheck        Bills Due           Running Balance      │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    Feb 1  ─────────────────────────────────────────────    │
│            Rent             $1,500      -$1,500             │
│            Car insurance    $150        -$1,650             │
│                                                             │
│    Feb 7  +$2,450 ─────────────────────  +$800 ✅          │
│                                                             │
│    Feb 10 ─────────────────────────────────────────────    │
│            Car payment      $400        +$400               │
│            Utilities        $120        +$280               │
│                                                             │
│    Feb 15 ─────────────────────────────────────────────    │
│            Credit card      $500        -$220  ⚠️          │
│                                                             │
│    Feb 21 +$2,450 ─────────────────────  +$2,230 ✅        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️  TIMING ISSUE DETECTED                                  │
│                                                             │
│  Between Feb 10-21, you have bills totaling $500 but        │
│  won't receive a paycheck until Feb 21.                     │
│                                                             │
│  You may need $220 buffer to avoid overdraft.               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 SUGGESTIONS                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Move credit card due date to after the 21st    │   │
│  │      (Most cards allow you to change due date)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦  Keep $500 buffer in checking                   │   │
│  │      for this recurring gap                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function analyzePaycheckBillsAlignment(
  paycheckSchedule: PaySchedule,
  bills: Bill[],
  month: Date
): AlignmentAnalysis {
  const timeline = buildMonthTimeline(paycheckSchedule, bills, month);

  let runningBalance = 0; // Assuming starting from zero
  let lowestPoint = 0;
  let gapPeriods: GapPeriod[] = [];

  for (const event of timeline) {
    if (event.type === 'paycheck') {
      runningBalance += event.amount;
    } else {
      runningBalance -= event.amount;
    }

    if (runningBalance < lowestPoint) {
      lowestPoint = runningBalance;
    }

    if (runningBalance < 0) {
      gapPeriods.push({
        startDate: event.date,
        deficit: Math.abs(runningBalance),
        nextPaycheck: findNextPaycheck(timeline, event.date),
      });
    }
  }

  return {
    timeline,
    lowestPoint,
    gapPeriods,
    suggestedBuffer: Math.abs(lowestPoint) + 100, // Add padding
    billsToConsiderMoving: identifyMovableBills(gapPeriods, bills),
  };
}
```

### When to Show

- Monthly, before the month starts
- When user adds new recurring bills
- When timing issues are detected

---

## Insight #3: Income Dependency Risk

### Why It's Valuable

If a single salary represents 100% of household income, that's a **significant financial risk**. This insight helps users understand their vulnerability and encourages diversification or emergency planning.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚖️ Income Concentration                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR INCOME SOURCES                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   ████████████████████████████████████  92%        │   │
│  │   Your salary at Acme Corp                          │   │
│  │   $5,300/month                                      │   │
│  │                                                     │   │
│  │   ███  8%                                          │   │
│  │   Dividend income                                   │   │
│  │   $450/month                                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️  HIGH CONCENTRATION ALERT                               │
│                                                             │
│  92% of your income comes from a single source.             │
│                                                             │
│  If this income stopped unexpectedly:                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📉 Monthly income would drop to:     $450          │   │
│  │                                                     │   │
│  │  📊 Your fixed expenses are:          $3,200        │   │
│  │                                                     │   │
│  │  ⏱️ Gap to cover each month:          $2,750        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 RECOMMENDATIONS                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏦  Emergency fund target: $16,500                 │   │
│  │      (6 months of the $2,750 gap)                   │   │
│  │                                                     │   │
│  │      Current emergency fund: $8,000                 │   │
│  │      Progress: ████████░░░░░░░  48%                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Consider: Building additional income streams could         │
│  reduce your dependency on a single employer.               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateIncomeDependency(
  incomes: Income[],
  expenses: Expense[]
): DependencyAnalysis {
  const totalMonthlyIncome = sum(incomes.map((i) => i.monthlyAmount));

  const incomeBreakdown = incomes.map((income) => ({
    income,
    percentage: (income.monthlyAmount / totalMonthlyIncome) * 100,
    isHighRisk: income.incomeType === 'salary', // Single employer
  }));

  const primaryIncome = incomeBreakdown
    .filter((i) => i.isHighRisk)
    .sort((a, b) => b.percentage - a.percentage)[0];

  const fixedExpenses = sum(
    expenses.filter((e) => e.isFixed).map((e) => e.amount)
  );

  const incomeWithoutPrimary =
    totalMonthlyIncome - primaryIncome.income.monthlyAmount;
  const monthlyGap = Math.max(0, fixedExpenses - incomeWithoutPrimary);

  return {
    incomeBreakdown,
    primaryIncomePercentage: primaryIncome.percentage,
    isHighConcentration: primaryIncome.percentage > 80,
    monthlyGapIfLost: monthlyGap,
    recommendedEmergencyFund: monthlyGap * 6, // 6 months
    currentEmergencyFund: getUserEmergencyFund(),
    emergencyFundProgress: currentFund / recommended,
  };
}
```

### When to Show

- When single income source exceeds 80% of total
- On financial health dashboard
- When user asks about emergency fund targets

---

## Insight #4: Real Hourly Rate

### Why It's Valuable

Salaried employees often don't think about their **actual hourly rate** when factoring in overtime, commute time, and work-related expenses. This insight reveals what they're _really_ earning per hour of their life dedicated to work.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ Your Real Hourly Rate                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ON PAPER                                                   │
│                                                             │
│  Annual salary:               $65,000                       │
│  Standard hours:              2,080/year (40 hrs × 52 wks)  │
│  Nominal hourly rate:         $31.25/hour                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  IN REALITY                                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  TIME SPENT                                         │   │
│  │                                                     │   │
│  │  Work hours/week:           45 hrs (you reported)   │   │
│  │  Commute time/week:         5 hrs (you reported)    │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total work-related time:   50 hrs/week             │   │
│  │  Annual hours:              2,600 hrs               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  WORK-RELATED COSTS                                 │   │
│  │                                                     │   │
│  │  Commuting (gas, transit):  $200/month  ($2,400/yr) │   │
│  │  Work clothes/dry cleaning: $50/month   ($600/yr)   │   │
│  │  Lunches out:               $150/month  ($1,800/yr) │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total work costs:          $4,800/year             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR REAL HOURLY RATE                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Net income after work costs: $60,200               │   │
│  │  Total hours dedicated:       2,600                 │   │
│  │                                                     │   │
│  │  ═══════════════════════════════════════════════   │   │
│  │                                                     │   │
│  │  REAL HOURLY RATE:            $23.15/hour          │   │
│  │                                                     │   │
│  │  vs. nominal rate:            $31.25/hour          │   │
│  │                                                     │   │
│  │  Difference:                  -26% lower           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 WHAT THIS MEANS                                         │
│                                                             │
│  When you're considering a purchase that costs $100,        │
│  it actually costs you 4.3 hours of your life              │
│  (not 3.2 hours as your nominal rate suggests).            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✏️  Update my work hours and costs                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Needed (Optional Questions)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ Calculate Your Real Hourly Rate                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Help us calculate what you really earn per hour.           │
│                                                             │
│  How many hours do you actually work per week?              │
│  (Including overtime, checking emails at home, etc.)        │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 45                             │  hours/week  │
│             └────────────────────────────────┘              │
│                                                             │
│  How long is your total daily commute?                      │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 60                             │  minutes     │
│             └────────────────────────────────┘              │
│                                                             │
│  What do you spend monthly on work-related costs?           │
│  (Commuting, parking, work clothes, lunches, etc.)          │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 400                            │  /month      │
│             └────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateRealHourlyRate(
  annualSalary: number,
  actualHoursPerWeek: number,
  commuteMinutesPerDay: number,
  monthlyWorkCosts: number
): RealHourlyRateAnalysis {
  // Nominal calculation
  const standardHours = 2080; // 40 hrs × 52 weeks
  const nominalHourlyRate = annualSalary / standardHours;

  // Real calculation
  const workDaysPerWeek = 5;
  const weeksPerYear = 52;

  const commuteHoursPerWeek = (commuteMinutesPerDay * workDaysPerWeek) / 60;
  const totalHoursPerWeek = actualHoursPerWeek + commuteHoursPerWeek;
  const totalHoursPerYear = totalHoursPerWeek * weeksPerYear;

  const annualWorkCosts = monthlyWorkCosts * 12;
  const netIncome = annualSalary - annualWorkCosts;

  const realHourlyRate = netIncome / totalHoursPerYear;

  const percentageDifference =
    ((realHourlyRate - nominalHourlyRate) / nominalHourlyRate) * 100;

  return {
    nominalHourlyRate,
    realHourlyRate,
    percentageDifference,
    totalHoursPerYear,
    netIncomeAfterWorkCosts: netIncome,
    hoursPerHundredDollars: 100 / realHourlyRate,
  };
}
```

### When to Show

- As an optional "deep dive" insight
- When user shows interest in work-life balance
- Useful for job change comparisons

---

## Insight #5: Raise Impact Calculator

### Why It's Valuable

When people think about raises, they often think in percentages or annual terms. This insight shows the **tangible monthly and daily impact** of a raise, making it feel more real and helping with negotiation decisions.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Raise Impact Calculator                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR CURRENT SALARY                                        │
│                                                             │
│  Annual:     $65,000                                        │
│  Monthly:    $5,417 (gross)                                 │
│  Take-home:  $4,250/month                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WHAT WOULD A RAISE MEAN?                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Raise amount:    [ 5 ]%     or    $[_____]/year   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WITH A 5% RAISE                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                    BEFORE      AFTER      CHANGE    │   │
│  │  ───────────────────────────────────────────────   │   │
│  │  Annual (gross)    $65,000    $68,250    +$3,250   │   │
│  │  Monthly (gross)   $5,417     $5,688     +$271     │   │
│  │  Monthly (net)*    $4,250     $4,450     +$200     │   │
│  │  Per paycheck*     $2,125     $2,225     +$100     │   │
│  │                                                     │   │
│  │  * Estimated after taxes                           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 WHAT +$200/MONTH COULD DO                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏦 Invested (7% return):    $54,800 in 15 years   │   │
│  │  💳 Toward debt:             Pay off $2,400/year   │   │
│  │  🏠 Extra mortgage payment:  Save $XX in interest  │   │
│  │  🎯 Emergency fund:          Fully funded in X mo  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🤔 NEGOTIATION CONTEXT                                     │
│                                                             │
│  A 5% raise is $3,250/year.                                 │
│  That's $12.50/day you'd be leaving on the table           │
│  if you don't ask.                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  I got a raise! Update my salary               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateRaiseImpact(
  currentAnnualSalary: number,
  currentTakeHome: number,
  raisePercentage: number
): RaiseImpactAnalysis {
  const raiseAmount = currentAnnualSalary * (raisePercentage / 100);
  const newAnnualSalary = currentAnnualSalary + raiseAmount;

  // Estimate tax impact (simplified - higher income, slightly higher tax)
  const currentTaxRate = 1 - (currentTakeHome * 12) / currentAnnualSalary;
  const estimatedNewTaxRate = currentTaxRate + raisePercentage * 0.001; // Slight increase

  const newAnnualTakeHome = newAnnualSalary * (1 - estimatedNewTaxRate);
  const monthlyTakeHomeIncrease = newAnnualTakeHome / 12 - currentTakeHome;

  // Future value calculations
  const investedValue15Years = calculateFutureValue(
    monthlyTakeHomeIncrease,
    0.07, // 7% annual return
    15 * 12 // 15 years in months
  );

  return {
    raiseAmount,
    newAnnualSalary,
    monthlyGrossIncrease: raiseAmount / 12,
    monthlyNetIncrease: monthlyTakeHomeIncrease,
    perPaycheckIncrease: monthlyTakeHomeIncrease / 2, // Assuming biweekly
    dailyValue: raiseAmount / 365,
    investedValue15Years,
    annualDebtPayoff: monthlyTakeHomeIncrease * 12,
  };
}
```

### When to Show

- When user expresses interest in raises
- Around common review periods (January, anniversary)
- As a planning tool

---

## Insight #6: Job Loss Runway

### Why It's Valuable

Nobody likes to think about losing their job, but **understanding how long you could survive** without income is critical for financial security. This insight calculates actual runway based on savings and expenses, not just vague "3-6 months" advice.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🛡️ Your Financial Runway                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  If your income from "Acme Corp" stopped today,             │
│  how long could you maintain your lifestyle?                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR CURRENT SITUATION                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💰 Available savings:           $12,500            │   │
│  │     (Checking + Savings - reserved)                 │   │
│  │                                                     │   │
│  │  📊 Monthly essential expenses:  $3,200             │   │
│  │     (Housing, utilities, food, insurance, debt)     │   │
│  │                                                     │   │
│  │  📊 Other income (if any):       $450/month         │   │
│  │     (Dividends)                                     │   │
│  │                                                     │   │
│  │  📊 Monthly gap to cover:        $2,750             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⏱️ YOUR RUNWAY                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   $12,500  ÷  $2,750/month  =                      │   │
│  │                                                     │   │
│  │   ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░     │   │
│  │                                                     │   │
│  │   4.5 months runway                                │   │
│  │                                                     │   │
│  │   ⚠️  Below recommended 6-month minimum            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 RUNWAY OVER TIME                                        │
│                                                             │
│  If you lost income today:                                  │
│                                                             │
│  Month 1:  $12,500 → $9,750 remaining                      │
│  Month 2:  $9,750 → $7,000 remaining                       │
│  Month 3:  $7,000 → $4,250 remaining                       │
│  Month 4:  $4,250 → $1,500 remaining  ⚠️ Critical          │
│  Month 5:  Would need additional funds                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 TO REACH 6 MONTHS RUNWAY                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Target:      $16,500 (6 × $2,750)                  │   │
│  │  Current:     $12,500                               │   │
│  │  Gap:         $4,000                                │   │
│  │                                                     │   │
│  │  At $400/month savings: 10 months to goal          │   │
│  │  At $600/month savings: 7 months to goal           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📉 COULD YOU CUT EXPENSES IN EMERGENCY?                    │
│                                                             │
│  If you cut to bare minimum ($2,400/month):                 │
│  Runway extends to: 6.4 months ✅                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  Review which expenses I could cut              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateJobLossRunway(
  salaryIncome: SalaryIncome,
  allIncomes: Income[],
  expenses: Expense[],
  liquidSavings: number
): RunwayAnalysis {
  // Calculate what income remains if this salary stops
  const otherIncome = allIncomes
    .filter((i) => i.id !== salaryIncome.id)
    .reduce((sum, i) => sum + i.monthlyAmount, 0);

  // Calculate essential expenses (marked as essential by user, or all fixed)
  const essentialExpenses = expenses
    .filter((e) => e.isEssential || e.isFixed)
    .reduce((sum, e) => sum + e.monthlyAmount, 0);

  // Monthly gap that needs to be covered from savings
  const monthlyGap = Math.max(0, essentialExpenses - otherIncome);

  // Calculate runway
  const runwayMonths = monthlyGap > 0 ? liquidSavings / monthlyGap : Infinity; // No gap = infinite runway

  // Calculate reduced expense scenario
  const reducedExpenses = essentialExpenses * 0.75; // Assume 25% can be cut
  const reducedGap = Math.max(0, reducedExpenses - otherIncome);
  const reducedRunway = reducedGap > 0 ? liquidSavings / reducedGap : Infinity;

  // Calculate target for 6 months
  const targetSavings = monthlyGap * 6;
  const savingsGap = Math.max(0, targetSavings - liquidSavings);

  return {
    liquidSavings,
    otherMonthlyIncome: otherIncome,
    essentialExpenses,
    monthlyGap,
    runwayMonths,
    isAdequate: runwayMonths >= 6,
    runwayTimeline: buildRunwayTimeline(liquidSavings, monthlyGap),
    targetSavings,
    savingsGap,
    reducedExpenseRunway: reducedRunway,
    monthsToTarget: (savingsNeeded: number, monthlySavings: number) =>
      savingsNeeded / monthlySavings,
  };
}
```

### When to Show

- On financial health dashboard
- When emergency fund is below target
- Periodically (quarterly) as a check-in

---

## Insight #7: Year-to-Date & Projection

### Why It's Valuable

Users often lose track of how much they've earned in the current year, which is important for **tax planning, bonus expectations, and hitting income goals**. This shows progress and projects the full year.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 2025 Salary Earnings                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YEAR-TO-DATE (through February 15)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Gross earned:           $8,125                     │   │
│  │  (5 paychecks × $1,625 gross)                       │   │
│  │                                                     │   │
│  │  Take-home received:     $6,125                     │   │
│  │  (5 paychecks × $1,225 net)                         │   │
│  │                                                     │   │
│  │  Withheld for taxes:     $1,500 (est.)              │   │
│  │  Withheld for benefits:  $500 (est.)                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  PROGRESS                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  $8,125 of $42,250 annual salary                   │   │
│  │  19% of year's income earned                        │   │
│  │                                                     │   │
│  │  📅 On track - 12.5% of year elapsed               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  FULL YEAR PROJECTION                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Remaining paychecks:    21                         │   │
│  │  Remaining gross:        $34,125                    │   │
│  │  Remaining take-home:    $25,725                    │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  2025 Total Gross:       $42,250                    │   │
│  │  2025 Total Take-home:   $31,850 (estimated)        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 KEY DATES                                               │
│                                                             │
│  May 2025:      3-paycheck month (+$1,225 extra)           │
│  October 2025:  3-paycheck month (+$1,225 extra)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateYTDAndProjection(
  salary: SalaryIncome,
  currentDate: Date
): YTDAnalysis {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

  // Calculate paychecks received this year
  const paychecksReceived = getPaychecksBetween(
    salary.paySchedule,
    yearStart,
    currentDate
  );

  const ytdGross = paychecksReceived.length * salary.grossPerPaycheck;
  const ytdNet = paychecksReceived.length * salary.netPerPaycheck;

  // Calculate remaining paychecks
  const remainingPaychecks = getPaychecksBetween(
    salary.paySchedule,
    currentDate,
    yearEnd
  );

  const remainingGross = remainingPaychecks.length * salary.grossPerPaycheck;
  const remainingNet = remainingPaychecks.length * salary.netPerPaycheck;

  // Progress calculation
  const yearProgress = dayOfYear(currentDate) / 365;
  const incomeProgress = ytdGross / salary.annualGross;
  const isOnTrack = incomeProgress >= yearProgress;

  return {
    paychecksReceived: paychecksReceived.length,
    ytdGross,
    ytdNet,
    remainingPaychecks: remainingPaychecks.length,
    remainingGross,
    remainingNet,
    projectedAnnualGross: ytdGross + remainingGross,
    projectedAnnualNet: ytdNet + remainingNet,
    yearProgress,
    incomeProgress,
    isOnTrack,
    extraPaycheckMonths: getExtraPaycheckMonths(
      salary.paySchedule,
      currentDate.getFullYear()
    ),
  };
}
```

### When to Show

- On income dashboard
- Monthly summary
- Tax planning time (Q4)

---

## Summary: Salary Income Insights

| #   | Insight                       | Value Provided                                     | When to Show                       |
| --- | ----------------------------- | -------------------------------------------------- | ---------------------------------- |
| 1   | **Extra Paycheck Months**     | Reveals hidden "bonus" money for planning          | Start of year, before bonus months |
| 2   | **Paycheck-Bills Alignment**  | Prevents overdrafts, reduces cash flow stress      | Monthly, when issues detected      |
| 3   | **Income Dependency Risk**    | Highlights vulnerability, motivates emergency fund | Dashboard, when concentration >80% |
| 4   | **Real Hourly Rate**          | Reveals true earning rate, aids decisions          | Optional deep-dive, job comparison |
| 5   | **Raise Impact Calculator**   | Makes raises tangible, aids negotiation            | Review periods, user interest      |
| 6   | **Job Loss Runway**           | Shows actual financial security                    | Dashboard, quarterly check-in      |
| 7   | **Year-to-Date & Projection** | Tracks progress, aids tax planning                 | Dashboard, monthly summary         |
