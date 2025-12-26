# Account Migration Guide

This guide explains how to migrate your initial accounts from the spreadsheet data to the app's database.

## Overview

The migration script (`src/utils/migrateAccounts.ts`) converts your spreadsheet account data into the app's financial account data model and creates all accounts in Firestore.

## How to Run the Migration

### Option 1: Using the UI (Recommended)

1. **Start the app** (make sure Firebase emulators are running):

   ```bash
   pnpm dev
   ```

2. **Navigate to the Migration page**:
   - Sign in to the app
   - Click on "Migrate Accounts" in the sidebar (🔄 icon)
   - Or go directly to: http://localhost:5174/migrate

3. **Preview the migration**:
   - Click "Preview Migration" to see what accounts will be created
   - Review the output to ensure all accounts are correctly mapped

4. **Run the migration**:
   - Click "Run Migration" to create all accounts in the database
   - Confirm when prompted
   - Review the results

### Option 2: Using the Browser Console

1. Open the app in your browser
2. Open the browser console (F12 or Cmd+Option+I)
3. Run:

   ```javascript
   // Preview migration
   import('./src/utils/migrateAccounts.ts').then((m) => m.previewMigration());

   // Run migration
   import('./src/utils/migrateAccounts.ts').then((m) => m.runMigration());
   ```

## Account Data Mapping

The migration script maps your spreadsheet columns to the app's data model:

| Spreadsheet Column    | App Field                                              | Notes                                  |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| Fecha Maxima          | `nextDueDate`                                          | Parsed from DD-MM-YYYY format          |
| Account Name          | `accountName`                                          | Used as-is                             |
| Total                 | `totalAmountRemaining`                                 | Multiplied by 1000 (assumes thousands) |
| Cuota / Total Payment | `monthlyPayment`                                       | Monthly payment amount                 |
| Rate                  | `rate`                                                 | Interest rate as percentage            |
| Cap / Int             | `metadata.capitalPortion` / `metadata.interestPortion` | Stored in metadata                     |

## Account Type Mapping

The script automatically maps account names to account types:

- **Mortgages**: Accounts with "hipotecario" in the name
- **Credit Cards**: Accounts with "tc " or "tarjeta" in the name
- **Auto Loans**: Accounts with "auto" in the name
- **Personal Loans**: Accounts with "prestamo" in the name
- **Bills**: Accounts like "planilla", "administracion", "agua", "luz", "gas", "internet", "cel"
- **Other**: Savings accounts ("ahorro", "scaleno") and other accounts

## Migrated Accounts

The following accounts are included in the migration:

1. **Hipotecario 2** - Mortgage
2. **Hipotecario** - Mortgage
3. **TC Signature** - Credit Card
4. **AutoPrestamo** - Auto Loan
5. **Ahorro Scaleno 17** - Other (Savings)
6. **Scaleno Rentabilidad** - Other (Savings)
7. **Scaleno Proyecto** - Other (Savings)
8. **TC Davivienda** - Credit Card
9. **Crediservice** - Loan
10. **Planilla Salud/Pension** - Bill
11. **Planilla Salud/Pension Ginna** - Bill
12. **Administracion** - Bill
13. **Administracion Altavista** - Bill
14. **Agua** - Bill
15. **Luz** - Bill
16. **Gas Natural** - Bill
17. **Internet Altavista** - Bill
18. **Cel Mama** - Bill
19. **Cel Leo** - Bill
20. **Prestamo Fidel** - Personal Loan

## After Migration

After running the migration:

1. **View your accounts**:
   - Go to Dashboard to see all accounts
   - Navigate to specific account types using the sidebar

2. **Verify the data**:
   - Check that all amounts are correct
   - Verify due dates are accurate
   - Confirm account types are properly assigned

3. **Update if needed**:
   - You can edit accounts individually from the Accounts by Type pages
   - Use the "Edit" button on any account card

## Troubleshooting

### Error: "Validation failed"

- Check that all required fields are present
- Ensure dates are in the correct format
- Verify amounts are valid numbers

### Error: "Account already exists"

- The migration uses account numbers as document IDs
- If an account with the same number exists, it will be skipped
- Delete existing accounts first if you want to re-run the migration

### Accounts not appearing

- Check the browser console for errors
- Verify you're logged in with the correct user
- Ensure Firebase emulators are running (if in development)

## Modifying the Migration

To modify the account data or add new accounts:

1. Edit `src/utils/migrateAccounts.ts`
2. Update the `rawAccounts` array with your data
3. Ensure the data format matches the `RawAccountData` interface
4. Re-run the migration

## Notes

- The migration creates accounts for the currently logged-in user
- Account numbers are auto-generated from account names
- All amounts are in COP (Colombian Pesos)
- Dates are parsed from DD-MM-YYYY format
- The migration is idempotent - running it multiple times will create duplicate accounts (use with caution)
