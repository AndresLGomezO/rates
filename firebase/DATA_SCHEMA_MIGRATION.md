You are an expert TypeScript refactoring assistant working on a personal finance app.

Goal:
Refactor the current generic `FinancialAccount` model into a **discriminated union** of more precise account types, with **minimal required user input** per type and clear separation of **derived vs. stored fields**. We want to:

- Merge conceptually identical products into a single core type (e.g., loans).
- Tailor fields to each account type instead of one giant interface.
- Reduce the amount of information users must manually enter.
- Keep room for future metrics, projections, and AI-based suggestions.

---

1. CURRENT STATE (for reference)

---

This is (roughly) the current model:

```ts
export interface FinancialAccount {
  /** Unique account identifier/number */
  accountNumber: string;

  /** Display name for the account */
  accountName: string;

  /** Detailed description of the account */
  accountDescription: string;

  /** Type of account (loan, credit card, bill, etc.) */
  accountType: AccountType;

  /** Current status of the account */
  status: AccountStatus;

  /** Total amount remaining in the account's primary currency */
  totalAmountRemaining: CurrencyAmount;

  /** Payment amount per period in the account's primary currency */
  paymentAmount: CurrencyAmount;

  /** Payment frequency */
  paymentFrequency: PaymentFrequency;

  /** Interest rate (as a percentage, e.g., 12.5 for 12.5%) */
  rate: number;

  /** Next payment due date */
  nextDueDate: Timestamp | Date;

  /** Account start date */
  startDate?: Timestamp | Date;

  /** Account end/maturity date */
  endDate?: Timestamp | Date;

  /** Minimum payment (if different from payment amount) */
  minimumPayment?: CurrencyAmount;

  /** Original loan/account amount */
  originalAmount?: CurrencyAmount;

  /** Number of payment periods */
  numberOfPayments?: number;

  /** Remaining number of payments */
  remainingPayments?: number;

  /** Additional metadata as key-value pairs */
  metadata?: Record<string, unknown>;
}

export interface CurrencyAmount {
  /** Amount value */
  amount: number;
  /** Currency code (COP, USD, etc.) */
  currency: CurrencyCode;
}

export type AccountType =
  | 'loan'
  | 'credit_card'
  | 'bill'
  | 'mortgage'
  | 'personal_loan'
  | 'auto_loan'
  | 'other';

export type PaymentFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annually'
  | 'annually';
```

`AccountStatus`, `CurrencyCode`, `Timestamp` already exist and should be kept as-is unless necessary.

The issue: this single `FinancialAccount` is used for all account types, but many fields are either irrelevant or redundant depending on the account type. We want a cleaner, type-safe model.

---

2. HIGH-LEVEL DESIGN CHANGES

---

Implement the following major changes:

1. **Merge overlapping account types** into unified categories:
   - “loan”, “mortgage”, “personal_loan”, “auto_loan” → a single `installment_loan` type with a subtype.
   - “credit_card” and similar → a `revolving_credit` type with a subtype.
   - Keep `bill` and `other`.

2. Introduce a **BaseAccount** interface with fields common to all account types.

3. Create specialized interfaces:
   - `InstallmentLoanAccount`
   - `RevolvingCreditAccount`
   - `BillAccount`
   - `OtherAccount`

4. Define `FinancialAccount` as a **discriminated union** of those specialized interfaces.

5. Explicitly distinguish between:
   - Fields the **user must input**.
   - Fields that should be **derived/calculated** and NOT requested from the user (they can be computed in services or helpers).

6. Where we previously had fields like `totalAmountRemaining`, `paymentAmount`, `numberOfPayments`, etc., **replace or reinterpret them** appropriately in each subtype, and treat them as computed where possible.

---

3. NEW TYPE DEFINITIONS TO IMPLEMENT

---

### 3.1. Simplified AccountType and Subtypes

Replace the existing `AccountType` with:

```ts
export type AccountType =
  | 'installment_loan' // includes mortgage, auto, personal, etc.
  | 'revolving_credit' // credit cards, credit lines
  | 'bill' // utilities, subscriptions, rent, etc.
  | 'other';
```

Add subtypes:

```ts
export type InstallmentLoanSubtype =
  | 'mortgage'
  | 'auto'
  | 'personal'
  | 'student'
  | 'other';

export type RevolvingCreditSubtype =
  | 'credit_card'
  | 'line_of_credit'
  | 'store_card'
  | 'overdraft'
  | 'other';

export type BillSubtype =
  | 'subscription'
  | 'utility'
  | 'rent'
  | 'insurance'
  | 'tax'
  | 'other';
```

### 3.2. BaseAccount (shared fields)

Create a base interface with shared fields:

```ts
export interface BaseAccount {
  /** Unique account identifier/number (user or institution) */
  accountNumber?: string;

  /** Display name for the account */
  accountName: string;

  /** Detailed description of the account */
  accountDescription?: string;

  /** Type of account (discriminator) */
  accountType: AccountType;

  /** Current status of the account */
  status: AccountStatus;

  /** Primary currency of the account */
  currency: CurrencyCode;

  /**
   * When the user started tracking this in the app.
   * This is NOT necessarily the same as contractStartDate for loans.
   */
  trackingStartDate?: Timestamp | Date;

  /** Additional metadata as key-value pairs */
  metadata?: Record<string, unknown>;
}
```

Keep `CurrencyAmount` as-is:

```ts
export interface CurrencyAmount {
  amount: number;
  currency: CurrencyCode;
}
```

### 3.3. Installment Loan Accounts (Mortgage, Auto, Personal, etc.)

Unify all amortizing loans under a single type:

```ts
export interface InstallmentLoanAccount extends BaseAccount {
  accountType: 'installment_loan';
  loanSubtype: InstallmentLoanSubtype;

  /** Original principal at origination */
  originalPrincipal?: CurrencyAmount;

  /**
   * Current outstanding principal when the user starts tracking.
   * If missing but originalPrincipal + schedule are known, can be computed.
   */
  currentPrincipal?: CurrencyAmount;

  /** Nominal annual interest rate, % (e.g. 12.5 for 12.5%) */
  annualInterestRate: number;

  /** Fixed payment frequency (e.g. monthly) */
  paymentFrequency: PaymentFrequency;

  /** Contract start date (when the loan actually started) */
  contractStartDate?: Timestamp | Date;

  /** Contract end/maturity date (if known or applicable) */
  contractEndDate?: Timestamp | Date;

  /**
   * Total number of scheduled payments in the contract.
   * e.g. 360 for a 30-year monthly mortgage.
   */
  termInPayments?: number;

  /**
   * Scheduled payment per period (if user knows it).
   * If missing but principal + rate + term are known, it should be calculated.
   */
  scheduledPayment?: CurrencyAmount;

  /**
   * If tracking an existing loan mid-life:
   * how many payments are left (optional; can be calculated).
   */
  remainingPayments?: number;

  /** Next scheduled payment due date (if the loan is active) */
  nextDueDate?: Timestamp | Date;

  /**
   * If lender specifies a minimum different from the standard scheduled payment.
   * Rare but keep the option.
   */
  minimumPaymentOverride?: CurrencyAmount;

  /** Compounding convention for more accurate calculations (optional) */
  compoundingFrequency?: 'daily' | 'monthly' | 'annually';
}
```

**Important behavioral requirements for installment loans:**

- **User input (minimal):**
  - `loanSubtype`
  - `annualInterestRate`
  - `paymentFrequency`

  And **either**:
  - For a new loan from the start:
    - `originalPrincipal`
    - `termInPayments` **or** `contractEndDate`
    - Optionally `contractStartDate`
  - For an existing loan mid-way:
    - `currentPrincipal`
    - `scheduledPayment`
    - Optionally `originalPrincipal` and/or `termInPayments` or `contractEndDate`
    - `nextDueDate`

- **Derived (do NOT require as user input):**
  - `scheduledPayment` (if rate + term + originalPrincipal are known).
  - `contractEndDate` from `contractStartDate + termInPayments` (if not given).
  - `termInPayments` from `contractStartDate` and `contractEndDate` (if desired).
  - `remainingPayments` (from schedule + current date or currentPrincipal).
  - A conceptual `totalAmountRemaining` is basically `currentPrincipal`.

Where we previously used fields like:

- `totalAmountRemaining`
- `paymentAmount`
- `originalAmount`
- `numberOfPayments`
- `remainingPayments`

You should map them conceptually to:

- `currentPrincipal` (for totalAmountRemaining).
- `scheduledPayment` (for paymentAmount).
- `originalPrincipal` (for originalAmount).
- `termInPayments` (for numberOfPayments).

Implement helper functions or services to compute them, instead of storing redundant copies everywhere.

### 3.4. Revolving Credit Accounts (Credit Cards, Lines of Credit, etc.)

Create a type for credit products that do not have a fixed amortization schedule:

```ts
export interface RevolvingCreditAccount extends BaseAccount {
  accountType: 'revolving_credit';
  creditSubtype: RevolvingCreditSubtype;

  /** Credit limit approved by issuer (if known) */
  creditLimit?: CurrencyAmount;

  /** Current balance when user starts tracking / current snapshot */
  currentBalance: CurrencyAmount;

  /** Purchase APR (annual), in percent */
  purchaseApr: number;

  /** Cash advance APR (if relevant) */
  cashApr?: number;

  /** How interest is compounded for this account */
  compoundingFrequency?: 'daily' | 'monthly';

  /** Statement day (1–31) or explicit next due date */
  statementDayOfMonth?: number;
  nextDueDate?: Timestamp | Date;

  /**
   * Issuer-defined minimum payment for the current cycle.
   * For manual setups, user may enter what's on their last statement.
   */
  currentMinimumPayment?: CurrencyAmount;

  /**
   * User’s intended recurring payment amount
   * (for projections and payoff simulations).
   */
  userPlannedPayment?: CurrencyAmount;
}
```

**Important behavioral requirements for revolving credit:**

- **User input (minimal):**
  - `creditSubtype`
  - `currentBalance`
  - `purchaseApr`
  - Either `nextDueDate` or `statementDayOfMonth`.

- **Optional but helpful:**
  - `creditLimit`
  - `currentMinimumPayment`
  - `userPlannedPayment`

- **Do NOT ask for loan-style fields:**
  - No `originalAmount`, `numberOfPayments`, `remainingPayments` for revolving credit.
  - No fixed `paymentAmount` as part of the contract (only planned payments).

Instead, implement projection helpers that:

- Estimate interest over time.
- Simulate payoff dates for different `userPlannedPayment` values.
- Suggest increased payment amounts to hit user-defined payoff targets.

### 3.5. Bill Accounts (Utilities, Subscriptions, Rent, etc.)

For non-credit obligations:

```ts
export interface BillAccount extends BaseAccount {
  accountType: 'bill';
  billSubtype: BillSubtype;

  /** True if this bill repeats (subscription, rent, etc.) */
  isRecurring: boolean;

  /** For recurring, fixed amount (if known) */
  recurringAmount?: CurrencyAmount;

  /** Recurrence pattern (monthly, annually, etc.) */
  paymentFrequency?: PaymentFrequency;

  /**
   * True if the amount is variable/unpredictable beforehand (e.g., utilities).
   */
  isAmountVariable?: boolean;

  /** Next due date */
  nextDueDate: Timestamp | Date;

  /**
   * When this bill series ends (e.g., subscription cancellation date).
   */
  endDate?: Timestamp | Date;
}
```

**Behavioral requirements for bills:**

- **Fixed recurring bill (subscription, rent, etc.)**
  - Ask:
    - `billSubtype`
    - `isRecurring: true`
    - `recurringAmount`
    - `paymentFrequency`
    - `nextDueDate`
  - Derive:
    - Future due dates using `nextDueDate + paymentFrequency` for projections.

- **Variable recurring bill (utilities, variable insurance, etc.)**
  - Ask:
    - `billSubtype`
    - `isRecurring: true`
    - `isAmountVariable: true`
    - `paymentFrequency`
    - `nextDueDate`
  - The amount will typically come from actual payment records per period.

- **No loan fields here**: No interest rate, no principal, no termInPayments.

### 3.6. Other Accounts

Catch-all for rare or custom obligations:

```ts
export interface OtherAccount extends BaseAccount {
  accountType: 'other';

  /** Free-form category or tag, user-defined */
  category?: string;

  /** Current outstanding amount, if any */
  currentAmount?: CurrencyAmount;

  /** Next relevant date (due, review, etc.) */
  nextRelevantDate?: Timestamp | Date;
}
```

Use this sparingly. Additional custom data can go in `metadata`.

### 3.7. Discriminated Union for FinancialAccount

Redefine `FinancialAccount` as:

```ts
export type FinancialAccount =
  | InstallmentLoanAccount
  | RevolvingCreditAccount
  | BillAccount
  | OtherAccount;
```

This allows code like:

```ts
function calculateMetrics(account: FinancialAccount) {
  switch (account.accountType) {
    case 'installment_loan':
      // amortization schedule, payoff date, interest breakdown
      break;

    case 'revolving_credit':
      // interest projections, payoff simulations, utilization
      break;

    case 'bill':
      // cashflow reminders & future payment projections
      break;

    case 'other':
      // minimal/custom handling
      break;
  }
}
```

---

4. DERIVED VS STORED FIELDS

---

Implement the following design regarding derived data:

- **Do not require the user to input:**
  - For loans:
    - `scheduledPayment` when `originalPrincipal + annualInterestRate + termInPayments` (or equivalent) is given.
    - `remainingPayments` (derive from schedule + current date/position).
    - Any separate `totalAmountRemaining` if it’s the same as `currentPrincipal`.

- **Implement helper or service functions** (in a separate module) to:
  - Compute `scheduledPayment` for installment loans.
  - Generate amortization schedules for loans.
  - Compute remaining term, projected payoff date, and interest remaining.
  - For revolving credit:
    - Estimate payoff time given `currentBalance`, `purchaseApr`, and a fixed `userPlannedPayment`.
    - Suggest a payment amount needed to hit a target payoff date.

If any existing consumers are expecting `totalAmountRemaining`, `paymentAmount`, `originalAmount`, `numberOfPayments`, and `remainingPayments` directly on `FinancialAccount`, either:

- Update them to use the new specialized fields (`currentPrincipal`, `scheduledPayment`, `originalPrincipal`, `termInPayments`, `remainingPayments`), or
- Provide a backward-compatible adaptor layer or helper functions that map from new structure to old expectations.

---

5. REFAC TORING TASKS

---

1. **Create / update type definitions:**
   - Introduce `AccountType`, `InstallmentLoanSubtype`, `RevolvingCreditSubtype`, `BillSubtype` as above.
   - Implement `BaseAccount`, `InstallmentLoanAccount`, `RevolvingCreditAccount`, `BillAccount`, `OtherAccount`, and the union `FinancialAccount` exactly as described.

2. **Remove or deprecate the old monolithic `FinancialAccount` interface.**
   - If full removal is risky, temporarily:
     - Mark it as deprecated with a JSDoc comment.
     - Internally map it to the new union types where used.
   - Ultimately, all code should use the new discriminated union.

3. **Update all existing code that uses `FinancialAccount`:**
   - Any code branching on `accountType` should now handle the four high-level types:
     - `'installment_loan'`
     - `'revolving_credit'`
     - `'bill'`
     - `'other'`
   - Replace usages of:
     - `totalAmountRemaining` → `currentPrincipal` (loans) or `currentBalance` (revolving) or `currentAmount` (other).
     - `paymentAmount` → `scheduledPayment` (loans) or `recurringAmount` (bills, where applicable) or `userPlannedPayment` (revolving) depending on context.
     - `originalAmount` → `originalPrincipal` (loans).
     - `numberOfPayments` → `termInPayments` (loans).
     - `remainingPayments` → `remainingPayments` from `InstallmentLoanAccount`.

4. **Adjust validation and form logic (if present):**
   - For **installment loans**:
     - Forms should require:
       - `loanSubtype`, `annualInterestRate`, `paymentFrequency`
       - and either:
         - new-loan: `originalPrincipal` + `termInPayments` or `contractEndDate`
         - existing-loan: `currentPrincipal` + `scheduledPayment`
     - Hide derived fields from input where possible and compute them in code.

   - For **revolving credit**:
     - Forms should require:
       - `creditSubtype`, `currentBalance`, `purchaseApr`
       - and either `nextDueDate` or `statementDayOfMonth`
     - `currentMinimumPayment` and `userPlannedPayment` are optional.

   - For **bills**:
     - Fixed recurring:
       - require `billSubtype`, `isRecurring`, `recurringAmount`, `paymentFrequency`, `nextDueDate`
     - Variable recurring:
       - require `billSubtype`, `isRecurring`, `isAmountVariable`, `paymentFrequency`, `nextDueDate`

   - For **other**:
     - Only require minimal fields (`accountName`, `accountType`, `currency`, `status`); the rest is optional.

5. **Ensure TypeScript exhaustiveness:**
   - Where `FinancialAccount` is switched on `accountType`, use `switch` + `never` checks to ensure all cases are handled.
   - This will help catch any future additions to `AccountType`.

---

6. OUTPUT EXPECTATION

---

Produce:

1. The updated TypeScript type definitions for:
   - `AccountType` and subtypes.
   - `BaseAccount`.
   - `InstallmentLoanAccount`, `RevolvingCreditAccount`, `BillAccount`, `OtherAccount`.
   - `FinancialAccount` (discriminated union).

2. Any necessary helper type guards or utility functions if helpful, for example:
   - `isInstallmentLoan(account: FinancialAccount): account is InstallmentLoanAccount`
   - `isRevolvingCredit(...)`, etc.

3. A set of changes (or suggestions) to existing code that:
   - Migrates away from the old monolithic `FinancialAccount`.
   - Replaces or adapts usage of now-deprecated fields.
   - Uses the new structure to reduce required user input and rely on calculations instead.

Please implement this refactor in a precise and type-safe way, following the structure and semantics defined above.

---

7. HELPER UTILITIES (SPECIFICATION)

---

In addition to the type refactor, define (or plan for) a small set of helper functions to centralize financial calculations and to keep the model as “input-light” as possible.

You don’t have to implement the full math here if that’s out of scope, but at minimum declare the interfaces and ensure call sites use them instead of duplicating logic.

### 7.1. Installment Loan Helpers

Create a module (e.g., `loanCalculations.ts`) with functions like:

```ts
/**
 * Calculate the fixed periodic payment for an installment loan
 * given principal, nominal annual interest, payment frequency, and total number of payments.
 *
 * @param principal - principal amount (currency + value)
 * @param annualInterestRate - nominal annual interest rate in percent (e.g. 12.5 for 12.5%)
 * @param paymentFrequency - one of 'monthly', 'weekly', 'biweekly', etc.
 * @param termInPayments - total number of payments (n)
 * @returns CurrencyAmount - scheduled payment amount per period
 */
export function calculateScheduledPayment(
  principal: CurrencyAmount,
  annualInterestRate: number,
  paymentFrequency: PaymentFrequency,
  termInPayments: number
): CurrencyAmount;
```

```ts
export interface AmortizationPayment {
  paymentNumber: number;
  date?: Timestamp | Date;
  paymentAmount: CurrencyAmount;
  principalComponent: CurrencyAmount;
  interestComponent: CurrencyAmount;
  remainingPrincipal: CurrencyAmount;
}

/**
 * Generate an amortization schedule for an installment loan.
 *
 * @param loan - InstallmentLoanAccount with at least originalPrincipal or currentPrincipal,
 *               annualInterestRate, paymentFrequency, and either termInPayments or contractEndDate.
 * @param options - optional config, e.g., startFromToday, includeDates, etc.
 */
export function generateAmortizationSchedule(
  loan: InstallmentLoanAccount,
  options?: {
    startFromToday?: boolean; // true => ignore past payments; start from "now"
    includeDates?: boolean; // if true, compute dates using nextDueDate or contractStartDate
  }
): AmortizationPayment[];
```

```ts
export interface LoanProjection {
  remainingPayments: number;
  projectedPayoffDate?: Timestamp | Date;
  totalInterestRemaining: CurrencyAmount;
}

/**
 * Given a loan and its schedule, compute projection metrics like remainingPayments,
 * payoff date, and remaining interest. Should prefer schedule data over simple formulas.
 */
export function projectInstallmentLoan(
  loan: InstallmentLoanAccount
): LoanProjection;
```

Use these helpers in your domain services instead of storing or asking the user for redundant values such as `remainingPayments`, `totalAmountRemaining`, etc.

### 7.2. Revolving Credit Helpers

For revolving accounts (credit cards, lines of credit), define:

```ts
export interface RevolvingPayoffProjection {
  /**
   * Estimated number of months to payoff given the fixed payment.
   * Could be fractional; round appropriately for UI.
   */
  monthsToPayoff?: number;

  /** Projected total interest paid until payoff (approximate) */
  totalInterestPaid?: CurrencyAmount;

  /** Projected payoff date (if nextDueDate or statementDayOfMonth are known) */
  projectedPayoffDate?: Timestamp | Date;

  /**
   * If the payment is too small to ever amortize the balance (e.g. less than monthly interest),
   * indicate that the balance won't be paid off.
   */
  willPayoff: boolean;
}

/**
 * Estimate payoff dynamics for a revolving credit account given a fixed monthly payment.
 *
 * @param account - RevolvingCreditAccount
 * @param fixedMonthlyPayment - The amount the user plans to pay every month
 */
export function projectRevolvingPayoff(
  account: RevolvingCreditAccount,
  fixedMonthlyPayment: CurrencyAmount
): RevolvingPayoffProjection;
```

Additionally, optionally define:

```ts
/**
 * Suggest the minimum monthly payment required to pay off the balance
 * within a target number of months (if feasible).
 *
 * @param account - RevolvingCreditAccount
 * @param targetMonths - Desired payoff horizon in months
 */
export function suggestPaymentForTargetMonths(
  account: RevolvingCreditAccount,
  targetMonths: number
): CurrencyAmount | null; // null if impossible/unrealistic
```

These functions enable AI/UX features (e.g., “If you pay X per month, you’ll be debt-free by Y”).

### 7.3. Bill Helpers

For bill accounts, helpers are mostly about date generation:

```ts
/**
 * Given a recurring bill and a starting date, generate the next N due dates.
 *
 * @param bill - BillAccount with isRecurring = true
 * @param count - Number of future occurrences to generate
 * @returns array of future due dates (excluding past)
 */
export function generateBillDueDates(
  bill: BillAccount,
  count: number
): (Timestamp | Date)[];
```

You may also add helpers to combine bill schedules into a cashflow projection, but that’s optional at this stage.

---

8. BACKWARD COMPATIBILITY / ADAPTER LAYER

---

If there is existing code expecting the old `FinancialAccount` interface and you cannot remove it immediately, create an **adapter module** that:

1. Defines a deprecated “legacy” type for reference (optional):

```ts
/** @deprecated Use the new discriminated union FinancialAccount instead. */
export interface LegacyFinancialAccount {
  accountNumber: string;
  accountName: string;
  accountDescription: string;
  accountType:
    | 'loan'
    | 'credit_card'
    | 'bill'
    | 'mortgage'
    | 'personal_loan'
    | 'auto_loan'
    | 'other';
  status: AccountStatus;
  totalAmountRemaining: CurrencyAmount;
  paymentAmount: CurrencyAmount;
  paymentFrequency: PaymentFrequency;
  rate: number;
  nextDueDate: Timestamp | Date;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  minimumPayment?: CurrencyAmount;
  originalAmount?: CurrencyAmount;
  numberOfPayments?: number;
  remainingPayments?: number;
  metadata?: Record<string, unknown>;
}
```

2. Provides functions to map from `LegacyFinancialAccount` → new `FinancialAccount` union:

```ts
export function migrateLegacyAccount(
  legacy: LegacyFinancialAccount
): FinancialAccount {
  switch (legacy.accountType) {
    case 'loan':
    case 'mortgage':
    case 'personal_loan':
    case 'auto_loan':
      return migrateLegacyLoan(legacy);
    case 'credit_card':
      return migrateLegacyCreditCard(legacy);
    case 'bill':
      return migrateLegacyBill(legacy);
    case 'other':
    default:
      return migrateLegacyOther(legacy);
  }
}
```

Sketch each migration function:

```ts
function migrateLegacyLoan(
  legacy: LegacyFinancialAccount
): InstallmentLoanAccount {
  // Infer subtype from accountType if possible
  const subtype: InstallmentLoanSubtype =
    legacy.accountType === 'mortgage'
      ? 'mortgage'
      : legacy.accountType === 'auto_loan'
        ? 'auto'
        : legacy.accountType === 'personal_loan'
          ? 'personal'
          : 'other';

  return {
    accountType: 'installment_loan',
    loanSubtype: subtype,
    accountNumber: legacy.accountNumber,
    accountName: legacy.accountName,
    accountDescription: legacy.accountDescription,
    status: legacy.status,
    currency: legacy.totalAmountRemaining.currency,
    trackingStartDate: legacy.startDate,
    metadata: legacy.metadata,

    // Map amounts:
    originalPrincipal: legacy.originalAmount,
    currentPrincipal: legacy.totalAmountRemaining,

    // Rate and frequency:
    annualInterestRate: legacy.rate,
    paymentFrequency: legacy.paymentFrequency,

    // Contract dates:
    contractStartDate: legacy.startDate,
    contractEndDate: legacy.endDate,

    // Terms:
    termInPayments: legacy.numberOfPayments,
    remainingPayments: legacy.remainingPayments,

    // Payments:
    scheduledPayment: legacy.paymentAmount,
    minimumPaymentOverride: legacy.minimumPayment,
    nextDueDate: legacy.nextDueDate,
  };
}
```

```ts
function migrateLegacyCreditCard(
  legacy: LegacyFinancialAccount
): RevolvingCreditAccount {
  return {
    accountType: 'revolving_credit',
    creditSubtype: 'credit_card',
    accountNumber: legacy.accountNumber,
    accountName: legacy.accountName,
    accountDescription: legacy.accountDescription,
    status: legacy.status,
    currency: legacy.totalAmountRemaining.currency,
    trackingStartDate: legacy.startDate,
    metadata: legacy.metadata,

    // Revolving-specific:
    currentBalance: legacy.totalAmountRemaining,
    purchaseApr: legacy.rate,
    nextDueDate: legacy.nextDueDate,

    // Legacy minimumPayment and paymentAmount can map to currentMinimumPayment
    currentMinimumPayment: legacy.minimumPayment ?? legacy.paymentAmount,
  };
}
```

```ts
function migrateLegacyBill(legacy: LegacyFinancialAccount): BillAccount {
  return {
    accountType: 'bill',
    billSubtype: 'other', // cannot know; user can reclassify later
    accountNumber: legacy.accountNumber,
    accountName: legacy.accountName,
    accountDescription: legacy.accountDescription,
    status: legacy.status,
    currency: legacy.paymentAmount.currency,
    trackingStartDate: legacy.startDate,
    metadata: legacy.metadata,

    isRecurring: true, // assumption; could be false if you detect otherwise
    recurringAmount: legacy.paymentAmount,
    paymentFrequency: legacy.paymentFrequency,
    nextDueDate: legacy.nextDueDate,
    endDate: legacy.endDate,
  };
}
```

```ts
function migrateLegacyOther(legacy: LegacyFinancialAccount): OtherAccount {
  return {
    accountType: 'other',
    accountNumber: legacy.accountNumber,
    accountName: legacy.accountName,
    accountDescription: legacy.accountDescription,
    status: legacy.status,
    currency: legacy.totalAmountRemaining.currency,
    trackingStartDate: legacy.startDate,
    metadata: legacy.metadata,

    currentAmount: legacy.totalAmountRemaining,
    nextRelevantDate: legacy.nextDueDate,
  };
}
```

**Important:** These migration functions are just examples. Adjust logic to match the real semantics in the existing codebase. The primary goal is to **minimize breaking changes** while transitioning to the new, more expressive model.

---

9. PERSISTENCE & MIGRATION NOTES

---

If there is a database or persistent storage schema:

1. **Schema updates:**
   - Ensure the stored `accountType` values migrate from:
     - `'loan' | 'mortgage' | 'personal_loan' | 'auto_loan' | 'credit_card' | 'bill' | 'other'`
   - To:
     - `'installment_loan' | 'revolving_credit' | 'bill' | 'other'`
   - Consider storing the new subtypes:
     - `loanSubtype`, `creditSubtype`, `billSubtype` as separate columns/fields.

2. **Data migration script:**
   - Implement a script that:
     - Reads existing records.
     - For each record, builds a `LegacyFinancialAccount`.
     - Calls `migrateLegacyAccount` to get the new `FinancialAccount`.
     - Persists the new structure (either as multiple columns or serialized JSON depending on your schema).

3. **Handling unknown / legacy data:**
   - If any old `accountType` cannot be cleanly mapped, default to:
     - `accountType: 'other'` and store the original `accountType` string in `metadata.originalAccountType`.
   - For bills where it’s unclear whether they are recurring or not:
     - Start with `isRecurring: false` and let future user interaction clarify if needed.

4. **Versioning:**
   - Optionally, add a `schemaVersion` field at the account level in persistence to distinguish between the old and new models.
   - New accounts should be stored only in the new format.

---

10. TESTING & TYPE-SAFETY EXPECTATIONS

---

When implementing this refactor:

1. **TypeScript exhaustiveness:**
   - For any function that handles `FinancialAccount`, use a `switch` on `account.accountType` and a `never` check in the default case, e.g.:

```ts
function handleAccount(account: FinancialAccount) {
  switch (account.accountType) {
    case 'installment_loan':
      return handleInstallmentLoan(account);
    case 'revolving_credit':
      return handleRevolvingCredit(account);
    case 'bill':
      return handleBill(account);
    case 'other':
      return handleOther(account);
    default: {
      const _exhaustiveCheck: never = account;
      return _exhaustiveCheck;
    }
  }
}
```

- This ensures that if new `AccountType` values are added in the future, the compiler will flag all unhandled branches.

2. **Unit tests (if present in the project):**
   - Add tests for:
     - `migrateLegacyAccount` covering each legacy `accountType`.
     - Calculation helpers (at least some representative scenarios).
     - Form validation or input-mapping functions to confirm the minimal required fields per account type.

3. **Runtime validation (optional but recommended):**
   - If using a runtime schema library (e.g., Zod, io-ts), define schemas mirroring these TypeScript types for validation of user input and persisted data.

---

11. SUMMARY OF KEY OBJECTIVES

---

- Replace a monolithic `FinancialAccount` interface with:
  - `BaseAccount`
  - `InstallmentLoanAccount`
  - `RevolvingCreditAccount`
  - `BillAccount`
  - `OtherAccount`
  - and a discriminated union `FinancialAccount`.

- Introduce clear subtyping:
  - `InstallmentLoanSubtype`
  - `RevolvingCreditSubtype`
  - `BillSubtype`

- Minimize required user input by:
  - Asking only for essential data per account type.
  - Computing fields like scheduled payment, remaining term, payoff date, etc., via helper functions.

- Provide a migration strategy from the old model to the new one, including:
  - Adapter functions.
  - Possible DB schema considerations.
  - Backward compatibility where necessary.

Please implement the refactor as described, keeping the codebase type-safe, minimizing breaking changes, and preparing for future AI-driven recommendations and projections based on these cleaner data models.

---

12. MINIMAL CREATE-ACCOUNT FORM SPEC (PER TYPE)

---

Design the create-account flows so they ask for the **smallest possible set of fields** per account type. This is important context for how the models will be used.

You do not need to implement UI here, just ensure the model and any validation/helpers support the following minimal inputs.

### 12.1. Installment Loan (New Loan from Start)

Use when user is adding a brand-new loan at origination.

Required input fields:

- `accountName`
- `accountType = 'installment_loan'`
- `loanSubtype` (e.g. 'mortgage' | 'auto' | 'personal' | 'student' | 'other')
- `status` (e.g., 'open', existing enum)
- `currency`
- `originalPrincipal`
- `annualInterestRate`
- `paymentFrequency`
- ONE of:
  - `termInPayments`
  - OR `contractEndDate`

Optional:

- `accountNumber`
- `accountDescription`
- `contractStartDate` (if omitted, you can default to “today” or first due date logic)
- `trackingStartDate` (defaults to “today”)
- `metadata`

System-derived (do NOT ask user):

- `scheduledPayment` (from principal + rate + term + freq)
- `remainingPayments` (initially equals `termInPayments`)
- `contractEndDate` (if `termInPayments` provided)
- Any amortization schedule details

### 12.2. Installment Loan (Existing Loan Mid-Way)

Use when user already has a running loan and is adding it now.

Required input fields:

- `accountName`
- `accountType = 'installment_loan'`
- `loanSubtype`
- `status`
- `currency`
- `currentPrincipal`
- `annualInterestRate`
- `paymentFrequency`
- `scheduledPayment`
- `nextDueDate`

Optional:

- `accountNumber`
- `accountDescription`
- `originalPrincipal`
- `termInPayments` or `contractEndDate`
- `trackingStartDate`
- `minimumPaymentOverride`
- `metadata`

System-derived / estimated:

- `remainingPayments`
- `projectedPayoffDate`
- `totalInterestRemaining`

### 12.3. Revolving Credit (Credit Card, Line of Credit)

Required input fields:

- `accountName`
- `accountType = 'revolving_credit'`
- `creditSubtype`
- `status`
- `currency`
- `currentBalance`
- `purchaseApr`
- EITHER:
  - `nextDueDate`
  - OR `statementDayOfMonth`

Optional:

- `accountNumber`
- `accountDescription`
- `cashApr`
- `creditLimit`
- `currentMinimumPayment`
- `userPlannedPayment`
- `trackingStartDate`
- `metadata`

System-derived:

- Payoff projections (months to payoff, payoff date, total interest) when user sets `userPlannedPayment`.
- Suggestions for `userPlannedPayment` to hit a desired payoff horizon.

### 12.4. Bill Accounts

#### 12.4.1. Fixed Recurring Bill (e.g., Subscription, Rent)

Required input fields:

- `accountName`
- `accountType = 'bill'`
- `billSubtype`
- `status`
- `currency`
- `isRecurring = true`
- `recurringAmount`
- `paymentFrequency`
- `nextDueDate`

Optional:

- `accountNumber`
- `accountDescription`
- `isAmountVariable` (should be `false` or omitted)
- `endDate`
- `trackingStartDate`
- `metadata`

System-derived:

- Future due dates schedule for projections and reminders.

#### 12.4.2. Variable Recurring Bill (e.g., Utilities)

Required input fields:

- `accountName`
- `accountType = 'bill'`
- `billSubtype`
- `status`
- `currency`
- `isRecurring = true`
- `isAmountVariable = true`
- `paymentFrequency`
- `nextDueDate`

Optional:

- `accountNumber`
- `accountDescription`
- `endDate`
- `trackingStartDate`
- `metadata`

System behavior:

- Amount will be recorded at payment time per period.
- Use historical data to estimate typical bill size if needed.

#### 12.4.3. One-Time Bill

If you support one-off bills (non-recurring):

Required:

- `accountName`
- `accountType = 'bill'`
- `billSubtype`
- `status`
- `currency`
- `isRecurring = false`
- `nextDueDate`
- `recurringAmount` (the one-time amount)

Optional:

- `accountNumber`
- `accountDescription`
- `trackingStartDate`
- `metadata`

No recurrence logic needed; treat as a single payment event.

### 12.5. Other Accounts

Required input fields:

- `accountName`
- `accountType = 'other'`
- `status`
- `currency`

Optional:

- `accountNumber`
- `accountDescription`
- `category`
- `currentAmount`
- `nextRelevantDate`
- `trackingStartDate`
- `metadata`

Use this as a flexible fallback type for unusual obligations.

---

13. FINAL INSTRUCTIONS

---

1. Implement all the type changes, helpers, and migration layers described in sections 1–12.
2. Replace the old monolithic `FinancialAccount` interface with the new discriminated union-based design.
3. Ensure all consumers of `FinancialAccount` in the codebase are updated to:
   - Use `switch` on `accountType` with exhaustive handling.
   - Use the new type-specific fields (`currentPrincipal`, `currentBalance`, `recurringAmount`, etc.).
   - Rely on helper utilities for financial calculations rather than storing redundant, derived fields.
4. Align any existing or future form/validation logic with the **minimal input** specs from section 12 so that:
   - Users see only relevant fields per account type.
   - Derived values (payments, remaining terms, payoff dates) are computed automatically by the backend/domain logic.

Use strong TypeScript typing throughout to ensure incorrect field combinations (e.g., loan-only fields on a bill, or term fields on revolving credit) are impossible or clearly flagged by the compiler.
