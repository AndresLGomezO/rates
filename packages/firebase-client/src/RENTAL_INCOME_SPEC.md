# Income Type #3: Rental Income

## Detailed Design Document

---

## 1. Purpose & Overview

### What is this income type for?

Income earned from renting out property - whether a full property, a room, or short-term vacation rentals. This income type bridges the gap between highly predictable (long-term leases) and variable (Airbnb/VRBO) income patterns.

### Who uses this?

- Landlords with long-term tenants
- Airbnb/VRBO hosts
- Room renters (renting a spare room)
- Property investors with multiple units
- House hackers (living in one unit, renting others)
- Vacation property owners

### Why track it?

- Understand net income after property expenses
- Track across multiple properties
- Plan for vacancy periods
- Balance rental income against mortgage payments
- Calculate true ROI on rental properties
- Tax planning (rental income has specific tax implications)

### Key Challenges This Flow Must Solve

| Challenge                            | Solution                                              |
| ------------------------------------ | ----------------------------------------------------- |
| Long-term vs short-term rentals      | Branch based on rental type                           |
| Gross vs net income confusion        | Ask what user wants to track, help calculate net      |
| Associated expenses (mortgage, etc.) | Option to link to existing accounts or enter expenses |
| Multiple units/properties            | Support per-property or aggregated tracking           |
| Vacancy periods                      | Capture expected occupancy rate                       |
| Property management fees             | Include in expense calculation                        |
| Security deposits (not income)       | Clarify what counts as income                         |

---

## 2. Data Requirements

### Minimum Required Data (Must Have)

| Field         | Purpose                     | User Knows This? |
| ------------- | --------------------------- | ---------------- |
| Income Name   | Identify this rental income | Always ✅        |
| Rental Type   | Long-term vs short-term     | Always ✅        |
| Rental Amount | How much rent they receive  | Always ✅        |

### Optional but Valuable Data

| Field                 | Purpose                           | User Knows This? |
| --------------------- | --------------------------------- | ---------------- |
| Property Address/Name | Reference for multiple properties | Usually ✅       |
| Rental Frequency      | How often rent is collected       | Usually ✅       |
| Number of Units       | For multi-unit properties         | Always ✅        |
| Tenant Name           | Reference (long-term)             | Often ✅         |
| Lease End Date        | Predict income continuity         | Often ✅         |
| Expected Occupancy    | For short-term rentals            | Sometimes        |
| Associated Expenses   | Calculate net income              | Sometimes        |
| Linked Mortgage       | Connect to existing loan account  | Sometimes        |

### Calculated/Derived Data (System Computes)

| Field                | Derived From                        |
| -------------------- | ----------------------------------- |
| Monthly Gross Income | Rental Amount × Frequency           |
| Monthly Net Income   | Gross - Expenses                    |
| Annual Gross Income  | Monthly × 12 (adjusted for vacancy) |
| Annual Net Income    | Annual Gross - Annual Expenses      |
| Effective Occupancy  | Actual vs expected (over time)      |

---

## 3. Schema Skeleton

```typescript
interface RentalIncome extends BaseIncome {
  incomeType: 'rental';
  rentalSubtype: RentalSubtype;

  // ===== PROPERTY IDENTIFICATION =====

  /** Property name or address for reference */
  propertyName?: string;

  /** Full address (optional, for records) */
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  /** Number of units (for multi-family) */
  numberOfUnits?: number;

  // ===== RENTAL DETAILS =====

  /** Rental amount per period */
  rentalAmount: CurrencyAmount;

  /** How often rent is collected */
  rentalFrequency: PaymentFrequency;

  /** Day of month rent is due (for monthly) */
  rentDueDay?: number;

  /** For long-term: tenant information */
  tenantName?: string;

  /** Lease start date */
  leaseStartDate?: Timestamp | Date;

  /** Lease end date */
  leaseEndDate?: Timestamp | Date;

  /** Is lease auto-renewing? */
  isLeaseAutoRenewing?: boolean;

  // ===== SHORT-TERM RENTAL FIELDS =====

  /** Platform used (Airbnb, VRBO, etc.) */
  platformType?: RentalPlatformType;

  /** Nightly/weekly rate */
  nightlyRate?: CurrencyAmount;
  weeklyRate?: CurrencyAmount;

  /** Expected occupancy percentage (0-100) */
  expectedOccupancyPercent?: number;

  /** Average nights booked per month */
  averageNightsPerMonth?: number;

  // ===== EXPENSE TRACKING =====

  /** Does user want to track net income? */
  trackNetIncome: boolean;

  /** Link to existing mortgage account (if any) */
  linkedMortgageAccountId?: string;

  /** Monthly mortgage payment (if not linked) */
  mortgagePayment?: CurrencyAmount;

  /** Property management fee (% or fixed) */
  propertyManagementFee?: {
    type: 'percentage' | 'fixed';
    value: number;
  };

  /** Other monthly expenses */
  otherMonthlyExpenses?: CurrencyAmount;

  /** Expense breakdown (optional detail) */
  expenseBreakdown?: {
    insurance?: CurrencyAmount;
    propertyTax?: CurrencyAmount;
    hoa?: CurrencyAmount;
    utilities?: CurrencyAmount;
    maintenance?: CurrencyAmount;
    other?: CurrencyAmount;
  };

  // ===== CALCULATED FIELDS =====

  /** Gross monthly income */
  grossMonthlyIncome?: CurrencyAmount;

  /** Net monthly income (after expenses) */
  netMonthlyIncome?: CurrencyAmount;

  /** Total monthly expenses */
  totalMonthlyExpenses?: CurrencyAmount;

  // ===== FLAGS =====

  /** Is this the user's primary residence? (house hacking) */
  isPrimaryResidence?: boolean;

  /** Does user live in one unit? */
  ownerOccupied?: boolean;

  /** Is property currently vacant? */
  isCurrentlyVacant?: boolean;

  /** Expected vacancy date (if tenant leaving) */
  expectedVacancyDate?: Timestamp | Date;
}

type RentalSubtype =
  | 'long_term' // Traditional yearly lease
  | 'short_term' // Airbnb, VRBO, vacation rental
  | 'room_rental' // Renting a room in primary residence
  | 'commercial' // Commercial property rental
  | 'other';

type RentalPlatformType =
  | 'airbnb'
  | 'vrbo'
  | 'booking_com'
  | 'direct' // Direct booking, no platform
  | 'property_manager' // Managed by PM company
  | 'other';
```

---

## 4. Complete UI Flow

### Flow Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         RENTAL INCOME FLOW                                   │
│                                                                              │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────────┐   ┌─────────────┐  │
│  │ 1   │──▶│ 2   │──▶│ 3   │──▶│ 4       │──▶│ 5       │──▶│ 6           │  │
│  │Name │   │Type │   │Amt  │   │Expenses │   │Timing   │   │Confirm      │  │
│  └─────┘   └─────┘   └─────┘   └─────────┘   └─────────┘   └─────────────┘  │
│                │                    │                                        │
│       ┌────────┴────────┐           │                                        │
│       ▼                 ▼           │                                        │
│  [Long-term]      [Short-term]      │                                        │
│       │                 │           │                                        │
│       ▼                 ▼           ▼                                        │
│  (Fixed rent)    (Nightly rate   (Optional:                                  │
│                   + occupancy)    Link mortgage                              │
│                                   or enter expenses)                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### STEP 1: Income Name & Property

**Screen Title:** "Let's add your rental income"

**Purpose:** Identify the rental property and create a friendly reference

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏠 Let's add your rental income                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What would you like to call this rental income?            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Downtown apartment rental                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Examples: "Main Street duplex", "Beach house Airbnb",  │
│     "Spare bedroom rent"                                   │
│                                                             │
│                                                             │
│  Property address or identifier (optional)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 123 Main Street, Apt 2B                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Helps you identify which property this is for          │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Is this property your primary residence?                   │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  🏠 No              │   │  🏡 Yes             │         │
│  │                     │   │                     │         │
│  │  It's a separate    │   │  I live here and    │         │
│  │  investment         │   │  rent part of it    │         │
│  │  property           │   │  (house hacking)    │         │
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
- `propertyName` / `propertyAddress` (optional)
- `isPrimaryResidence`: boolean

**UX Notes:**

- If user selects "Yes" (primary residence), this indicates house hacking
- Property address is optional but helpful for users with multiple properties

---

### STEP 2: Rental Type

**Screen Title:** "What type of rental is this?"

**Purpose:** Determine the rental model - this is the KEY branching question

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔑 What type of rental is this?                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select the option that best describes your rental:         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📋  Long-term rental                               │   │
│  │                                                     │   │
│  │      Traditional lease (6+ months)                  │   │
│  │      Fixed monthly rent from a tenant               │   │
│  │                                          ⭐ Common  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏖️  Short-term / Vacation rental                   │   │
│  │                                                     │   │
│  │      Airbnb, VRBO, or similar                       │   │
│  │      Nightly or weekly bookings                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🛏️  Room rental                                    │   │
│  │                                                     │   │
│  │      Renting a room in your home                    │   │
│  │      Roommate or boarder                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏢  Commercial rental                              │   │
│  │                                                     │   │
│  │      Office, retail, or industrial space            │   │
│  │      Business tenant                                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❓  Other                                          │   │
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

- `rentalSubtype`: RentalSubtype

**Critical Branching:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  "Long-term rental"                                         │
│       │                                                     │
│       └──▶ STEP 3A: Fixed Rent Flow                        │
│            (Monthly rent amount, tenant info, lease dates)  │
│                                                             │
│  "Short-term / Vacation rental"                             │
│       │                                                     │
│       └──▶ STEP 3B: Variable Rental Flow                   │
│            (Platform, nightly rate, occupancy estimate)     │
│                                                             │
│  "Room rental"                                              │
│       │                                                     │
│       └──▶ STEP 3A: Fixed Rent Flow (simplified)           │
│            (Monthly rent, roommate info)                    │
│                                                             │
│  "Commercial rental"                                        │
│       │                                                     │
│       └──▶ STEP 3A: Fixed Rent Flow                        │
│            (Monthly rent, business tenant, lease terms)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 2B: Short-term Platform Selection

**Only shown if user selected "Short-term / Vacation rental"**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏖️ How do you manage bookings?                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Select the platform(s) you use:                            │
│                                                             │
│  ┌────────────────┐   ┌────────────────┐                   │
│  │                │   │                │                   │
│  │    🏠         │   │    🌴         │                   │
│  │   Airbnb      │   │    VRBO       │                   │
│  │                │   │                │                   │
│  └────────────────┘   └────────────────┘                   │
│                                                             │
│  ┌────────────────┐   ┌────────────────┐                   │
│  │                │   │                │                   │
│  │    🌐         │   │    👤         │                   │
│  │  Booking.com  │   │    Direct     │                   │
│  │                │   │   bookings    │                   │
│  └────────────────┘   └────────────────┘                   │
│                                                             │
│  ┌────────────────┐   ┌────────────────┐                   │
│  │                │   │                │                   │
│  │    🏢         │   │    ❓         │                   │
│  │   Property    │   │    Other      │                   │
│  │   Manager     │   │               │                   │
│  └────────────────┘   └────────────────┘                   │
│                                                             │
│  💡 Select your primary platform - you can track income    │
│     from all sources together                               │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `platformType`: RentalPlatformType

---

### STEP 3A: Long-term Rental Amount

**For: Long-term rental, Room rental, Commercial rental**

**Screen Title:** "How much rent do you receive?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much rent do you receive?                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What is the monthly rent amount?                           │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,800                          │  .00         │
│             └────────────────────────────────┘              │
│             per month                                       │
│                                                             │
│  💡 Enter the full rent amount (before any deductions)     │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How many units does this cover?                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  1 unit                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • 1 unit (single tenant)             ← default  │     │
│    │ • 2 units (duplex)                              │     │
│    │ • 3 units (triplex)                             │     │
│    │ • 4+ units (multi-family)                       │     │
│    │ • Multiple separate properties                  │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│  (If multiple units selected:)                              │
│                                                             │
│  Is the $1,800 the total for all units?                     │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │  ✅ Yes, total      │   │  📝 No, per unit    │         │
│  │  for all units      │   │  (I'll enter each)  │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Monthly rental income: $1,800                           │
│     Annual rental income: $21,600                           │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `rentalAmount`: CurrencyAmount
- `rentalFrequency`: 'monthly' (default for long-term)
- `numberOfUnits`: number

**Multi-Unit Expansion (if "per unit" selected):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏢 Enter rent for each unit                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Unit 1                                                     │
│  ┌────────────────────────────────┐                        │
│  │ $ 950                          │ .00 /month              │
│  └────────────────────────────────┘                        │
│  ☐ Currently vacant                                        │
│                                                             │
│  Unit 2                                                     │
│  ┌────────────────────────────────┐                        │
│  │ $ 850                          │ .00 /month              │
│  └────────────────────────────────┘                        │
│  ☐ Currently vacant                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Total monthly rental income: $1,800                     │
│     (2 units occupied)                                      │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 3A-2: Tenant & Lease Details (Long-term)

**Screen Title:** "Tell us about the lease"

**Purpose:** Capture lease information for income continuity planning

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 Tell us about the lease                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  This helps us predict your rental income over time.        │
│                                                             │
│                                                             │
│  Tenant name (optional)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ John Smith                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  💡 Just for your reference                                │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When does the current lease end?                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄 Month-to-month (no fixed end)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅 Fixed lease ending on:                          │   │
│  │                                                     │   │
│  │     ┌─────────────────────────────────────────┐    │   │
│  │     │  August 31, 2025                        │    │   │
│  │     └─────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  │     ☐ Lease will likely be renewed                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏠 Property is currently vacant                    │   │
│  │     (Looking for a tenant)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       ⏭️  Skip lease details                        │   │
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

- `tenantName` (optional)
- `leaseEndDate`: Date | null (null = month-to-month)
- `isLeaseAutoRenewing`: boolean
- `isCurrentlyVacant`: boolean

**Vacant Property Flow:**
If user selects "Property is currently vacant":

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏠 Property is vacant                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When do you expect to have a tenant?                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Expecting tenant around: February 2025         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  What rent do you expect to charge?                         │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,800                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 We'll show $0 income until then, and your expected     │
│     income afterward.                                       │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 3B: Short-term Rental Amount

**For: Short-term / Vacation rental**

**Screen Title:** "How much do you earn from this rental?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💵 How much do you earn from this rental?                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's the easiest way for you to enter your income?       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📅  I know my average monthly income               │   │
│  │                                                     │   │
│  │      I can estimate what I typically earn           │   │
│  │      each month from this rental                    │   │
│  │                                          ⭐ Easiest │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🌙  I know my nightly rate and occupancy           │   │
│  │                                                     │   │
│  │      I'll enter my rate and how often               │   │
│  │      the property is booked                         │   │
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

- "Average monthly income" → Step 3B-1
- "Nightly rate and occupancy" → Step 3B-2

---

#### STEP 3B-1: Monthly Estimate (Short-term)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📅 What's your average monthly income?                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How much do you typically earn per month from this         │
│  property (after platform fees)?                            │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 2,500                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Think about an average month - it's okay if it varies  │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Does income vary significantly by season?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄 No, it's fairly consistent                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📈 Yes, it varies by season                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (If seasonal selected:)                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Peak season (busy months):     $4,000 /month       │   │
│  │  Off season (slow months):      $1,500 /month       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Estimated annual income: $30,000                        │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `grossMonthlyIncome`: CurrencyAmount (estimated)
- `isSeasonalIncome`: boolean
- `peakSeasonAmount` / `offSeasonAmount` (if seasonal)

---

#### STEP 3B-2: Nightly Rate & Occupancy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🌙 Tell us about your rental rates                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's your average nightly rate?                          │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 150                            │  .00 /night  │
│             └────────────────────────────────┘              │
│                                                             │
│  💡 Use your average rate (after discounts, before fees)   │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How often is the property booked?                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │           Occupancy Rate                            │   │
│  │                                                     │   │
│  │    0%  ├────────●─────────────────────┤  100%      │   │
│  │                 ▲                                   │   │
│  │               ~60%                                  │   │
│  │                                                     │   │
│  │    About 18 nights per month                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OR enter directly:                                         │
│                                                             │
│  Average nights booked per month:                           │
│             ┌────────────────────────────────┐              │
│             │ 18                             │  nights      │
│             └────────────────────────────────┘              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Estimated gross income:                                 │
│                                                             │
│     $150/night × 18 nights = $2,700/month                   │
│                              $32,400/year                   │
│                                                             │
│  ⚠️  Note: Platform fees (typically 3-15%) will reduce     │
│      your actual payout                                     │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `nightlyRate`: CurrencyAmount
- `expectedOccupancyPercent`: number (0-100)
- `averageNightsPerMonth`: number
- `grossMonthlyIncome`: CurrencyAmount (calculated)

---

### STEP 4: Expenses & Net Income

**Screen Title:** "Do you want to track your net income?"

**Purpose:** This is a KEY decision - track gross only or calculate net after expenses

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Do you want to track your net rental income?            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your gross rental income is $1,800/month.                  │
│                                                             │
│  Would you like to subtract expenses to see your actual     │
│  profit from this property?                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📈  Track gross income only                        │   │
│  │                                                     │   │
│  │      Just show the rent I receive                   │   │
│  │      I'll track expenses separately                 │   │
│  │                                          ⭐ Simpler │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  💰  Track net income (after expenses)              │   │
│  │                                                     │   │
│  │      Subtract mortgage, taxes, insurance, etc.      │   │
│  │      See my true cash flow from this property       │   │
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

- "Track gross income only" → Skip to Step 5 (Timing)
- "Track net income" → Step 4A (Expense Entry)

---

### STEP 4A: Expense Entry

**Screen Title:** "What are your property expenses?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💸 What are your property expenses?                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Let's calculate your monthly expenses for this property.   │
│                                                             │
│                                                             │
│  ─────────────────── MORTGAGE ────────────────────────────  │
│                                                             │
│  Do you have a mortgage on this property?                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔗  Yes - link to existing mortgage account        │   │
│  │      Connect to "123 Main St Mortgage" ($1,250/mo)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  Yes - I'll enter the payment amount            │   │
│  │                                                     │   │
│  │      Monthly mortgage payment:                      │   │
│  │      ┌────────────────────────────────┐             │   │
│  │  $   │ 1,250                          │ .00 /month  │   │
│  │      └────────────────────────────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌  No mortgage (property is paid off)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ─────────────────── OTHER EXPENSES ──────────────────────  │
│                                                             │
│  What are your other monthly expenses?                      │
│  (Enter amounts or leave blank if not applicable)           │
│                                                             │
│  Property taxes        $  ┌─────────────┐  /month          │
│                           │ 250         │                   │
│                           └─────────────┘                   │
│                                                             │
│  Insurance             $  ┌─────────────┐  /month          │
│                           │ 100         │                   │
│                           └─────────────┘                   │
│                                                             │
│  HOA fees              $  ┌─────────────┐  /month          │
│                           │ 150         │                   │
│                           └─────────────┘                   │
│                                                             │
│  Property management   $  ┌─────────────┐  /month          │
│  (or ___% of rent)        │ 0           │                   │
│                           └─────────────┘                   │
│                                                             │
│  Utilities (if paid    $  ┌─────────────┐  /month          │
│  by landlord)             │ 0           │                   │
│                           └─────────────┘                   │
│                                                             │
│  Maintenance reserve   $  ┌─────────────┐  /month          │
│  (recommended ~5%)        │ 90          │                   │
│                           └─────────────┘                   │
│                                                             │
│  Other expenses        $  ┌─────────────┐  /month          │
│                           │ 0           │                   │
│                           └─────────────┘                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Expense Summary                                         │
│                                                             │
│     Mortgage:              $1,250                           │
│     Property taxes:        $250                             │
│     Insurance:             $100                             │
│     HOA:                   $150                             │
│     Maintenance reserve:   $90                              │
│     ─────────────────────────────                           │
│     Total expenses:        $1,840/month                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💰 Net Income Calculation                                  │
│                                                             │
│     Gross rent:            $1,800                           │
│     Total expenses:       -$1,840                           │
│     ─────────────────────────────                           │
│     Net income:           -$40/month  ⚠️                    │
│                                                             │
│  ⚠️  This property currently has negative cash flow.        │
│      This is common if you're building equity.              │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `linkedMortgageAccountId` OR `mortgagePayment`
- `expenseBreakdown`: { insurance, propertyTax, hoa, utilities, maintenance, other }
- `totalMonthlyExpenses`: CurrencyAmount (calculated)
- `netMonthlyIncome`: CurrencyAmount (calculated)

**Smart Features:**

- If user has existing mortgage accounts, offer to link
- Show warning for negative cash flow (but don't prevent saving)
- Suggest maintenance reserve (~5-10% of rent)

---

### STEP 4B: Simplified Expense Entry

**Alternative: Quick expense entry for users who don't want detail**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💸 Quick expense entry                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What's your total monthly expense for this property?       │
│  (Include mortgage, taxes, insurance, everything)           │
│                                                             │
│             ┌────────────────────────────────┐              │
│         $   │ 1,500                          │  .00 /month  │
│             └────────────────────────────────┘              │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Net Income Calculation                                  │
│                                                             │
│     Gross rent:            $1,800                           │
│     Total expenses:       -$1,500                           │
│     ─────────────────────────────                           │
│     Net income:            $300/month  ✅                   │
│     Annual net:            $3,600/year                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝  I'd rather enter expenses in detail            │   │
│  │      (mortgage, taxes, insurance separately)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### STEP 5: Payment Timing

**Screen Title:** "When do you receive rent?"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you receive rent?                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  What day of the month is rent due?                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  1st of the month                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │ • 1st of the month                   ⭐ Common  │     │
│    │ • 15th of the month                             │     │
│    │ • Last day of the month                         │     │
│    │ • Other date...                                 │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When do you expect the next rent payment?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  February 1, 2025                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
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

**For Short-term Rentals (different timing screen):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🗓️ When do you receive payouts?                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How often does [Airbnb] pay you?                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  After each guest checks out                    │   │
│  │      (typically within 24 hours)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Weekly payouts                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Monthly payouts                                │   │
│  │      (e.g., property manager sends monthly)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔀  It varies / irregular                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Back                                ┌─────────────────┐  │
│                                        │    Continue →   │  │
│                                        └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Captured:**

- `rentDueDay`: number (1-31) for long-term
- `rentalFrequency`: PaymentFrequency
- `nextExpectedPayment`: Date

---

### STEP 6: Confirmation & Summary

**Screen Title:** "Review your rental income"

#### Long-term Rental Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your rental income                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏠  Downtown apartment rental                      │   │
│  │      123 Main Street, Apt 2B                        │   │
│  │                                      Long-term lease│   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 INCOME                                          │   │
│  │                                                     │   │
│  │     Monthly rent:           $1,800                  │   │
│  │     Annual gross:           $21,600                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💸 EXPENSES                                        │   │
│  │                                                     │   │
│  │     Mortgage:               $1,250                  │   │
│  │     Property taxes:         $250                    │   │
│  │     Insurance:              $100                    │   │
│  │     HOA:                    $150                    │   │
│  │     Maintenance:            $90                     │   │
│  │     ─────────────────────────────                   │   │
│  │     Total expenses:         $1,840/month            │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💰 NET INCOME                                      │   │
│  │                                                     │   │
│  │     Monthly net:            -$40  ⚠️                │   │
│  │     Annual net:             -$480                   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📋 LEASE DETAILS                                   │   │
│  │                                                     │   │
│  │     Tenant:                 John Smith              │   │
│  │     Lease ends:             August 31, 2025         │   │
│  │     Rent due:               1st of each month       │   │
│  │     Next payment:           February 1, 2025        │   │
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

#### Short-term Rental Summary:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ Review your rental income                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏖️  Beach house Airbnb                             │   │
│  │      456 Ocean Drive                                │   │
│  │                             Short-term via Airbnb   │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  💵 INCOME                                          │   │
│  │                                                     │   │
│  │     Nightly rate:           $150                    │   │
│  │     Expected occupancy:     60% (~18 nights/mo)     │   │
│  │                                                     │   │
│  │     Est. monthly gross:     $2,700                  │   │
│  │     Est. annual gross:      $32,400                 │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  📊 VARIABILITY                                     │   │
│  │                                                     │   │
│  │     ⚠️  Income will vary based on bookings          │   │
│  │                                                     │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  🗓️ PAYOUTS                                         │   │
│  │                                                     │   │
│  │     Frequency:              After each checkout     │   │
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
│ STEP 1: Name & Property             │
│                                     │
│ Q: "What would you like to call     │
│    this rental income?"             │
│ Q: "Property address?" (optional)   │
│ Q: "Is this your primary residence?"│
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Rental Type (KEY BRANCHING QUESTION)                        │
│                                                                     │
│ Q: "What type of rental is this?"                                   │
│                                                                     │
│ ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐ │
│ │  Long-term   │  │  Short-term  │  │   Room     │  │ Commercial │ │
│ └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘ │
│        │                 │                │               │        │
└────────┼─────────────────┼────────────────┼───────────────┼────────┘
         │                 │                │               │
         │                 ▼                │               │
         │    ┌────────────────────────┐    │               │
         │    │ STEP 2B: Platform      │    │               │
         │    │                        │    │               │
         │    │ Q: "How do you manage  │    │               │
         │    │    bookings?"          │    │               │
         │    │                        │    │               │
         │    │ [Airbnb/VRBO/etc.]     │    │               │
         │    └───────────┬────────────┘    │               │
         │                │                 │               │
         ▼                │                 ▼               ▼
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: Rental Amount                                              │
│                                                                    │
│ ┌─────────────────────────────┐  ┌───────────────────────────────┐ │
│ │ STEP 3A: Long-term          │  │ STEP 3B: Short-term           │ │
│ │ (Long-term, Room, Commerc.) │  │                               │ │
│ │                             │  │ Q: "What's the easiest way    │ │
│ │ Q: "What is the monthly     │  │    to enter your income?"     │ │
│ │    rent amount?"            │  │                               │ │
│ │ Q: "How many units?"        │  │ ┌─────────────┐ ┌───────────┐ │ │
│ │                             │  │ │Avg monthly  │ │Nightly +  │ │ │
│ │         │                   │  │ │income       │ │occupancy  │ │ │
│ │         ▼                   │  │ └──────┬──────┘ └─────┬─────┘ │ │
│ │ ┌─────────────────────────┐ │  │        ▼             ▼       │ │
│ │ │ STEP 3A-2: Lease        │ │  │ ┌───────────┐ ┌───────────┐  │ │
│ │ │                         │ │  │ │ 3B-1:     │ │ 3B-2:     │  │ │
│ │ │ Q: "Tenant name?"       │ │  │ │ Monthly   │ │ Rate +    │  │ │
│ │ │ Q: "When does lease     │ │  │ │ estimate  │ │ occupancy │  │ │
│ │ │    end?"                │ │  │ └───────────┘ └───────────┘  │ │
│ │ │ Q: "Currently vacant?"  │ │  │                               │ │
│ │ └─────────────────────────┘ │  │                               │ │
│ └─────────────────────────────┘  └───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
         │                                    │
         └──────────────┬─────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Expenses & Net Income (KEY DECISION)                        │
│                                                                     │
│ Q: "Do you want to track your net rental income?"                   │
│                                                                     │
│ ┌─────────────────────────────┐  ┌────────────────────────────────┐ │
│ │  Track gross income only    │  │  Track net income (expenses)   │ │
│ │                             │  │                                │ │
│ │  (Skip to Step 5)           │  │          │                     │ │
│ └─────────────────────────────┘  │          ▼                     │ │
│                                  │  ┌──────────────────────────┐  │ │
│                                  │  │ STEP 4A: Expense Entry   │  │ │
│                                  │  │                          │  │ │
│                                  │  │ Q: "Do you have a        │  │ │
│                                  │  │    mortgage?"            │  │ │
│                                  │  │    • Link existing       │  │ │
│                                  │  │    • Enter amount        │  │ │
│                                  │  │    • No mortgage         │  │ │
│                                  │  │                          │  │ │
│                                  │  │ Q: "What are your other  │  │ │
│                                  │  │    monthly expenses?"    │  │ │
│                                  │  │    • Property taxes      │  │ │
│                                  │  │    • Insurance           │  │ │
│                                  │  │    • HOA                 │  │ │
│                                  │  │    • Property mgmt       │  │ │
│                                  │  │    • Utilities           │  │ │
│                                  │  │    • Maintenance         │  │ │
│                                  │  │    • Other               │  │ │
│                                  │  └──────────────────────────┘  │ │
│                                  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Payment Timing                                              │
│                                                                     │
│ For Long-term:                      For Short-term:                 │
│ ┌─────────────────────────────┐    ┌──────────────────────────────┐ │
│ │ Q: "What day is rent due?"  │    │ Q: "How often do you receive │ │
│ │    • 1st of month           │    │    payouts?"                 │ │
│ │    • 15th of month          │    │    • After each checkout     │ │
│ │    • Last day               │    │    • Weekly                  │ │
│ │    • Other                  │    │    • Monthly                 │ │
│ │                             │    │    • Irregular               │ │
│ │ Q: "Next expected payment?" │    │                              │ │
│ └─────────────────────────────┘    └──────────────────────────────┘ │
│                                                                     │
│ [Skip for now] option available                                     │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────┐
│ STEP 6: Review & Confirm            │
│                                     │
│ Shows all entered data              │
│ Shows gross income                  │
│ Shows expenses (if tracked)         │
│ Shows net income (if tracked)       │
│ Shows lease/booking details         │
│                                     │
│ [Edit] or [Save Income ✓]           │
└─────────────────────────────────────┘
                        │
                        ▼
                      DONE
```

---

## 6. Minimum Path Examples

### Example 1: Simple Long-term Rental (Shortest Path - Gross Only)

```
Step 1 → Enter name "Rental property", No primary residence
     → Step 2 → Select "Long-term rental"
     → Step 3A → Enter $1,500/month, 1 unit
     → Step 3A-2 → Select "Month-to-month"
     → Step 4 → Select "Track gross income only"
     → Step 5 → Select "1st of the month"
     → Step 6 → Confirm

Total: 6 screens
Data captured: Name, type, rent amount, lease type, due date
```

### Example 2: Long-term Rental with Net Income Tracking

```
Step 1 → Enter name + address, Not primary residence
     → Step 2 → Select "Long-term rental"
     → Step 3A → Enter $1,800/month, 1 unit
     → Step 3A-2 → Enter tenant name, lease end date
     → Step 4 → Select "Track net income"
     → Step 4A → Link mortgage ($1,250), enter expenses
     → Step 5 → Enter due date
     → Step 6 → Confirm

Total: 7 screens
Data captured: Full details including expenses and net income
```

### Example 3: Airbnb Short-term Rental (Nightly Rate Path)

```
Step 1 → Enter name "Beach house Airbnb"
     → Step 2 → Select "Short-term / Vacation rental"
     → Step 2B → Select "Airbnb"
     → Step 3B → Select "Nightly rate and occupancy"
     → Step 3B-2 → Enter $150/night, 60% occupancy
     → Step 4 → Select "Track gross income only"
     → Step 5 → Select "After each checkout"
     → Step 6 → Confirm

Total: 7 screens
Data captured: Name, platform, nightly rate, occupancy, payout frequency
```

### Example 4: Room Rental (Simplest Path)

```
Step 1 → Enter name "Spare bedroom rent", Primary residence = Yes
     → Step 2 → Select "Room rental"
     → Step 3A → Enter $600/month, 1 unit
     → Step 3A-2 → Skip lease details
     → Step 4 → Select "Track gross income only"
     → Step 5 → Skip
     → Step 6 → Confirm

Total: 6 screens (with skips)
Data captured: Name, type, rent amount
```

### Example 5: Multi-unit Property (Duplex)

```
Step 1 → Enter name "Main Street Duplex"
     → Step 2 → Select "Long-term rental"
     → Step 3A → Select "2 units (duplex)"
             → Select "Per unit entry"
             → Unit 1: $950/month
             → Unit 2: $850/month (☐ vacant)
     → Step 3A-2 → Enter lease details for Unit 1
     → Step 4 → Select "Track net income"
     → Step 4A → Enter mortgage + expenses
     → Step 5 → Enter due date
     → Step 6 → Confirm

Total: 7 screens
Data captured: Multi-unit details, partial occupancy, expenses
```

---

## 7. Edge Cases & Handling

| Scenario                                | Handling                                                             |
| --------------------------------------- | -------------------------------------------------------------------- |
| Property is currently vacant            | Flag as vacant, ask for expected tenant date, show $0 current income |
| Tenant is leaving soon                  | Capture lease end date, show warning about upcoming income change    |
| Negative cash flow                      | Show warning but allow saving (common for equity building)           |
| User has multiple properties            | Allow adding multiple rental incomes (one per property)              |
| Mixed use property (live + rent)        | Flag as primary residence, only count rented portion as income       |
| Rent includes utilities                 | Option to note this, affects expense calculation                     |
| Property manager handles everything     | Capture PM fee, note that reported income is after fees              |
| Seasonal vacation rental                | Capture peak/off season rates, calculate blended average             |
| Rent is paid in cash                    | Same flow, no impact on tracking                                     |
| Tenant pays late frequently             | Metadata note, doesn't affect expected income                        |
| Security deposit received               | Clarify this is NOT income (refundable)                              |
| Rent increases mid-year                 | Allow updating rent amount, track effective date                     |
| Short-term rental with variable pricing | Use average nightly rate, note variability                           |
| Commercial lease with annual increases  | Capture current rent, option to note escalation clause               |

---

## 8. Data Priority for Calculations

### Monthly Income Calculation Priority

```
Priority Order for Rental Income:

1. For Long-term Rentals:
   └── rentalAmount × numberOfOccupiedUnits
       (Straightforward - rent is fixed)

2. For Short-term Rentals:
   ├── If user provided monthly estimate:
   │   └── Use estimatedMonthlyIncome directly
   │
   └── If user provided nightly rate + occupancy:
       └── nightlyRate × averageNightsPerMonth
           OR
           nightlyRate × (30 × expectedOccupancyPercent / 100)

3. Net Income Calculation:
   └── grossMonthlyIncome - totalMonthlyExpenses
       Where totalMonthlyExpenses includes:
       ├── mortgagePayment (or linked mortgage amount)
       ├── propertyTax
       ├── insurance
       ├── hoa
       ├── propertyManagementFee
       ├── utilities
       ├── maintenanceReserve
       └── otherExpenses
```

### Confidence Scoring

```typescript
// Pseudo-logic for rental income confidence
function getRentalIncomeConfidence(income: RentalIncome): IncomeConfidence {
  // Long-term with active tenant = high confidence
  if (income.rentalSubtype === 'long_term' && !income.isCurrentlyVacant) {
    if (income.leaseEndDate && isWithinMonths(income.leaseEndDate, 2)) {
      return 'medium'; // Lease ending soon
    }
    return 'high';
  }

  // Room rental = high (typically stable)
  if (income.rentalSubtype === 'room_rental' && !income.isCurrentlyVacant) {
    return 'high';
  }

  // Commercial = high (longer leases)
  if (income.rentalSubtype === 'commercial' && !income.isCurrentlyVacant) {
    return 'high';
  }

  // Short-term = variable
  if (income.rentalSubtype === 'short_term') {
    if (income.expectedOccupancyPercent >= 70) {
      return 'medium'; // Good occupancy
    }
    return 'low'; // Variable/unpredictable
  }

  // Vacant property
  if (income.isCurrentlyVacant) {
    return 'very_low';
  }

  return 'medium';
}
```

### Display in Projections

| Confidence | Display Treatment                                                           |
| ---------- | --------------------------------------------------------------------------- |
| High       | Solid bar in income chart, included in totals normally                      |
| Medium     | Solid bar with subtle indicator, included in totals                         |
| Low        | Hatched/dashed bar, "variable" label, range shown                           |
| Very Low   | Dotted/faded bar, "uncertain" label, excluded from conservative projections |

---

## 9. Special Rental Income Features

### Feature 1: Mortgage Linkage

When user has existing mortgage accounts in the app:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔗 Link to existing mortgage                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  We found mortgages in your accounts. Is one of these       │
│  for this rental property?                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏠 123 Main Street Mortgage                        │   │
│  │     $1,250/month • $185,000 remaining               │   │
│  │                                        [ Link ]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏠 Beach Property Loan                             │   │
│  │     $890/month • $120,000 remaining                 │   │
│  │                                        [ Link ]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ➕ None of these - I'll enter the amount           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ❌ No mortgage on this property                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits of Linking:**

- Expense auto-updates if mortgage payment changes
- Shows unified view of property cash flow
- Tracks equity building alongside rental income

---

### Feature 2: Lease Expiration Alerts

For long-term rentals approaching lease end:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ Lease Expiration Notice                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  The lease for "Downtown apartment rental" ends in          │
│  45 days (August 31, 2025).                                 │
│                                                             │
│  What's happening with this property?                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄 Tenant is renewing                              │   │
│  │     (Update lease end date)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👋 Tenant is leaving                               │   │
│  │     (Property will be vacant)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔜 New tenant already lined up                     │   │
│  │     (Enter new tenant info)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⏰ Remind me later                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 3: Vacancy Period Tracking

When property becomes vacant:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏠 Property Vacancy                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  "Downtown apartment rental" is now vacant.                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Impact on your finances:                                │
│                                                             │
│     Previous monthly income:    $1,800                      │
│     Current monthly income:     $0                          │
│                                                             │
│     Monthly expenses continue:  -$1,840                     │
│     Net monthly impact:         -$1,840  ⚠️                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When do you expect to have a new tenant?                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Around: March 2025                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 We'll adjust your projections to show $0 income        │
│     until then.                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature 4: ROI Summary (Optional Enhancement)

For users tracking net income, show property ROI:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📊 Property Performance Summary                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Downtown apartment rental                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  CASH FLOW                                          │   │
│  │                                                     │   │
│  │  Monthly gross:         $1,800                      │   │
│  │  Monthly expenses:     -$1,840                      │   │
│  │  Monthly net:          -$40                         │   │
│  │                                                     │   │
│  │  Annual gross:          $21,600                     │   │
│  │  Annual expenses:      -$22,080                     │   │
│  │  Annual net:           -$480                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  EQUITY BUILDING (if mortgage linked)               │   │
│  │                                                     │   │
│  │  Monthly principal paydown:    $450                 │   │
│  │  Annual principal paydown:     $5,400               │   │
│  │                                                     │   │
│  │  True annual return:           $4,920               │   │
│  │  (Principal paydown - cash loss)                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Even with negative cash flow, you're building          │
│     $5,400/year in equity through principal paydown.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Comparison: Income Types So Far

| Aspect               | Salary Income                 | Freelance/Gig Income              | Rental Income                                   |
| -------------------- | ----------------------------- | --------------------------------- | ----------------------------------------------- |
| **Predictability**   | High                          | Variable                          | Medium-High (long-term) / Variable (short-term) |
| **Key Question**     | "What's your take-home pay?"  | "How predictable is this income?" | "What type of rental?"                          |
| **Amount Entry**     | Take-home / Gross / Annual    | Rate-based or Estimate            | Fixed rent or Nightly + Occupancy               |
| **Expense Tracking** | No (handled by employer)      | Optional (tax set-aside)          | Yes (mortgage, taxes, etc.)                     |
| **Net Income**       | N/A (already net after taxes) | Gross only typically              | Gross or Net (user choice)                      |
| **Timing**           | Exact pay dates               | Approximate frequency             | Due dates (long-term) or irregular (short-term) |
| **Linked Accounts**  | No                            | No                                | Yes (mortgage linkage)                          |
| **Confidence**       | Always high                   | Varies by predictability          | High (long-term) / Low (short-term)             |
| **Special Features** | None                          | Tax planning helper               | Vacancy tracking, ROI summary                   |

---

## 11. Summary: Complete Question List

### All Questions in Rental Income Flow

| Step | Question                                          | Required? | Condition                    |
| ---- | ------------------------------------------------- | --------- | ---------------------------- |
| 1    | "What would you like to call this rental income?" | ✅ Yes    | Always                       |
| 1    | "Property address or identifier?"                 | Optional  | Always                       |
| 1    | "Is this property your primary residence?"        | ✅ Yes    | Always                       |
| 2    | "What type of rental is this?"                    | ✅ Yes    | Always (KEY QUESTION)        |
| 2B   | "How do you manage bookings?"                     | ✅ Yes    | If short-term selected       |
| 3A   | "What is the monthly rent amount?"                | ✅ Yes    | If long-term/room/commercial |
| 3A   | "How many units does this cover?"                 | ✅ Yes    | If long-term/commercial      |
| 3A   | "Is the amount total or per unit?"                | ✅ Yes    | If multiple units            |
| 3A-2 | "Tenant name?"                                    | Optional  | If long-term                 |
| 3A-2 | "When does the current lease end?"                | Optional  | If long-term                 |
| 3A-2 | "Currently vacant?"                               | ✅ Yes    | If long-term                 |
| 3A-2 | "When do you expect to have a tenant?"            | ✅ Yes    | If vacant                    |
| 3B   | "What's the easiest way to enter your income?"    | ✅ Yes    | If short-term                |
| 3B-1 | "How much do you typically earn per month?"       | ✅ Yes    | If monthly estimate selected |
| 3B-1 | "Does income vary significantly by season?"       | Optional  | If short-term                |
| 3B-2 | "What's your average nightly rate?"               | ✅ Yes    | If nightly rate selected     |
| 3B-2 | "How often is the property booked?"               | ✅ Yes    | If nightly rate selected     |
| 4    | "Do you want to track your net rental income?"    | ✅ Yes    | Always (KEY DECISION)        |
| 4A   | "Do you have a mortgage on this property?"        | ✅ Yes    | If tracking net income       |
| 4A   | "What are your other monthly expenses?"           | Optional  | If tracking net income       |
| 5    | "What day of the month is rent due?"              | Optional  | If long-term                 |
| 5    | "How often do you receive payouts?"               | Optional  | If short-term                |
| 5    | "When do you expect the next rent payment?"       | Optional  | Always                       |
| 6    | "Does everything look correct?"                   | ✅ Yes    | Always (confirmation)        |

---

## 12. Schema Skeleton (Complete)

```typescript
interface RentalIncome extends BaseIncome {
  incomeType: 'rental';
  rentalSubtype: RentalSubtype;

  // ===== PROPERTY IDENTIFICATION =====
  propertyName?: string;
  propertyAddress?: PropertyAddress;
  numberOfUnits?: number;
  isPrimaryResidence: boolean;
  ownerOccupied?: boolean;

  // ===== RENTAL DETAILS =====
  rentalAmount: CurrencyAmount;
  rentalFrequency: PaymentFrequency;
  rentDueDay?: number;

  // ===== TENANT & LEASE (Long-term) =====
  tenantName?: string;
  leaseStartDate?: Timestamp | Date;
  leaseEndDate?: Timestamp | Date;
  isLeaseAutoRenewing?: boolean;
  isCurrentlyVacant?: boolean;
  expectedTenantDate?: Timestamp | Date;

  // ===== SHORT-TERM RENTAL =====
  platformType?: RentalPlatformType;
  nightlyRate?: CurrencyAmount;
  weeklyRate?: CurrencyAmount;
  expectedOccupancyPercent?: number;
  averageNightsPerMonth?: number;
  isSeasonalIncome?: boolean;
  peakSeasonAmount?: CurrencyAmount;
  offSeasonAmount?: CurrencyAmount;

  // ===== EXPENSE TRACKING =====
  trackNetIncome: boolean;
  linkedMortgageAccountId?: string;
  mortgagePayment?: CurrencyAmount;
  propertyManagementFee?: FeeStructure;
  otherMonthlyExpenses?: CurrencyAmount;
  expenseBreakdown?: ExpenseBreakdown;

  // ===== CALCULATED =====
  grossMonthlyIncome?: CurrencyAmount;
  netMonthlyIncome?: CurrencyAmount;
  totalMonthlyExpenses?: CurrencyAmount;

  // ===== TIMING =====
  nextExpectedPayment?: Timestamp | Date;
  payoutFrequency?: PaymentFrequency | 'per_checkout' | 'irregular';
}

type RentalSubtype =
  | 'long_term'
  | 'short_term'
  | 'room_rental'
  | 'commercial'
  | 'other';

type RentalPlatformType =
  | 'airbnb'
  | 'vrbo'
  | 'booking_com'
  | 'direct'
  | 'property_manager'
  | 'other';

interface ExpenseBreakdown {
  insurance?: CurrencyAmount;
  propertyTax?: CurrencyAmount;
  hoa?: CurrencyAmount;
  utilities?: CurrencyAmount;
  maintenance?: CurrencyAmount;
  other?: CurrencyAmount;
}

interface FeeStructure {
  type: 'percentage' | 'fixed';
  value: number;
}
```
