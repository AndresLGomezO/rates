# Income Type #6: Other Income

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

A catch-all category for any income that doesn't fit neatly into the other five categories. This includes one-time windfalls, gifts, irregular income, and any unique income sources the user wants to track.

### Who uses this?

- Anyone receiving a one-time gift or inheritance
- Lottery or prize winners
- People selling personal items (garage sales, online sales)
- Those receiving informal income (odd jobs, favors)
- Anyone with unique income that doesn't fit other categories
- People receiving insurance settlements or legal awards
- Cash back, rewards, or rebates they want to track
- Cryptocurrency airdrops or rewards
- Found money or unclaimed property

### Why track it?

- Complete picture of all money coming in
- Plan around one-time windfalls
- Track irregular but meaningful income
- Tax planning for taxable gifts/prizes
- Historical record of all income sources

### Key Design Principles for This Flow

| Principle         | Implementation                       |
| ----------------- | ------------------------------------ |
| **Simplicity**    | Minimal required fields, quick entry |
| **Flexibility**   | Support one-time or recurring        |
| **No judgment**   | All amounts welcome, no minimums     |
| **Quick capture** | Get the essential info, move on      |
| **Future-proof**  | Catch anything we haven't thought of |

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field                 | Purpose                  | User Knows This? |
| --------------------- | ------------------------ | ---------------- |
| Income Name           | Identify this income     | Always ✅        |
| Amount                | How much                 | Always ✅        |
| One-time vs Recurring | Frequency classification | Always ✅        |

### Optional but Valuable Data

| Field                    | Purpose                | User Knows This? |
| ------------------------ | ---------------------- | ---------------- |
| Category/Type            | Rough classification   | Usually ✅       |
| Source                   | Where it came from     | Usually ✅       |
| Date (if one-time)       | When received/expected | Usually ✅       |
| Frequency (if recurring) | How often              | Usually ✅       |
| Is Taxable               | Tax planning           | Sometimes        |
| Notes                    | Any additional context | Optional         |

### Calculated/Derived Data (System Computes)

| Field          | Derived From                      |
| -------------- | --------------------------------- |
| Monthly Income | Amount ÷ frequency (if recurring) |
| Annual Income  | Monthly × 12 or one-time amount   |

---

## 3. Schema Skeleton

```typescript
interface OtherIncome extends BaseIncome {
  incomeType: 'other';
  otherIncomeSubtype: OtherIncomeSubtype;

  // ===== IDENTIFICATION =====

  /** Source of the income */
  incomeSource?: string;

  /** Additional description or notes */
  notes?: string;

  // ===== INCOME DETAILS =====

  /** Income amount */
  incomeAmount: CurrencyAmount;

  /** Is this a one-time or recurring income? */
  isOneTime: boolean;

  /** For recurring: payment frequency */
  paymentFrequency?: PaymentFrequency | 'irregular';

  /** For one-time: date received or expected */
  incomeDate?: Timestamp | Date;

  /** For recurring: expected next payment */
  nextPaymentDate?: Timestamp | Date;

  // ===== PREDICTABILITY =====

  /** How predictable is this income? (for recurring) */
  predictability?: IncomePredictability;

  /** For variable recurring: typical range */
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;

  // ===== DURATION =====

  /** For recurring: does it have an end date? */
  hasEndDate?: boolean;

  /** End date if applicable */
  endDate?: Timestamp | Date;

  // ===== TAX =====

  /** Is this income taxable? */
  isTaxable?: boolean;

  /** Tax notes or considerations */
  taxNotes?: string;

  // ===== FLAGS =====

  /** Is this income already received? (for one-time) */
  isReceived?: boolean;

  /** Should this be included in regular projections? */
  includeInProjections: boolean;
}

type OtherIncomeSubtype =
  | 'gift' // Cash gift from family/friends
  | 'inheritance' // Inherited money
  | 'prize_lottery' // Lottery, contest, sweepstakes
  | 'sale_personal_items' // Selling personal belongings
  | 'insurance_settlement' // Insurance payout
  | 'legal_settlement' // Legal award or settlement
  | 'tax_refund' // Tax refund
  | 'rebate_cashback' // Rebates, cash back rewards
  | 'odd_jobs' // Informal work, odd jobs
  | 'crypto_airdrop' // Cryptocurrency airdrops/rewards
  | 'found_money' // Found money, unclaimed property
  | 'stipend' // Stipend (non-employment)
  | 'allowance' // Allowance from family
  | 'reimbursement' // Reimbursement received
  | 'other'; // Anything else

type IncomePredictability =
  | 'highly_predictable'
  | 'somewhat_predictable'
  | 'variable'
  | 'unpredictable';
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           OTHER INCOME FLOW                               │
│                                                                           │
│  ┌─────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌──────────────┐   │
│  │ 1   │──▶│ 2        │──▶│ 3       │──▶│ 4       │──▶│ 5            │   │
│  │Name │   │One-time  │   │Amount   │   │Details  │   │Confirm       │   │
│  │     │   │or Recur? │   │         │   │(optional│   │              │   │
│  └─────┘   └──────────┘   └─────────┘   └─────────┘   └──────────────┘   │
│                 │                                                         │
│        ┌────────┴────────┐                                               │
│        ▼                 ▼                                               │
│   [One-time]       [Recurring]                                           │
│        │                 │                                               │
│        ▼                 ▼                                               │
│   (Date only)      (Frequency +                                          │
│                     predictability)                                      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Category

**Screen Title:** "Let's add your other income"

**Purpose:** Quick identification of the income with optional categorization

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎁 Let's add your other income                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this income?                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Birthday gift from grandma                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Examples: "Tax refund", "Sold old furniture",          │
│     "Birthday money", "Side job for neighbor"              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What type of income is this? (optional)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Gift                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ 💝 Gift (from family/friends)                   │     │
│    │ 🏛️ Inheritance                                  │     │
│    │ 🎰 Prize / Lottery winnings                     │     │
│    │ 🏷️ Sold personal items                          │     │
│    │ 🛡️ Insurance settlement                         │     │
│    │ ⚖️ Legal settlement                             │     │
│    │ 💰 Tax refund                                   │     │
│    │ 🔄 Rebate / Cash back                           │     │
│    │ 🔧 Odd jobs / Informal work                     │     │
│    │ 🪙 Crypto airdrop / rewards                     │     │
│    │ 🔍 Found money / Unclaimed property             │     │
│    │ 📚 Stipend                                      │     │
│    │ 👨‍👩‍👧 Allowance                                    │     │
│    │ 📋 Reimbursement                                │     │
│    │ ❓ Other / Not listed                           │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  💡 This helps organize your income - skip if unsure       │
│                                                             │
│                                                             │
│                                        ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeName` (required)
- `otherIncomeSubtype` (optional, defaults to 'other')

**Smart Defaults Based on Category:**
| Category | Assumed One-time? | Assumed Taxable? |
|----------|-------------------|------------------|
| Gift | Yes | Usually no (under $17k) |
| Inheritance | Yes | Usually no |
| Prize/Lottery | Yes | Yes |
| Sold personal items | Yes | Usually no (personal loss) |
| Insurance settlement | Yes | Depends |
| Legal settlement | Yes | Depends |
| Tax refund | Yes | No |
| Rebate/Cash back | Yes | Usually no |
| Odd jobs | Could be either | Yes |
| Crypto airdrop | Yes | Yes |
| Found money | Yes | Usually no |
| Stipend | Recurring | Depends |
| Allowance | Recurring | No |
| Reimbursement | Yes | No |

---

### STEP 2: One-time or Recurring

**Screen Title:** "Is this a one-time or recurring income?"

**Purpose:** This is the KEY branching question for the flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔄 Is this a one-time or recurring income?                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎯  One-time                                       │   │
│  │                                                     │   │
│  │      This is a single payment I received            │   │
│  │      or expect to receive                           │   │
│  │                                                     │   │
│  │      Examples: Gift, tax refund, sold item,         │   │
│  │      inheritance, prize                             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔄  Recurring                                      │   │
│  │                                                     │   │
│  │      I receive this income regularly                │   │
│  │      (even if the amount varies)                    │   │
│  │                                                     │   │
│  │      Examples: Monthly allowance, regular odd       │   │
│  │      jobs, ongoing stipend                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `isOneTime`: boolean

**Branching:**

- One-time → Step 3A (One-time Amount & Date)
- Recurring → Step 3B (Recurring Amount & Frequency)

---

### STEP 3A: One-time Income Details

**Screen Title:** "Tell us about this one-time income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎯 Tell us about this one-time income                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much is/was this income?                               │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 500                            │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Have you received this money yet?                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, I already received it                     │   │
│  │                                                     │   │
│  │      When did you receive it?                       │   │
│  │      ┌─────────────────────────────────────────┐   │   │
│  │      │  📅  January 15, 2025                   │   │   │
│  │      └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏳  No, I'm expecting to receive it                │   │
│  │                                                     │   │
│  │      When do you expect to receive it?              │   │
│  │      ┌─────────────────────────────────────────┐   │   │
│  │      │  📅  February 28, 2025                  │   │   │
│  │      └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Where is this income from? (optional)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Grandma                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 One-time income will appear in the month it's           │
│     received, but won't be included in your regular         │
│     monthly income projections.                             │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeAmount`: CurrencyAmount
- `isReceived`: boolean
- `incomeDate`: Date
- `incomeSource`: string (optional)

---

### STEP 3B: Recurring Income Details

**Screen Title:** "Tell us about this recurring income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔄 Tell us about this recurring income                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you typically receive?                         │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 200                            │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  How often do you receive this income?                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Monthly                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Weekly                                        │     │
│    │ • Every two weeks                               │     │
│    │ • Monthly                            ⭐ Common  │     │
│    │ • Quarterly                                     │     │
│    │ • Annually                                      │     │
│    │ • Irregular (no set schedule)                   │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to:                                      │
│                                                             │
│     • $200/month                                            │
│     • $2,400/year                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How predictable is this income?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Very predictable                               │   │
│  │      Same amount, same time, every time             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊  Somewhat predictable                           │   │
│  │      Usually comes, amount may vary                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Variable / Unpredictable                       │   │
│  │      Comes irregularly or varies a lot              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeAmount`: CurrencyAmount
- `paymentFrequency`: PaymentFrequency | 'irregular'
- `predictability`: IncomePredictability

**If "Irregular" frequency selected:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔀 Irregular income details                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Since this income is irregular, how would you like         │
│  to estimate it?                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  I know roughly how much I get per month        │   │
│  │                                                     │   │
│  │      Average monthly amount: $ [__________]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📆  I know roughly how much I get per year         │   │
│  │                                                     │   │
│  │      Average yearly amount: $ [__________]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🤷  I really can't estimate                        │   │
│  │      (We'll track it but not include in projections)│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If "Variable" predictability selected:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Variable income range                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the typical range for this income?                  │
│                                                             │
│  Low amount (minimum):                                      │
│             ┌────────────────────────────────┐              │
│         $   │ 100                            │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│  High amount (maximum):                                     │
│             ┌────────────────────────────────┐              │
│         $   │ 300                            │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  For projections, which estimate should we use?             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛡️  Conservative ($100)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚖️  Average ($200)                  ⭐ Recommended │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯  Optimistic ($300)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 4: Additional Details (Optional)

**Screen Title:** "Any additional details?"

**Purpose:** Capture optional but helpful information

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📝 Any additional details? (optional)                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  These details are optional but can help with planning.     │
│                                                             │
│                                                             │
│  Where is this income from?                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Monthly allowance from parents                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (For recurring income:)                                    │
│                                                             │
│  Does this income have an end date?                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄  No, it's ongoing                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Yes, it ends on: [________________]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Do you think this income is taxable?                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, it's probably taxable                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  No, it's probably not taxable                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Common non-taxable items: gifts under $17k, personal   │
│     item sales at a loss, most rebates, reimbursements     │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Any notes you'd like to add?                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │ For college expenses while in school                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       ⏭️  Skip additional details                   │   │
│  │       I'll just save the basics                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeSource`: string (optional)
- `hasEndDate`: boolean
- `endDate`: Date (optional)
- `isTaxable`: boolean | null
- `notes`: string (optional)

---

### STEP 5: Confirmation & Summary

**Screen Title:** "Review your other income"

#### One-time Income Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your other income                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎁  Birthday gift from grandma                     │   │
│  │      Gift                                           │   │
│  │                                         One-time    │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 AMOUNT                                          │   │
│  │                                                     │   │
│  │     Amount:                 $500                    │   │
│  │     Status:                 ✅ Already received     │   │
│  │     Date:                   January 15, 2025        │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 HOW THIS APPEARS                                │   │
│  │                                                     │   │
│  │     This $500 will appear as one-time income        │   │
│  │     in January 2025.                                │   │
│  │                                                     │   │
│  │     It won't be included in your regular            │   │
│  │     monthly projections.                            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💡 TAX INFO                                        │   │
│  │                                                     │   │
│  │     Likely not taxable:     Gifts under $17,000     │   │
│  │                             are generally not       │   │
│  │                             taxable to the recipient│   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does everything look correct?                              │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────┐    │
│  │   ← Edit         │          │   Save Income ✓      │    │
│  └──────────────────┘          └──────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### Recurring Income Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your other income                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  👨‍👩‍👧  Monthly allowance                              │   │
│  │      Allowance                                      │   │
│  │                                         Recurring   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Amount:                 $200/month              │   │
│  │     Frequency:              Monthly                 │   │
│  │     Annual total:           $2,400                  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 PREDICTABILITY                                  │   │
│  │                                                     │   │
│  │     Confidence:             Very predictable        │   │
│  │     Included in projections: ✅ Yes                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ⏱️ DURATION                                        │   │
│  │                                                     │   │
│  │     Ends:                   May 2026                │   │
│  │                             (when I graduate)       │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📝 NOTES                                           │   │
│  │                                                     │   │
│  │     "For college expenses while in school"          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does everything look correct?                              │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────┐    │
│  │   ← Edit         │          │   Save Income ✓      │    │
│  └──────────────────┘          └──────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### Variable/Irregular Income Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your other income                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔧  Odd jobs for neighbors                         │   │
│  │      Odd jobs / Informal work                       │   │
│  │                                         Recurring   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Typical range:          $100 - $300/month       │   │
│  │     Using for projections:  $200/month (average)    │   │
│  │     Annual estimate:        ~$2,400                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 PREDICTABILITY                                  │   │
│  │                                                     │   │
│  │     Confidence:             Variable ⚠️             │   │
│  │     Frequency:              Irregular               │   │
│  │                                                     │   │
│  │     ⚠️ This income may vary significantly           │   │
│  │        from month to month.                         │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💡 TAX INFO                                        │   │
│  │                                                     │   │
│  │     Likely taxable:         Yes - informal income   │   │
│  │                             is generally taxable    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does everything look correct?                              │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────┐    │
│  │   ← Edit         │          │   Save Income ✓      │    │
│  └──────────────────┘          └──────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Complete Flow Decision Tree

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ STEP 1: Name & Category             │
│                                     │
│ Q: "What would you like to call     │
│    this income?"                    │
│ Q: "What type of income is this?"   │
│    (optional category selection)    │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: One-time or Recurring (KEY BRANCHING QUESTION)          │
│                                                                 │
│ Q: "Is this a one-time or recurring income?"                    │
│                                                                 │
│ ┌─────────────────────────────┐    ┌──────────────────────────┐ │
│ │        One-time             │    │        Recurring         │ │
│ └─────────────┬───────────────┘    └─────────────┬────────────┘ │
│               │                                  │              │
└───────────────┼──────────────────────────────────┼──────────────┘
                │                                  │
                ▼                                  ▼
┌───────────────────────────────┐    ┌────────────────────────────────┐
│ STEP 3A: One-time Details     │    │ STEP 3B: Recurring Details     │
│                               │    │                                │
│ Q: "How much is this income?" │    │ Q: "How much do you receive?"  │
│                               │    │                                │
│ Q: "Have you received it yet?"│    │ Q: "How often do you receive   │
│    • Yes (enter past date)    │    │    this income?"               │
│    • No (enter expected date) │    │    • Weekly                    │
│                               │    │    • Biweekly                  │
│ Q: "Where is it from?"        │    │    • Monthly                   │
│    (optional)                 │    │    • Quarterly                 │
│                               │    │    • Annually                  │
│                               │    │    • Irregular                 │
│                               │    │                                │
│                               │    │ Q: "How predictable is it?"    │
│                               │    │    • Very predictable          │
│                               │    │    • Somewhat predictable      │
│                               │    │    • Variable/Unpredictable    │
│                               │    │                                │
│                               │    │ (If irregular or variable:)    │
│                               │    │ Q: "Estimate method?"          │
│                               │    │ Q: "Income range?"             │
└───────────────┬───────────────┘    └────────────────┬───────────────┘
                │                                     │
                └──────────────┬──────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Additional Details (Optional)                           │
│                                                                 │
│ Q: "Where is this income from?" (source)                        │
│                                                                 │
│ (For recurring:)                                                │
│ Q: "Does this income have an end date?"                         │
│    • No, ongoing                                                │
│    • Yes, ends on [date]                                        │
│                                                                 │
│ Q: "Do you think this is taxable?"                              │
│    • Yes                                                        │
│    • No                                                         │
│    • Not sure                                                   │
│                                                                 │
│ Q: "Any notes?" (free text)                                     │
│                                                                 │
│ [Skip additional details] option                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────┐
│ STEP 5: Review & Confirm            │
│                                     │
│ Shows all entered data              │
│ Shows how it affects projections    │
│ Shows tax implications (if known)   │
│                                     │
│ [Edit] or [Save Income ✓]           │
└─────────────────────────────────────┘
                               │
                               ▼
                             DONE
```

---

## 6. Minimum Path Examples

### Example 1: Simple One-time Gift (Shortest Path)

```
Step 1 → Enter name "Birthday money", select "Gift"
     → Step 2 → Select "One-time"
     → Step 3A → Enter $200, "Yes, already received", Jan 15
     → Step 4 → Skip additional details
     → Step 5 → Confirm

Total: 4 screens (with skip)
Data captured: Name, type, amount, date, received status
```

### Example 2: Tax Refund

```
Step 1 → Enter name "2024 Tax refund", select "Tax refund"
     → Step 2 → Select "One-time"
     → Step 3A → Enter $1,850, "No, expecting", March 15
     → Step 4 → Skip (tax refund is not taxable)
     → Step 5 → Confirm

Total: 4 screens
Data captured: Name, type, amount, expected date
Special: Auto-flagged as not taxable
```

### Example 3: Regular Allowance

```
Step 1 → Enter name "Monthly allowance", select "Allowance"
     → Step 2 → Select "Recurring"
     → Step 3B → Enter $300/month, "Monthly", "Very predictable"
     → Step 4 → Source "Parents", ends "May 2026", not taxable
     → Step 5 → Confirm

Total: 5 screens
Data captured: Name, type, amount, frequency, predictability, end date
```

### Example 4: Variable Odd Jobs

```
Step 1 → Enter name "Yard work for neighbors", select "Odd jobs"
     → Step 2 → Select "Recurring"
     → Step 3B → Enter $150, "Irregular", "Variable"
              → Range $50-$250, use "Average"
     → Step 4 → Taxable: "Yes"
     → Step 5 → Confirm

Total: 5 screens
Data captured: Name, type, range, average estimate, irregular flag, taxable
```

### Example 5: Inheritance (One-time, Large)

```
Step 1 → Enter name "Inheritance from Uncle Bob", select "Inheritance"
     → Step 2 → Select "One-time"
     → Step 3A → Enter $25,000, "No, expecting", April 2025
     → Step 4 → Source "Estate of Robert Smith", not taxable
     → Step 5 → Confirm

Total: 5 screens
Data captured: Name, type, amount, expected date, source, tax status
Special: Large amount flagged for financial planning
```

### Example 6: Crypto Airdrop

```
Step 1 → Enter name "Ethereum airdrop", select "Crypto airdrop"
     → Step 2 → Select "One-time"
     → Step 3A → Enter $350, "Yes, received", Jan 5
     → Step 4 → Taxable: "Yes", note "Need to track cost basis"
     → Step 5 → Confirm

Total: 5 screens
Data captured: Name, type, amount, date, taxable, notes
Special: Flagged as taxable with notes
```

---

## 7. Edge Cases & Handling

| Scenario                                  | Handling                                                        |
| ----------------------------------------- | --------------------------------------------------------------- |
| Very small amounts ($5, $10)              | Accept without judgment - all income welcome                    |
| Very large amounts ($100k+)               | Accept normally, perhaps suggest financial planning resources   |
| Multiple one-time gifts from same source  | Allow multiple entries, or user can add single entry with total |
| Gift that might be recurring (birthdays)  | Let user choose one-time or recurring based on their preference |
| Unsure if taxable                         | Offer "not sure" option, provide general guidance               |
| Foreign currency income                   | Show currency selector, convert for display                     |
| Income already spent                      | Still track for historical record                               |
| Expected income that doesn't arrive       | User can delete or mark as cancelled                            |
| Recurring income that stops unexpectedly  | User archives or marks end date                                 |
| Partial payment received                  | Track partial amount, update later if more comes                |
| Bartered goods/services                   | Suggest tracking fair market value if desired                   |
| Income shared with someone else           | Track user's portion only                                       |
| Reimbursement for expense already tracked | Note in metadata to avoid double-counting                       |
| Prize with non-cash component             | Track cash value portion                                        |

---

## 8. Data Priority for Calculations

### Monthly Income Calculation

```
Priority Order for Other Income:

1. One-time Income:
   └── NOT included in regular monthly projections
       • Shown only in the specific month
       • Included in annual totals

2. Recurring Income (fixed frequency):
   └── incomeAmount × frequency_to_monthly_factor

3. Recurring Income (irregular):
   ├── If monthly estimate provided:
   │   └── Use provided estimate
   │
   └── If annual estimate provided:
       └── annualEstimate / 12

4. Variable Income:
   └── Based on estimate type:
       • Conservative: incomeRangeLow
       • Average: (incomeRangeLow + incomeRangeHigh) / 2
       • Optimistic: incomeRangeHigh

5. If includeInProjections = false:
   └── Track but don't include in cash flow projections
```

### Confidence Scoring

```typescript
function getOtherIncomeConfidence(income: OtherIncome): IncomeConfidence {
  // One-time income has specific confidence
  if (income.isOneTime) {
    if (income.isReceived) {
      return 'high'; // Already received = certain
    }
    return 'medium'; // Expected but not received
  }

  // Recurring based on predictability
  if (income.predictability === 'highly_predictable') {
    return 'high';
  }

  if (income.predictability === 'somewhat_predictable') {
    return 'medium';
  }

  if (income.predictability === 'variable') {
    return 'low';
  }

  if (income.paymentFrequency === 'irregular') {
    return 'low';
  }

  // Include in projections flag
  if (!income.includeInProjections) {
    return 'very_low'; // User chose to exclude
  }

  return 'medium';
}
```

### Display in Projections

| Confidence | Display Treatment                            |
| ---------- | -------------------------------------------- |
| High       | Solid bar, fully included                    |
| Medium     | Solid bar, included with note                |
| Low        | Dashed bar, "variable" label                 |
| Very Low   | Not shown in projections, tracked separately |

---

## 9. Special Other Income Features

### Feature 1: One-time Income Calendar

Show upcoming and past one-time income:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 One-time Income                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  UPCOMING                                                   │
│                                                             │
│  Mar 15   Tax refund                    $1,850   ⏳ Expected│
│  Apr      Inheritance                   $25,000  ⏳ Expected│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  RECEIVED THIS YEAR                                         │
│                                                             │
│  Jan 15   Birthday gift from grandma    $500     ✅ Received│
│  Jan 5    Ethereum airdrop              $350     ✅ Received│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  2025 One-time Income Total:                                │
│                                                             │
│     Received:    $850                                       │
│     Expected:    $26,850                                    │
│     Total:       $27,700                                    │
│                                                             │
│  💡 One-time income is shown separately from your           │
│     regular monthly income.                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 2: Quick Add for Common Types

Shortcuts for quickly adding common other income:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ➕ Quick Add Other Income                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │            │ │            │ │            │              │
│  │   💝      │ │   💰      │ │   🏷️      │              │
│  │   Gift    │ │ Tax Refund │ │ Sold Item  │              │
│  │            │ │            │ │            │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │            │ │            │ │            │              │
│  │   🔄      │ │   🔧      │ │   ❓      │              │
│  │  Rebate   │ │  Odd Job   │ │  Other    │              │
│  │            │ │            │ │            │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Or start from scratch:                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  Add custom income                              │   │
│  │      (Full form with all options)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 3: Tax Summary for Other Income

Help users understand taxable other income:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Other Income Tax Summary                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LIKELY TAXABLE                            $2,750/year      │
│                                                             │
│  ├── Odd jobs for neighbors                $2,400           │
│  └── Crypto airdrop                        $350             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  LIKELY NOT TAXABLE                        $27,350/year     │
│                                                             │
│  ├── Birthday gift                         $500             │
│  ├── Tax refund                            $1,850           │
│  └── Inheritance                           $25,000          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  NOT SURE                                  $0               │
│                                                             │
│  (No items marked as uncertain)                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 This is for reference only. Please consult a tax        │
│     professional for advice specific to your situation.     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 4: Expected Income Tracking

For one-time income that hasn't arrived yet:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏳ Expected Income Update                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  You expected to receive "Tax refund" around March 15.      │
│  It's now March 20.                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What happened?                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  I received it!                                 │   │
│  │                                                     │   │
│  │      Amount received: $ [  1,850  ]                 │   │
│  │      Date received:   [ March 18, 2025 ]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  It's delayed                                   │   │
│  │                                                     │   │
│  │      New expected date: [ April 1, 2025 ]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  It's not coming                                │   │
│  │      (Remove from expected income)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰  Ask me again in a week                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Final Comparison: All Six Income Types

| Aspect                | Salary           | Freelance/Gig         | Rental           | Investment          | Benefits             | Other                        |
| --------------------- | ---------------- | --------------------- | ---------------- | ------------------- | -------------------- | ---------------------------- |
| **Predictability**    | High             | Variable              | Medium-High      | Varies              | Very High            | Varies                       |
| **Key Question**      | "Take-home pay?" | "How predictable?"    | "Rental type?"   | "Investment type?"  | "Benefit type?"      | "One-time or recurring?"     |
| **Typical User**      | Employees        | Self-employed         | Landlords        | Investors           | Retirees, recipients | Anyone                       |
| **Frequency**         | Biweekly/Monthly | Variable              | Monthly          | Quarterly/Monthly   | Monthly              | One-time or Varies           |
| **Duration**          | Ongoing          | Ongoing               | Ongoing          | Ongoing             | Permanent/Fixed      | Usually one-time             |
| **Complexity**        | Low              | High                  | Medium           | Medium-High         | Medium               | Low                          |
| **Tax Treatment**     | Withheld         | Self-managed          | Rental income    | Varies              | Varies               | Varies                       |
| **Cash Flow**         | Always cash      | Always cash           | Always cash      | Cash/Reinvested     | Always cash          | Always cash                  |
| **Special Features**  | Pay schedule     | Rate/estimate options | Expense tracking | Reinvestment, yield | COLA, end dates      | Quick add, expected tracking |
| **Screens (typical)** | 5-6              | 5-7                   | 5-7              | 5-6                 | 5-6                  | 4-5                          |

---

## 11. Summary: Complete Question List

### All Questions in Other Income Flow

| Step | Question                                   | Required? | Condition                  |
| ---- | ------------------------------------------ | --------- | -------------------------- |
| 1    | "What would you like to call this income?" | ✅ Yes    | Always                     |
| 1    | "What type of income is this?"             | Optional  | Always (category)          |
| 2    | "Is this a one-time or recurring income?"  | ✅ Yes    | Always (KEY QUESTION)      |
| 3A   | "How much is/was this income?"             | ✅ Yes    | If one-time                |
| 3A   | "Have you received this money yet?"        | ✅ Yes    | If one-time                |
| 3A   | "When did you receive it?"                 | ✅ Yes    | If one-time + received     |
| 3A   | "When do you expect to receive it?"        | ✅ Yes    | If one-time + expected     |
| 3A   | "Where is this income from?"               | Optional  | If one-time                |
| 3B   | "How much do you typically receive?"       | ✅ Yes    | If recurring               |
| 3B   | "How often do you receive this income?"    | ✅ Yes    | If recurring               |
| 3B   | "How predictable is this income?"          | ✅ Yes    | If recurring               |
| 3B   | "How would you like to estimate it?"       | ✅ Yes    | If irregular frequency     |
| 3B   | "What's the typical range?"                | ✅ Yes    | If variable predictability |
| 3B   | "Which estimate should we use?"            | ✅ Yes    | If variable predictability |
| 4    | "Where is this income from?"               | Optional  | Always                     |
| 4    | "Does this income have an end date?"       | Optional  | If recurring               |
| 4    | "Do you think this is taxable?"            | Optional  | Always                     |
| 4    | "Any notes you'd like to add?"             | Optional  | Always                     |
| 5    | "Does everything look correct?"            | ✅ Yes    | Always (confirmation)      |

---

## 12. Schema Skeleton (Complete)

```typescript
interface OtherIncome extends BaseIncome {
  incomeType: 'other';
  otherIncomeSubtype: OtherIncomeSubtype;

  // ===== IDENTIFICATION =====
  incomeSource?: string;
  notes?: string;

  // ===== INCOME DETAILS =====
  incomeAmount: CurrencyAmount;
  isOneTime: boolean;
  paymentFrequency?: PaymentFrequency | 'irregular';
  incomeDate?: Timestamp | Date;
  nextPaymentDate?: Timestamp | Date;

  // ===== PREDICTABILITY =====
  predictability?: IncomePredictability;
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;
  estimateType?: 'conservative' | 'average' | 'optimistic';

  // ===== DURATION =====
  hasEndDate?: boolean;
  endDate?: Timestamp | Date;

  // ===== TAX =====
  isTaxable?: boolean;
  taxNotes?: string;

  // ===== FLAGS =====
  isReceived?: boolean;
  includeInProjections: boolean;
}

type OtherIncomeSubtype =
  | 'gift'
  | 'inheritance'
  | 'prize_lottery'
  | 'sale_personal_items'
  | 'insurance_settlement'
  | 'legal_settlement'
  | 'tax_refund'
  | 'rebate_cashback'
  | 'odd_jobs'
  | 'crypto_airdrop'
  | 'found_money'
  | 'stipend'
  | 'allowance'
  | 'reimbursement'
  | 'other';
```
