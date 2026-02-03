# Rental Income Insights

## Meaningful Insights That Provide Real Value

---

## Design Philosophy (Applied to Rental)

| ✅ Valuable Insight                      | ❌ Not Valuable                    |
| ---------------------------------------- | ---------------------------------- |
| Shows true profitability after ALL costs | Just showing gross rent            |
| Reveals hidden costs of vacancy          | Simple "property is vacant" status |
| Compares to alternative investments      | ROI without context                |
| Alerts when expenses trend abnormally    | Just listing expense categories    |
| Shows wealth building beyond cash flow   | Only focusing on monthly cash      |

---

## Insight #1: True Cash Flow Reality

### Why It's Valuable

Many landlords think of their rental income as "I collect $2,000/month" without fully accounting for **all the costs that eat into that**. This insight reveals the **actual money that lands in their pocket** — often surprisingly lower than expected.

This is the rental equivalent of "Real Hourly Rate" for salary.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 True Cash Flow: Downtown Apartment                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WHAT YOU COLLECT                                           │
│                                                             │
│  Monthly rent:                          $2,200              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WHAT GOES OUT                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏦 Mortgage payment           $1,150               │   │
│  │     ├─ Principal               $320                 │   │
│  │     └─ Interest                $830                 │   │
│  │                                                     │   │
│  │  🏠 Property tax (monthly)     $280                 │   │
│  │  🛡️ Insurance                  $95                  │   │
│  │  🔧 Maintenance reserve        $110  (5% of rent)   │   │
│  │  🏢 HOA fee                    $150                 │   │
│  │  📋 Property management        $0    (self-managed) │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total outflows:               $1,785               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💵 WHAT YOU ACTUALLY KEEP                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   $2,200  −  $1,785  =                             │   │
│  │                                                     │   │
│  │   ════════════════════════════════════════════     │   │
│  │                                                     │   │
│  │   $415/month cash flow                             │   │
│  │                                                     │   │
│  │   That's 19% of what you collect                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR CASH FLOW BREAKDOWN                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Rent collected      ████████████████████  $2,200  │   │
│  │                                                     │   │
│  │  ├─ Mortgage int.    ████████░░░░░░░░░░░░  $830    │   │
│  │  ├─ Principal        ███░░░░░░░░░░░░░░░░░  $320    │   │
│  │  ├─ Taxes            ███░░░░░░░░░░░░░░░░░  $280    │   │
│  │  ├─ Other expenses   ████░░░░░░░░░░░░░░░░  $355    │   │
│  │  └─ You keep         ████░░░░░░░░░░░░░░░░  $415    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 BUT WAIT — YOU'RE ALSO BUILDING WEALTH                  │
│                                                             │
│  That $320/month in principal paydown is building           │
│  your equity. Your tenant is essentially buying             │
│  this property for you.                                     │
│                                                             │
│  True monthly benefit: $415 + $320 = $735                  │
│                                                             │
│  (See "Wealth Building" insight for more)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateTrueCashFlow(
  rental: RentalIncome,
  linkedMortgage?: InstallmentLoanAccount
): TrueCashFlowAnalysis {
  const grossRent = rental.grossRentalAmount;

  // Get mortgage breakdown if linked
  let mortgagePayment = 0;
  let principalPortion = 0;
  let interestPortion = 0;

  if (linkedMortgage) {
    mortgagePayment = linkedMortgage.scheduledPayment;
    // Calculate current principal/interest split from amortization
    const amortization = calculateCurrentAmortization(linkedMortgage);
    principalPortion = amortization.principal;
    interestPortion = amortization.interest;
  } else if (rental.mortgagePayment) {
    mortgagePayment = rental.mortgagePayment;
    // Estimate 70/30 interest/principal if no detailed data
    interestPortion = mortgagePayment * 0.7;
    principalPortion = mortgagePayment * 0.3;
  }

  // Operating expenses (excluding mortgage)
  const operatingExpenses = rental.monthlyExpenses || 0;

  // Total outflows
  const totalOutflows = mortgagePayment + operatingExpenses;

  // Cash flow
  const monthlyCashFlow = grossRent - totalOutflows;
  const cashFlowPercentage = (monthlyCashFlow / grossRent) * 100;

  // True benefit (including equity building)
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
  };
}
```

### When to Show

- Primary insight on rental income dashboard
- Monthly summary
- When user adds/updates rental property

---

## Insight #2: The Real Cost of Vacancy

### Why It's Valuable

When a property is vacant, landlords often only think about **lost rent**. But the real cost is much higher — **all the carrying costs continue while income stops**. This insight shows the true daily/weekly cost of vacancy and creates urgency around filling units.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🚨 Vacancy Cost: Downtown Apartment                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your property has been vacant since January 15             │
│  (Currently 18 days)                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  THE TRUE COST OF VACANCY                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  It's not just lost rent...                        │   │
│  │                                                     │   │
│  │  DAILY COST BREAKDOWN                               │   │
│  │                                                     │   │
│  │  📉 Lost rent              $73/day                  │   │
│  │  🏦 Mortgage still due     $38/day                  │   │
│  │  🏠 Property tax           $9/day                   │   │
│  │  🛡️ Insurance              $3/day                   │   │
│  │  🏢 HOA                    $5/day                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total daily cost:         $128/day                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR VACANCY SO FAR                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  18 days  ×  $128/day  =                           │   │
│  │                                                     │   │
│  │  ════════════════════════════════════════════      │   │
│  │                                                     │   │
│  │  $2,304 total cost so far                          │   │
│  │                                                     │   │
│  │  That's more than 1 month of rent.                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⏱️ VACANCY TIMELINE                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Week 1:   −$896    (you are here: −$2,304)        │   │
│  │  Week 2:   −$1,792  ████████░░░░░░░░░░░░░░░░░     │   │
│  │  Week 3:   −$2,688                                 │   │
│  │  Week 4:   −$3,584  (1 month vacancy)              │   │
│  │  Week 8:   −$7,168  (2 month vacancy)              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 PERSPECTIVE                                             │
│                                                             │
│  With positive cash flow of $415/month when occupied,       │
│  this vacancy has already wiped out 5.5 months of profit.  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Break-even point: You need 5.5 months of          │   │
│  │  occupied rental to recover this vacancy cost.      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🤔 WORTH CONSIDERING                                       │
│                                                             │
│  A $100/month rent reduction could:                         │
│  • Make your listing more competitive                       │
│  • Cost you $1,200/year in reduced rent                     │
│  • But save $3,584+ if it avoids 1 month vacancy           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Mark property as occupied                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateVacancyCost(
  rental: RentalIncome,
  vacancyStartDate: Date,
  currentDate: Date
): VacancyCostAnalysis {
  const dailyRent = rental.grossRentalAmount / 30;

  // Daily carrying costs (continue even when vacant)
  const dailyMortgage = (rental.mortgagePayment || 0) / 30;
  const dailyExpenses = (rental.monthlyExpenses || 0) / 30;
  const dailyCarryingCost = dailyMortgage + dailyExpenses;

  // Total daily cost of vacancy
  const totalDailyCost = dailyRent + dailyCarryingCost;

  // Calculate days vacant
  const daysVacant = differenceInDays(currentDate, vacancyStartDate);

  // Total cost so far
  const totalCostSoFar = daysVacant * totalDailyCost;

  // Cash flow when occupied
  const monthlyCashFlow =
    rental.grossRentalAmount -
    (rental.mortgagePayment || 0) -
    (rental.monthlyExpenses || 0);

  // Months of profit wiped out
  const monthsOfProfitLost = totalCostSoFar / monthlyCashFlow;

  // Recovery time needed
  const monthsToRecover = totalCostSoFar / monthlyCashFlow;

  // Rent reduction analysis
  const rentReductionScenario = (reduction: number) => {
    const annualCostOfReduction = reduction * 12;
    const daysOfVacancyEquivalent = annualCostOfReduction / totalDailyCost;
    return {
      annualCost: annualCostOfReduction,
      equivalentVacancyDays: daysOfVacancyEquivalent,
    };
  };

  return {
    dailyRent,
    dailyCarryingCost,
    totalDailyCost,
    daysVacant,
    totalCostSoFar,
    monthsOfProfitLost,
    monthsToRecover,
    weeklyProjection: buildWeeklyProjection(totalDailyCost, 8),
    rentReductionAnalysis: rentReductionScenario(100),
  };
}
```

### When to Show

- When property status is "vacant"
- As an alert/notification
- In monthly summary during vacancy periods

---

## Insight #3: Your Tenant is Buying Your Property

### Why It's Valuable

Many landlords focus only on **cash flow** and miss the bigger picture: **their tenant is paying down the mortgage**, building equity that belongs to the landlord. This insight reframes rental income as a **wealth-building tool**, not just a monthly check.

This is often the most surprising and motivating insight for rental property owners.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏠 Wealth Building: Downtown Apartment                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your tenant isn't just paying rent —                       │
│  they're buying this property for you.                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  THIS MONTH'S HIDDEN BENEFIT                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your mortgage payment:              $1,150         │   │
│  │                                                     │   │
│  │  ├─ 💸 Interest (cost):              $830          │   │
│  │  │                                                  │   │
│  │  └─ 🏦 Principal (equity built):     $320          │   │
│  │       ↑                                             │   │
│  │       This goes into YOUR pocket                    │   │
│  │       as increased ownership                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 YOUR COMPLETE MONTHLY BENEFIT                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💵 Cash flow (money in hand):       $415          │   │
│  │  🏦 Principal paydown (equity):      $320          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Total monthly wealth gain:          $735          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 EQUITY BUILDING OVER TIME                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  THIS YEAR (2025)                                   │   │
│  │                                                     │   │
│  │  Principal paid by tenant:           $3,950        │   │
│  │  (Jan-Dec, increasing each month)                   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  NEXT 5 YEARS                                       │   │
│  │                                                     │   │
│  │  Year 1:  $3,950   ████                            │   │
│  │  Year 2:  $4,180   █████                           │   │
│  │  Year 3:  $4,420   █████                           │   │
│  │  Year 4:  $4,680   ██████                          │   │
│  │  Year 5:  $4,950   ██████                          │   │
│  │  ───────────────────                                │   │
│  │  5-year total: $22,180 in equity                   │   │
│  │                                                     │   │
│  │  (And that's without property appreciation!)        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 YOUR EQUITY POSITION                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Property value:           $320,000 (estimated)    │   │
│  │  Remaining mortgage:       $245,000                │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Current equity:           $75,000  (23%)          │   │
│  │                                                     │   │
│  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  │  In 5 years (mortgage only):                        │   │
│  │  Equity:                   $97,180  (30%)          │   │
│  │                                                     │   │
│  │  ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 THE BIG PICTURE                                         │
│                                                             │
│  While $415/month cash flow might seem modest,              │
│  you're actually gaining $735/month in total wealth.        │
│                                                             │
│  That's $8,820/year — a 11.8% return on your $75K equity.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateWealthBuilding(
  rental: RentalIncome,
  mortgage: InstallmentLoanAccount,
  propertyValue?: number
): WealthBuildingAnalysis {
  // Get current amortization position
  const currentPayment = calculateCurrentAmortization(mortgage);
  const principal = currentPayment.principal;
  const interest = currentPayment.interest;

  // Cash flow
  const monthlyCashFlow =
    rental.grossRentalAmount -
    mortgage.scheduledPayment -
    (rental.monthlyExpenses || 0);

  // Total monthly benefit
  const totalMonthlyBenefit = monthlyCashFlow + principal;

  // Project 5 years of principal paydown
  const fiveYearProjection = projectAmortization(mortgage, 5);
  const fiveYearPrincipalPaydown = fiveYearProjection.totalPrincipal;

  // Current equity position
  const currentEquity = propertyValue
    ? propertyValue - mortgage.currentPrincipal
    : null;

  // Equity percentage
  const equityPercentage = propertyValue
    ? (currentEquity / propertyValue) * 100
    : null;

  // Return on equity
  const annualBenefit = totalMonthlyBenefit * 12;
  const returnOnEquity = currentEquity
    ? (annualBenefit / currentEquity) * 100
    : null;

  // Future equity (mortgage paydown only, no appreciation)
  const futureEquity = currentEquity
    ? currentEquity + fiveYearPrincipalPaydown
    : null;

  return {
    monthlyPrincipal: principal,
    monthlyInterest: interest,
    monthlyCashFlow,
    totalMonthlyBenefit,
    annualPrincipalPaydown: principal * 12,
    fiveYearPrincipalPaydown,
    currentEquity,
    equityPercentage,
    futureEquity,
    futureEquityPercentage: propertyValue
      ? (futureEquity / propertyValue) * 100
      : null,
    returnOnEquity,
    yearByYearProjection: fiveYearProjection.byYear,
  };
}
```

### When to Show

- On rental dashboard (primary motivational insight)
- Monthly summary
- Year-end review

---

## Insight #4: Is This Property Worth Keeping?

### Why It's Valuable

Many landlords hold onto properties out of habit without asking: **"Is my money working hard enough here?"** This insight compares the property's return to alternatives (stock market, other investments), helping users make informed decisions about keeping, selling, or leveraging equity.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Investment Performance: Downtown Apartment              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How does this property perform as an investment?           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR PROPERTY RETURNS                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Property value:           $320,000                 │   │
│  │  Your equity invested:     $75,000                  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ANNUAL RETURNS                                     │   │
│  │                                                     │   │
│  │  💵 Cash flow:             $4,980/yr    6.6%       │   │
│  │  🏦 Principal paydown:     $3,840/yr    5.1%       │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total return (no apprec): $8,820/yr    11.8%      │   │
│  │                                                     │   │
│  │  📈 If 3% appreciation:    $9,600/yr    12.8%      │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total return (w/ apprec): $18,420/yr   24.6%      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 HOW DOES THIS COMPARE?                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Your property (cash + equity)                      │   │
│  │  ████████████████████████  11.8%                   │   │
│  │                                                     │   │
│  │  Your property (with 3% appreciation)               │   │
│  │  █████████████████████████████████████████  24.6%  │   │
│  │                                                     │   │
│  │  S&P 500 historical average                         │   │
│  │  ██████████████████  10%                           │   │
│  │                                                     │   │
│  │  High-yield savings account                         │   │
│  │  █████  4.5%                                       │   │
│  │                                                     │   │
│  │  10-year Treasury bonds                             │   │
│  │  █████  4.2%                                       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🤔 ALTERNATIVE SCENARIOS                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  WHAT IF YOU SOLD?                                  │   │
│  │                                                     │   │
│  │  If you sold for $320,000:                          │   │
│  │  - Pay off mortgage:       −$245,000                │   │
│  │  - Selling costs (~6%):    −$19,200                 │   │
│  │  - Net proceeds:           $55,800                  │   │
│  │                                                     │   │
│  │  $55,800 invested at 7%:   $3,906/year             │   │
│  │  vs. current total return: $8,820/year             │   │
│  │                                                     │   │
│  │  ✅ Keeping outperforms selling by $4,914/year     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 BOTTOM LINE                                             │
│                                                             │
│  Your property is generating an 11.8% return on equity,     │
│  beating typical stock market returns.                      │
│                                                             │
│  This property appears to be a strong performer.            │
│  ✅ Worth keeping                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateInvestmentPerformance(
  rental: RentalIncome,
  mortgage: InstallmentLoanAccount | null,
  propertyValue: number,
  estimatedAppreciation: number = 0.03
): InvestmentPerformanceAnalysis {
  // Calculate equity
  const mortgageBalance = mortgage?.currentPrincipal || 0;
  const equity = propertyValue - mortgageBalance;

  // Annual cash flow
  const annualCashFlow = calculateAnnualCashFlow(rental, mortgage);

  // Annual principal paydown
  const annualPrincipalPaydown = mortgage
    ? calculateAnnualPrincipal(mortgage)
    : 0;

  // Cash-on-cash return
  const cashOnCashReturn = (annualCashFlow / equity) * 100;

  // Total return (cash + equity building)
  const totalReturnWithoutAppreciation =
    annualCashFlow + annualPrincipalPaydown;
  const totalROE = (totalReturnWithoutAppreciation / equity) * 100;

  // With appreciation
  const annualAppreciation = propertyValue * estimatedAppreciation;
  const totalReturnWithAppreciation =
    totalReturnWithoutAppreciation + annualAppreciation;
  const totalROEWithAppreciation = (totalReturnWithAppreciation / equity) * 100;

  // Sale scenario
  const sellingCosts = propertyValue * 0.06; // 6% typical
  const netProceedsFromSale = propertyValue - mortgageBalance - sellingCosts;
  const alternativeReturn = netProceedsFromSale * 0.07; // 7% stock market

  const keepVsSellDifference =
    totalReturnWithoutAppreciation - alternativeReturn;

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
      netProceeds: netProceedsFromSale,
      alternativeReturn,
      difference: keepVsSellDifference,
      recommendation: keepVsSellDifference > 0 ? 'keep' : 'consider_selling',
    },
    benchmarks: {
      sp500: 10,
      highYieldSavings: 4.5,
      treasuryBonds: 4.2,
    },
  };
}
```

### When to Show

- Quarterly review
- When property value is provided
- When user asks "should I keep this property?"
- Year-end financial review

---

## Insight #5: Expense Health Check

### Why It's Valuable

Landlords often don't know if their expenses are **normal or problematic**. This insight benchmarks their expense ratio against typical ranges and flags when maintenance costs are trending up — potentially indicating deferred maintenance issues or an aging property.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔍 Expense Health Check: Downtown Apartment                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR OPERATING EXPENSE RATIO                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Monthly rent:             $2,200                   │   │
│  │  Monthly expenses:         $635 (excl. mortgage)    │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Expense ratio:            29%                      │   │
│  │                                                     │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │  0%     20%      35%      50%      65%     80%      │   │
│  │          ▲        │        │                        │   │
│  │         You    Typical   High                       │   │
│  │                                                     │   │
│  │  ✅ Your expenses are below typical range           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 EXPENSE BREAKDOWN                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏠 Property tax          $280    44%  ████████    │   │
│  │  🏢 HOA                   $150    24%  █████       │   │
│  │  🔧 Maintenance reserve   $110    17%  ████        │   │
│  │  🛡️ Insurance             $95     15%  ███         │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total                    $635    100%             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 EXPENSE TREND (Last 12 months)                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  $800 ┤                                             │   │
│  │       │                                    ∗        │   │
│  │  $700 ┤                              ∗             │   │
│  │       │              ∗    ∗                        │   │
│  │  $600 ┤  ∗    ∗    ∗         ∗    ∗    ∗          │   │
│  │       │                                             │   │
│  │  $500 ┤                                             │   │
│  │       └──────────────────────────────────────────   │   │
│  │        J  F  M  A  M  J  J  A  S  O  N  D           │   │
│  │                                                     │   │
│  │  ⚠️ Maintenance costs spiked in Nov/Dec            │   │
│  │     ($780 avg vs. $620 earlier in year)             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 WHAT THIS MEANS                                         │
│                                                             │
│  Your overall expense ratio is healthy, but maintenance     │
│  costs have increased 26% in recent months.                 │
│                                                             │
│  This could indicate:                                       │
│  • Seasonal repairs (normal)                                │
│  • Aging systems needing attention (monitor)                │
│  • One-time fixes (should normalize)                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  Log a maintenance note                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Benchmarks Reference

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📚 TYPICAL EXPENSE RATIOS BY PROPERTY TYPE                 │
│                                                             │
│  Single-family home:         30-40%                         │
│  Condo/Townhome (with HOA):  35-45%                         │
│  Multi-family (2-4 units):   40-50%                         │
│  Apartment building:         45-55%                         │
│                                                             │
│  Note: Ratios above 50% often indicate older properties,    │
│  high-maintenance buildings, or high-tax areas.             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateExpenseHealth(
  rental: RentalIncome,
  expenseHistory: MonthlyExpense[]
): ExpenseHealthAnalysis {
  const grossRent = rental.grossRentalAmount;
  const currentExpenses = rental.monthlyExpenses || 0;

  // Expense ratio
  const expenseRatio = (currentExpenses / grossRent) * 100;

  // Determine health status
  let status: 'excellent' | 'good' | 'typical' | 'high' | 'concerning';
  if (expenseRatio < 25) status = 'excellent';
  else if (expenseRatio < 35) status = 'good';
  else if (expenseRatio < 50) status = 'typical';
  else if (expenseRatio < 65) status = 'high';
  else status = 'concerning';

  // Analyze trends if history available
  let trend = null;
  if (expenseHistory.length >= 6) {
    const recentAvg = average(expenseHistory.slice(-3).map((e) => e.total));
    const olderAvg = average(expenseHistory.slice(0, -3).map((e) => e.total));
    const trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;

    trend = {
      direction:
        trendPercentage > 5
          ? 'increasing'
          : trendPercentage < -5
            ? 'decreasing'
            : 'stable',
      percentage: trendPercentage,
      recentAverage: recentAvg,
      olderAverage: olderAvg,
    };
  }

  // Breakdown by category
  const breakdown = rental.expenseBreakdown?.map((exp) => ({
    ...exp,
    percentageOfTotal: (exp.amount / currentExpenses) * 100,
    percentageOfRent: (exp.amount / grossRent) * 100,
  }));

  return {
    expenseRatio,
    status,
    currentExpenses,
    grossRent,
    breakdown,
    trend,
    benchmarks: {
      excellent: 25,
      good: 35,
      typical: 50,
      high: 65,
    },
  };
}
```

### When to Show

- Monthly summary
- When expenses are updated
- Quarterly review
- Alert when ratio exceeds 50% or trend spikes

---

## Insight #6: Break-Even & Annual Projection

### Why It's Valuable

Landlords need to understand their **annual picture**, not just monthly cash flow. This insight shows year-to-date performance, projects the full year, and calculates how many vacant months they can absorb before the property becomes a net loss.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 2025 Performance: Downtown Apartment                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YEAR-TO-DATE (through February 28)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Rent collected:           $4,400 (2 months)        │   │
│  │  Expenses paid:            −$1,270                  │   │
│  │  Mortgage payments:        −$2,300                  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Net cash flow YTD:        $830                     │   │
│  │                                                     │   │
│  │  Equity built YTD:         $645                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total wealth gain YTD:    $1,475                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 PROGRESS                                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Cash flow target: $4,980/year                      │   │
│  │                                                     │   │
│  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │  $830 of $4,980                                     │   │
│  │                                                     │   │
│  │  17% of goal  |  17% of year elapsed  ✅ On track  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🎯 FULL YEAR PROJECTION                                    │
│                                                             │
│  If occupancy continues at 100%:                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Total rent:               $26,400                  │   │
│  │  Total expenses:           −$7,620                  │   │
│  │  Total mortgage:           −$13,800                 │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Projected cash flow:      $4,980                   │   │
│  │                                                     │   │
│  │  Projected equity built:   $3,840                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Projected total gain:     $8,820                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚖️ YOUR BREAK-EVEN POINT                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Annual fixed costs:       $21,420                  │   │
│  │  (mortgage + expenses, even if vacant)              │   │
│  │                                                     │   │
│  │  Monthly rent:             $2,200                   │   │
│  │                                                     │   │
│  │  Break-even:               9.7 months occupied      │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  You can afford 2.3 months of vacancy              │   │
│  │  before this property loses money for the year.     │   │
│  │                                                     │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │  9.7 months       Break-even        2.3 months      │   │
│  │  occupied                           vacancy buffer   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 VACANCY USED THIS YEAR                                  │
│                                                             │
│  Vacant days in 2025:         0 days                        │
│  Vacancy buffer remaining:    2.3 months (70 days)          │
│                                                             │
│  ✅ Full buffer available                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function calculateAnnualProjection(
  rental: RentalIncome,
  mortgage: InstallmentLoanAccount | null,
  currentDate: Date,
  rentHistory: MonthlyRentRecord[],
  vacancyHistory: VacancyPeriod[]
): AnnualProjectionAnalysis {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

  // YTD calculations
  const monthsElapsed = differenceInMonths(currentDate, yearStart) + 1;
  const ytdRentCollected = sum(
    rentHistory
      .filter((r) =>
        isWithinInterval(r.date, { start: yearStart, end: currentDate })
      )
      .map((r) => r.amount)
  );

  const ytdExpenses = rental.monthlyExpenses * monthsElapsed;
  const ytdMortgage = mortgage ? mortgage.scheduledPayment * monthsElapsed : 0;
  const ytdCashFlow = ytdRentCollected - ytdExpenses - ytdMortgage;

  // YTD equity
  const ytdEquity = mortgage
    ? calculateEquityBuiltBetween(mortgage, yearStart, currentDate)
    : 0;

  // Full year projection (assuming 100% occupancy)
  const monthsRemaining = 12 - monthsElapsed;
  const projectedRemainingRent = rental.grossRentalAmount * monthsRemaining;
  const projectedRemainingExpenses = rental.monthlyExpenses * monthsRemaining;
  const projectedRemainingMortgage = mortgage
    ? mortgage.scheduledPayment * monthsRemaining
    : 0;

  const projectedAnnualCashFlow =
    ytdCashFlow +
    (projectedRemainingRent -
      projectedRemainingExpenses -
      projectedRemainingMortgage);

  // Break-even calculation
  const annualFixedCosts =
    rental.monthlyExpenses * 12 +
    (mortgage ? mortgage.scheduledPayment * 12 : 0);
  const monthlyRent = rental.grossRentalAmount;
  const breakEvenMonths = annualFixedCosts / monthlyRent;
  const vacancyBuffer = 12 - breakEvenMonths;

  // Vacancy used this year
  const ytdVacancyDays = sum(
    vacancyHistory
      .filter((v) =>
        isWithinInterval(v.startDate, { start: yearStart, end: currentDate })
      )
      .map((v) => v.days)
  );

  const vacancyBufferUsed = ytdVacancyDays / 30; // Convert to months
  const vacancyBufferRemaining = vacancyBuffer - vacancyBufferUsed;

  return {
    ytd: {
      rentCollected: ytdRentCollected,
      expenses: ytdExpenses,
      mortgage: ytdMortgage,
      cashFlow: ytdCashFlow,
      equityBuilt: ytdEquity,
      totalGain: ytdCashFlow + ytdEquity,
    },
    projection: {
      annualRent: ytdRentCollected + projectedRemainingRent,
      annualExpenses: ytdExpenses + projectedRemainingExpenses,
      annualMortgage: ytdMortgage + projectedRemainingMortgage,
      annualCashFlow: projectedAnnualCashFlow,
      annualEquity:
        ytdEquity + calculateEquityBuiltBetween(mortgage, currentDate, yearEnd),
    },
    breakEven: {
      monthsNeeded: breakEvenMonths,
      vacancyBuffer: vacancyBuffer,
      vacancyBufferDays: vacancyBuffer * 30,
      vacancyUsed: vacancyBufferUsed,
      vacancyRemaining: vacancyBufferRemaining,
    },
    isOnTrack: ytdCashFlow / projectedAnnualCashFlow >= monthsElapsed / 12,
  };
}
```

### When to Show

- Monthly summary dashboard
- Quarterly review
- Year-end summary
- When vacancy occurs (show impact on projection)

---

## Summary: Rental Income Insights

| #   | Insight                                 | Value Provided                            | When to Show                 |
| --- | --------------------------------------- | ----------------------------------------- | ---------------------------- |
| 1   | **True Cash Flow Reality**              | Reveals actual money kept after ALL costs | Dashboard, monthly           |
| 2   | **The Real Cost of Vacancy**            | Shows true daily cost, creates urgency    | When vacant, alerts          |
| 3   | **Your Tenant is Buying Your Property** | Reframes rental as wealth-building        | Dashboard, motivational      |
| 4   | **Is This Property Worth Keeping?**     | Compares ROI to alternatives              | Quarterly, annual review     |
| 5   | **Expense Health Check**                | Benchmarks costs, flags trends            | Monthly, when expenses spike |
| 6   | **Break-Even & Annual Projection**      | Shows YTD progress, vacancy tolerance     | Monthly summary              |
