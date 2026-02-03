# Income Type #2: Freelance/Gig Income

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

Income earned from self-employment, independent contracting, gig economy platforms, or side work where the user is not a traditional employee. This income is typically **variable** and **less predictable** than salary income.

### Who uses this?

- Freelancers (designers, writers, developers, consultants)
- Gig economy workers (Uber, Lyft, DoorDash, Instacart)
- Independent contractors
- Side hustlers with irregular income
- Creative professionals (photographers, musicians, artists)
- Consultants with project-based work

### Why track it?

- Understand average income despite variability
- Plan for income gaps/dry periods
- Balance variable income against fixed expenses
- Track multiple income streams
- Tax planning (self-employment taxes)

### Key Challenges This Flow Must Solve

| Challenge                         | Solution                                       |
| --------------------------------- | ---------------------------------------------- |
| Income is unpredictable           | Ask for estimates/averages, flag as variable   |
| Multiple clients/platforms        | Option to track by source or aggregate         |
| Different rate structures         | Support hourly, project, retainer, per-task    |
| Irregular payment timing          | Flexible scheduling options                    |
| User may not know monthly average | Help calculate from rate + typical work volume |

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field             | Purpose                      | User Knows This? |
| ----------------- | ---------------------------- | ---------------- |
| Income Name       | Identify this income source  | Always ✅        |
| Income Subtype    | Categorization               | Always ✅        |
| Amount (any form) | How much they typically earn | Usually ✅       |

### Optional but Valuable Data

| Field                  | Purpose                               | User Knows This? |
| ---------------------- | ------------------------------------- | ---------------- |
| Client/Platform Name   | Reference for multiple streams        | Usually ✅       |
| Rate Type              | How they charge (hourly/project/etc.) | Usually ✅       |
| Rate Amount            | Their standard rate                   | Often ✅         |
| Typical Hours/Projects | Volume estimation                     | Sometimes        |
| Payment Frequency      | When they typically get paid          | Sometimes        |
| Predictability Level   | How consistent is this income         | Always ✅        |
| Retainer Details       | For ongoing contracts                 | When applicable  |

### Calculated/Derived Data (System Computes)

| Field                    | Derived From                         |
| ------------------------ | ------------------------------------ |
| Estimated Monthly Income | Rate × Volume OR User estimate       |
| Estimated Annual Income  | Monthly × 12 (with variability flag) |
| Income Confidence Level  | Based on predictability inputs       |

---

## 3. Schema Skeleton

```typescript
interface FreelanceGigIncome extends BaseIncome {
  incomeType: 'freelance_gig';
  incomeSubtype: FreelanceGigSubtype;

  /** Client, platform, or business name */
  sourceName?: string;

  /** How predictable is this income? */
  predictability: IncomePredictability;

  // ===== RATE-BASED FIELDS =====

  /** How the user charges for work */
  rateType?: RateType;

  /** Rate amount (hourly, per project, per task) */
  rateAmount?: CurrencyAmount;

  /** For hourly: typical hours per week/month */
  typicalHoursPerWeek?: number;
  typicalHoursPerMonth?: number;

  /** For project-based: typical projects per month */
  typicalProjectsPerMonth?: number;

  /** For gig/task-based: typical tasks per week */
  typicalTasksPerWeek?: number;

  // ===== ESTIMATE-BASED FIELDS =====

  /** User's estimate of typical monthly income */
  estimatedMonthlyIncome?: CurrencyAmount;

  /** For variable income: typical range */
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;

  // ===== RETAINER FIELDS (for predictable contracts) =====

  /** Is this a retainer/recurring contract? */
  isRetainer?: boolean;

  /** Retainer amount per period */
  retainerAmount?: CurrencyAmount;

  /** Retainer payment frequency */
  retainerFrequency?: PaymentFrequency;

  // ===== TIMING =====

  /** How often they typically receive payments */
  typicalPaymentFrequency?: PaymentFrequency | 'irregular';

  /** Next expected payment (if known) */
  nextExpectedPayment?: Timestamp | Date;

  /** When this income stream started */
  startDate?: Timestamp | Date;

  /** When this ends (for contracts with end dates) */
  endDate?: Timestamp | Date;

  // ===== FLAGS =====

  /** Is this a side income (not primary)? */
  isSideIncome?: boolean;

  /** Platform-specific identifier (for gig platforms) */
  platformType?: GigPlatformType;
}

type FreelanceGigSubtype =
  | 'freelance' // Traditional freelancing
  | 'consulting' // Professional consulting
  | 'gig_platform' // Uber, DoorDash, etc.
  | 'creative' // Art, music, content creation
  | 'side_hustle' // Casual side work
  | 'other';

type RateType =
  | 'hourly'
  | 'per_project'
  | 'per_task'
  | 'retainer'
  | 'commission'
  | 'variable';

type IncomePredictability =
  | 'highly_predictable' // Retainer, long-term contract
  | 'somewhat_predictable' // Regular clients, steady work
  | 'variable' // Fluctuates but has patterns
  | 'unpredictable'; // Completely irregular

type GigPlatformType =
  | 'uber'
  | 'lyft'
  | 'doordash'
  | 'instacart'
  | 'upwork'
  | 'fiverr'
  | 'taskrabbit'
  | 'etsy'
  | 'other';
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FREELANCE/GIG INCOME FLOW                             │
│                                                                          │
│  ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────────┐   ┌─────┐   ┌─────────┐  │
│  │ 1   │──▶│ 2   │──▶│ 3       │──▶│ 4       │──▶│ 5   │──▶│ CONFIRM │  │
│  │Name │   │Type │   │Predict- │   │Amount   │   │Time │   │ & SAVE  │  │
│  │     │   │     │   │ability  │   │         │   │     │   │         │  │
│  └─────┘   └─────┘   └─────────┘   └─────────┘   └─────┘   └─────────┘  │
│                           │              │                               │
│                  ┌────────┴────────┐     │                               │
│                  ▼                 ▼     │                               │
│            [Retainer]        [Variable]  │                               │
│                 │                 │      │                               │
│                 ▼                 ▼      ▼                               │
│          (Fixed amount)    (Rate-based OR Estimate)                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Source

**Screen Title:** "Let's add your freelance income"

**Purpose:** Identify the income stream and its source

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💼 Let's add your freelance income                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this income?                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Freelance design work                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Examples: "Uber driving", "Web design clients",        │
│     "Consulting work", "Etsy shop"                         │
│                                                             │
│                                                             │
│  Where does this income come from? (optional)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Various clients                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 This could be a client name, platform, or just         │
│     "Various clients"                                      │
│                                                             │
│                                                             │
│  Is this your main income or a side income?                 │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  🎯 Main income     │   │  📦 Side income     │         │
│  │                     │   │                     │         │
│  │  This is how I      │   │  Extra income on    │         │
│  │  primarily earn     │   │  top of other work  │         │
│  └─────────────────────┘   └─────────────────────┘         │
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
- `sourceName` (optional)
- `isSideIncome`: boolean

**UX Notes:**

- Pre-fill source name based on subtype selection in next step
- "Side income" flag affects how we weight this in projections

---

### STEP 2: Income Type

**Screen Title:** "What type of work is this?"

**Purpose:** Categorize the freelance/gig work for tailored follow-up questions

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎨 What type of work is this?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select the option that best describes this income:         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💻  Freelancing                                    │   │
│  │      Design, writing, development, marketing, etc.  │   │
│  │      Working independently for various clients      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯  Consulting                                     │   │
│  │      Professional advice and expertise              │   │
│  │      Often project-based or retainer               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🚗  Gig Platform (Uber, DoorDash, etc.)            │   │
│  │      App-based work with variable earnings          │   │
│  │      Driving, delivery, tasks, etc.                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎨  Creative Work                                  │   │
│  │      Art, music, photography, content creation      │   │
│  │      Commissions, sales, royalties                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🌙  Side Hustle                                    │   │
│  │      Casual or occasional work                      │   │
│  │      Tutoring, pet sitting, odd jobs, etc.         │   │
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

**Subtype-Specific Follow-up (for Gig Platform selection):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🚗 Which platform do you use?                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │   🚙      │ │   🚕      │ │   🍔      │              │
│  │   Uber    │ │   Lyft    │ │ DoorDash  │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │   🛒      │ │   🔨      │ │   🛍️      │              │
│  │ Instacart │ │TaskRabbit │ │   Etsy    │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │   💼      │ │   🎨      │ │   ❓      │              │
│  │  Upwork   │ │  Fiverr   │ │  Other    │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  💡 Select the main platform - you can add others later    │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeSubtype`: FreelanceGigSubtype
- `platformType`: GigPlatformType (if gig_platform selected)

**Branching Logic:**
| Selection | Effect on Flow |
|-----------|----------------|
| Freelancing | Show hourly/project rate options |
| Consulting | Emphasize retainer option |
| Gig Platform | Show platform picker, then per-task/hourly options |
| Creative | Show commission/sales/royalty options |
| Side Hustle | Simplified flow, estimate-focused |
| Other | Generic flow |

---

### STEP 3: Predictability Assessment

**Screen Title:** "How predictable is this income?"

**Purpose:** This is the KEY branching question - determines the entire amount entry flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 How predictable is this income?                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  This helps us give you more accurate projections.          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🎯  Very predictable                               │   │
│  │                                                     │   │
│  │      I have a retainer or ongoing contract          │   │
│  │      I know exactly what I'll earn each month       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  Somewhat predictable                           │   │
│  │                                                     │   │
│  │      I have regular clients or steady work          │   │
│  │      Income varies but I can estimate              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📉  Variable                                       │   │
│  │                                                     │   │
│  │      Work comes and goes                            │   │
│  │      Some months are good, some are slow           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ❓  Unpredictable                                  │   │
│  │                                                     │   │
│  │      Completely irregular                           │   │
│  │      I really can't estimate what I'll earn        │   │
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

- `predictability`: IncomePredictability

**Critical Branching:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  "Very predictable"                                         │
│       │                                                     │
│       └──▶ STEP 4A: Retainer Flow                          │
│            (Fixed amount, fixed frequency)                  │
│                                                             │
│  "Somewhat predictable"                                     │
│       │                                                     │
│       └──▶ STEP 4B: Rate + Estimate Flow                   │
│            (How do you charge? + Monthly estimate)          │
│                                                             │
│  "Variable"                                                 │
│       │                                                     │
│       └──▶ STEP 4C: Range Estimate Flow                    │
│            (What's your typical range?)                     │
│                                                             │
│  "Unpredictable"                                            │
│       │                                                     │
│       └──▶ STEP 4D: Best Guess Flow                        │
│            (Conservative estimate for planning)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 4A: Retainer/Contract Flow (Very Predictable)

**Screen Title:** "Tell us about your contract"

**Purpose:** Capture fixed, predictable income details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Tell us about your contract                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Great! Predictable income makes planning easier.           │
│                                                             │
│                                                             │
│  How much do you receive from this contract?                │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 3,500                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  How often do you receive this payment?                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Monthly                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Weekly                                        │     │
│    │ • Every two weeks                               │     │
│    │ • Monthly                            ← selected │     │
│    │ • Quarterly                                     │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this contract have an end date?                       │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  🔄 Ongoing         │   │  📅 Has end date    │         │
│  │  No set end date    │   │  Ends on a specific │         │
│  │                     │   │  date               │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  (If "Has end date" selected:)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  March 31, 2025                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 That's $3,500/month or $42,000/year                     │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `isRetainer`: true
- `retainerAmount`: CurrencyAmount
- `retainerFrequency`: PaymentFrequency
- `endDate`: Date (optional)

**After This Step:** Skip to Step 5 (Timing)

---

### STEP 4B: Rate + Estimate Flow (Somewhat Predictable)

**Purpose:** Capture how they charge AND their typical earnings

#### STEP 4B-1: How Do You Charge?

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How do you typically charge?                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select how you usually bill for this work:                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏱️  Hourly rate                                    │   │
│  │      I charge by the hour                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📦  Per project                                    │   │
│  │      I charge a fixed fee per project               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎫  Per task/delivery                              │   │
│  │      I get paid per delivery, task, or gig          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊  Commission/percentage                          │   │
│  │      I earn a percentage of sales                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔀  Mixed / It varies                              │   │
│  │      I use different methods for different work     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Branching from this screen:**

```
User selects "Hourly rate"       → Go to Step 4B-2a (Hourly details)
User selects "Per project"       → Go to Step 4B-2b (Project details)
User selects "Per task/delivery" → Go to Step 4B-2c (Task details)
User selects "Commission"        → Go to Step 4B-2d (Commission details)
User selects "Mixed/It varies"   → Go to Step 4B-3 (Skip rate, go to estimate)
```

---

#### STEP 4B-2a: Hourly Rate Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ What's your hourly rate?                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What do you typically charge per hour?                     │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 75                             │  .00 /hour   │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Use your average rate if it varies by client           │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How many hours do you typically work per week on this?     │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 15                             │  hours/week  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Think about an average week - it's okay to estimate    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Based on that, you'd earn approximately:                │
│                                                             │
│     • $1,125/week                                           │
│     • $4,875/month                                          │
│     • $58,500/year                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this estimate seem right?                             │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  ✅ Yes, roughly    │   │  ✏️ Let me adjust   │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If "Let me adjust" selected:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✏️ Adjust your estimate                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What do you actually expect to earn per month?             │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 4,000                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 This is what we'll use for your projections            │
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

- `rateType`: 'hourly'
- `rateAmount`: CurrencyAmount
- `typicalHoursPerWeek`: number
- `estimatedMonthlyIncome`: CurrencyAmount (calculated or adjusted)

---

#### STEP 4B-2b: Project Rate Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📦 Tell us about your project work                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What do you typically charge per project?                  │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,500                          │  .00         │
│             └────────────────────────────────┘              │
│             per project (average)                           │
│                                                             │
│  💡 If project sizes vary a lot, use a rough average       │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How many projects do you typically complete?               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  About 2 per month                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • Less than 1 per month                         │     │
│    │ • About 1 per month                             │     │
│    │ • About 2 per month                  ← selected │     │
│    │ • About 3-4 per month                           │     │
│    │ • 5 or more per month                           │     │
│    │ • It really varies                              │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Based on that, you'd earn approximately:                │
│                                                             │
│     • $5,000/month                                          │
│     • $60,000/year                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this estimate seem right?                             │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  ✅ Yes, roughly    │   │  ✏️ Let me adjust   │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `rateType`: 'per_project'
- `rateAmount`: CurrencyAmount
- `typicalProjectsPerMonth`: number
- `estimatedMonthlyIncome`: CurrencyAmount

---

#### STEP 4B-2c: Task/Delivery Rate Details

**Optimized for gig workers (Uber, DoorDash, etc.)**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🚗 Tell us about your gig earnings                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you typically earn per [task/delivery/ride]?   │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 8                              │  .50         │
│             └────────────────────────────────┘              │
│             per delivery (average including tips)           │
│                                                             │
│  💡 Include tips if applicable                              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How many [deliveries/rides/tasks] do you complete          │
│  in a typical week?                                         │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 35                             │  per week    │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Based on that, you'd earn approximately:                │
│                                                             │
│     • $297/week                                             │
│     • $1,287/month                                          │
│     • $15,444/year                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this estimate seem right?                             │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  ✅ Yes, roughly    │   │  ✏️ Let me adjust   │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `rateType`: 'per_task'
- `rateAmount`: CurrencyAmount
- `typicalTasksPerWeek`: number
- `estimatedMonthlyIncome`: CurrencyAmount

**Dynamic Labels:**
| Platform | Task Label |
|----------|------------|
| Uber/Lyft | "ride" |
| DoorDash/Instacart | "delivery" |
| TaskRabbit | "task" |
| Default | "gig" |

---

#### STEP 4B-2d: Commission Details

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Tell us about your commission income                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Since commission varies based on sales, let's estimate     │
│  your typical monthly earnings.                             │
│                                                             │
│                                                             │
│  What's your typical monthly earnings from commissions?     │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,500                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Think about an average month                            │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (Optional) What's your commission rate?                    │
│                                                             │
│             ┌────────────────────────────────┐              │
│             │ 15                             │  %           │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 This is just for your reference - we'll use your       │
│     monthly estimate for projections                        │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `rateType`: 'commission'
- `estimatedMonthlyIncome`: CurrencyAmount
- `rateAmount`: percentage (optional, for reference)

---

### STEP 4C: Range Estimate Flow (Variable)

**Purpose:** For truly variable income, capture a realistic range

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Let's estimate your variable income                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Since your income varies, let's figure out a realistic     │
│  range to help with planning.                               │
│                                                             │
│                                                             │
│  In a slow month, how much do you typically earn?           │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,500                          │  .00         │
│             └────────────────────────────────┘              │
│             minimum / slow month                            │
│                                                             │
│                                                             │
│  In a good month, how much do you typically earn?           │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 4,500                          │  .00         │
│             └────────────────────────────────┘              │
│             maximum / busy month                            │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Your income range:                                      │
│                                                             │
│    $1,500 ◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶ $4,500            │
│            └────── $3,000 average ──────┘                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 For planning, which estimate should we use?             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛡️  Conservative (use the low end)                 │   │
│  │      $1,500/month - Play it safe                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚖️  Average (use the middle)         ⭐ Recommended │   │
│  │      $3,000/month - Balanced approach               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯  Optimistic (use the high end)                  │   │
│  │      $4,500/month - Best case scenario              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `incomeRangeLow`: CurrencyAmount
- `incomeRangeHigh`: CurrencyAmount
- `estimatedMonthlyIncome`: CurrencyAmount (based on selection)
- `estimateType`: 'conservative' | 'average' | 'optimistic'

---

### STEP 4D: Best Guess Flow (Unpredictable)

**Purpose:** For completely unpredictable income, get a conservative estimate

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🤔 Let's make a conservative estimate                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Even with unpredictable income, having some estimate       │
│  helps with planning. Let's be conservative.                │
│                                                             │
│                                                             │
│  If you had to guess, what's the minimum you'd expect       │
│  to earn in a typical month from this work?                 │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 500                            │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Think about the worst-case realistic scenario -        │
│     not zero, but a slow month                              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 We'll use $500/month as a conservative estimate         │
│                                                             │
│  ⚠️  This income will be flagged as "unpredictable"         │
│      in your projections                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 You can always update this as you learn more about     │
│     your earning patterns                                   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `estimatedMonthlyIncome`: CurrencyAmount
- `estimateType`: 'conservative'
- Flag: `isHighlyVariable`: true

---

### STEP 5: Payment Timing

**Screen Title:** "When do you get paid?"

**Purpose:** Understand payment patterns for cash flow (less critical than salary)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you typically get paid?                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How often do payments come in from this work?              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Weekly                                         │   │
│  │      Usually get paid once a week                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Every two weeks                                │   │
│  │      Payments come bi-weekly                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Monthly                                        │   │
│  │      Usually once a month                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Per project/job                                │   │
│  │      When each job is completed                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔀  Irregular / It varies                          │   │
│  │      No real pattern                                │   │
│  └─────────────────────────────────────────────────────┘   │
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

**Data Captured:**

- `typicalPaymentFrequency`: PaymentFrequency | 'irregular' | 'per_job'

**Context-Sensitive Defaults:**
| Subtype | Suggested Default |
|---------|-------------------|
| Gig Platform (Uber, etc.) | Weekly |
| Freelance (Upwork) | Per project |
| Consulting | Monthly |
| Creative | Irregular |

---

### STEP 6: Confirmation & Summary

**Screen Title:** "Review your freelance income"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your freelance income                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💼  Freelance design work                          │   │
│  │      Various clients                                │   │
│  │                                          Side income│   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 Estimated monthly      $4,000                   │   │
│  │                                                     │   │
│  │  📊 Predictability         Somewhat predictable     │   │
│  │                                                     │   │
│  │  ⏱️ Rate                    $75/hour                │   │
│  │                                                     │   │
│  │  📅 Typical hours          ~15 hours/week           │   │
│  │                                                     │   │
│  │  🗓️ Payments               Per project              │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 Annual estimate        ≈ $48,000                │   │
│  │                                                     │   │
│  │  ⚠️  Note: This income is variable and may          │   │
│  │      fluctuate from month to month                  │   │
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

**Alternative Summary for Variable Income:**

```
┌─────────────────────────────────────────────────────────────┐
│  │                                                     │   │
│  │  💼  DoorDash deliveries                            │   │
│  │      DoorDash                                       │   │
│  │                                          Side income│   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 Income range                                    │   │
│  │                                                     │   │
│  │     $800 ◀━━━━━━━━━━━━━━━━━━━━━▶ $1,500            │   │
│  │              (using $1,150 average)                 │   │
│  │                                                     │   │
│  │  📊 Predictability         Variable                 │   │
│  │                                                     │   │
│  │  🚗 Typical volume         ~35 deliveries/week      │   │
│  │                                                     │   │
│  │  💵 Average per delivery   $8.50                    │   │
│  │                                                     │   │
│  │  🗓️ Payments               Weekly                   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 Annual estimate        ≈ $13,800                │   │
│  │      (based on average monthly)                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Complete Flow Decision Tree

```
START
  │
  ▼
┌─────────────────────────────────────┐
│ STEP 1: Name & Source               │
│                                     │
│ Q: "What would you like to call     │
│    this income?"                    │
│ Q: "Where does this income come     │
│    from?"                           │
│ Q: "Is this your main income or     │
│    a side income?"                  │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ STEP 2: Income Type                 │
│                                     │
│ Q: "What type of work is this?"     │
│                                     │
│ Options:                            │
│ • Freelancing                       │
│ • Consulting                        │
│ • Gig Platform ─────────────────┐   │
│ • Creative Work                 │   │
│ • Side Hustle                   │   │
│ • Other                         │   │
└─────────────────────────────────────┘
  │                               │
  │                               ▼
  │                    ┌─────────────────────┐
  │                    │ STEP 2B: Platform   │
  │                    │                     │
  │                    │ Q: "Which platform  │
  │                    │    do you use?"     │
  │                    │                     │
  │                    │ [Platform grid]     │
  │                    └─────────────────────┘
  │                               │
  ◀───────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Predictability (KEY BRANCHING QUESTION)                 │
│                                                                 │
│ Q: "How predictable is this income?"                            │
│                                                                 │
│ ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│ │ Very predictable│  │Somewhat predict. │  │   Variable     │  │
│ └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│          │                    │                    │            │
│          │                    │                    │            │
│ ┌────────────────┐                                              │
│ │ Unpredictable  │                                              │
│ └───────┬────────┘                                              │
│         │                                                       │
└─────────┼─────────────────────┼────────────────────┼────────────┘
          │                     │                    │
          ▼                     ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ STEP 4A:        │   │ STEP 4B-1:      │   │ STEP 4C:        │
│ RETAINER FLOW   │   │ Rate Type       │   │ RANGE ESTIMATE  │
│                 │   │ Selection       │   │                 │
│ Q: "How much do │   │                 │   │ Q: "In a slow   │
│ you receive?"   │   │ Q: "How do you  │   │ month, how much │
│                 │   │ typically       │   │ do you earn?"   │
│ Q: "How often?" │   │ charge?"        │   │                 │
│                 │   │                 │   │ Q: "In a good   │
│ Q: "End date?"  │   │ [Hourly/Project │   │ month?"         │
│                 │   │  /Task/Commis.] │   │                 │
└────────┬────────┘   └────────┬────────┘   │ Q: "Which       │
         │                     │            │ estimate to     │
         │            ┌────────┴────────┐   │ use?"           │
         │            ▼                 │   └────────┬────────┘
         │   ┌─────────────────┐        │            │
         │   │ STEP 4B-2a/b/c/d│        │            │
         │   │ Rate Details    │        │            │
         │   │                 │        │            │
         │   │ (Varies by type)│        │            │
         │   │                 │        │            │
         │   │ Shows estimate  │        │            │
         │   │ → Confirm or    │        │            │
         │   │   Adjust        │        │            │
         │   └────────┬────────┘        │            │
         │            │                 │            │
         │            │    ┌────────────┘            │
         │            │    ▼                         │
         │            │  ┌─────────────────┐         │
         │            │  │ STEP 4D:        │         │
         │            │  │ BEST GUESS      │         │
         │            │  │ (Unpredictable) │         │
         │            │  │                 │         │
         │            │  │ Q: "What's the  │         │
         │            │  │ minimum you'd   │         │
         │            │  │ expect?"        │         │
         │            │  └────────┬────────┘         │
         │            │           │                  │
         ▼            ▼           ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Payment Timing                                          │
│                                                                 │
│ Q: "How often do payments come in from this work?"              │
│                                                                 │
│ Options:                                                        │
│ • Weekly                                                        │
│ • Every two weeks                                               │
│ • Monthly                                                       │
│ • Per project/job                                               │
│ • Irregular                                                     │
│ • [Skip for now]                                                │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│ STEP 6: Review & Confirm            │
│                                     │
│ Shows all entered data              │
│ Shows calculated estimates          │
│ Shows variability warnings          │
│                                     │
│ [Edit] or [Save Income ✓]           │
└─────────────────────────────────────┘
  │
  ▼
 DONE
```

---

## 6. Minimum Path Examples

### Example 1: Uber Driver (Shortest Path)

```
Step 1 → Step 2 → Select "Gig Platform" → Select "Uber"
     → Step 3 → Select "Variable"
     → Step 4C → Enter range ($800-$1500) → Select "Average"
     → Step 5 → Select "Weekly"
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, platform, range, estimate, frequency
```

### Example 2: Consultant with Retainer (Shortest Path)

```
Step 1 → Step 2 → Select "Consulting"
     → Step 3 → Select "Very predictable"
     → Step 4A → Enter $5,000/month, Monthly, Ongoing
     → Step 5 → Skip (already captured)
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, retainer amount, frequency
```

### Example 3: Freelance Designer (Full Path) - Continued

```
Step 1 → Step 2 → Select "Freelancing"
     → Step 3 → Select "Somewhat predictable"
     → Step 4B-1 → Select "Hourly rate"
     → Step 4B-2a → Enter $75/hour, 15 hrs/week → "Let me adjust"
     → Step 4B-3 → Adjust to $4,000/month
     → Step 5 → Select "Per project"
     → Step 6 → Confirm

Total: 7 screens
Data captured: Name, type, rate, hours, adjusted estimate, frequency
```

### Example 4: Unpredictable Side Hustle (Minimal Data)

```
Step 1 → Step 2 → Select "Side Hustle"
     → Step 3 → Select "Unpredictable"
     → Step 4D → Enter $500/month conservative estimate
     → Step 5 → Select "Irregular"
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, conservative estimate, irregular flag
```

---

## 7. Edge Cases & Handling

| Scenario                          | Handling                                                         |
| --------------------------------- | ---------------------------------------------------------------- |
| User has multiple gig platforms   | Allow adding multiple freelance incomes (one per platform)       |
| Income is seasonal                | Add optional "active months" field, calculate annual differently |
| User doesn't know their rate      | Skip rate, go directly to monthly estimate                       |
| Retainer + extra project work     | Capture retainer as base, add note about additional income       |
| Income just started (no history)  | Use "best guess" flow, flag for review after 3 months            |
| User paid in multiple currencies  | Show currency selector per income                                |
| Gig platform income varies wildly | Emphasize range entry, use conservative estimate                 |
| Client pays late frequently       | Note in metadata, doesn't affect estimate                        |
| User wants to track expenses too  | Out of scope for income, but note for future feature             |
| Tax withholding (1099 income)     | Add optional "set aside for taxes" percentage field              |

---

## 8. Data Priority for Calculations

When calculating monthly income for cash flow projections:

```
Priority Order for Freelance/Gig Income:

1. retainerAmount (if isRetainer = true)
   └── Most reliable, use directly

2. estimatedMonthlyIncome (user-confirmed or adjusted)
   └── User validated this number

3. Calculated from rate + volume:
   ├── hourlyRate × typicalHoursPerWeek × 4.33
   ├── projectRate × typicalProjectsPerMonth
   └── taskRate × typicalTasksPerWeek × 4.33

4. Average of income range:
   └── (incomeRangeLow + incomeRangeHigh) / 2

5. incomeRangeLow (if user selected "conservative")
   └── Safest estimate for budgeting
```

### Confidence Scoring

```typescript
// Pseudo-logic for income confidence
function getIncomeConfidence(income: FreelanceGigIncome): IncomeConfidence {
  if (income.isRetainer && income.retainerAmount) {
    return 'high'; // Retainer = reliable
  }

  if (income.predictability === 'highly_predictable') {
    return 'high';
  }

  if (
    income.predictability === 'somewhat_predictable' &&
    income.estimatedMonthlyIncome
  ) {
    return 'medium';
  }

  if (
    income.predictability === 'variable' &&
    income.incomeRangeLow &&
    income.incomeRangeHigh
  ) {
    return 'low'; // Known to vary
  }

  return 'very_low'; // Unpredictable
}
```

### Display in Projections

| Confidence | Display Treatment                     |
| ---------- | ------------------------------------- |
| High       | Solid line in charts, no warning      |
| Medium     | Solid line with subtle indicator      |
| Low        | Dashed line, "varies" label           |
| Very Low   | Dotted line, warning icon, disclaimer |

---

## 9. Comparison: Salary vs Freelance Income

| Aspect             | Salary Income                          | Freelance/Gig Income                         |
| ------------------ | -------------------------------------- | -------------------------------------------- |
| **Predictability** | High (fixed schedule)                  | Variable (user-defined)                      |
| **Amount Entry**   | Single amount (take-home/gross/annual) | Multiple paths (rate-based, estimate, range) |
| **Key Question**   | "What's your take-home pay?"           | "How predictable is this income?"            |
| **Timing**         | Exact pay dates                        | Approximate frequency                        |
| **Confidence**     | Always high                            | Varies based on predictability               |
| **Calculation**    | Straightforward                        | Multiple fallback methods                    |
| **UI Complexity**  | Simpler (5-6 screens)                  | More complex (5-7 screens with branches)     |
| **Tax Handling**   | Usually withheld                       | Often needs self-management                  |

---

## 10. Special Considerations for Freelance/Gig

### Tax Planning Helper (Optional Enhancement)

Since freelance/gig income typically doesn't have tax withholding, consider adding:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💡 Tax Planning Tip                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Freelance income usually doesn't have taxes withheld.      │
│  Would you like us to help you set aside money for taxes?   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☐ Yes, remind me to set aside ___% for taxes       │   │
│  │                                                     │   │
│  │    Common rates:                                    │   │
│  │    • 25-30% (US self-employment)                    │   │
│  │    • Varies by country/situation                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☐ No thanks, I handle taxes separately             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured (if enabled):**

- `taxSetAsidePercentage`: number (e.g., 25)
- This affects "spendable income" calculations

---

### Seasonal Income Pattern (Optional Enhancement)

For income that varies by season:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 Does this income vary by season?                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄 No, it's fairly consistent year-round           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📈 Yes, some months are busier than others         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (If "Yes" selected:)                                       │
│                                                             │
│  Which months are typically your busy season?               │
│                                                             │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│  │Jan│ │Feb│ │Mar│ │Apr│ │May│ │Jun│                      │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                      │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│  │Jul│ │Aug│ │Sep│ │Oct│ │Nov│ │Dec│                      │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                      │
│    ✓     ✓                 ✓     ✓    (selected)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured (if enabled):**

- `isSeasonalIncome`: boolean
- `busyMonths`: number[] (e.g., [7, 8, 11, 12])
- Affects monthly projections (higher in busy months)

---

## 11. Summary: Complete Question List

### All Questions in Freelance/Gig Flow

| Step  | Question                                                      | Required? | Condition                  |
| ----- | ------------------------------------------------------------- | --------- | -------------------------- |
| 1     | "What would you like to call this income?"                    | ✅ Yes    | Always                     |
| 1     | "Where does this income come from?"                           | Optional  | Always                     |
| 1     | "Is this your main income or a side income?"                  | ✅ Yes    | Always                     |
| 2     | "What type of work is this?"                                  | ✅ Yes    | Always                     |
| 2B    | "Which platform do you use?"                                  | ✅ Yes    | If gig_platform selected   |
| 3     | "How predictable is this income?"                             | ✅ Yes    | Always (KEY QUESTION)      |
| 4A    | "How much do you receive from this contract?"                 | ✅ Yes    | If very_predictable        |
| 4A    | "How often do you receive this payment?"                      | ✅ Yes    | If very_predictable        |
| 4A    | "Does this contract have an end date?"                        | Optional  | If very_predictable        |
| 4B-1  | "How do you typically charge?"                                | ✅ Yes    | If somewhat_predictable    |
| 4B-2a | "What do you typically charge per hour?"                      | ✅ Yes    | If hourly selected         |
| 4B-2a | "How many hours do you typically work per week?"              | ✅ Yes    | If hourly selected         |
| 4B-2b | "What do you typically charge per project?"                   | ✅ Yes    | If per_project selected    |
| 4B-2b | "How many projects do you typically complete?"                | ✅ Yes    | If per_project selected    |
| 4B-2c | "How much do you typically earn per [task]?"                  | ✅ Yes    | If per_task selected       |
| 4B-2c | "How many [tasks] do you complete in a typical week?"         | ✅ Yes    | If per_task selected       |
| 4B-2d | "What's your typical monthly earnings from commissions?"      | ✅ Yes    | If commission selected     |
| 4B-\* | "Does this estimate seem right?"                              | ✅ Yes    | After any rate calculation |
| 4B-\* | "What do you actually expect to earn per month?"              | Optional  | If user wants to adjust    |
| 4C    | "In a slow month, how much do you typically earn?"            | ✅ Yes    | If variable                |
| 4C    | "In a good month, how much do you typically earn?"            | ✅ Yes    | If variable                |
| 4C    | "For planning, which estimate should we use?"                 | ✅ Yes    | If variable                |
| 4D    | "What's the minimum you'd expect to earn in a typical month?" | ✅ Yes    | If unpredictable           |
| 5     | "How often do payments come in from this work?"               | Optional  | Always (can skip)          |
| 6     | "Does everything look correct?"                               | ✅ Yes    | Always (confirmation)      |

---

## 12. Schema Skeleton (Complete)

```typescript
interface FreelanceGigIncome extends BaseIncome {
  incomeType: 'freelance_gig';
  incomeSubtype: FreelanceGigSubtype;

  // ===== IDENTIFICATION =====
  sourceName?: string;
  platformType?: GigPlatformType;
  isSideIncome: boolean;

  // ===== PREDICTABILITY =====
  predictability: IncomePredictability;

  // ===== RATE-BASED FIELDS =====
  rateType?: RateType;
  rateAmount?: CurrencyAmount;
  typicalHoursPerWeek?: number;
  typicalHoursPerMonth?: number;
  typicalProjectsPerMonth?: number;
  typicalTasksPerWeek?: number;

  // ===== ESTIMATE FIELDS =====
  estimatedMonthlyIncome?: CurrencyAmount;
  incomeRangeLow?: CurrencyAmount;
  incomeRangeHigh?: CurrencyAmount;
  estimateType?: 'conservative' | 'average' | 'optimistic';

  // ===== RETAINER FIELDS =====
  isRetainer?: boolean;
  retainerAmount?: CurrencyAmount;
  retainerFrequency?: PaymentFrequency;

  // ===== TIMING =====
  typicalPaymentFrequency?: PaymentFrequency | 'irregular' | 'per_job';
  nextExpectedPayment?: Timestamp | Date;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;

  // ===== OPTIONAL ENHANCEMENTS =====
  taxSetAsidePercentage?: number;
  isSeasonalIncome?: boolean;
  busyMonths?: number[];

  // ===== FLAGS =====
  isHighlyVariable?: boolean;
}

type FreelanceGigSubtype =
  | 'freelance'
  | 'consulting'
  | 'gig_platform'
  | 'creative'
  | 'side_hustle'
  | 'other';

type RateType =
  | 'hourly'
  | 'per_project'
  | 'per_task'
  | 'retainer'
  | 'commission'
  | 'variable';

type IncomePredictability =
  | 'highly_predictable'
  | 'somewhat_predictable'
  | 'variable'
  | 'unpredictable';

type GigPlatformType =
  | 'uber'
  | 'lyft'
  | 'doordash'
  | 'instacart'
  | 'upwork'
  | 'fiverr'
  | 'taskrabbit'
  | 'etsy'
  | 'other';
```
