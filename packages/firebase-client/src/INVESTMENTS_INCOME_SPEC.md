# Income Type #4: Investment Income

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

Income earned from investments including dividends, interest, capital gains, and other returns on financial assets. This income type ranges from highly predictable (bond interest, CD interest) to completely variable (capital gains from stock sales).

### Who uses this?

- Dividend investors (stocks, ETFs, mutual funds)
- Savers with high-yield savings accounts or CDs
- Bond holders receiving interest payments
- Retirees drawing from investment accounts
- Active traders realizing capital gains
- Royalty recipients (patents, licensing, creative works)
- Real estate investors (REITs)

### Why track it?

- Understand passive income streams
- Plan for irregular but expected payments (quarterly dividends)
- Track progress toward financial independence
- Balance investment income against expenses
- Tax planning (different tax treatments)
- Monitor portfolio income performance

### Key Challenges This Flow Must Solve

| Challenge                               | Solution                                   |
| --------------------------------------- | ------------------------------------------ |
| Many different income types             | Branch by investment income subtype        |
| Varying predictability                  | Assess predictability per subtype          |
| Quarterly vs monthly vs annual payments | Flexible frequency options                 |
| Reinvested vs cash dividends            | Ask if income is actually received as cash |
| Multiple accounts/holdings              | Option to track per-account or aggregate   |
| Tax-advantaged vs taxable accounts      | Capture account type for planning          |
| Capital gains are one-time              | Handle as irregular/one-time income        |
| Income may be small but meaningful      | Support any amount without judgment        |

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field             | Purpose                                   | User Knows This? |
| ----------------- | ----------------------------------------- | ---------------- |
| Income Name       | Identify this income source               | Always ✅        |
| Investment Type   | Categorization (dividend, interest, etc.) | Always ✅        |
| Amount (any form) | How much they receive                     | Usually ✅       |

### Optional but Valuable Data

| Field                     | Purpose                            | User Knows This? |
| ------------------------- | ---------------------------------- | ---------------- |
| Account/Institution Name  | Reference for multiple accounts    | Usually ✅       |
| Payment Frequency         | How often income is received       | Usually ✅       |
| Account Type              | Tax treatment (taxable, IRA, etc.) | Usually ✅       |
| Is Income Reinvested      | Affects cash flow calculations     | Always ✅        |
| Holdings/Ticker           | Detailed tracking                  | Sometimes        |
| Yield/Rate                | Calculate expected income          | Sometimes        |
| Principal/Portfolio Value | Calculate income from yield        | Sometimes        |
| Next Payment Date         | Cash flow timing                   | Sometimes        |

### Calculated/Derived Data (System Computes)

| Field           | Derived From                    |
| --------------- | ------------------------------- |
| Monthly Income  | Amount × Frequency adjustment   |
| Annual Income   | Monthly × 12 or direct annual   |
| Effective Yield | Annual Income ÷ Portfolio Value |

---

## 3. Schema Skeleton

```typescript
interface InvestmentIncome extends BaseIncome {
  incomeType: 'investment';
  investmentSubtype: InvestmentIncomeSubtype;

  // ===== ACCOUNT IDENTIFICATION =====

  /** Account or institution name */
  accountName?: string;

  /** Institution holding the investment */
  institutionName?: string;

  /** Account type for tax planning */
  accountType?: InvestmentAccountType;

  /** Specific holdings (optional detail) */
  holdings?: string; // e.g., "VYM, SCHD, JNJ"

  // ===== INCOME DETAILS =====

  /** How predictable is this income? */
  predictability: IncomePredictability;

  /** Income amount per period */
  incomeAmount?: CurrencyAmount;

  /** Payment frequency */
  paymentFrequency: PaymentFrequency | 'irregular';

  /** For interest: Annual rate (%) */
  annualRate?: number;

  /** For interest: Principal/balance amount */
  principalAmount?: CurrencyAmount;

  /** For dividends: Annual yield (%) */
  dividendYield?: number;

  /** For dividends: Portfolio value */
  portfolioValue?: CurrencyAmount;

  /** For capital gains: Is this one-time or recurring? */
  isOneTime?: boolean;

  // ===== CASH FLOW =====

  /** Is income reinvested or received as cash? */
  isReinvested: boolean;

  /** If partially reinvested, what percentage as cash? */
  cashPercentage?: number;

  // ===== TIMING =====

  /** Next expected payment date */
  nextPaymentDate?: Timestamp | Date;

  /** Specific payment months (for quarterly dividends) */
  paymentMonths?: number[]; // e.g., [3, 6, 9, 12] for Mar/Jun/Sep/Dec

  // ===== VARIABILITY =====

  /** For variable income: typical range */
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;

  /** Is income expected to grow? */
  expectedGrowthRate?: number; // Annual % growth

  // ===== FLAGS =====

  /** Is this a tax-advantaged account? */
  isTaxAdvantaged?: boolean;

  /** For retirees: Is this a required minimum distribution? */
  isRMD?: boolean;
}

type InvestmentIncomeSubtype =
  | 'dividends' // Stock/ETF/mutual fund dividends
  | 'interest' // Savings, CDs, bonds
  | 'capital_gains' // From selling investments
  | 'distributions' // Retirement account distributions
  | 'royalties' // Patents, licensing, creative works
  | 'reit' // Real estate investment trust income
  | 'other';

type InvestmentAccountType =
  | 'taxable' // Regular brokerage account
  | 'traditional_ira' // Traditional IRA
  | 'roth_ira' // Roth IRA
  | '401k' // 401(k)
  | 'hsa' // Health Savings Account
  | 'savings' // Savings account
  | 'cd' // Certificate of Deposit
  | 'other';

type IncomePredictability =
  | 'highly_predictable' // Fixed interest, stable dividends
  | 'somewhat_predictable' // Regular but variable dividends
  | 'variable' // Fluctuating income
  | 'unpredictable'; // One-time or sporadic
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         INVESTMENT INCOME FLOW                                   │
│                                                                                  │
│  ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────┐  │
│  │ 1   │──▶│ 2   │──▶│ 3       │──▶│ 4       │──▶│ 5       │──▶│ 6           │  │
│  │Name │   │Type │   │Amount   │   │Cash vs  │   │Timing   │   │Confirm      │  │
│  │     │   │     │   │         │   │Reinvest │   │         │   │             │  │
│  └─────┘   └─────┘   └─────────┘   └─────────┘   └─────────┘   └─────────────┘  │
│                │           │                                                     │
│       ┌────────┴───────────┴────────────┐                                       │
│       ▼        ▼           ▼            ▼                                       │
│  [Dividends] [Interest] [Cap Gains] [Distributions]                             │
│       │        │           │            │                                       │
│       ▼        ▼           ▼            ▼                                       │
│  (Yield or  (Rate or   (One-time    (Regular                                    │
│   amount)   amount)     or est.)    withdrawal)                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Account

**Screen Title:** "Let's add your investment income"

**Purpose:** Identify the income stream and its source

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Let's add your investment income                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this income?                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dividend income from Fidelity                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Examples: "Vanguard dividends", "High-yield savings    │
│     interest", "Bond income"                               │
│                                                             │
│                                                             │
│  Where is this investment held? (optional)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fidelity Investments                                │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Bank, brokerage, or institution name                   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What type of account is this?                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Taxable brokerage account                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Taxable brokerage account                     │     │
│    │ • Traditional IRA                               │     │
│    │ • Roth IRA                                      │     │
│    │ • 401(k)                                        │     │
│    │ • Savings account                               │     │
│    │ • Certificate of Deposit (CD)                   │     │
│    │ • Health Savings Account (HSA)                  │     │
│    │ • Other / I'm not sure                          │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  💡 This helps with tax planning - skip if unsure          │
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
- `institutionName` (optional)
- `accountType`: InvestmentAccountType (optional but helpful)

**Smart Defaults:**

- If account type is "Savings account" or "CD" → pre-select "Interest" in Step 2
- If account type is "Traditional IRA" or "401k" → pre-select "Distributions" for retirees

---

### STEP 2: Investment Income Type

**Screen Title:** "What type of investment income is this?"

**Purpose:** Determine the category - this is the KEY branching question

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 What type of investment income is this?                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select the type that best describes this income:           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📊  Dividends                                      │   │
│  │                                                     │   │
│  │      Income from stocks, ETFs, or mutual funds      │   │
│  │      Usually paid quarterly                         │   │
│  │                                          ⭐ Common  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏦  Interest                                       │   │
│  │                                                     │   │
│  │      From savings accounts, CDs, or bonds           │   │
│  │      Usually predictable and regular                │   │
│  │                                          ⭐ Common  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  Capital Gains                                  │   │
│  │                                                     │   │
│  │      Profits from selling investments               │   │
│  │      One-time or occasional                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎂  Retirement Distributions                       │   │
│  │                                                     │   │
│  │      Withdrawals from IRA, 401(k), pension          │   │
│  │      Regular retirement income                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏢  REIT Distributions                             │   │
│  │                                                     │   │
│  │      Income from real estate investment trusts      │   │
│  │      Similar to dividends but from real estate      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ©️  Royalties                                       │   │
│  │                                                     │   │
│  │      From patents, licensing, creative works        │   │
│  │      Books, music, inventions, etc.                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other investment income                        │   │
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

- `investmentSubtype`: InvestmentIncomeSubtype

**Critical Branching:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  "Dividends"                                                │
│       │                                                     │
│       └──▶ STEP 3A: Dividend Income Flow                   │
│            (Yield-based or amount-based entry)              │
│                                                             │
│  "Interest"                                                 │
│       │                                                     │
│       └──▶ STEP 3B: Interest Income Flow                   │
│            (Rate-based or amount-based entry)               │
│                                                             │
│  "Capital Gains"                                            │
│       │                                                     │
│       └──▶ STEP 3C: Capital Gains Flow                     │
│            (One-time or estimated recurring)                │
│                                                             │
│  "Retirement Distributions"                                 │
│       │                                                     │
│       └──▶ STEP 3D: Distribution Flow                      │
│            (Fixed withdrawal amount)                        │
│                                                             │
│  "REIT Distributions"                                       │
│       │                                                     │
│       └──▶ STEP 3A: Dividend Income Flow (same as dividends)│
│                                                             │
│  "Royalties"                                                │
│       │                                                     │
│       └──▶ STEP 3E: Royalties Flow                         │
│            (Similar to freelance - predictability-based)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 3A: Dividend Income

**Screen Title:** "Tell us about your dividend income"

#### STEP 3A-1: Entry Method Selection

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Tell us about your dividend income                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the easiest way for you to enter this income?       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💵  I know how much I receive                      │   │
│  │                                                     │   │
│  │      I can enter the dollar amount per period       │   │
│  │      (e.g., "$150 per quarter")                     │   │
│  │                                          ⭐ Easiest │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  I know my portfolio value and yield            │   │
│  │                                                     │   │
│  │      I'll enter my investment value and             │   │
│  │      dividend yield percentage                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📅  I know my annual dividend total                │   │
│  │                                                     │   │
│  │      I'll enter what I received last year           │   │
│  │      as an estimate for this year                   │   │
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

**Branching:**

- "I know how much I receive" → Step 3A-2a
- "I know my portfolio value and yield" → Step 3A-2b
- "I know my annual dividend total" → Step 3A-2c

---

#### STEP 3A-2a: Dividend Amount Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much do you receive in dividends?                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you typically receive per payment?             │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 350                            │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  How often do you receive dividend payments?                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Quarterly (every 3 months)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Monthly                                       │     │
│    │ • Quarterly (every 3 months)        ⭐ Common   │     │
│    │ • Semi-annually (twice a year)                  │     │
│    │ • Annually (once a year)                        │     │
│    │ • Irregular / varies                            │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to:                                      │
│                                                             │
│     • $116.67/month                                         │
│     • $1,400/year                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How predictable is this dividend income?                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Very predictable                               │   │
│  │      Stable companies, rarely changes               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊  Somewhat predictable                           │   │
│  │      Usually consistent but may vary                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Variable                                       │   │
│  │      Changes frequently based on company earnings   │   │
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
- `paymentFrequency`: PaymentFrequency
- `predictability`: IncomePredictability

---

#### STEP 3A-2b: Dividend Yield Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Enter your portfolio details                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the approximate value of this investment?           │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 50,000                         │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Use the current market value                            │
│                                                             │
│                                                             │
│  What's the dividend yield?                                 │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 3.5                            │  %           │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 You can find this on your brokerage statement           │
│     or by searching the ticker symbol                       │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Estimated dividend income:                              │
│                                                             │
│     $50,000 × 3.5% = $1,750/year                           │
│                                                             │
│     • ~$145.83/month                                        │
│     • ~$437.50/quarter                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How often are dividends paid?                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Quarterly (every 3 months)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `portfolioValue`: CurrencyAmount
- `dividendYield`: number (percentage)
- `paymentFrequency`: PaymentFrequency
- `incomeAmount`: CurrencyAmount (calculated)

---

#### STEP 3A-2c: Annual Dividend Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 How much did you receive last year?                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What was your total dividend income last year?             │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,400                          │  .00 /year   │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Check your 1099-DIV or brokerage annual statement      │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Do you expect this year to be similar?                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, about the same                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📈  Higher (I've added to my investments)          │   │
│  │                                                     │   │
│  │      Expected this year: $________                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Lower (I've sold some investments)             │   │
│  │                                                     │   │
│  │      Expected this year: $________                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Using $2,400/year:                                      │
│                                                             │
│     • $200/month                                            │
│     • $600/quarter                                          │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeAmount`: CurrencyAmount (annual, converted to period)
- `paymentFrequency`: 'quarterly' (default for dividends)

---

### STEP 3B: Interest Income

**Screen Title:** "Tell us about your interest income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏦 Tell us about your interest income                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the easiest way for you to enter this income?       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💵  I know my monthly/annual interest              │   │
│  │                                                     │   │
│  │      I can enter the dollar amount I receive        │   │
│  │                                          ⭐ Easiest │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  I know my balance and interest rate            │   │
│  │                                                     │   │
│  │      I'll enter my account balance and APY          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### STEP 3B-1: Interest Amount Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much interest do you earn?                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much interest do you typically receive?                │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 85                             │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per ┌─────────────────┐                        │
│                 │ ▼  month        │                        │
│                 └─────────────────┘                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to:                                      │
│                                                             │
│     • $85/month                                             │
│     • $1,020/year                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Interest income is typically very predictable.          │
│     We'll flag this as reliable income.                     │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeAmount`: CurrencyAmount
- `paymentFrequency`: PaymentFrequency
- `predictability`: 'highly_predictable' (auto-set for interest)

---

#### STEP 3B-2: Interest Rate Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Enter your account details                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's your current account balance?                       │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 25,000                         │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  What's the annual interest rate (APY)?                     │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 4.5                            │  % APY       │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Check your account or recent statement for the APY     │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Estimated interest income:                              │
│                                                             │
│     $25,000 × 4.5% = $1,125/year                           │
│                                                             │
│     • ~$93.75/month                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️  Note: If your balance changes, your interest will too. │
│      You can update this anytime.                           │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `principalAmount`: CurrencyAmount
- `annualRate`: number (percentage)
- `incomeAmount`: CurrencyAmount (calculated)
- `paymentFrequency`: 'monthly' (default for interest)

---

### STEP 3C: Capital Gains

**Screen Title:** "Tell us about your capital gains"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Tell us about your capital gains                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Capital gains come from selling investments at a profit.   │
│  How would you describe this income?                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎯  One-time gain                                  │   │
│  │                                                     │   │
│  │      I sold an investment and made a profit         │   │
│  │      This is a specific, one-time amount            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔄  Regular trading gains                          │   │
│  │                                                     │   │
│  │      I actively trade and regularly realize gains   │   │
│  │      I can estimate my typical monthly/annual gains │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📊  Fund distributions                             │   │
│  │                                                     │   │
│  │      My mutual fund distributes capital gains       │   │
│  │      Usually happens annually in December           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### STEP 3C-1: One-time Capital Gain

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎯 One-time capital gain                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much was/will be your capital gain?                    │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 5,000                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 This is the profit (sale price minus what you paid)    │
│                                                             │
│                                                             │
│  When did/will you receive this?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  January 15, 2025                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Since this is a one-time gain:                          │
│                                                             │
│     • We'll add $5,000 to that month's income               │
│     • It won't be included in regular monthly projections   │
│     • We'll note it separately in your annual view          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Do you expect more capital gains this year?                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  No, this is the only one                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, I might have more                         │   │
│  │      (I'll add them separately when they happen)    │   │
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
- `isOneTime`: true
- `nextPaymentDate`: Date
- `paymentFrequency`: 'one_time'

---

#### STEP 3C-2: Regular Trading Gains

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔄 Regular trading gains                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Since trading gains vary, let's estimate your typical      │
│  income from trading.                                       │
│                                                             │
│                                                             │
│  In an average month, how much do you make from trading?    │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 500                            │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Be conservative - some months may be losses            │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How predictable is this income?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊  Somewhat predictable                           │   │
│  │      I usually make something most months           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Very variable                                  │   │
│  │      Big swings - sometimes gains, sometimes losses │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️  Trading income is highly variable. We'll flag this     │
│      as unpredictable in your projections.                  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeAmount`: CurrencyAmount (monthly estimate)
- `paymentFrequency`: 'monthly'
- `predictability`: 'variable' or 'unpredictable'
- `isOneTime`: false

---

### STEP 3D: Retirement Distributions

**Screen Title:** "Tell us about your retirement income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎂 Tell us about your retirement distributions             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What type of retirement account is this from?              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋  Traditional IRA                                │   │
│  │      Pre-tax contributions, taxed on withdrawal     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🌟  Roth IRA                                       │   │
│  │      After-tax contributions, tax-free withdrawal   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏢  401(k) / 403(b)                                │   │
│  │      Employer-sponsored retirement plan             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎖️  Pension                                        │   │
│  │      Defined benefit from employer                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other retirement account                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### STEP 3D-2: Distribution Amount

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much do you withdraw?                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you receive from this retirement account?      │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,000                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per ┌─────────────────┐                        │
│                 │ ▼  month        │                        │
│                 └─────────────────┘                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to:                                      │
│                                                             │
│     • $2,000/month                                          │
│     • $24,000/year                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Is this a Required Minimum Distribution (RMD)?             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, this is my RMD                            │   │
│  │      (Required withdrawal based on my age)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  No, this is my chosen withdrawal amount        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure                                   │   │
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
- `paymentFrequency`: PaymentFrequency
- `accountType`: InvestmentAccountType
- `isRMD`: boolean
- `predictability`: 'highly_predictable' (retirement distributions are fixed)

---

### STEP 3E: Royalties

**Screen Title:** "Tell us about your royalty income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ©️ Tell us about your royalty income                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What type of royalties do you receive?                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📚  Book / Publishing royalties                    │   │
│  │      From book sales, articles, etc.                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎵  Music / Media royalties                        │   │
│  │      From songs, videos, streaming, etc.            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💡  Patent / Invention royalties                   │   │
│  │      From licensing inventions or patents           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🖼️  Licensing / Image royalties                    │   │
│  │      From photos, artwork, brand licensing          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⛽  Mineral / Oil & Gas royalties                  │   │
│  │      From land or mineral rights                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other royalties                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### STEP 3E-2: Royalty Amount & Predictability

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much do you receive in royalties?                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How predictable is this royalty income?                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯  Very predictable                               │   │
│  │      Licensed for a fixed amount, steady sales      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊  Somewhat predictable                           │   │
│  │      Generally consistent with some variation       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Variable / Unpredictable                       │   │
│  │      Depends on sales, streams, usage, etc.         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (Based on selection, show appropriate input:)              │
│                                                             │
│  For "Very predictable":                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  How much do you receive?                           │   │
│  │                                                     │   │
│  │      $ [________] per [month ▼]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  For "Variable":                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  What's your typical monthly range?                 │   │
│  │                                                     │   │
│  │      Low month:  $ [________]                       │   │
│  │      Good month: $ [________]                       │   │
│  │                                                     │   │
│  │  Which estimate should we use?                      │   │
│  │  ○ Conservative  ● Average  ○ Optimistic            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `predictability`: IncomePredictability
- `incomeAmount`: CurrencyAmount (or range)
- `incomeRangeLow` / `incomeRangeHigh`: CurrencyAmount (if variable)
- `paymentFrequency`: PaymentFrequency

---

### STEP 4: Cash Flow Question

**Screen Title:** "Do you receive this as cash?"

**Purpose:** Determine if this income affects actual cash flow (crucial for reinvested dividends)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💸 Do you receive this income as cash?                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  This helps us understand your actual cash flow.            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💵  Yes, I receive it as cash                      │   │
│  │                                                     │   │
│  │      The money is deposited to my bank account      │   │
│  │      or available to spend                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🔄  No, it's automatically reinvested              │   │
│  │                                                     │   │
│  │      The income is used to buy more shares          │   │
│  │      (DRIP - Dividend Reinvestment Plan)            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ➗  Some cash, some reinvested                     │   │
│  │                                                     │   │
│  │      Part of it is reinvested, part is paid out     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If "Some cash, some reinvested" selected:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ➗ How much do you receive as cash?                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What percentage of this income do you receive as cash?     │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 50                             │  %           │
│             └────────────────────────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Based on $350/quarter in dividends:                     │
│                                                             │
│     • Total dividend income:    $350/quarter                │
│     • Received as cash (50%):   $175/quarter                │
│     • Reinvested (50%):         $175/quarter                │
│                                                             │
│  💡 For cash flow, we'll use $175/quarter ($58/month)      │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `isReinvested`: boolean
- `cashPercentage`: number (if partially reinvested)

**Important Logic:**

- If fully reinvested → Income is tracked but NOT included in cash flow projections
- If partially reinvested → Only cash portion included in cash flow
- User still sees total income for net worth/portfolio tracking

---

### STEP 5: Payment Timing

**Screen Title:** "When do you receive this income?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you receive this income?                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (For quarterly dividends:)                                 │
│                                                             │
│  Which months do you typically receive payments?            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  January, April, July, October                  │   │
│  │      (Cycle 1)                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  February, May, August, November                │   │
│  │      (Cycle 2)                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  March, June, September, December   ⭐ Common   │   │
│  │      (Cycle 3)                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔀  Mixed / Multiple cycles                        │   │
│  │      I have investments in different cycles         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When do you expect the next payment?                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  March 15, 2025                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       ⏭️  Skip timing details                       │   │
│  │       I'll add this later                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `paymentMonths`: number[] (e.g., [3, 6, 9, 12])
- `nextPaymentDate`: Date

**Context-Sensitive Timing Screens:**

| Income Type              | Timing Question                                 |
| ------------------------ | ----------------------------------------------- |
| Dividends (Quarterly)    | Which quarter cycle? (3 options)                |
| Dividends (Monthly)      | What day of month?                              |
| Interest (Monthly)       | What day of month? (often end of month)         |
| Interest (Annual - CD)   | What month does the CD mature?                  |
| Capital Gains (One-time) | Already captured in amount step                 |
| Distributions            | What day of month?                              |
| Royalties                | How often paid? (monthly/quarterly/semi-annual) |

---

#### STEP 5 Alternative: Interest Timing

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you receive interest?                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How is your interest paid?                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Monthly                                        │   │
│  │      Interest is credited every month               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Quarterly                                      │   │
│  │      Interest is credited every 3 months            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  At maturity (CDs)                              │   │
│  │      Interest is paid when the CD matures           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Annually                                       │   │
│  │      Interest is paid once per year                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (If "At maturity" selected:)                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When does your CD mature?                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  September 15, 2025                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 We'll show this as a one-time income on that date      │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 6: Confirmation & Summary

**Screen Title:** "Review your investment income"

#### Dividend Income Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your investment income                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📊  Dividend income from Fidelity                  │   │
│  │      Fidelity Investments                           │   │
│  │                           Taxable brokerage account │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Type:                   Dividends               │   │
│  │     Amount:                 $350/quarter            │   │
│  │     Frequency:              Quarterly               │   │
│  │     Payment months:         Mar, Jun, Sep, Dec      │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 CALCULATED                                      │   │
│  │                                                     │   │
│  │     Monthly average:        $116.67                 │   │
│  │     Annual total:           $1,400                  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 CASH FLOW                                       │   │
│  │                                                     │   │
│  │     Received as cash:       ✅ Yes                  │   │
│  │     Included in cash flow:  $116.67/month           │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📈 PREDICTABILITY                                  │   │
│  │                                                     │   │
│  │     Confidence:             Somewhat predictable    │   │
│  │     Next payment:           March 15, 2025          │   │
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

#### Interest Income Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your investment income                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏦  High-yield savings interest                    │   │
│  │      Marcus by Goldman Sachs                        │   │
│  │                                      Savings account│   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Type:                   Interest                │   │
│  │     Balance:                $25,000                 │   │
│  │     APY:                    4.5%                    │   │
│  │     Frequency:              Monthly                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 CALCULATED                                      │   │
│  │                                                     │   │
│  │     Monthly interest:       ~$93.75                 │   │
│  │     Annual total:           ~$1,125                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 CASH FLOW                                       │   │
│  │                                                     │   │
│  │     Received as cash:       ✅ Yes                  │   │
│  │     Included in cash flow:  $93.75/month            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📈 PREDICTABILITY                                  │   │
│  │                                                     │   │
│  │     Confidence:             High                    │   │
│  │     ⚠️ Note: Will vary if balance or rate changes   │   │
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

#### Reinvested Dividend Summary (Special Case):

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your investment income                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📊  Vanguard DRIP dividends                        │   │
│  │      Vanguard                                       │   │
│  │                                          Roth IRA   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Type:                   Dividends               │   │
│  │     Portfolio value:        $100,000                │   │
│  │     Dividend yield:         2.5%                    │   │
│  │     Frequency:              Quarterly               │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 CALCULATED                                      │   │
│  │                                                     │   │
│  │     Quarterly dividend:     ~$625                   │   │
│  │     Annual total:           ~$2,500                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 CASH FLOW                                       │   │
│  │                                                     │   │
│  │     Received as cash:       ❌ No (Reinvested)      │   │
│  │     Included in cash flow:  $0                      │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💡 This income grows your investment but doesn't   │   │
│  │     add to your spendable cash flow.                │   │
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

#### One-time Capital Gain Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your investment income                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  Stock sale - Apple shares                      │   │
│  │      Charles Schwab                                 │   │
│  │                           Taxable brokerage account │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 INCOME DETAILS                                  │   │
│  │                                                     │   │
│  │     Type:                   Capital Gain            │   │
│  │     Amount:                 $5,000                  │   │
│  │     Frequency:              One-time                │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📅 TIMING                                          │   │
│  │                                                     │   │
│  │     Date received:          January 15, 2025        │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 CASH FLOW IMPACT                                │   │
│  │                                                     │   │
│  │     This will appear as a one-time income           │   │
│  │     of $5,000 in January 2025.                      │   │
│  │                                                     │   │
│  │     ⚠️ Not included in regular monthly projections  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💡 TAX NOTE                                        │   │
│  │                                                     │   │
│  │     Capital gains may be subject to taxes.          │   │
│  │     Consider setting aside funds for tax time.      │   │
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
│ STEP 1: Name & Account              │
│                                     │
│ Q: "What would you like to call     │
│    this income?"                    │
│ Q: "Where is this investment held?" │
│ Q: "What type of account is this?"  │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Investment Income Type (KEY BRANCHING QUESTION)                     │
│                                                                             │
│ Q: "What type of investment income is this?"                                │
│                                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│ │Dividends │ │Interest  │ │Cap Gains │ │Distrib.  │ │  REIT    │ │Royalty│ │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │
│      │            │            │            │            │           │     │
└──────┼────────────┼────────────┼────────────┼────────────┼───────────┼─────┘
       │            │            │            │            │           │
       ▼            │            │            │            │           │
┌──────────────┐    │            │            │            │           │
│ STEP 3A:     │    │            │            │            │           │
│ Dividends    │    │            │            │            │           │
│              │    │            │            │            │           │
│ Q: "Easiest  │    │            │            │            │           │
│    way to    │    │            │            │            │           │
│    enter?"   │    │            │            │            │           │
│              │    │            │            │            │           │
│ ┌─────────┐  │    │            │            │            │           │
│ │Amount   │  │    │            │            │            │           │
│ │per period│ │    │            │            │            │           │
│ └────┬────┘  │    │            │            │            │           │
│      │       │    │            │            │            │           │
│ ┌─────────┐  │    │            │            │            │           │
│ │Portfolio│  │    │            │            │            │           │
│ │+ Yield  │  │    │            │            │            │           │
│ └────┬────┘  │    │            │            │            │           │
│      │       │    │            │            │            │           │
│ ┌─────────┐  │    │            │            │            │           │
│ │Annual   │  │    │            │            │            │           │
│ │total    │  │    │            │            │            │           │
│ └────┬────┘  │    │            │            │            │           │
└──────┼───────┘    │            │            │            │           │
       │            ▼            │            │            │           │
       │   ┌──────────────┐      │            │            │           │
       │   │ STEP 3B:     │      │            │            │           │
       │   │ Interest     │      │            │            │           │
       │   │              │      │            │            │           │
       │   │ Q: "Easiest  │      │            │            │           │
       │   │    way?"     │      │            │            │           │
       │   │              │      │            │            │           │
       │   │ ┌─────────┐  │      │            │            │           │
       │   │ │Amount   │  │      │            │            │           │
       │   │ └────┬────┘  │      │            │            │           │
       │   │      │       │      │            │            │           │
       │   │ ┌─────────┐  │      │            │            │           │
       │   │ │Balance +│  │      │            │            │           │
       │   │ │APY      │  │      │            │            │           │
       │   │ └────┬────┘  │      │            │            │           │
       │   └──────┼───────┘      │            │            │           │
       │          │              ▼            │            │           │
       │          │     ┌──────────────┐      │            │           │
       │          │     │ STEP 3C:     │      │            │           │
       │          │     │ Capital Gains│      │            │           │
       │          │     │              │      │            │           │
       │          │     │ Q: "Type of  │      │            │           │
       │          │     │    gain?"    │      │            │           │
       │          │     │              │      │            │           │
       │          │     │ ┌─────────┐  │      │            │           │
       │          │     │ │One-time │  │      │            │           │
       │          │     │ └────┬────┘  │      │            │           │
       │          │     │      │       │      │            │           │
       │          │     │ ┌─────────┐  │      │            │           │
       │          │     │ │Regular  │  │      │            │           │
       │          │     │ │trading  │  │      │            │           │
       │          │     │ └────┬────┘  │      │            │           │
       │          │     │      │       │      │            │           │
       │          │     │ ┌─────────┐  │      │            │           │
       │          │     │ │Fund     │  │      │            │           │
       │          │     │ │distrib. │  │      │            │           │
       │          │     │ └────┬────┘  │      │            │           │
       │          │     └──────┼───────┘      │            │           │
       │          │            │              ▼            │           │
       │          │            │     ┌──────────────┐      │           │
       │          │            │     │ STEP 3D:     │      │           │
       │          │            │     │ Retirement   │      │           │
       │          │            │     │ Distributions│      │           │
       │          │            │     │              │      │           │
       │          │            │     │ Q: "Account  │      │           │
       │          │            │     │    type?"    │      │           │
       │          │            │     │              │      │           │
       │          │            │     │ Q: "Amount?" │      │           │
       │          │            │     │              │      │           │
       │          │            │     │ Q: "Is RMD?" │      │           │
       │          │            │     └──────┬───────┘      │           │
       │          │            │            │              │           │
       │          │            │            │     ┌────────┘           │
       │          │            │            │     │                    │
       │          │            │            │     │          ┌─────────┘
       │          │            │            │     │          │
       │          │            │            │     ▼          ▼
       │          │            │            │  (Same as   ┌──────────────┐
       │          │            │            │  Dividends) │ STEP 3E:     │
       │          │            │            │             │ Royalties    │
       │          │            │            │             │              │
       │          │            │            │             │ Q: "Type of  │
       │          │            │            │             │    royalty?" │
       │          │            │            │             │              │
       │          │            │            │             │ Q: "Predict- │
       │          │            │            │             │    ability?" │
       │          │            │            │             │              │
       │          │            │            │             │ Q: "Amount?" │
       │          │            │            │             └──────┬───────┘
       │          │            │            │                    │
       ▼          ▼            ▼            ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Cash Flow Question                                                  │
│                                                                             │
│ Q: "Do you receive this income as cash?"                                    │
│                                                                             │
│ ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐ │
│ │ Yes, as cash       │  │ No, reinvested     │  │ Some cash, some reinv. │ │
│ └─────────┬──────────┘  └─────────┬──────────┘  └───────────┬────────────┘ │
│           │                       │                         │              │
│           │                       │             ┌───────────┘              │
│           │                       │             ▼                          │
│           │                       │   ┌────────────────────┐               │
│           │                       │   │ Q: "What % as cash?"│              │
│           │                       │   └─────────┬──────────┘               │
│           │                       │             │                          │
│ (Full amount in                   │   (Partial amount                      │
│  cash flow)            (Not in cash flow,       in cash flow)              │
│                        tracked for             │                           │
│                        portfolio only)         │                           │
└───────────┼───────────────────────┼────────────┼───────────────────────────┘
            │                       │            │
            └───────────────────────┼────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Payment Timing                                                      │
│                                                                             │
│ Q: Varies by income type:                                                   │
│                                                                             │
│ • Dividends: "Which quarter cycle?" / "Which months?"                       │
│ • Interest:  "How often paid?" / "When does CD mature?"                     │
│ • Cap Gains: "When received?" (if one-time)                                 │
│ • Distrib.:  "What day of month?"                                           │
│ • Royalties: "How often paid?"                                              │
│                                                                             │
│ Q: "When do you expect the next payment?"                                   │
│                                                                             │
│ [Skip for now] option available                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────┐
│ STEP 6: Review & Confirm            │
│                                     │
│ Shows all entered data              │
│ Shows calculated monthly/annual     │
│ Shows cash flow impact              │
│ Shows predictability                │
│ Shows tax notes (if applicable)     │
│                                     │
│ [Edit] or [Save Income ✓]           │
└─────────────────────────────────────┘
                                    │
                                    ▼
                                  DONE
```

---

## 6. Minimum Path Examples

### Example 1: Simple Dividend Income (Shortest Path)

```
Step 1 → Enter name "Vanguard dividends", skip institution, skip account type
     → Step 2 → Select "Dividends"
     → Step 3A-1 → Select "I know how much I receive"
     → Step 3A-2a → Enter $300/quarter, "Somewhat predictable"
     → Step 4 → Select "Yes, I receive it as cash"
     → Step 5 → Select "Mar, Jun, Sep, Dec" cycle, skip next payment
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, amount, frequency, cash flow status
```

### Example 2: High-Yield Savings Interest (Rate-Based)

```
Step 1 → Enter name + institution "Marcus savings", account type "Savings"
     → Step 2 → Select "Interest"
     → Step 3B → Select "Balance and rate"
     → Step 3B-2 → Enter $25,000 balance, 4.5% APY
     → Step 4 → Select "Yes, I receive it as cash"
     → Step 5 → Select "Monthly"
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, institution, type, balance, rate, frequency
```

### Example 3: Reinvested DRIP Dividends

```
Step 1 → Enter name "Fidelity DRIP", institution, account type "Roth IRA"
     → Step 2 → Select "Dividends"
     → Step 3A-1 → Select "Portfolio value and yield"
     → Step 3A-2b → Enter $80,000 value, 3% yield
     → Step 4 → Select "No, it's automatically reinvested"
     → Step 5 → Skip (reinvested, timing less important)
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, portfolio, yield, reinvestment status
Special: Not included in cash flow projections
```

### Example 4: One-Time Capital Gain

```
Step 1 → Enter name "AAPL stock sale"
     → Step 2 → Select "Capital Gains"
     → Step 3C → Select "One-time gain"
     → Step 3C-1 → Enter $5,000, date January 15, 2025
     → Step 4 → (Skipped - one-time always cash)
     → Step 5 → (Skipped - already entered date)
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, date
Special: Marked as one-time, not in recurring projections
```

### Example 5: Retirement Distribution (RMD)

```
Step 1 → Enter name "IRA distribution", institution "Vanguard"
     → Step 2 → Select "Retirement Distributions"
     → Step 3D → Select "Traditional IRA"
     → Step 3D-2 → Enter $2,000/month, "Yes, this is my RMD"
     → Step 4 → Select "Yes, I receive it as cash"
     → Step 5 → Enter payment day (15th)
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, account type, amount, RMD status, frequency
```

### Example 6: Variable Royalty Income

```
Step 1 → Enter name "Book royalties"
     → Step 2 → Select "Royalties"
     → Step 3E → Select "Book/Publishing royalties"
     → Step 3E-2 → Select "Variable", enter range $200-$800, use "Average"
     → Step 4 → Select "Yes, I receive it as cash"
     → Step 5 → Select "Quarterly"
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, range, estimate method, frequency
```

---

## 7. Edge Cases & Handling

| Scenario                                  | Handling                                              |
| ----------------------------------------- | ----------------------------------------------------- |
| Dividends reinvested (DRIP)               | Track income but exclude from cash flow projections   |
| Partially reinvested                      | Calculate cash portion only for cash flow             |
| Multiple dividend stocks in one account   | Option to track aggregate or suggest separate entries |
| Dividend amount varies each quarter       | Capture as "somewhat predictable", use average        |
| CD matures mid-year                       | Show as one-time income on maturity date              |
| Interest rate changes frequently          | Note that income will vary, user can update           |
| Capital loss (not gain)                   | Out of scope - suggest tracking only gains            |
| Foreign dividends with withholding        | Track net amount received                             |
| Qualified vs ordinary dividends           | Metadata note for tax planning (optional)             |
| Cryptocurrency staking rewards            | Categorize as "Other" or "Interest" equivalent        |
| Annuity payments                          | Categorize as "Distributions"                         |
| Trust distributions                       | Categorize as "Distributions" with custom note        |
| Inherited IRA distributions               | Special RMD rules - note in metadata                  |
| Roth conversion (not income)              | Out of scope - not actually income                    |
| Tax-advantaged account (no immediate tax) | Flag account type, note in summary                    |

---

## 8. Data Priority for Calculations

### Monthly Income Calculation Priority

```
Priority Order for Investment Income:

1. Dividends:
   ├── If user provided amount per period:
   │   └── incomeAmount × frequency_to_monthly_factor
   │
   └── If user provided portfolio + yield:
       └── portfolioValue × dividendYield / 100 / 12

2. Interest:
   ├── If user provided amount per period:
   │   └── incomeAmount × frequency_to_monthly_factor
   │
   └── If user provided balance + rate:
       └── principalAmount × annualRate / 100 / 12

3. Capital Gains:
   ├── If one-time:
   │   └── Full amount in specified month only
   │
   └── If recurring trading:
       └── estimatedMonthlyIncome (flagged as variable)

4. Distributions:
   └── incomeAmount × frequency_to_monthly_factor
       (High confidence - fixed withdrawal)

5. Royalties:
   ├── If predictable:
   │   └── incomeAmount × frequency_to_monthly_factor
   │
   └── If variable:
       └── Use selected estimate (conservative/average/optimistic)

6. Cash Flow Adjustment:
   └── Monthly Income × cashPercentage / 100
       (If reinvested, multiply by 0)
```

### Frequency Conversion Factors

```typescript
const frequencyToMonthly = {
  monthly: 1,
  quarterly: 1 / 3, // 0.333...
  semi_annually: 1 / 6, // 0.166...
  annually: 1 / 12, // 0.083...
  one_time: 0, // Handled separately
};

const frequencyToAnnual = {
  monthly: 12,
  quarterly: 4,
  semi_annually: 2,
  annually: 1,
  one_time: 1, // Full amount once
};
```

### Confidence Scoring

```typescript
function getInvestmentIncomeConfidence(
  income: InvestmentIncome
): IncomeConfidence {
  // Interest is highly predictable
  if (income.investmentSubtype === 'interest') {
    return 'high';
  }

  // Retirement distributions are highly predictable
  if (income.investmentSubtype === 'distributions') {
    return 'high';
  }

  // Dividends depend on user assessment
  if (income.investmentSubtype === 'dividends') {
    if (income.predictability === 'highly_predictable') return 'high';
    if (income.predictability === 'somewhat_predictable') return 'medium';
    return 'low';
  }

  // Capital gains
  if (income.investmentSubtype === 'capital_gains') {
    if (income.isOneTime) return 'medium'; // Known amount, known date
    return 'very_low'; // Trading gains are unpredictable
  }

  // Royalties depend on user assessment
  if (income.investmentSubtype === 'royalties') {
    if (income.predictability === 'highly_predictable') return 'high';
    if (income.predictability === 'somewhat_predictable') return 'medium';
    return 'low';
  }

  // REITs similar to dividends
  if (income.investmentSubtype === 'reit') {
    return 'medium';
  }

  return 'medium';
}
```

### Display in Projections

| Confidence | Display Treatment                                                |
| ---------- | ---------------------------------------------------------------- |
| High       | Solid bar, included in totals, no warnings                       |
| Medium     | Solid bar, included in totals, subtle "may vary" indicator       |
| Low        | Dashed bar, "variable" label, included with caveat               |
| Very Low   | Dotted bar, warning icon, excluded from conservative projections |

### Special Display: Reinvested Income

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Monthly Income Summary                                  │
│                                                             │
│  Cash Income (spendable):                                   │
│  ├── Salary                    $4,500                       │
│  ├── Savings interest          $94                          │
│  ├── Dividend income           $117                         │
│  └── Total Cash Income         $4,711/month                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Reinvested Income (growing your wealth):                   │
│  ├── Vanguard DRIP             $208/month                   │
│  └── Total Reinvested          $208/month                   │
│                                                             │
│  💡 Reinvested income isn't available to spend but          │
│     is building your net worth.                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Special Investment Income Features

### Feature 1: Dividend Calendar View

For users with multiple dividend incomes:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 Your Dividend Calendar                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Upcoming dividend payments:                                │
│                                                             │
│  JANUARY 2025                                               │
│  ├── Jan 15  Fidelity dividends         $350               │
│  └── Jan 28  REIT distribution          $125               │
│                                                             │
│  FEBRUARY 2025                                              │
│  └── Feb 15  Bond interest              $85                │
│                                                             │
│  MARCH 2025                                                 │
│  ├── Mar 10  Vanguard dividends         $425               │
│  └── Mar 15  Fidelity dividends         $350               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Quarterly totals:                                       │
│                                                             │
│     Q1 2025: $1,335                                         │
│     Q2 2025: $1,285 (estimated)                             │
│     Q3 2025: $1,335 (estimated)                             │
│     Q4 2025: $1,285 (estimated)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 2: Yield Tracking & Alerts

For interest and dividend income based on rates/yields:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Rate Change Alert                                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your "Marcus savings" interest rate may have changed.      │
│                                                             │
│  Current tracked rate: 4.5% APY                             │
│  Marcus current advertised rate: 4.25% APY                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Would you like to update your rate?                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅ Yes, update to 4.25%                            │   │
│  │     (Monthly income: $93.75 → $88.54)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌ No, my rate hasn't changed                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰ Remind me later                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 3: Portfolio Value Update Prompt

For yield-based calculations, prompt periodic updates:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💼 Portfolio Value Check                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  It's been 3 months since you updated your portfolio        │
│  value for "Dividend income from Fidelity".                 │
│                                                             │
│  Current tracked value: $50,000                             │
│  Current dividend estimate: $1,750/year (3.5% yield)        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Has your portfolio value changed significantly?            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📈 Yes, update my portfolio value                  │   │
│  │                                                     │   │
│  │  New value: $ [__________]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅ No, it's about the same                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰ Ask me again in 3 months                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 4: Tax Account Summary

Help users understand tax implications:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Investment Income by Tax Treatment                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TAXABLE ACCOUNTS                          $3,200/year      │
│  Income you'll likely owe taxes on:                         │
│  ├── Fidelity dividends (taxable)          $1,400           │
│  ├── Marcus savings interest               $1,125           │
│  ├── REIT distributions                    $600             │
│  └── Stock sale capital gain               $5,000 (one-time)│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TAX-ADVANTAGED ACCOUNTS                   $2,500/year      │
│  Income growing tax-free or tax-deferred:                   │
│  ├── Vanguard DRIP (Roth IRA)              $2,500           │
│  │   └── 🔄 Reinvested - not in cash flow                  │
│  └── No immediate tax impact                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Tax Note:                                               │
│  You may want to set aside money for taxes on your          │
│  taxable investment income. Consult a tax professional      │
│  for personalized advice.                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 5: One-Time Income Handling

Special display for capital gains and other one-time income:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 January 2025 Income                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  RECURRING INCOME                          $4,711           │
│  ├── Salary                                $4,500           │
│  ├── Savings interest                      $94              │
│  └── Dividend income                       $117             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ONE-TIME INCOME                           $5,000           │
│  └── Stock sale - AAPL shares              $5,000           │
│      └── ⭐ One-time capital gain                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TOTAL JANUARY INCOME                      $9,711           │
│                                                             │
│  ⚠️ Note: Your typical monthly income is ~$4,711.           │
│     January includes a one-time gain of $5,000.             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Comparison: All Income Types So Far

| Aspect                  | Salary                       | Freelance/Gig                     | Rental                                       | Investment                        |
| ----------------------- | ---------------------------- | --------------------------------- | -------------------------------------------- | --------------------------------- |
| **Predictability**      | High                         | Variable                          | Medium-High                                  | Varies by type                    |
| **Key Question**        | "What's your take-home pay?" | "How predictable is this income?" | "What type of rental?"                       | "What type of investment income?" |
| **Amount Entry**        | Take-home / Gross / Annual   | Rate-based or Estimate            | Fixed rent or Nightly + Occupancy            | Amount / Yield+Value / Annual     |
| **Frequency**           | Weekly to Monthly            | Variable                          | Monthly (long-term) / Irregular (short-term) | Monthly to Annual                 |
| **Cash Flow**           | Always cash                  | Always cash                       | Always cash                                  | Cash OR reinvested                |
| **Expense Offset**      | N/A                          | Optional tax set-aside            | Yes (mortgage, taxes, etc.)                  | N/A                               |
| **Timing Precision**    | Exact pay dates              | Approximate                       | Due dates                                    | Payment cycles/dates              |
| **Linked Accounts**     | No                           | No                                | Yes (mortgage)                               | No                                |
| **Tax Considerations**  | Withheld by employer         | Self-employment tax               | Rental income tax                            | Varies by account type            |
| **One-time Option**     | No                           | No                                | No                                           | Yes (capital gains)               |
| **Reinvestment Option** | No                           | No                                | No                                           | Yes (DRIP)                        |

---

## 11. Summary: Complete Question List

### All Questions in Investment Income Flow

| Step  | Question                                       | Required? | Condition                    |
| ----- | ---------------------------------------------- | --------- | ---------------------------- |
| 1     | "What would you like to call this income?"     | ✅ Yes    | Always                       |
| 1     | "Where is this investment held?"               | Optional  | Always                       |
| 1     | "What type of account is this?"                | Optional  | Always                       |
| 2     | "What type of investment income is this?"      | ✅ Yes    | Always (KEY QUESTION)        |
| 3A-1  | "What's the easiest way to enter this income?" | ✅ Yes    | If dividends                 |
| 3A-2a | "How much do you receive per payment?"         | ✅ Yes    | If dividends + amount method |
| 3A-2a | "How often do you receive payments?"           | ✅ Yes    | If dividends + amount method |
| 3A-2a | "How predictable is this dividend income?"     | ✅ Yes    | If dividends + amount method |
| 3A-2b | "What's the portfolio value?"                  | ✅ Yes    | If dividends + yield method  |
| 3A-2b | "What's the dividend yield?"                   | ✅ Yes    | If dividends + yield method  |
| 3A-2c | "What was your total dividend last year?"      | ✅ Yes    | If dividends + annual method |
| 3A-2c | "Do you expect this year to be similar?"       | ✅ Yes    | If dividends + annual method |
| 3B    | "What's the easiest way to enter?"             | ✅ Yes    | If interest                  |
| 3B-1  | "How much interest do you receive?"            | ✅ Yes    | If interest + amount method  |
| 3B-2  | "What's your account balance?"                 | ✅ Yes    | If interest + rate method    |
| 3B-2  | "What's the APY?"                              | ✅ Yes    | If interest + rate method    |
| 3C    | "What type of capital gain?"                   | ✅ Yes    | If capital gains             |
| 3C-1  | "How much was your gain?"                      | ✅ Yes    | If one-time gain             |
| 3C-1  | "When did/will you receive this?"              | ✅ Yes    | If one-time gain             |
| 3C-2  | "Average monthly trading gains?"               | ✅ Yes    | If regular trading           |
| 3C-2  | "How predictable?"                             | ✅ Yes    | If regular trading           |
| 3D    | "What type of retirement account?"             | ✅ Yes    | If distributions             |
| 3D-2  | "How much do you withdraw?"                    | ✅ Yes    | If distributions             |
| 3D-2  | "How often?"                                   | ✅ Yes    | If distributions             |
| 3D-2  | "Is this an RMD?"                              | Optional  | If distributions             |
| 3E    | "What type of royalties?"                      | ✅ Yes    | If royalties                 |
| 3E-2  | "How predictable?"                             | ✅ Yes    | If royalties                 |
| 3E-2  | "Amount or range?"                             | ✅ Yes    | If royalties                 |
| 4     | "Do you receive this as cash?"                 | ✅ Yes    | Always (KEY QUESTION)        |
| 4     | "What percentage as cash?"                     | ✅ Yes    | If partially reinvested      |
| 5     | "Which payment cycle/months?"                  | Optional  | If quarterly dividends       |
| 5     | "How often is interest paid?"                  | Optional  | If interest                  |
| 5     | "When do you expect next payment?"             | Optional  | Always                       |
| 6     | "Does everything look correct?"                | ✅ Yes    | Always (confirmation)        |

---

## 12. Schema Skeleton (Complete)

```typescript
interface InvestmentIncome extends BaseIncome {
  incomeType: 'investment';
  investmentSubtype: InvestmentIncomeSubtype;

  // ===== ACCOUNT IDENTIFICATION =====
  accountName?: string;
  institutionName?: string;
  accountType?: InvestmentAccountType;
  holdings?: string;

  // ===== PREDICTABILITY =====
  predictability: IncomePredictability;

  // ===== INCOME AMOUNT =====
  incomeAmount?: CurrencyAmount;
  paymentFrequency: PaymentFrequency | 'irregular' | 'one_time';

  // ===== RATE/YIELD BASED =====
  annualRate?: number;
  principalAmount?: CurrencyAmount;
  dividendYield?: number;
  portfolioValue?: CurrencyAmount;

  // ===== CAPITAL GAINS =====
  isOneTime?: boolean;
  gainDate?: Timestamp | Date;

  // ===== VARIABILITY =====
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;
  estimateType?: 'conservative' | 'average' | 'optimistic';

  // ===== CASH FLOW =====
  isReinvested: boolean;
  cashPercentage?: number;

  // ===== TIMING =====
  nextPaymentDate?: Timestamp | Date;
  paymentMonths?: number[];
  paymentDayOfMonth?: number;

  // ===== RETIREMENT SPECIFIC =====
  isRMD?: boolean;

  // ===== ROYALTY SPECIFIC =====
  royaltyType?: RoyaltyType;

  // ===== FLAGS =====
  isTaxAdvantaged?: boolean;

  // ===== CALCULATED =====
  monthlyIncomeAmount?: CurrencyAmount;
  annualIncomeAmount?: CurrencyAmount;
  cashFlowAmount?: CurrencyAmount;
}

type InvestmentIncomeSubtype =
  | 'dividends'
  | 'interest'
  | 'capital_gains'
  | 'distributions'
  | 'reit'
  | 'royalties'
  | 'other';

type InvestmentAccountType =
  | 'taxable'
  | 'traditional_ira'
  | 'roth_ira'
  | '401k'
  | 'hsa'
  | 'savings'
  | 'cd'
  | 'other';

type RoyaltyType =
  | 'book_publishing'
  | 'music_media'
  | 'patent_invention'
  | 'licensing_image'
  | 'mineral_oil_gas'
  | 'other';

type IncomePredictability =
  | 'highly_predictable'
  | 'somewhat_predictable'
  | 'variable'
  | 'unpredictable';
```
