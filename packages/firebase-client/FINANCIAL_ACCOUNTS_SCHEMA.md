# Financial Accounts Schema

This document describes the Firestore schema for tracking personal financial accounts (bills, loans, credit cards, etc.).

## Overview

The schema is designed to be generic and extensible, supporting various account types while maintaining consistency. It includes both **required fields** (stored in Firestore) and **calculated fields** (computed on-demand).

## Collection Name

```
financialAccounts
```

## Document Structure

### Required Fields

These fields must be provided when creating an account:

- **`accountNumber`** (string): Unique account identifier/number
- **`accountName`** (string): Display name for the account
- **`accountDescription`** (string): Detailed description
- **`accountType`** (AccountType): Type of account (loan, credit_card, bill, mortgage, etc.)
- **`status`** (AccountStatus): Current status (active, paid_off, closed, etc.)
- **`totalAmountRemaining`** (CurrencyAmount): Remaining balance in primary currency
  - `amount` (number): Amount value
  - `currency` (string): Currency code (COP, USD, etc.)
- **`monthlyPayment`** (CurrencyAmount): Monthly payment amount
- **`rate`** (number): Interest rate as percentage (e.g., 12.5 for 12.5%)
- **`nextDueDate`** (Timestamp/Date): Next payment due date
- **`paymentLog`** (PaymentLogEntry[]): Array of payment history entries
- **`userId`** (string): Owner of the account
- **`createdAt`** (Timestamp/Date): Creation timestamp
- **`updatedAt`** (Timestamp/Date): Last update timestamp

### Optional Fields

- **`additionalAmounts`** (CurrencyAmount[]): Additional currency amounts (e.g., USD equivalent)
- **`startDate`** (Timestamp/Date): Account start date
- **`endDate`** (Timestamp/Date): Account end/maturity date
- **`minimumPayment`** (CurrencyAmount): Minimum payment (if different from monthly)
- **`creditLimit`** (CurrencyAmount): Credit limit (for credit cards)
- **`originalAmount`** (CurrencyAmount): Original loan/account amount
- **`numberOfPayments`** (number): Total number of payment periods
- **`remainingPayments`** (number): Remaining number of payments
- **`metadata`** (Record<string, unknown>): Additional custom fields

### Payment Log Entry Structure

Each entry in `paymentLog` contains:

- **`monthPaid`** (string): Month in YYYY-MM format
- **`datePaid`** (Timestamp/Date): Exact payment date
- **`valuePaid`** (number): Amount paid
- **`currency`** (string): Currency code
- **`notes`** (string, optional): Payment notes
- **`createdAt`** (Timestamp/Date): Entry creation timestamp

## Calculated Fields

These fields are computed on-demand (not stored in Firestore):

- **`daysRemainingToDueDate`** (number): Days until next due date (can be negative if overdue)
- **`nextDueDateMonth`** (string): Next due date month in YYYY-MM format
- **`monthlyCapital`** (CurrencyAmount): Capital portion of monthly payment
- **`monthlyInterest`** (CurrencyAmount): Interest portion of monthly payment
- **`totalAmountsByCurrency`** (Record<CurrencyCode, number>): Totals grouped by currency
- **`totalPaid`** (CurrencyAmount): Sum of all payments
- **`remainingBalancePercentage`** (number): Percentage of original amount remaining
- **`estimatedPayoffDate`** (Date, optional): Estimated date to pay off account
- **`totalInterestPaid`** (CurrencyAmount): Total interest paid to date
- **`totalCapitalPaid`** (CurrencyAmount): Total capital paid to date

## Account Types

Supported account types:

- `loan`: General loan
- `credit_card`: Credit card account
- `bill`: Recurring bill
- `mortgage`: Mortgage loan
- `personal_loan`: Personal loan
- `auto_loan`: Auto loan
- `other`: Other account types

## Account Status

Supported statuses:

- `active`: Account is active and being paid
- `paid_off`: Account has been fully paid
- `closed`: Account is closed
- `defaulted`: Account is in default
- `on_hold`: Account payments are on hold

## Usage Examples

### Creating an Account

```typescript
import { createFinancialAccount } from '@rates/firebase-client/financial-accounts-example';
import type { CreateFinancialAccountInput } from '@rates/firebase-client';

const accountData: CreateFinancialAccountInput = {
  accountNumber: 'LOAN-001',
  accountName: 'Personal Loan - Bank ABC',
  accountDescription: 'Personal loan for home improvement',
  accountType: 'personal_loan',
  status: 'active',
  totalAmountRemaining: {
    amount: 5000000, // 5M COP
    currency: 'COP',
  },
  monthlyPayment: {
    amount: 500000, // 500K COP
    currency: 'COP',
  },
  rate: 12.5, // 12.5% annual
  nextDueDate: new Date('2024-02-15'),
  originalAmount: {
    amount: 10000000, // 10M COP
    currency: 'COP',
  },
  additionalAmounts: [
    {
      amount: 1250, // USD equivalent
      currency: 'USD',
    },
  ],
  userId: 'user123',
};

const accountId = await createFinancialAccount('user123', accountData);
```

### Getting Account with Calculated Fields

```typescript
import { getFinancialAccountWithCalculated } from '@rates/firebase-client/financial-accounts-example';

const account = await getFinancialAccountWithCalculated('LOAN-001');

console.log(account.daysRemainingToDueDate); // Calculated field
console.log(account.monthlyCapital); // Capital portion
console.log(account.monthlyInterest); // Interest portion
```

### Adding a Payment

```typescript
import { addPaymentLogEntry } from '@rates/firebase-client/financial-accounts-example';

await addPaymentLogEntry('LOAN-001', {
  valuePaid: 500000,
  currency: 'COP',
  datePaid: new Date(),
  notes: 'February payment',
});
```

### Using Utility Functions

```typescript
import {
  calculatePaymentBreakdown,
  calculateDaysRemaining,
  getAccountWithCalculated,
} from '@rates/firebase-client';

// Calculate capital/interest split
const breakdown = calculatePaymentBreakdown(
  5000000, // principal
  12.5, // rate (12.5%)
  500000, // payment amount
  'COP' // currency
);

// Calculate days remaining
const days = calculateDaysRemaining(new Date('2024-02-15'));

// Get account with all calculated fields
const accountWithCalculated = getAccountWithCalculated(account);
```

## Firestore Security Rules

The schema includes security rules that ensure users can only access their own accounts:

```javascript
match /financialAccounts/{accountId} {
  allow read, write: if request.auth != null &&
                       request.auth.uid == resource.data.userId;
  allow create: if request.auth != null &&
                  request.auth.uid == request.resource.data.userId;
}
```

## Migration from Spreadsheet

When migrating from your spreadsheet, map your columns as follows:

| Spreadsheet Column                    | Firestore Field                          |
| ------------------------------------- | ---------------------------------------- |
| account number                        | `accountNumber`                          |
| account name                          | `accountName`                            |
| account description                   | `accountDescription`                     |
| total amount remaining (COP)          | `totalAmountRemaining` (currency: 'COP') |
| total amount remaining (USD)          | `additionalAmounts[0]` (currency: 'USD') |
| monthly payment                       | `monthlyPayment`                         |
| rate                                  | `rate`                                   |
| capital split                         | Calculated: `monthlyCapital`             |
| interest split                        | Calculated: `monthlyInterest`            |
| Next due date                         | `nextDueDate`                            |
| next due date month                   | Calculated: `nextDueDateMonth`           |
| days remaining to due date            | Calculated: `daysRemainingToDueDate`     |
| Payment log (month paid, date, value) | `paymentLog[]`                           |

## Extensibility

The schema is designed to be extensible:

1. **Custom Account Types**: Add new types to the `AccountType` union
2. **Custom Fields**: Use the `metadata` field for account-specific data
3. **Additional Currencies**: Add more entries to `additionalAmounts` array
4. **Custom Statuses**: Add new statuses to the `AccountStatus` union

## Notes

- All monetary amounts should be stored as numbers (not strings)
- Dates should be stored as Firestore Timestamps
- The `rate` field represents annual interest rate as a percentage
- Calculated fields are computed client-side or via Cloud Functions
- Payment log entries are immutable (append-only)
