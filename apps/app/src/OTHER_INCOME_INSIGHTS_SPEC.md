# Other Income Insights

## Meaningful Insights That Provide Real Value

---

## Design Philosophy (Applied to Other Income)

| ✅ Valuable Insight                        | ❌ Not Valuable              |
| ------------------------------------------ | ---------------------------- |
| Helps plan what to do with a windfall      | Just showing amount received |
| Tracks expected income that hasn't arrived | Simple list of entries       |
| Clarifies tax obligations                  | Assuming all is tax-free     |
| Shows impact on overall financial picture  | Treating as isolated events  |

---

## Key Principle for "Other" Income Insights

**Keep it simple.** "Other Income" is intentionally a catch-all — users shouldn't need complex analysis for miscellaneous income. Focus on:

1. **Planning** when large amounts arrive
2. **Tracking** expected vs. received
3. **Tax awareness** for taxable items
4. **Context** for how it fits the bigger picture

---

## Insight #1: Windfall Decision Helper

### Why It's Valuable

When someone receives a significant one-time payment (inheritance, prize, large gift, settlement), they often don't have a plan. This money can easily "disappear" into general spending. This insight helps users **make intentional decisions** about unexpected money.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎁 You received a windfall!                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  "Inheritance from Uncle Bob"                               │
│  $25,000 received April 15, 2025                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 WHAT COULD YOU DO WITH $25,000?                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Based on your financial situation:                 │   │
│  │                                                     │   │
│  │  🏦 BOOST EMERGENCY FUND                            │   │
│  │     Your current runway: 2.3 months                 │   │
│  │     Add $8,250 → reach 6 months ✓                  │   │
│  │                                                     │   │
│  │  💳 PAY OFF HIGH-INTEREST DEBT                      │   │
│  │     Credit card balance: $4,200 at 22% APR          │   │
│  │     Pay it off → save $924/year in interest        │   │
│  │                                                     │   │
│  │  🏠 EXTRA MORTGAGE PAYMENT                          │   │
│  │     $5,000 to principal → save ~$12,000 lifetime   │   │
│  │                                                     │   │
│  │  📈 INVEST FOR GROWTH                               │   │
│  │     $7,550 remaining → could grow to $14,800       │   │
│  │     in 10 years (at 7% avg return)                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 SUGGESTED SPLIT                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Emergency fund     $8,250    33%  █████████████   │   │
│  │  Pay off credit card $4,200   17%  █████           │   │
│  │  Mortgage principal $5,000    20%  ██████          │   │
│  │  Invest             $7,550    30%  ██████████      │   │
│  │                     ───────                         │   │
│  │  Total              $25,000   100%                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 This is just a suggestion based on common               │
│     financial priorities. Use it however makes              │
│     sense for your life.                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  Create a plan for this money                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✓  I've already decided what to do                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Smaller Windfall Version

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎁 You received: Birthday gift — $500                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 QUICK IDEAS                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💳 Pay down credit card    Saves ~$9/month int.   │   │
│  │  🏦 Add to savings          +1 week emergency fund │   │
│  │  📈 Invest it               Could be $980 in 10yr  │   │
│  │  🎉 Enjoy it!               Guilt-free spending    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  No judgment — it's your money. Just options to consider.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function generateWindfallSuggestions(
  amount: number,
  userFinancials: UserFinancialSnapshot
): WindfallSuggestions {
  const suggestions: WindfallAllocation[] = [];
  let remainingAmount = amount;

  // Priority 1: Emergency fund gap (if under 6 months)
  const monthlyExpenses = userFinancials.totalMonthlyExpenses;
  const targetEmergencyFund = monthlyExpenses * 6;
  const currentEmergencyFund = userFinancials.emergencyFundBalance || 0;
  const emergencyFundGap = Math.max(
    0,
    targetEmergencyFund - currentEmergencyFund
  );

  if (emergencyFundGap > 0 && remainingAmount > 0) {
    const allocation = Math.min(emergencyFundGap, remainingAmount * 0.5); // Cap at 50%
    suggestions.push({
      category: 'emergency_fund',
      amount: allocation,
      reason: `Reach ${getMonthsOfRunway(currentEmergencyFund + allocation, monthlyExpenses)} months runway`,
      priority: 1,
    });
    remainingAmount -= allocation;
  }

  // Priority 2: High-interest debt (>15% APR)
  const highInterestDebt = userFinancials.debts
    ?.filter((d) => d.apr > 15)
    .sort((a, b) => b.apr - a.apr);

  if (highInterestDebt?.length > 0 && remainingAmount > 0) {
    const topDebt = highInterestDebt[0];
    const allocation = Math.min(topDebt.balance, remainingAmount * 0.4);
    const interestSaved = calculateInterestSaved(topDebt, allocation);

    suggestions.push({
      category: 'debt_payoff',
      amount: allocation,
      reason: `Save ~$${Math.round(interestSaved)}/year in interest`,
      targetDebt: topDebt.name,
      priority: 2,
    });
    remainingAmount -= allocation;
  }

  // Priority 3: Mortgage principal (if applicable)
  if (userFinancials.mortgage && remainingAmount > 1000) {
    const allocation = Math.min(remainingAmount * 0.3, 10000);
    const lifetimeSavings = calculateMortgageInterestSaved(
      userFinancials.mortgage,
      allocation
    );

    suggestions.push({
      category: 'mortgage_principal',
      amount: allocation,
      reason: `Save ~$${Math.round(lifetimeSavings)} lifetime interest`,
      priority: 3,
    });
    remainingAmount -= allocation;
  }

  // Priority 4: Invest the rest
  if (remainingAmount > 0) {
    const futureValue = calculateFutureValue(remainingAmount, 0.07, 10);

    suggestions.push({
      category: 'invest',
      amount: remainingAmount,
      reason: `Could grow to $${Math.round(futureValue).toLocaleString()} in 10 years`,
      priority: 4,
    });
  }

  return {
    totalAmount: amount,
    suggestions,
    isLargeWindfall: amount > 5000,
  };
}
```

### When to Show

- Immediately when a one-time income over $500 is marked as "received"
- Larger presentation for amounts over $5,000
- Can be dismissed with "I've decided" or revisited later

---

## Insight #2: Expected Income Tracker

### Why It's Valuable

Users often track income they're expecting (tax refund, inheritance, insurance settlement) before it arrives. This insight helps them **track what's pending** and prompts follow-up when expected dates pass — preventing forgotten income from falling through the cracks.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏳ Expected Income Tracker                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  WAITING TO RECEIVE                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💰 Tax refund (2024)                               │   │
│  │     Expected: $1,850                                │   │
│  │     Due: ~March 15, 2025                            │   │
│  │                                                     │   │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ⏳        │   │
│  │     12 days away                                    │   │
│  │                                                     │   │
│  │     ┌────────────────┐  ┌────────────────┐         │   │
│  │     │ ✓ Received     │  │ Update date    │         │   │
│  │     └────────────────┘  └────────────────┘         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏛️ Inheritance from Uncle Bob                      │   │
│  │     Expected: $25,000                               │   │
│  │     Due: ~April 2025 (estate settlement)            │   │
│  │                                                     │   │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ⏳        │   │
│  │     ~6 weeks away                                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 SUMMARY                                                 │
│                                                             │
│  Total expected:         $26,850                            │
│  Nearest arrival:        12 days (Tax refund)               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  RECENTLY RECEIVED                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ✅ Birthday gift from grandma                      │   │
│  │     Received: $500 on Jan 15                        │   │
│  │                                                     │   │
│  │  ✅ Sold old furniture (Craigslist)                 │   │
│  │     Received: $275 on Jan 8                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Overdue Follow-up Prompt

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ❓ Income Check-in                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  You expected "Tax refund" around March 15.                 │
│  It's now March 22.                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What happened?                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ✅  I received it                                  │   │
│  │                                                     │   │
│  │      Amount: $ [ 1,850 ]  Date: [ Mar 20 ]         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  It's delayed — new date: [ _________ ]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  It's not coming (remove it)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰  Ask me again next week                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function getExpectedIncomeStatus(
  otherIncomes: OtherIncome[]
): ExpectedIncomeAnalysis {
  const now = new Date();

  // Filter to one-time, not-yet-received
  const pending = otherIncomes.filter(
    (inc) => inc.isOneTime && !inc.isReceived && inc.incomeDate
  );

  // Categorize by timing
  const upcoming = pending
    .filter((inc) => inc.incomeDate > now)
    .sort((a, b) => a.incomeDate.getTime() - b.incomeDate.getTime());

  const overdue = pending
    .filter((inc) => inc.incomeDate <= now)
    .sort((a, b) => a.incomeDate.getTime() - b.incomeDate.getTime());

  // Recently received (last 30 days)
  const recentlyReceived = otherIncomes.filter(
    (inc) =>
      inc.isOneTime &&
      inc.isReceived &&
      inc.incomeDate &&
      differenceInDays(now, inc.incomeDate) <= 30
  );

  const totalExpected = sum(pending.map((p) => p.incomeAmount));
  const nearestArrival = upcoming[0];

  return {
    pending,
    upcoming,
    overdue,
    recentlyReceived,
    totalExpected,
    nearestArrival,
    daysUntilNearest: nearestArrival
      ? differenceInDays(nearestArrival.incomeDate, now)
      : null,
    hasOverdue: overdue.length > 0,
  };
}
```

### When to Show

- Dashboard widget (if pending income exists)
- Alert when expected date passes
- Monthly summary

---

## Insight #3: Other Income Tax Summary

### Why It's Valuable

"Other income" has **highly variable tax treatment** — gifts are usually tax-free, prizes are fully taxable, odd jobs should be reported. This simple insight helps users understand what they may owe taxes on, avoiding surprises.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Other Income Tax Summary (2025)                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LIKELY TAXABLE                                 $2,750      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔧 Odd jobs for neighbors           $2,400/year   │   │
│  │     Self-employment income — report on Schedule C   │   │
│  │                                                     │   │
│  │  🪙 Crypto airdrop                   $350          │   │
│  │     Taxable as ordinary income at receipt          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Estimated tax on this income: ~$600-$750               │
│     (at 22-27% combined federal + state)                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LIKELY NOT TAXABLE                             $27,350     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💝 Birthday gift from grandma       $500          │   │
│  │     Gifts under $18,000 are not taxable            │   │
│  │                                                     │   │
│  │  💰 Tax refund                       $1,850        │   │
│  │     Refunds are not taxable income                  │   │
│  │                                                     │   │
│  │  🏛️ Inheritance                      $25,000       │   │
│  │     Inheritances are generally not taxable          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ IMPORTANT                                               │
│                                                             │
│  This is general guidance only. Tax rules are complex       │
│  and depend on your specific situation.                     │
│                                                             │
│  Consider consulting a tax professional, especially for:    │
│  • Large inheritances (estate tax may apply)                │
│  • Prizes over $600                                         │
│  • Self-employment income over $400                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tax Treatment Reference

```typescript
const TAX_TREATMENT_BY_SUBTYPE: Record<OtherIncomeSubtype, TaxGuidance> = {
  gift: {
    likelyTaxable: false,
    explanation: 'Gifts under $18,000 (2024) are not taxable to recipient',
    exception: 'If gift is from employer, may be taxable',
  },
  inheritance: {
    likelyTaxable: false,
    explanation: 'Inheritances are generally not taxable income',
    exception:
      'Estate tax may apply to very large estates; inherited retirement accounts have special rules',
  },
  prize_lottery: {
    likelyTaxable: true,
    explanation: 'Prizes and lottery winnings are fully taxable',
    exception:
      'Small prizes under $600 may not generate a 1099 but are still taxable',
  },
  sale_personal_items: {
    likelyTaxable: false,
    explanation: 'Selling personal items at a loss is not taxable',
    exception: 'If sold for more than you paid, the gain may be taxable',
  },
  insurance_settlement: {
    likelyTaxable: 'depends',
    explanation: 'Depends on the type of settlement',
    details:
      'Property damage reimbursement: usually not taxable. Lost wages: usually taxable.',
  },
  legal_settlement: {
    likelyTaxable: 'depends',
    explanation: 'Depends on what the settlement is for',
    details:
      'Physical injury: usually not taxable. Emotional distress or punitive damages: usually taxable.',
  },
  tax_refund: {
    likelyTaxable: false,
    explanation: 'Tax refunds are not taxable income',
    exception:
      'If you deducted state taxes and got a refund, that refund may be taxable federally',
  },
  rebate_cashback: {
    likelyTaxable: false,
    explanation:
      'Rebates and cash back are considered price reductions, not income',
    exception: 'Credit card sign-up bonuses may be taxable',
  },
  odd_jobs: {
    likelyTaxable: true,
    explanation: 'Income from odd jobs is self-employment income',
    details: 'Report on Schedule C if over $400. May owe self-employment tax.',
  },
  crypto_airdrop: {
    likelyTaxable: true,
    explanation:
      'Crypto airdrops are taxable as ordinary income at fair market value when received',
  },
  found_money: {
    likelyTaxable: false,
    explanation: 'Small amounts of found money are generally not taxable',
    exception: 'Large amounts or treasure trove may be taxable',
  },
  stipend: {
    likelyTaxable: 'depends',
    explanation: 'Depends on the type of stipend',
    details:
      'Educational stipends for tuition: not taxable. Living expense stipends: often taxable.',
  },
  allowance: {
    likelyTaxable: false,
    explanation: 'Allowances from family are typically gifts, not taxable',
  },
  reimbursement: {
    likelyTaxable: false,
    explanation: 'Reimbursements for expenses are not income',
    exception: 'Must be for actual expenses incurred',
  },
  other: {
    likelyTaxable: 'unknown',
    explanation:
      'Tax treatment varies — consider consulting a tax professional',
  },
};
```

### When to Show

- Tax season (January-April)
- Year-end summary
- When adding taxable income types
- On request

---

## Insight #4: Other Income in Context

### Why It's Valuable

"Other income" can feel disconnected from someone's regular financial picture. This insight shows **how irregular income fits into the whole** — whether it's a meaningful supplement or a small bonus, and how reliable it is to count on.

### The Insight

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Your Other Income in Context                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  HOW IT FITS YOUR TOTAL INCOME                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  YOUR MONTHLY INCOME SOURCES                        │   │
│  │                                                     │   │
│  │  Salary              $4,200   78%  ████████████████│   │
│  │  Investment income   $350     7%   ██             │   │
│  │  Recurring other     $200     4%   █              │   │
│  │  (Monthly allowance)                               │   │
│  │  Irregular other     ~$150    3%   █  (variable)  │   │
│  │  (Odd jobs avg)                                    │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Total regular       $4,900   92%                  │   │
│  │                                                     │   │
│  │  + One-time income this year: $27,200              │   │
│  │    (Inheritance, tax refund, gifts)                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 YOUR "OTHER" INCOME PROFILE                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  RECURRING OTHER INCOME                             │   │
│  │                                                     │   │
│  │  Monthly allowance        $200/mo    Predictable   │   │
│  │  Odd jobs                 ~$150/mo   Variable ⚠️   │   │
│  │  ─────────────────────────────────────             │   │
│  │  Total recurring:         ~$350/mo                 │   │
│  │                                                     │   │
│  │  This covers about 3 days of expenses per month.   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ONE-TIME INCOME (2025)                             │   │
│  │                                                     │   │
│  │  Received:    $775     (gifts, crypto)             │   │
│  │  Expected:    $26,850  (inheritance, tax refund)   │   │
│  │  ─────────────────────────────────────             │   │
│  │  Total 2025:  $27,625                              │   │
│  │                                                     │   │
│  │  💡 The inheritance alone equals 5.5 months of     │   │
│  │     your regular expenses!                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📈 RELIABILITY CHECK                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Reliable recurring other:    $200/mo  (allowance) │   │
│  │  Variable recurring other:    ~$150/mo (odd jobs)  │   │
│  │                                                     │   │
│  │  ✅ 57% of your recurring "other" income is        │   │
│  │     predictable. The rest varies.                   │   │
│  │                                                     │   │
│  │  Recommendation: Budget based on the reliable      │   │
│  │  $200/mo. Treat odd job income as bonus.           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
function analyzeOtherIncomeInContext(
  otherIncomes: OtherIncome[],
  allIncomes: Income[],
  monthlyExpenses: number
): OtherIncomeContextAnalysis {
  // Separate one-time vs recurring
  const oneTime = otherIncomes.filter((i) => i.isOneTime);
  const recurring = otherIncomes.filter((i) => !i.isOneTime);

  // Calculate recurring monthly total
  const recurringMonthly = recurring.reduce((sum, inc) => {
    return sum + getMonthlyAmount(inc);
  }, 0);

  // Separate reliable vs variable recurring
  const reliableRecurring = recurring.filter(
    (i) =>
      i.predictability === 'highly_predictable' ||
      i.predictability === 'somewhat_predictable'
  );
  const variableRecurring = recurring.filter(
    (i) =>
      i.predictability === 'variable' ||
      i.predictability === 'unpredictable' ||
      i.paymentFrequency === 'irregular'
  );

  const reliableMonthly = sum(
    reliableRecurring.map((i) => getMonthlyAmount(i))
  );
  const variableMonthly = sum(
    variableRecurring.map((i) => getMonthlyAmount(i))
  );

  // Calculate one-time totals for current year
  const currentYear = new Date().getFullYear();
  const oneTimeThisYear = oneTime.filter(
    (i) => i.incomeDate?.getFullYear() === currentYear
  );

  const receivedOneTime = oneTimeThisYear
    .filter((i) => i.isReceived)
    .reduce((sum, i) => sum + i.incomeAmount, 0);

  const expectedOneTime = oneTimeThisYear
    .filter((i) => !i.isReceived)
    .reduce((sum, i) => sum + i.incomeAmount, 0);

  // Total income context
  const totalMonthlyIncome = allIncomes.reduce((sum, inc) => {
    if (inc.incomeType !== 'other' || !inc.isOneTime) {
      return sum + getMonthlyAmount(inc);
    }
    return sum;
  }, 0);

  const otherAsPercentOfTotal =
    totalMonthlyIncome > 0 ? (recurringMonthly / totalMonthlyIncome) * 100 : 0;

  // How many days of expenses does recurring other cover?
  const dailyExpenses = monthlyExpenses / 30;
  const daysCovered = recurringMonthly / dailyExpenses;

  // How many months does one-time cover?
  const totalOneTime = receivedOneTime + expectedOneTime;
  const monthsCovered = totalOneTime / monthlyExpenses;

  return {
    recurring: {
      total: recurringMonthly,
      reliable: reliableMonthly,
      variable: variableMonthly,
      reliablePercentage:
        recurringMonthly > 0 ? (reliableMonthly / recurringMonthly) * 100 : 0,
      daysCovered,
    },
    oneTime: {
      received: receivedOneTime,
      expected: expectedOneTime,
      total: totalOneTime,
      monthsCovered,
    },
    context: {
      totalMonthlyIncome,
      otherAsPercentOfTotal,
      recommendation:
        reliableMonthly > variableMonthly
          ? 'Budget based on reliable portion; treat variable as bonus'
          : 'This income is mostly variable; budget conservatively',
    },
  };
}
```

### When to Show

- Dashboard overview
- Monthly/quarterly summary
- When user has multiple "other" income sources

---

## Summary: Other Income Insights

| #   | Insight                      | Value Provided                                | When to Show                          |
| --- | ---------------------------- | --------------------------------------------- | ------------------------------------- |
| 1   | **Windfall Decision Helper** | Guides intentional use of unexpected money    | When one-time income >$500 received   |
| 2   | **Expected Income Tracker**  | Tracks pending income, prompts follow-up      | Dashboard, when dates pass            |
| 3   | **Tax Summary**              | Clarifies what's taxable vs. not              | Tax season, when adding taxable items |
| 4   | **Income in Context**        | Shows how other income fits the whole picture | Dashboard, summary views              |

---

## Other Income Insight Availability Matrix

| User Has                 | Insights Available             |
| ------------------------ | ------------------------------ |
| One-time received income | Windfall Helper, Tax Summary   |
| One-time expected income | Expected Tracker, Tax Summary  |
| Recurring other income   | Income in Context, Tax Summary |
| Mix of types             | All insights available         |

---

## Key Principle Reminder

**"Other Income" should be simple.**

Unlike salary or investment income where users expect detailed analysis, "Other Income" users just want to:

1. ✅ Track it
2. ✅ Know if it's taxable
3. ✅ Make good decisions about windfalls
4. ✅ Not forget about expected money

These four insights cover those needs without overcomplicating a catch-all category.
