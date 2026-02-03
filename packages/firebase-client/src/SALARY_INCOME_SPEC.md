# Income Type #1: Salary/Wages

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

Regular employment income where someone works for an employer and receives predictable, scheduled payments. This is the most common income source for most users.

### Who uses this?

- Full-time employees
- Part-time employees
- Contract workers with regular pay
- Hourly workers with consistent schedules

### Why track it?

- Predict cash flow (know when money arrives)
- Balance against expenses/bills
- Calculate surplus/deficit
- Plan for savings goals

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field             | Purpose                     | User Knows This? |
| ----------------- | --------------------------- | ---------------- |
| Income Name       | Identify this income source | Always ✅        |
| Payment Frequency | How often they get paid     | Always ✅        |
| Amount (any form) | How much they earn          | Always ✅        |

### Optional but Valuable Data

| Field                    | Purpose                 | User Knows This? |
| ------------------------ | ----------------------- | ---------------- |
| Employer Name            | Reference/organization  | Usually ✅       |
| Employment Type          | Context for projections | Usually ✅       |
| Pay Day Pattern          | Predict exact dates     | Often ✅         |
| Next Pay Date            | Immediate cash flow     | Often ✅         |
| Employment Start Date    | Historical tracking     | Sometimes        |
| Gross vs Net distinction | Tax planning            | Sometimes        |

### Calculated/Derived Data (System Computes)

| Field          | Derived From                    |
| -------------- | ------------------------------- |
| Monthly Income | Amount + Frequency              |
| Annual Income  | Amount + Frequency              |
| Next Pay Date  | Pay Day Pattern + Last Pay Date |

---

## 3. Schema Skeleton

```typescript
interface SalaryIncome extends BaseIncome {
  incomeType: 'salary';
  incomeSubtype: SalarySubtype; // full_time, part_time, contract, hourly

  employerName?: string;

  // Amount fields (at least one required)
  takeHomePay?: CurrencyAmount; // NET - what hits the bank
  grossPay?: CurrencyAmount; // GROSS - before deductions
  annualSalary?: CurrencyAmount; // Yearly figure

  // Timing
  paymentFrequency: PaymentFrequency;
  payDayPattern?: PayDayPattern; // "every Friday", "15th and last", etc.
  nextPayDate?: Timestamp | Date;

  // Employment period
  employmentStartDate?: Timestamp | Date;
  employmentEndDate?: Timestamp | Date;

  // For hourly workers
  hourlyRate?: CurrencyAmount;
  typicalHoursPerWeek?: number;
}
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    SALARY INCOME FLOW                            │
│                                                                  │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────────┐  │
│  │ 1   │──▶│ 2   │──▶│ 3   │──▶│ 4   │──▶│ 5   │──▶│ CONFIRM │  │
│  │Name │   │Type │   │Freq │   │Amt  │   │When │   │ & SAVE  │  │
│  └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────────┘  │
│                                   │                              │
│                         ┌─────────┼─────────┐                    │
│                         ▼         ▼         ▼                    │
│                     [Take-home] [Gross] [Annual]                 │
│                         │         │         │                    │
│                         ▼         ▼         ▼                    │
│                      (If hourly, branch to hours question)       │
└──────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Employer

**Screen Title:** "Let's add your income"

**Purpose:** Create a friendly identifier and optionally capture employer info

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💼 Let's add your income                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this income?                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ My main job                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Example: "My main job", "Part-time at Target"          │
│                                                             │
│                                                             │
│  Who do you work for? (optional)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Acme Corporation                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 This helps you identify the income later               │
│                                                             │
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
- `employerName` (optional)

**Validation:**

- Income name: minimum 2 characters
- Employer name: no validation (optional)

**UX Notes:**

- Auto-focus on first field
- Show examples as placeholder or hint text
- "Continue" button disabled until name entered

---

### STEP 2: Employment Type

**Screen Title:** "What type of work is this?"

**Purpose:** Understand the nature of employment for better defaults and projections

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  👔 What type of work is this?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select the option that best describes your employment:     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏢  Full-time employee                             │   │
│  │      Regular hours, typically 35-40+ hours/week     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🕐  Part-time employee                             │   │
│  │      Regular but reduced hours                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏱️  Hourly worker                                  │   │
│  │      Pay varies based on hours worked               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋  Contract/Temp worker                           │   │
│  │      Fixed-term or project-based employment         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other                                          │   │
│  │      None of the above                              │   │
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

- `incomeSubtype`: 'full_time' | 'part_time' | 'hourly' | 'contract' | 'other'

**Branching Logic:**
| Selection | Effect on Flow |
|-----------|----------------|
| Full-time | Default to monthly/biweekly frequency |
| Part-time | Default to weekly/biweekly frequency |
| **Hourly** | **Add hourly rate question in Step 4** |
| Contract | Show employment end date option later |
| Other | No special handling |

**UX Notes:**

- Large touch targets for mobile
- Selection auto-advances (or highlight + continue)
- Include helpful descriptions for each option

---

### STEP 3: Payment Frequency

**Screen Title:** "How often do you get paid?"

**Purpose:** Determine pay schedule for cash flow calculations

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 How often do you get paid?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select your pay schedule:                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Every week                                         │   │
│  │  52 paychecks per year                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Every two weeks                          ⭐ Common │   │
│  │  26 paychecks per year                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Twice a month (semi-monthly)                       │   │
│  │  24 paychecks per year (e.g., 1st and 15th)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Once a month                             ⭐ Common │   │
│  │  12 paychecks per year                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Other frequency...                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  💡 Not sure? Check your recent bank deposits or pay stub  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `paymentFrequency`: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'other'

**Smart Defaults Based on Step 2:**
| Employment Type | Suggested Default |
|-----------------|-------------------|
| Full-time | Biweekly (highlight) |
| Part-time | Weekly (highlight) |
| Hourly | Weekly (highlight) |
| Contract | Monthly (highlight) |

**"Other" Expansion:**
If user selects "Other frequency", show additional options:

- Daily
- Quarterly
- Custom (explain it's irregular)

**UX Notes:**

- Show "⭐ Common" badges on most selected options
- Include helpful context (paychecks per year)
- Hint at bottom for users who are unsure

---

### STEP 4: Amount (Conditional Branching)

**Screen Title:** "How much do you earn?"

**Purpose:** This is the KEY decision step - capture income amount in the format the user knows best

#### STEP 4A: Amount Method Selection

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 How much do you earn?                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the easiest way for you to enter your pay?          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💵  I know my take-home pay                        │   │
│  │                                                     │   │
│  │      The amount that actually hits my bank          │   │
│  │      account each payday (after taxes)              │   │
│  │                                          ⭐ Easiest │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📄  I know my gross pay                            │   │
│  │                                                     │   │
│  │      The amount before taxes and deductions         │   │
│  │      (from my pay stub)                             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📅  I know my annual salary                        │   │
│  │                                                     │   │
│  │      My yearly salary before taxes                  │   │
│  │      (from my offer letter or contract)             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  💡 Pick whichever you know - we'll calculate the rest     │
│                                                             │
│  ← Back                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Branching from this screen:**

```
User selects "Take-home pay"  → Go to Step 4B-1
User selects "Gross pay"      → Go to Step 4B-2
User selects "Annual salary"  → Go to Step 4B-3

SPECIAL CASE (from Step 2):
If user selected "Hourly"     → Go to Step 4B-4 (Hourly rate flow)
```

---

#### STEP 4B-1: Take-Home Pay Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 What's your take-home pay?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you receive each paycheck?                     │
│  (The amount deposited to your bank)                        │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,450                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per paycheck (every two weeks)                  │
│                 └─────────────────────────┘                 │
│                    (from your earlier selection)            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to approximately:                        │
│                                                             │
│     • $5,308/month                                          │
│     • $63,700/year                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `takeHomePay`: { amount: number, currency: string }

**Real-time Calculations Shown:**

- Monthly = amount × frequency multiplier
- Annual = monthly × 12

**Frequency Multipliers:**
| Frequency | Monthly Multiplier |
|-----------|-------------------|
| Weekly | 4.33 |
| Biweekly | 2.17 |
| Semi-monthly | 2.00 |
| Monthly | 1.00 |

---

#### STEP 4B-2: Gross Pay Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📄 What's your gross pay?                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you earn before taxes and deductions?          │
│  (Check your pay stub for "Gross Pay")                      │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 3,200                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per paycheck (every two weeks)                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That works out to approximately:                        │
│                                                             │
│     • $6,933/month (gross)                                  │
│     • $83,200/year (gross)                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Want to track your actual take-home amount too?         │
│                                                             │
│     ☐ Yes, I'll enter my take-home pay                      │
│                                                             │
│       ┌────────────────────────────────┐                    │
│   $   │ 2,450                          │ .00 per paycheck   │
│       └────────────────────────────────┘                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `grossPay`: { amount: number, currency: string }
- `takeHomePay`: (optional, if checkbox selected)

**UX Note:**

- The optional take-home field helps with actual cash flow tracking
- If not provided, system can estimate (but flag as estimated)

---

#### STEP 4B-3: Annual Salary Entry

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 What's your annual salary?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's your yearly salary before taxes?                    │
│  (From your offer letter or employment contract)            │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 85,000                         │  per year    │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Based on getting paid every two weeks:                  │
│                                                             │
│     • $3,269/paycheck (gross)                               │
│     • $7,083/month (gross)                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Do you know how much actually hits your bank?           │
│                                                             │
│     ☐ Yes, I'll enter my take-home pay                      │
│                                                             │
│       ┌────────────────────────────────┐                    │
│   $   │ 2,500                          │ .00 per paycheck   │
│       └────────────────────────────────┘                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `annualSalary`: { amount: number, currency: string }
- `takeHomePay`: (optional)

**Calculation:**

- Per paycheck = annual ÷ (payments per year based on frequency)

---

#### STEP 4B-4: Hourly Rate Entry (Special Path)

**Only shown if user selected "Hourly worker" in Step 2**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ What's your hourly rate?                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you earn per hour?                             │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 22                             │  .50 /hour   │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  How many hours do you typically work per week?             │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 32                             │  hours/week  │
│             └────────────────────────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Estimated earnings (before taxes):                      │
│                                                             │
│     • $720/week                                             │
│     • $3,120/month                                          │
│     • $37,440/year                                          │
│                                                             │
│  ⚠️  Your actual pay may vary based on hours worked         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Do you know your typical take-home pay?                 │
│                                                             │
│     ☐ Yes, I usually receive about $______ per paycheck     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `hourlyRate`: { amount: number, currency: string }
- `typicalHoursPerWeek`: number
- `takeHomePay`: (optional estimate)

**Special Flag:**

- `isIncomeVariable`: true (for hourly workers)

---

### STEP 5: Pay Schedule Timing

**Screen Title:** "When do you get paid?"

**Purpose:** Enable accurate cash flow predictions

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you get paid?                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  This helps us predict your upcoming income.                │
│                                                             │
│                                                             │
│  When is your next payday?                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Friday, January 17, 2025                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                 (tap to open date picker)                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What day do you typically get paid?                        │
│  (Optional - helps us predict future paydays)               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Every other Friday                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    Options based on frequency:                              │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Every Friday                                  │     │
│    │ • Every other Friday                            │     │
│    │ • Every other Thursday                          │     │
│    │ • A specific day each week...                   │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       ⏭️  Skip for now                              │   │
│  │       I'll add this later                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Pay Day Pattern Options (Context-Sensitive):**

| Frequency    | Pattern Options                                 |
| ------------ | ----------------------------------------------- |
| Weekly       | Every [Mon/Tue/Wed/Thu/Fri]                     |
| Biweekly     | Every other [Mon-Fri]                           |
| Semi-monthly | [1st and 15th] / [15th and last] / Custom dates |
| Monthly      | [1st] / [15th] / [Last day] / [Specific date]   |

**Data Captured:**

- `nextPayDate`: Date
- `payDayPattern`: structured pattern object

---

### STEP 6: Confirmation & Summary

**Screen Title:** "Review your income"

**Purpose:** Confirm all details before saving

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your income                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💼  My main job                                    │   │
│  │      at Acme Corporation                            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 Take-home pay         $2,450.00 / paycheck     │   │
│  │                                                     │   │
│  │  📅 Pay frequency         Every two weeks           │   │
│  │                                                     │   │
│  │  🗓️ Next payday           Friday, Jan 17, 2025     │   │
│  │                                                     │   │
│  │  👔 Employment type       Full-time                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 Monthly income        ≈ $5,308                  │   │
│  │  📊 Annual income         ≈ $63,700                 │   │
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
┌─────────────────────────────────┐
│ STEP 1: Name & Employer         │
│ Q: "What would you like to      │
│    call this income?"           │
│ Q: "Who do you work for?"       │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ STEP 2: Employment Type         │
│ Q: "What type of work is this?" │
│                                 │
│ Options:                        │
│ • Full-time                     │
│ • Part-time                     │
│ • Hourly ──────────────────┐    │
│ • Contract                 │    │
│ • Other                    │    │
└─────────────────────────────────┘
  │                          │
  ▼                          │
┌─────────────────────────────────┐
│ STEP 3: Frequency               │
│ Q: "How often do you get paid?" │
│                                 │
│ Options:                        │
│ • Weekly                        │
│ • Biweekly                      │
│ • Semi-monthly                  │
│ • Monthly                       │
│ • Other                         │
└─────────────────────────────────┘
  │                          │
  ▼                          │
┌─────────────────────────────────┐
│ STEP 4A: Amount Method          │
│ Q: "What's the easiest way to   │◄─┘
│    enter your pay?"             │
│                                 │
│ Options:                        │
│ • Take-home pay ───────────┐    │
│ • Gross pay ───────────────┼─┐  │
│ • Annual salary ───────────┼─┼──┐
│                            │ │  │
│ (If Hourly from Step 2) ───┼─┼──┼──┐
└────────────────────────────┼─┼──┼──┘
                             │ │  │  │
  ┌──────────────────────────┘ │  │  │
  ▼                            │  │  │
┌───────────────────┐          │  │  │
│ STEP 4B-1:        │          │  │  │
│ Take-home Entry   │          │  │  │
│                   │          │  │  │
│ Q: "How much do   │          │  │  │
│ you receive each  │          │  │  │
│ paycheck?"        │          │  │  │
│                   │          │  │  │
│ Input: $______    │          │  │  │
│                   │          │  │  │
│ Shows: Monthly &  │          │  │  │
│ Annual estimates  │          │  │  │
└───────────────────┘          │  │  │
  │                            │  │  │
  │  ┌─────────────────────────┘  │  │
  │  ▼                            │  │
  │ ┌───────────────────┐         │  │
  │ │ STEP 4B-2:        │         │  │
  │ │ Gross Pay Entry   │         │  │
  │ │                   │         │  │
  │ │ Q: "What's your   │         │  │
  │ │ pay before taxes?"│         │  │
  │ │                   │         │  │
  │ │ Input: $______    │         │  │
  │ │                   │         │  │
  │ │ Optional:         │         │  │
  │ │ ☐ Add take-home   │         │  │
  │ └───────────────────┘         │  │
  │   │                           │  │
  │   │  ┌────────────────────────┘  │
  │   │  ▼                           │
  │   │ ┌───────────────────┐        │
  │   │ │ STEP 4B-3:        │        │
  │   │ │ Annual Salary     │        │
  │   │ │                   │        │
  │   │ │ Q: "What's your   │        │
  │   │ │ yearly salary?"   │        │
  │   │ │                   │        │
  │   │ │ Input: $______/yr │        │
  │   │ │                   │        │
  │   │ │ Optional:         │        │
  │   │ │ ☐ Add take-home   │        │
  │   │ └───────────────────┘        │
  │   │   │                          │
  │   │   │  ┌───────────────────────┘
  │   │   │  ▼
  │   │   │ ┌───────────────────┐
  │   │   │ │ STEP 4B-4:        │
  │   │   │ │ Hourly Rate       │
  │   │   │ │ (SPECIAL PATH)    │
  │   │   │ │                   │
  │   │   │ │ Q: "What's your   │
  │   │   │ │ hourly rate?"     │
  │   │   │ │ Input: $____/hr   │
  │   │   │ │                   │
  │   │   │ │ Q: "How many hrs  │
  │   │   │ │ per week?"        │
  │   │   │ │ Input: ____hrs    │
  │   │   │ │                   │
  │   │   │ │ Optional:         │
  │   │   │ │ ☐ Add take-home   │
  │   │   │ └───────────────────┘
  │   │   │   │
  ▼   ▼   ▼   ▼
┌─────────────────────────────────┐
│ STEP 5: Pay Schedule            │
│                                 │
│ Q: "When is your next payday?"  │
│ Input: [Date picker]            │
│                                 │
│ Q: "What day do you typically   │
│    get paid?"                   │
│ Input: [Pattern selector]       │
│                                 │
│ [Skip for now] option           │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ STEP 6: Review & Confirm        │
│                                 │
│ Shows all entered data          │
│ Shows calculated monthly/annual │
│                                 │
│ [Edit] or [Save Income ✓]       │
└─────────────────────────────────┘
  │
  ▼
 DONE
```

---

## 6. Edge Cases & Handling

| Scenario                          | Handling                                             |
| --------------------------------- | ---------------------------------------------------- |
| User doesn't know any amount      | Cannot proceed - at least one amount required        |
| Hourly worker with variable hours | Flag income as variable, show warning in projections |
| Contract worker                   | Show optional end date field                         |
| User has multiple jobs            | Allow adding multiple salary incomes                 |
| Currency different from default   | Show currency selector (inherit from user settings)  |
| User paid in cash                 | Same flow, but can skip pay date pattern             |
| Irregular pay (tips, bonuses)     | Suggest "Freelance/Gig" income type instead          |

---

## 7. Data Priority for Calculations

When calculating monthly income for cash flow:

```
Priority Order:
1. takeHomePay (if available) ← Most accurate for budgeting
2. grossPay × estimated_tax_rate ← Approximation
3. annualSalary ÷ 12 × estimated_tax_rate ← Roughest estimate
4. hourlyRate × hours × frequency ← Variable warning
```
