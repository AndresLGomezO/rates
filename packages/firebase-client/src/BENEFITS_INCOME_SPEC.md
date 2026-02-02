# Income Type #5: Benefits Income

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

Income received from government programs, pensions, or other benefit systems. This income is typically highly predictable and regular, making it one of the most reliable income sources to track. It often forms the foundation of retirement or disability income planning.

### Who uses this?

- Retirees receiving Social Security
- Pension recipients (government, military, private)
- Disability benefit recipients (SSDI, SSI, private disability)
- Veterans receiving VA benefits
- Unemployment benefit recipients
- Parents receiving child-related benefits
- Workers' compensation recipients
- Individuals receiving alimony/spousal support (court-ordered)

### Why track it?

- Foundation of retirement income planning
- Highly predictable - reliable for budgeting
- Often has annual cost-of-living adjustments (COLA)
- May have tax implications (some benefits taxable, some not)
- Important for understanding total household income
- Benefits may have duration limits (unemployment)

### Key Challenges This Flow Must Solve

| Challenge                        | Solution                                           |
| -------------------------------- | -------------------------------------------------- |
| Many different benefit types     | Clear categorization with common options           |
| Varying tax treatments           | Capture benefit type to note tax implications      |
| Some benefits are temporary      | Track duration/end dates                           |
| Annual COLA adjustments          | Option to note expected increases                  |
| Joint vs individual benefits     | Clarify whose benefit this is                      |
| Benefits may have complex rules  | Keep it simple, don't try to calculate eligibility |
| Payment timing varies by program | Capture specific payment schedules                 |

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field             | Purpose               | User Knows This? |
| ----------------- | --------------------- | ---------------- |
| Income Name       | Identify this benefit | Always ✅        |
| Benefit Type      | Categorization        | Always ✅        |
| Amount            | How much they receive | Always ✅        |
| Payment Frequency | How often             | Always ✅        |

### Optional but Valuable Data

| Field                 | Purpose                             | User Knows This? |
| --------------------- | ----------------------------------- | ---------------- |
| Benefit Source/Agency | Reference (SSA, VA, etc.)           | Usually ✅       |
| Beneficiary           | Whose benefit (self, spouse, child) | Always ✅        |
| Payment Day           | Exact timing                        | Usually ✅       |
| Start Date            | When benefits began                 | Usually ✅       |
| End Date              | For temporary benefits              | Sometimes        |
| Is Taxable            | Tax planning                        | Sometimes        |
| Expected COLA         | Annual adjustment                   | Sometimes        |

### Calculated/Derived Data (System Computes)

| Field                | Derived From                  |
| -------------------- | ----------------------------- |
| Monthly Income       | Amount × Frequency adjustment |
| Annual Income        | Monthly × 12                  |
| Post-COLA Projection | Current × (1 + COLA rate)     |

---

## 3. Schema Skeleton

```typescript
interface BenefitsIncome extends BaseIncome {
  incomeType: 'benefits';
  benefitSubtype: BenefitSubtype;

  // ===== BENEFIT IDENTIFICATION =====

  /** Source agency or organization */
  benefitSource?: string;

  /** Specific program name (if applicable) */
  programName?: string;

  /** Who receives this benefit */
  beneficiary: BeneficiaryType;

  /** Beneficiary name (if not self) */
  beneficiaryName?: string;

  // ===== INCOME DETAILS =====

  /** Benefit amount per period */
  benefitAmount: CurrencyAmount;

  /** Payment frequency */
  paymentFrequency: PaymentFrequency;

  /** Specific payment day (varies by program) */
  paymentDayOfMonth?: number;

  /** For Social Security: based on birth date */
  paymentScheduleType?: SSPaymentSchedule;

  // ===== DURATION =====

  /** When benefits started */
  benefitStartDate?: Timestamp | Date;

  /** When benefits end (for temporary benefits) */
  benefitEndDate?: Timestamp | Date;

  /** Is this a permanent/ongoing benefit? */
  isPermanent: boolean;

  /** For unemployment: weeks remaining */
  weeksRemaining?: number;

  // ===== ADJUSTMENTS =====

  /** Expected annual COLA percentage */
  expectedColaPercent?: number;

  /** Date of next expected adjustment */
  nextAdjustmentDate?: Timestamp | Date;

  // ===== TAX TREATMENT =====

  /** Is this benefit taxable? */
  isTaxable?: boolean;

  /** Is tax withheld from payments? */
  hasTaxWithholding?: boolean;

  /** Withholding amount (if applicable) */
  withholdingAmount?: CurrencyAmount;

  // ===== FLAGS =====

  /** Is this benefit means-tested? */
  isMeansTested?: boolean;

  /** Is this a survivor benefit? */
  isSurvivorBenefit?: boolean;

  /** Is this a spousal benefit? */
  isSpousalBenefit?: boolean;
}

type BenefitSubtype =
  | 'social_security' // Social Security retirement
  | 'social_security_disability' // SSDI
  | 'ssi' // Supplemental Security Income
  | 'pension_government' // Government pension (federal, state, local)
  | 'pension_military' // Military retirement
  | 'pension_private' // Private company pension
  | 'va_benefits' // Veterans Affairs benefits
  | 'disability_private' // Private disability insurance
  | 'workers_comp' // Workers' compensation
  | 'unemployment' // Unemployment benefits
  | 'child_support' // Court-ordered child support
  | 'alimony' // Court-ordered alimony/spousal support
  | 'welfare' // TANF, general assistance
  | 'other';

type BeneficiaryType =
  | 'self'
  | 'spouse'
  | 'child'
  | 'other_dependent'
  | 'household'; // Benefit for entire household

type SSPaymentSchedule =
  | 'second_wednesday' // Birth dates 1-10
  | 'third_wednesday' // Birth dates 11-20
  | 'fourth_wednesday' // Birth dates 21-31
  | 'third_of_month'; // For those receiving before May 1997
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         BENEFITS INCOME FLOW                              │
│                                                                           │
│  ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────────┐   ┌─────┐   ┌──────────┐  │
│  │ 1   │──▶│ 2   │──▶│ 3       │──▶│ 4       │──▶│ 5   │──▶│ 6        │  │
│  │Name │   │Type │   │Amount   │   │Duration │   │Time │   │Confirm   │  │
│  └─────┘   └─────┘   └─────────┘   └─────────┘   └─────┘   └──────────┘  │
│                │                        │                                 │
│       ┌────────┴────────────────┐       │                                 │
│       ▼        ▼        ▼       ▼       │                                 │
│  [Social   [Pension] [Disab-  [Unemp-   │                                 │
│  Security]           ility]   loyment]  │                                 │
│       │        │        │       │       │                                 │
│       │        │        │       ▼       │                                 │
│       │        │        │  (Has end     │                                 │
│       │        │        │   date)       │                                 │
│       ▼        ▼        ▼               ▼                                 │
│  (Permanent benefits)            (Temporary benefits                      │
│                                   with duration)                          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Beneficiary

**Screen Title:** "Let's add your benefits income"

**Purpose:** Identify the benefit and who receives it

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏛️ Let's add your benefits income                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this income?                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Social Security retirement                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Examples: "My Social Security", "Military pension",    │
│     "Disability benefits", "Unemployment"                  │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Who receives this benefit?                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤  Me (myself)                        ⭐ Default  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👫  My spouse/partner                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👶  My child                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏠  Household benefit                              │   │
│  │      (Benefits the whole household)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (If spouse/child selected:)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Their name (optional): [________________]          │   │
│  └─────────────────────────────────────────────────────┘   │
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
- `beneficiary`: BeneficiaryType
- `beneficiaryName` (optional)

---

### STEP 2: Benefit Type

**Screen Title:** "What type of benefit is this?"

**Purpose:** Categorize the benefit - this is the KEY branching question

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 What type of benefit is this?                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  RETIREMENT & SOCIAL SECURITY                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏛️  Social Security Retirement                     │   │
│  │      Monthly benefit from SSA                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💼  Pension (Government)                           │   │
│  │      Federal, state, or local government pension    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎖️  Military Retirement                            │   │
│  │      Military pension or retirement pay             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏢  Pension (Private/Corporate)                    │   │
│  │      Company pension or defined benefit plan        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  DISABILITY & ASSISTANCE                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ♿  Social Security Disability (SSDI)              │   │
│  │      Disability benefits from SSA                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🆘  Supplemental Security Income (SSI)             │   │
│  │      Need-based federal assistance                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏥  Private Disability Insurance                   │   │
│  │      Long-term or short-term disability insurance   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚠️  Workers' Compensation                          │   │
│  │      Benefits for work-related injury/illness       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│                            (scroll for more options)    ▼   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Scrolled view - Additional options:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  VETERANS BENEFITS                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎖️  VA Disability Compensation                     │   │
│  │      Veterans Affairs disability benefits           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎖️  VA Pension                                     │   │
│  │      Veterans Affairs pension benefits              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TEMPORARY BENEFITS                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  Unemployment Benefits                          │   │
│  │      State unemployment insurance                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏠  Welfare / Public Assistance                    │   │
│  │      TANF, general assistance, etc.                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  FAMILY SUPPORT                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👶  Child Support                                  │   │
│  │      Court-ordered child support payments           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💍  Alimony / Spousal Support                      │   │
│  │      Court-ordered spousal support                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other Benefit                                  │   │
│  │      Any other type of benefit income               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitSubtype`: BenefitSubtype

**Critical Branching:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  PERMANENT/ONGOING BENEFITS:                                │
│  ├── Social Security Retirement → STEP 3A (with SS extras)  │
│  ├── SSDI                       → STEP 3A (with SS extras)  │
│  ├── Pension (any type)         → STEP 3B (pension flow)    │
│  ├── Military Retirement        → STEP 3B (pension flow)    │
│  ├── VA Benefits                → STEP 3C (VA flow)         │
│  └── SSI                        → STEP 3D (simple flow)     │
│                                                             │
│  TEMPORARY BENEFITS:                                        │
│  ├── Unemployment               → STEP 3E (with end date)   │
│  ├── Workers' Comp              → STEP 3E (with end date)   │
│  ├── Private Disability         → STEP 3E (with end date)   │
│  └── Welfare                    → STEP 3E (with end date)   │
│                                                             │
│  FAMILY SUPPORT:                                            │
│  ├── Child Support              → STEP 3F (support flow)    │
│  └── Alimony                    → STEP 3F (support flow)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 3A: Social Security Details

**For: Social Security Retirement, SSDI**

**Screen Title:** "Tell us about your Social Security"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏛️ Tell us about your Social Security                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your monthly benefit amount?                       │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,150                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 This is the amount after Medicare premiums are          │
│     deducted (the amount deposited to your account)         │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Is this your own benefit or a spousal/survivor benefit?    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤  My own benefit                                 │   │
│  │      Based on my own work history                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👫  Spousal benefit                                │   │
│  │      Based on my spouse's work history              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🕊️  Survivor benefit                               │   │
│  │      Based on deceased spouse's work history        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Annual benefit: $25,800                                 │
│                                                             │
│  💡 Social Security typically increases each January        │
│     with a cost-of-living adjustment (COLA).                │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitAmount`: CurrencyAmount
- `paymentFrequency`: 'monthly' (always for SS)
- `isSpousalBenefit`: boolean
- `isSurvivorBenefit`: boolean
- `isPermanent`: true (always for SS retirement/SSDI)

---

### STEP 3B: Pension Details

**For: Government Pension, Military Retirement, Private Pension**

**Screen Title:** "Tell us about your pension"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💼 Tell us about your pension                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your monthly pension amount?                       │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 3,500                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Enter the amount you actually receive (after any        │
│     deductions for health insurance, taxes, etc.)           │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Where is this pension from? (optional)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ State of California - CalPERS                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Employer, agency, or plan name                         │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this pension have annual cost-of-living increases?    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, it increases annually                     │   │
│  │                                                     │   │
│  │      Typical annual increase: [___]%                │   │
│  │      (Leave blank if you're not sure)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  No, it's a fixed amount                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Annual pension: $42,000                                 │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitAmount`: CurrencyAmount
- `paymentFrequency`: 'monthly'
- `benefitSource`: string (optional)
- `expectedColaPercent`: number (optional)
- `isPermanent`: true

---

### STEP 3C: VA Benefits Details

**For: VA Disability, VA Pension**

**Screen Title:** "Tell us about your VA benefits"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎖️ Tell us about your VA benefits                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What type of VA benefit do you receive?                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ♿  VA Disability Compensation                      │   │
│  │      Based on service-connected disability rating   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💰  VA Pension                                     │   │
│  │      Income-based benefit for wartime veterans      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎓  VA Education Benefits (GI Bill)                │   │
│  │      Monthly housing allowance or stipend           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other VA benefit                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your monthly benefit amount?                       │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,650                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  (If VA Disability selected:)                               │
│                                                             │
│  What is your disability rating? (optional)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  70%                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 VA Disability Compensation is tax-free                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Annual benefit: $19,800 (tax-free)                      │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitSubtype`: refined VA type
- `benefitAmount`: CurrencyAmount
- `disabilityRating`: number (optional, for reference)
- `isTaxable`: false (for VA disability)
- `isPermanent`: true (usually)

---

### STEP 3D: Simple Benefit Entry

**For: SSI, Welfare, Other basic benefits**

**Screen Title:** "Tell us about your benefit"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 Tell us about your benefit                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your monthly benefit amount?                       │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 943                            │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Enter the amount you actually receive each month        │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Annual benefit: $11,316                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 SSI benefits are generally not taxable and may          │
│     adjust based on living situation and other income.      │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitAmount`: CurrencyAmount
- `paymentFrequency`: 'monthly'
- `isPermanent`: true (default, can be changed)
- `isTaxable`: false (for SSI)
- `isMeansTested`: true (for SSI, welfare)

---

### STEP 3E: Temporary Benefit Details

**For: Unemployment, Workers' Comp, Private Disability**

**Screen Title:** "Tell us about your temporary benefit"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📉 Tell us about your unemployment benefits                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your weekly benefit amount?                        │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 450                            │  .00 /week   │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 This is the amount before any tax withholding           │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How long will you receive these benefits?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  I know the end date                            │   │
│  │                                                     │   │
│  │      Benefits end on: [  June 30, 2025  ]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔢  I know how many weeks remaining                │   │
│  │                                                     │   │
│  │      Weeks remaining: [ 16 ] weeks                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure                                   │   │
│  │      (We'll assume ongoing for now)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Benefit summary:                                        │
│                                                             │
│     Weekly amount:           $450                           │
│     Monthly equivalent:      ~$1,950                        │
│     Remaining (~16 weeks):   ~$7,200 total                  │
│                                                             │
│  ⚠️  These benefits will end around June 30, 2025.          │
│      We'll show $0 from this source after that date.        │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitAmount`: CurrencyAmount
- `paymentFrequency`: 'weekly' (unemployment) or as specified
- `isPermanent`: false
- `benefitEndDate`: Date
- `weeksRemaining`: number (alternative to end date)

**Similar flow for Workers' Comp and Private Disability:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏥 Tell us about your disability benefits                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is your benefit amount?                               │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,800                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per ┌─────────────────┐                        │
│                 │ ▼  month        │                        │
│                 └─────────────────┘                        │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Is this a temporary or permanent benefit?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏱️  Temporary (short-term disability)              │   │
│  │                                                     │   │
│  │      Expected end date: [________________]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ♾️  Long-term / Permanent                          │   │
│  │      No expected end date                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure yet                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 3F: Family Support Details

**For: Child Support, Alimony**

**Screen Title:** "Tell us about your support payments"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  👶 Tell us about your child support                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is the court-ordered payment amount?                  │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,200                          │  .00         │
│             └────────────────────────────────┘              │
│                                                             │
│             per ┌─────────────────┐                        │
│                 │ ▼  month        │                        │
│                 └─────────────────┘                        │
│                                                             │
│  💡 Enter the amount you're supposed to receive             │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How reliably do you receive these payments?                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Very reliable                                  │   │
│  │      Always on time and in full                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚠️  Sometimes late or partial                      │   │
│  │      Usually comes but not always on time           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  Unreliable                                     │   │
│  │      Often missed or incomplete                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does this support have an end date?                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Yes, ends on: [ September 2030 ]               │   │
│  │      (e.g., when child turns 18)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄  Ongoing / I'm not sure                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Annual support: $14,400                                 │
│                                                             │
│  💡 Child support received is generally not taxable income. │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `benefitAmount`: CurrencyAmount
- `paymentFrequency`: PaymentFrequency
- `reliability`: 'reliable' | 'sometimes_late' | 'unreliable'
- `benefitEndDate`: Date (optional)
- `isTaxable`: false (for child support)
- `isPermanent`: depends on end date

**For Alimony - similar but with tax note:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💡 Tax Note for Alimony:                                   │
│                                                             │
│  • For divorce agreements finalized before 2019:            │
│    Alimony received IS taxable income                       │
│                                                             │
│  • For divorce agreements finalized 2019 or later:          │
│    Alimony received is NOT taxable income                   │
│                                                             │
│  When was your divorce/separation agreement finalized?      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Before 2019 (alimony is taxable)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  2019 or later (alimony is not taxable)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 4: Duration Confirmation

**Screen Title:** "How long will you receive this benefit?"

**Purpose:** Confirm if benefit is permanent or temporary (may be skipped based on Step 3)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏱️ How long will you receive this benefit?                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (For permanent benefits like Social Security:)             │
│                                                             │
│  Social Security retirement benefits are permanent and      │
│  continue for your lifetime.                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, this is a lifetime benefit                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Actually, this has an end date                 │   │
│  │      (uncommon for SS, but possible)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** This step is often auto-completed or skipped based on benefit type:

- Social Security → Always permanent (auto-set)
- Pension → Usually permanent (auto-set, can override)
- Unemployment → Always temporary (end date required in Step 3E)
- Child Support → May have end date (asked in Step 3F)

---

### STEP 5: Payment Timing

**Screen Title:** "When do you receive this benefit?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you receive this benefit?                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (For Social Security:)                                     │
│                                                             │
│  Social Security payments are based on your birth date.     │
│  When do you receive your payment?                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  2nd Wednesday of each month                    │   │
│  │      (Birth dates 1st - 10th)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  3rd Wednesday of each month                    │   │
│  │      (Birth dates 11th - 20th)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  4th Wednesday of each month                    │   │
│  │      (Birth dates 21st - 31st)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  3rd of each month                              │   │
│  │      (For those receiving SS before May 1997)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  I'm not sure / Other                           │   │
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

- `paymentScheduleType`: SSPaymentSchedule (for Social Security)
- `paymentDayOfMonth`: number (for other benefits)

**Alternative timing screens based on benefit type:**

| Benefit Type    | Timing Question                        |
| --------------- | -------------------------------------- |
| Social Security | Which Wednesday schedule?              |
| Pension         | What day of month? (often 1st or last) |
| VA Benefits     | What day of month? (usually 1st)       |
| Unemployment    | What day of week? (varies by state)    |
| Child Support   | What day of month?                     |

---

### STEP 6: Confirmation & Summary

**Screen Title:** "Review your benefits income"

#### Social Security Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your benefits income                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏛️  Social Security retirement                     │   │
│  │      Social Security Administration                 │   │
│  │                                      Lifetime benefit│   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 BENEFIT DETAILS                                 │   │
│  │                                                     │   │
│  │     Beneficiary:            Me (myself)             │   │
│  │     Benefit type:           Own benefit             │   │
│  │     Monthly amount:         $2,150                  │   │
│  │     Annual amount:          $25,800                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  🗓️ PAYMENT SCHEDULE                                │   │
│  │                                                     │   │
│  │     Frequency:              Monthly                 │   │
│  │     Payment day:            3rd Wednesday           │   │
│  │     Next payment:           ~February 19, 2025      │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 ADDITIONAL INFO                                 │   │
│  │                                                     │   │
│  │     Duration:               Lifetime (permanent)    │   │
│  │     Taxable:                Partially (depends on   │   │
│  │                             total income)           │   │
│  │     COLA adjustments:       Typically each January  │   │
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

#### Unemployment Benefits Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your benefits income                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📉  Unemployment benefits                          │   │
│  │      State Unemployment Office                      │   │
│  │                                   Temporary benefit │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 BENEFIT DETAILS                                 │   │
│  │                                                     │   │
│  │     Beneficiary:            Me (myself)             │   │
│  │     Weekly amount:          $450                    │   │
│  │     Monthly equivalent:     ~$1,950                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ⏱️ DURATION                                        │   │
│  │                                                     │   │
│  │     Weeks remaining:        16 weeks                │   │
│  │     Benefits end:           ~June 30, 2025          │   │
│  │     Total remaining:        ~$7,200                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ⚠️  IMPORTANT                                      │   │
│  │                                                     │   │
│  │     This income will end around June 30, 2025.      │   │
│  │     We'll show this in your projections and alert   │   │
│  │     you as the end date approaches.                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 TAX INFO                                        │   │
│  │                                                     │   │
│  │     Taxable:                Yes (federal & state)   │   │
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

#### Child Support Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your benefits income                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  👶  Child support                                  │   │
│  │      Court-ordered support                          │   │
│  │                                      Ends Sep 2030  │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 PAYMENT DETAILS                                 │   │
│  │                                                     │   │
│  │     For:                    My child                │   │
│  │     Monthly amount:         $1,200                  │   │
│  │     Annual amount:          $14,400                 │   │
│  │     Reliability:            Very reliable ✅        │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  ⏱️ DURATION                                        │   │
│  │                                                     │   │
│  │     Ends:                   September 2030          │   │
│  │     Years remaining:        ~5.5 years              │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 TAX INFO                                        │   │
│  │                                                     │   │
│  │     Taxable:                No (child support is    │   │
│  │                             not taxable income)     │   │
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
│ STEP 1: Name & Beneficiary          │
│                                     │
│ Q: "What would you like to call     │
│    this income?"                    │
│ Q: "Who receives this benefit?"     │
│    • Me (myself)                    │
│    • My spouse                      │
│    • My child                       │
│    • Household benefit              │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Benefit Type (KEY BRANCHING QUESTION)                               │
│                                                                             │
│ Q: "What type of benefit is this?"                                          │
│                                                                             │
│ RETIREMENT/SS:          DISABILITY:           VETERANS:        TEMPORARY:   │
│ ┌──────────────┐       ┌──────────────┐      ┌──────────┐    ┌──────────┐  │
│ │SS Retirement │       │SSDI          │      │VA Disab. │    │Unemploy. │  │
│ │Gov Pension   │       │SSI           │      │VA Pension│    │Workers Cp│  │
│ │Military Ret. │       │Private Disab.│      │VA Other  │    │Welfare   │  │
│ │Private Pens. │       │Workers' Comp │      └────┬─────┘    └────┬─────┘  │
│ └──────┬───────┘       └──────┬───────┘           │               │        │
│        │                      │                   │               │        │
│ FAMILY SUPPORT:               │                   │               │        │
│ ┌──────────────┐              │                   │               │        │
│ │Child Support │              │                   │               │        │
│ │Alimony       │              │                   │               │        │
│ └──────┬───────┘              │                   │               │        │
│        │                      │                   │               │        │
└────────┼──────────────────────┼───────────────────┼───────────────┼────────┘
         │                      │                   │               │
         ▼                      ▼                   ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Benefit Details (varies by type)                                    │
│                                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌───────────────┐ │
│ │ STEP 3A:        │ │ STEP 3B:        │ │ STEP 3C:     │ │ STEP 3D:      │ │
│ │ Social Security │ │ Pension         │ │ VA Benefits  │ │ Simple Entry  │ │
│ │                 │ │                 │ │              │ │ (SSI, Other)  │ │
│ │ Q: "Monthly     │ │ Q: "Monthly     │ │ Q: "VA type?"│ │               │ │
│ │    amount?"     │ │    amount?"     │ │ Q: "Amount?" │ │ Q: "Amount?"  │ │
│ │ Q: "Own/spouse/ │ │ Q: "Source?"    │ │ Q: "Rating?" │ │               │ │
│ │    survivor?"   │ │ Q: "COLA?"      │ │              │ │               │ │
│ └────────┬────────┘ └────────┬────────┘ └──────┬───────┘ └───────┬───────┘ │
│          │                   │                 │                 │         │
│ ┌─────────────────┐ ┌─────────────────┐                                    │
│ │ STEP 3E:        │ │ STEP 3F:        │                                    │
│ │ Temporary       │ │ Family Support  │                                    │
│ │                 │ │                 │                                    │
│ │ Q: "Amount?"    │ │ Q: "Amount?"    │                                    │
│ │ Q: "End date?"  │ │ Q: "Reliable?"  │                                    │
│ │ Q: "Weeks left?"│ │ Q: "End date?"  │                                    │
│ └────────┬────────┘ └────────
│          │                   │                                              │
└──────────┼───────────────────┼──────────────────────────────────────────────┘
           │                   │
           └─────────┬─────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Duration Confirmation                                               │
│                                                                             │
│ (Often auto-set based on benefit type, may be skipped)                      │
│                                                                             │
│ PERMANENT BENEFITS (auto-confirmed):                                        │
│ ├── Social Security Retirement → isPermanent: true                          │
│ ├── SSDI                       → isPermanent: true                          │
│ ├── Pension (any type)         → isPermanent: true                          │
│ ├── VA Disability              → isPermanent: true                          │
│ └── SSI                        → isPermanent: true                          │
│                                                                             │
│ TEMPORARY BENEFITS (end date captured in Step 3):                           │
│ ├── Unemployment               → isPermanent: false, endDate required       │
│ ├── Workers' Comp              → isPermanent: false, endDate optional       │
│ ├── Private Disability         → isPermanent: varies (asked in Step 3)      │
│ └── Welfare                    → isPermanent: false, endDate optional       │
│                                                                             │
│ FAMILY SUPPORT (end date optional):                                         │
│ ├── Child Support              → isPermanent: false, endDate often known    │
│ └── Alimony                    → isPermanent: varies, endDate optional      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Payment Timing                                                      │
│                                                                             │
│ Q: Varies by benefit type:                                                  │
│                                                                             │
│ • Social Security:   "Which Wednesday schedule?" (based on birth date)      │
│ • Pension:           "What day of month?" (often 1st or last)               │
│ • VA Benefits:       "What day of month?" (usually 1st)                     │
│ • SSI:               "What day of month?" (usually 1st)                     │
│ • Unemployment:      "What day of week?" (varies by state)                  │
│ • Child Support:     "What day of month?"                                   │
│ • Other:             "When do you receive payment?"                         │
│                                                                             │
│ [Skip for now] option available                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────┐
│ STEP 6: Review & Confirm            │
│                                     │
│ Shows all entered data              │
│ Shows monthly/annual amounts        │
│ Shows duration (permanent/end date) │
│ Shows tax implications              │
│ Shows COLA info (if applicable)     │
│                                     │
│ [Edit] or [Save Income ✓]           │
└─────────────────────────────────────┘
                     │
                     ▼
                   DONE
```

---

## 6. Minimum Path Examples

### Example 1: Social Security Retirement (Most Common)

```
Step 1 → Enter name "My Social Security", beneficiary "Me"
     → Step 2 → Select "Social Security Retirement"
     → Step 3A → Enter $2,150/month, "Own benefit"
     → Step 4 → (Auto-confirmed as permanent)
     → Step 5 → Select "3rd Wednesday"
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, benefit type, payment schedule
Predictability: High
```

### Example 2: Government Pension

```
Step 1 → Enter name "State pension", beneficiary "Me"
     → Step 2 → Select "Pension (Government)"
     → Step 3B → Enter $3,500/month, source "CalPERS", COLA "2%"
     → Step 4 → (Auto-confirmed as permanent)
     → Step 5 → Select "1st of month"
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, source, COLA, payment day
Predictability: High
```

### Example 3: Unemployment Benefits (Temporary)

```
Step 1 → Enter name "Unemployment", beneficiary "Me"
     → Step 2 → Select "Unemployment Benefits"
     → Step 3E → Enter $450/week, 16 weeks remaining
     → Step 4 → (Auto-set as temporary with end date)
     → Step 5 → Select "Fridays" (payment day)
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, duration, payment day
Special: Flagged as temporary, shows end date warning
```

### Example 4: VA Disability

```
Step 1 → Enter name "VA disability", beneficiary "Me"
     → Step 2 → Select "VA Disability Compensation"
     → Step 3C → Enter $1,650/month, 70% rating
     → Step 4 → (Auto-confirmed as permanent)
     → Step 5 → Select "1st of month"
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, rating, payment day
Special: Flagged as tax-free
```

### Example 5: Child Support

```
Step 1 → Enter name "Child support", beneficiary "My child"
     → Step 2 → Select "Child Support"
     → Step 3F → Enter $1,200/month, "Very reliable", ends Sep 2030
     → Step 4 → (End date already captured)
     → Step 5 → Select "15th of month"
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, type, amount, reliability, end date, payment day
Special: Flagged as tax-free, reliability indicator
```

### Example 6: Spouse's Social Security

```
Step 1 → Enter name "John's Social Security", beneficiary "My spouse", name "John"
     → Step 2 → Select "Social Security Retirement"
     → Step 3A → Enter $1,850/month, "Own benefit"
     → Step 4 → (Auto-confirmed as permanent)
     → Step 5 → Select "2nd Wednesday"
     → Step 6 → Confirm

Total: 5 screens
Data captured: Name, beneficiary, spouse name, type, amount, schedule
Special: Tracked separately from user's own benefits
```

---

## 7. Edge Cases & Handling

| Scenario                                                          | Handling                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Multiple Social Security benefits (own + spousal)                 | Allow adding multiple benefits entries                     |
| Pension with survivor benefit option                              | Note in metadata for future reference                      |
| Unemployment extensions                                           | Allow updating end date/weeks remaining                    |
| Child support not being paid                                      | Capture reliability rating, flag in projections            |
| Alimony modification                                              | Allow updating amount and end date                         |
| Benefits converted (SSDI to SS Retirement at full retirement age) | User creates new entry, archives old one                   |
| Cost-of-living adjustment happens                                 | Prompt user to update amount in January                    |
| Benefits garnished for debt                                       | Enter net amount actually received                         |
| Benefits paid to representative payee                             | Track as household benefit or note in metadata             |
| State-specific benefits (state disability, etc.)                  | Categorize as "Other" with custom name                     |
| Foreign pension or social security                                | Categorize as appropriate type, note currency if different |
| Railroad Retirement benefits                                      | Categorize as government pension                           |
| Tribal benefits                                                   | Categorize as "Other" with custom name                     |
| Benefits under appeal/pending                                     | Don't add until receiving; or add with "pending" flag      |
| Tax withholding from benefits                                     | Capture gross amount, note withholding separately          |

---

## 8. Data Priority for Calculations

### Monthly Income Calculation

```
Priority Order for Benefits Income:

1. Direct amount entry (most common):
   └── benefitAmount × frequency_to_monthly_factor

2. For weekly benefits (unemployment):
   └── weeklyAmount × 4.33

3. For bi-weekly benefits:
   └── biweeklyAmount × 2.17

4. Annual COLA projection (optional):
   └── currentAmount × (1 + expectedColaPercent/100)
       Applied to projections for next year
```

### Frequency Conversion Factors

```typescript
const frequencyToMonthly = {
  weekly: 4.33,
  biweekly: 2.17,
  semi_monthly: 2,
  monthly: 1,
};

const frequencyToAnnual = {
  weekly: 52,
  biweekly: 26,
  semi_monthly: 24,
  monthly: 12,
};
```

### Confidence Scoring

```typescript
function getBenefitsIncomeConfidence(income: BenefitsIncome): IncomeConfidence {
  // Permanent government benefits = highest confidence
  if (income.isPermanent) {
    const highConfidenceTypes = [
      'social_security',
      'social_security_disability',
      'pension_government',
      'pension_military',
      'pension_private',
      'va_benefits',
      'ssi',
    ];

    if (highConfidenceTypes.includes(income.benefitSubtype)) {
      return 'high';
    }
  }

  // Temporary benefits with known end date
  if (!income.isPermanent && income.benefitEndDate) {
    // Check if approaching end
    const monthsRemaining = getMonthsUntil(income.benefitEndDate);
    if (monthsRemaining <= 2) {
      return 'low'; // Ending soon
    }
    return 'medium';
  }

  // Family support depends on reliability
  if (
    income.benefitSubtype === 'child_support' ||
    income.benefitSubtype === 'alimony'
  ) {
    if (income.reliability === 'reliable') return 'high';
    if (income.reliability === 'sometimes_late') return 'medium';
    return 'low';
  }

  // Temporary without clear end date
  if (!income.isPermanent && !income.benefitEndDate) {
    return 'low';
  }

  return 'medium';
}
```

### Display in Projections

| Confidence  | Display Treatment                                |
| ----------- | ------------------------------------------------ |
| High        | Solid bar, fully included, "reliable" badge      |
| Medium      | Solid bar, included, no special indicator        |
| Low         | Dashed bar, "uncertain" label, may show warning  |
| Ending Soon | Solid bar with countdown, alert for upcoming end |

---

## 9. Special Benefits Income Features

### Feature 1: Benefit End Date Alerts

For temporary benefits approaching expiration:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ Benefit Ending Soon                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your "Unemployment benefits" will end in 4 weeks           │
│  (around June 30, 2025).                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Impact on your finances:                                │
│                                                             │
│     Current monthly income (with unemployment):  $6,450     │
│     After unemployment ends:                     $4,500     │
│     Monthly difference:                         -$1,950     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's happening next?                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💼  I found a new job                              │   │
│  │      (Add new salary income)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄  I'm applying for an extension                  │   │
│  │      (Update end date if approved)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📉  I'll manage with reduced income                │   │
│  │      (Acknowledge and continue)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰  Remind me in 2 weeks                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 2: COLA Adjustment Prompt

For Social Security and pensions with COLA, prompt in January:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 Cost-of-Living Adjustment                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Social Security announced a 3.2% COLA for 2025.            │
│                                                             │
│  Would you like to update your benefit amount?              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Current benefit:          $2,150/month                     │
│  With 3.2% COLA:           $2,219/month                     │
│  Annual increase:          +$828/year                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅  Yes, update to $2,219/month                    │   │
│  │      (Use the calculated amount)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✏️  I'll enter my actual new amount                │   │
│  │      (My amount differs due to Medicare changes)    │   │
│  │                                                     │   │
│  │      New amount: $ [__________]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏭️  Skip for now                                   │   │
│  │      I'll update when I see my January payment      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 3: Household Benefits Summary

For users tracking multiple benefit incomes:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏠 Household Benefits Summary                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  YOUR BENEFITS                                              │
│  ├── Social Security retirement      $2,150/month          │
│  └── VA Disability (70%)             $1,650/month          │
│      Subtotal:                       $3,800/month          │
│                                                             │
│  SPOUSE'S BENEFITS                                          │
│  └── Social Security retirement      $1,850/month          │
│      Subtotal:                       $1,850/month          │
│                                                             │
│  FAMILY BENEFITS                                            │
│  └── Child support                   $1,200/month          │
│      Subtotal:                       $1,200/month          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TOTAL HOUSEHOLD BENEFITS            $6,850/month          │
│                                       $82,200/year         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 TAX SUMMARY                                             │
│                                                             │
│     Tax-free benefits:               $2,850/month          │
│     (VA Disability + Child Support)                         │
│                                                             │
│     Potentially taxable:             $4,000/month          │
│     (Social Security - depends on total income)             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 UPCOMING CHANGES                                        │
│                                                             │
│     • Child support ends Sep 2030 (-$1,200/month)          │
│     • COLA adjustments expected Jan 2026                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 4: Tax Implications Helper

Educate users on tax treatment of different benefits:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Benefits Tax Guide                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TAX-FREE BENEFITS                                          │
│  These benefits are generally not taxable:                  │
│                                                             │
│  ✅ VA Disability Compensation                              │
│  ✅ Supplemental Security Income (SSI)                      │
│  ✅ Workers' Compensation                                   │
│  ✅ Child Support received                                  │
│  ✅ Welfare/Public Assistance                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  PARTIALLY TAXABLE                                          │
│  Tax depends on your total income:                          │
│                                                             │
│  ⚠️ Social Security (up to 85% may be taxable)             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  FULLY TAXABLE                                              │
│  These benefits are generally taxable:                      │
│                                                             │
│  💰 Pensions (government and private)                       │
│  💰 Unemployment benefits                                   │
│  💰 Alimony (if divorce before 2019)                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 This is general information only. Consult a tax         │
│     professional for advice specific to your situation.     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 5: Payment Calendar for Benefits

Show when benefits arrive each month:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ February 2025 Benefits Calendar                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat                   │
│                                                             │
│                                1                            │
│                              💰 VA                          │
│                              $1,650                         │
│                                                             │
│  2     3     4     5     6     7     8                     │
│                                                             │
│  9     10    11    12    13    14    15                    │
│                          💰 SS                  💰 Child    │
│                          $2,150                 $1,200      │
│                          (3rd Wed)                          │
│                                                             │
│  16    17    18    19    20    21    22                    │
│                          💰 SS                              │
│                          $1,850                             │
│                          (spouse)                           │
│                                                             │
│  23    24    25    26    27    28                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  February Total Benefits: $6,850                            │
│                                                             │
│  📅 Key Dates:                                              │
│     Feb 1  - VA Disability                                  │
│     Feb 12 - Your Social Security (3rd Wed)                 │
│     Feb 15 - Child Support                                  │
│     Feb 19 - Spouse's Social Security (4th Wed)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Comparison: All Income Types

| Aspect                   | Salary                 | Freelance/Gig      | Rental                 | Investment                 | Benefits                |
| ------------------------ | ---------------------- | ------------------ | ---------------------- | -------------------------- | ----------------------- |
| **Predictability**       | High                   | Variable           | Medium-High            | Varies                     | Very High               |
| **Key Question**         | "Take-home pay?"       | "How predictable?" | "What type of rental?" | "What type of investment?" | "What type of benefit?" |
| **Typical Frequency**    | Biweekly/Monthly       | Variable           | Monthly                | Quarterly/Monthly          | Monthly                 |
| **Duration**             | Ongoing (employment)   | Ongoing (variable) | Ongoing (lease-based)  | Ongoing                    | Permanent or Fixed-term |
| **Tax Treatment**        | Withheld               | Self-managed       | Rental income          | Varies by type             | Varies by benefit       |
| **Cash Flow**            | Always cash            | Always cash        | Always cash            | Cash or Reinvested         | Always cash             |
| **End Date Tracking**    | No (job loss = remove) | No                 | No (vacancy = $0)      | No                         | Yes (for temporary)     |
| **COLA/Adjustments**     | Raises (manual)        | Market rates       | Rent increases         | Yield changes              | Automatic COLA          |
| **Linked Accounts**      | No                     | No                 | Yes (mortgage)         | No                         | No                      |
| **Beneficiary Tracking** | No (always self)       | No (always self)   | No                     | No                         | Yes (self/spouse/child) |
| **Reliability Rating**   | N/A                    | N/A                | N/A                    | N/A                        | Yes (family support)    |

---

## 11. Summary: Complete Question List

### All Questions in Benefits Income Flow

| Step | Question                                          | Required?        | Condition                  |
| ---- | ------------------------------------------------- | ---------------- | -------------------------- |
| 1    | "What would you like to call this income?"        | ✅ Yes           | Always                     |
| 1    | "Who receives this benefit?"                      | ✅ Yes           | Always                     |
| 1    | "Their name?"                                     | Optional         | If spouse/child selected   |
| 2    | "What type of benefit is this?"                   | ✅ Yes           | Always (KEY QUESTION)      |
| 3A   | "What is your monthly benefit amount?"            | ✅ Yes           | If Social Security         |
| 3A   | "Is this your own, spousal, or survivor benefit?" | ✅ Yes           | If Social Security         |
| 3B   | "What is your monthly pension amount?"            | ✅ Yes           | If Pension                 |
| 3B   | "Where is this pension from?"                     | Optional         | If Pension                 |
| 3B   | "Does this pension have COLA?"                    | Optional         | If Pension                 |
| 3B   | "Typical annual increase?"                        | Optional         | If Pension with COLA       |
| 3C   | "What type of VA benefit?"                        | ✅ Yes           | If VA Benefits             |
| 3C   | "What is your monthly benefit amount?"            | ✅ Yes           | If VA Benefits             |
| 3C   | "What is your disability rating?"                 | Optional         | If VA Disability           |
| 3D   | "What is your monthly benefit amount?"            | ✅ Yes           | If SSI/Other simple        |
| 3E   | "What is your weekly/monthly benefit amount?"     | ✅ Yes           | If Temporary benefit       |
| 3E   | "When will benefits end?"                         | ✅ Yes           | If Temporary benefit       |
| 3E   | "How many weeks remaining?"                       | Alternative      | If Temporary benefit       |
| 3F   | "What is the court-ordered payment amount?"       | ✅ Yes           | If Child Support/Alimony   |
| 3F   | "How reliably do you receive payments?"           | ✅ Yes           | If Child Support/Alimony   |
| 3F   | "Does this support have an end date?"             | Optional         | If Child Support/Alimony   |
| 3F   | "When was your divorce finalized?"                | ✅ Yes           | If Alimony (for tax)       |
| 4    | "Is this a lifetime benefit?"                     | Usually auto-set | Confirmation for permanent |
| 5    | "When do you receive this benefit?"               | Optional         | Always (varies by type)    |
| 5    | "Which Wednesday schedule?"                       | Optional         | If Social Security         |
| 6    | "Does everything look correct?"                   | ✅ Yes           | Always (confirmation)      |

---

## 12. Schema Skeleton (Complete)

```typescript
interface BenefitsIncome extends BaseIncome {
  incomeType: 'benefits';
  benefitSubtype: BenefitSubtype;

  // ===== BENEFIT IDENTIFICATION =====
  benefitSource?: string;
  programName?: string;
  beneficiary: BeneficiaryType;
  beneficiaryName?: string;

  // ===== INCOME DETAILS =====
  benefitAmount: CurrencyAmount;
  paymentFrequency: PaymentFrequency;
  paymentDayOfMonth?: number;
  paymentScheduleType?: SSPaymentSchedule;

  // ===== DURATION =====
  benefitStartDate?: Timestamp | Date;
  benefitEndDate?: Timestamp | Date;
  isPermanent: boolean;
  weeksRemaining?: number;

  // ===== ADJUSTMENTS =====
  expectedColaPercent?: number;
  nextAdjustmentDate?: Timestamp | Date;

  // ===== TAX TREATMENT =====
  isTaxable?: boolean;
  hasTaxWithholding?: boolean;
  withholdingAmount?: CurrencyAmount;

  // ===== FAMILY SUPPORT SPECIFIC =====
  reliability?: 'reliable' | 'sometimes_late' | 'unreliable';
  divorceYear?: number; // For alimony tax treatment

  // ===== SOCIAL SECURITY SPECIFIC =====
  isSpousalBenefit?: boolean;
  isSurvivorBenefit?: boolean;

  // ===== VA SPECIFIC =====
  disabilityRating?: number;

  // ===== FLAGS =====
  isMeansTested?: boolean;
}

type BenefitSubtype =
  | 'social_security'
  | 'social_security_disability'
  | 'ssi'
  | 'pension_government'
  | 'pension_military'
  | 'pension_private'
  | 'va_disability'
  | 'va_pension'
  | 'va_education'
  | 'va_other'
  | 'disability_private'
  | 'workers_comp'
  | 'unemployment'
  | 'child_support'
  | 'alimony'
  | 'welfare'
  | 'other';

type BeneficiaryType =
  | 'self'
  | 'spouse'
  | 'child'
  | 'other_dependent'
  | 'household';

type SSPaymentSchedule =
  | 'second_wednesday'
  | 'third_wednesday'
  | 'fourth_wednesday'
  | 'third_of_month';
```
