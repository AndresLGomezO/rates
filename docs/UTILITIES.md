# Utilities, Hooks, and Helper Functions Documentation

This document provides a comprehensive inventory of all custom hooks, utility functions, constants, type definitions, and services used throughout the project.

---

## 1. Custom Hooks Inventory

### `useAuth` (Consumer App)

**Location:** `apps/app/src/contexts/AuthContext.tsx`

**Purpose:** Provides authentication state and methods for the consumer application. Uses token-based authentication with cookie storage.

**Parameters:** None (uses context)

**Return Values:**

```typescript
{
  token: string | null;
  isAuthenticated: boolean;
  redirectToAuth: (path?: 'login' | 'signup' | 'session' | 'logout') =>
    Promise<void>;
  signOut: () => Promise<void>;
}
```

**Usage Example:**

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { token, isAuthenticated, redirectToAuth, signOut } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => redirectToAuth('login')}>Login</button>;
  }

  return (
    <div>
      <p>Authenticated</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

**Implementation Details:**

- Uses `useSyncExternalStore` to synchronously read token state from storage
- Token state is managed via external store with subscription pattern
- Automatically validates token format before considering user authenticated

---

### `useAuth` (Auth App)

**Location:** `apps/auth-app/src/contexts/AuthContext.tsx`

**Purpose:** Provides Firebase Auth user state and authentication methods for the auth application.

**Parameters:** None (uses context)

**Return Values:**

```typescript
{
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}
```

**Usage Example:**

```typescript
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const { signIn, loading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password, true);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return <LoginForm onSubmit={handleLogin} loading={loading} />;
}
```

**Implementation Details:**

- Uses `onAuthStateChanged` to listen to Firebase Auth state changes
- Supports both session and local persistence based on "remember me" option
- Provides loading state during initial auth check

---

## 2. Utility Functions

### Authentication Utilities

#### `apps/app/src/utils/auth.ts`

**`getAuthToken(returnRedirectTo?: boolean)`**

- **Purpose:** Retrieves auth token from cookie or URL parameters
- **Parameters:**
  - `returnRedirectTo` (optional): If true, returns object with token and redirectTo
- **Returns:** `string | null | { token: string | null; redirectTo: string | null }`
- **Usage:** Gets current authentication token, preferring cookie over URL param

**`setAuthToken(token: string, maxAgeSeconds?: number)`**

- **Purpose:** Stores auth token in cookie
- **Parameters:**
  - `token`: Firebase ID token string
  - `maxAgeSeconds` (optional): Cookie expiration in seconds (default: 3600)
- **Returns:** `void`

**`clearAuthToken()`**

- **Purpose:** Removes auth token from cookie and cleans URL parameters
- **Returns:** `void`

**`isValidTokenFormat(token: string | null | undefined)`**

- **Purpose:** Validates JWT token format (checks for 3 parts separated by dots)
- **Parameters:** `token` - Token string to validate
- **Returns:** `boolean`

**`getRedirectToFromUrl(urlParams: URLSearchParams)`**

- **Purpose:** Extracts redirectTo parameter from URL search params
- **Parameters:** `urlParams` - URLSearchParams object
- **Returns:** `string | null`

---

### Filtering Utilities

#### `apps/app/src/utils/filterAccounts.ts`

**`filterAccountsBySearch(accounts: FinancialAccount[], searchQuery: string)`**

- **Purpose:** Filters accounts by search query (searches name, number, description)
- **Parameters:**
  - `accounts`: Array of financial accounts
  - `searchQuery`: Search string
- **Returns:** `FinancialAccount[]`
- **Usage:** Case-insensitive search across account name, number, and description

**`filterAccounts(accounts: FinancialAccount[], filters: FilterOptions)`**

- **Purpose:** Applies multiple filter criteria to accounts
- **Parameters:**
  - `accounts`: Array of financial accounts
  - `filters`: Filter options object
- **Returns:** `FinancialAccount[]`
- **Filter Options:**
  ```typescript
  {
    search?: string;
    status?: AccountStatus[];
    type?: AccountType[];
    currency?: string;
  }
  ```

---

### Formatting Utilities

#### `apps/app/src/utils/formatters.ts`

**`formatCurrency(amount: number, currency: CurrencyCode)`**

- **Purpose:** Formats number as currency based on currency code
- **Parameters:**
  - `amount`: Numeric amount
  - `currency`: Currency code (COP, USD, etc.)
- **Returns:** `string` - Formatted currency string
- **Usage:** Uses Intl.NumberFormat with locale-specific formatting (es-CO for COP, en-US for USD)

**`toDate(date: Date | Timestamp)`**

- **Purpose:** Converts Firestore Timestamp or Date to Date object
- **Parameters:** `date` - Date or Timestamp
- **Returns:** `Date`

**`formatDate(date: Date | Timestamp, options?: {...})`**

- **Purpose:** Formats date to readable string
- **Parameters:**
  - `date`: Date or Timestamp
  - `options` (optional): Formatting options
- **Returns:** `string`
- **Options:**
  ```typescript
  {
    month?: 'short' | 'long' | 'numeric';
    day?: 'numeric';
    year?: 'numeric';
  }
  ```

**`formatDateShort(date: Date | Timestamp)`**

- **Purpose:** Formats date to short string (e.g., "Jan 2024")
- **Returns:** `string`

**`getPaymentStatusColor(status: PaymentPeriodStatus)`**

- **Purpose:** Returns color code for payment period status
- **Returns:** `string` - Hex color code
- **Status Colors:**
  - `paid`: #4caf50 (green)
  - `partial`: #ff9800 (orange)
  - `overdue`: #f44336 (red)
  - `pending`: #9e9e9e (gray)

**`getAccountStatusColor(status: AccountStatus)`**

- **Purpose:** Returns color code for account status
- **Returns:** `string` - Hex color code

**`formatAccountStatus(status: AccountStatus)`**

- **Purpose:** Formats account status for display (replaces underscores, uppercases)
- **Returns:** `string`

**`getAccountPaymentStatusColor(status: 'no_pending' | 'pending' | 'delayed' | 'overdue')`**

- **Purpose:** Returns color code for account payment status
- **Returns:** `string` - Hex color code

**`formatAccountPaymentStatus(status: 'no_pending' | 'pending' | 'delayed' | 'overdue')`**

- **Purpose:** Formats account payment status for display
- **Returns:** `string` - Human-readable status text

---

### Payment Utilities

#### `apps/app/src/utils/paymentUtils.ts`

**`getCurrentPeriod()`**

- **Purpose:** Gets current period month in YYYY-MM format
- **Returns:** `string`

**`calculateDaysRemaining(dueDate: Date | { toDate: () => Date })`**

- **Purpose:** Calculates days remaining until due date
- **Returns:** `number` - Can be negative if overdue

**`hasPendingPaymentWithinDays(account: FinancialAccount, daysAhead?: number)`**

- **Purpose:** Checks if account has pending payment within specified days
- **Parameters:**
  - `account`: Financial account
  - `daysAhead`: Number of days ahead to check (default: 15)
- **Returns:** `boolean`

**`getPaymentPeriod(dueDate: Date | { toDate: () => Date })`**

- **Purpose:** Gets period month for a payment based on due date
- **Returns:** `string` - YYYY-MM format

**`getPeriodPaymentStatus(period: PaymentPeriod, isBill?: boolean)`**

- **Purpose:** Gets payment status information for a period
- **Parameters:**
  - `period`: Payment period to check
  - `isBill`: Whether this period belongs to a bill account (default: false)
- **Returns:** `PeriodPaymentInfo`
- **Return Type:**
  ```typescript
  {
    period: PaymentPeriod;
    status: 'missing' | 'incomplete' | 'complete';
    amountDue: number;
    amountPaid: number;
    amountRemaining: number;
    hasPaymentLog: boolean;
    paymentLogCount: number;
  }
  ```

**`parseMonthYear(monthYear: string)`**

- **Purpose:** Parses month-year string (MM-YYYY or YYYY-MM) to Date object
- **Parameters:** `monthYear` - String in format "MM-YYYY" or "YYYY-MM"
- **Returns:** `Date` - First day of that month

**`identifyPendingPayments(accountNumber: string, startFromDate?: Date | string, isBill?: boolean)`**

- **Purpose:** Identifies all pending payments for an account based on payment periods
- **Parameters:**
  - `accountNumber`: Account number to check
  - `startFromDate` (optional): Date or month-year string to start checking from
  - `isBill`: Whether this account is a bill (default: false)
- **Returns:** `Promise<PeriodPaymentInfo[]>`

**`identifyPendingPaymentsForAccount(account: FinancialAccount)`**

- **Purpose:** Convenience function that uses account's startDate automatically
- **Returns:** `Promise<PeriodPaymentInfo[]>`

**`getPendingPaymentPeriods(accountNumber: string, startFromDate?: Date | string, isBill?: boolean)`**

- **Purpose:** Gets only pending (missing or incomplete) payment periods
- **Returns:** `Promise<PeriodPaymentInfo[]>`

**`hasPendingPaymentsFromPeriods(account: FinancialAccount, daysAhead?: number)`**

- **Purpose:** Checks if account has pending payments based on payment periods
- **Returns:** `Promise<boolean>`

**`getAccountPaymentStatus(paymentPeriods: PaymentPeriod[])`**

- **Purpose:** Gets overall payment status for an account based on payment periods
- **Returns:** `AccountPaymentStatus` - 'no_pending' | 'pending' | 'delayed' | 'overdue'

---

### Nonce Utilities

#### `apps/app/src/utils/nonce.ts`

**`generateNonce()`**

- **Purpose:** Generates secure nonce for app-to-app communication using HMAC-SHA256
- **Returns:** `Promise<string>` - Base64-encoded nonce
- **Format:** `base64(timestamp:random:hmac)`
- **Security:** Uses shared secret from `VITE_NONCE_SECRET` environment variable

**`buildAuthAppUrl(authAppBaseUrl: string, redirectTo: string, path?: 'login' | 'signup' | 'session' | 'logout')`**

- **Purpose:** Builds auth-app URL with nonce and redirect parameters
- **Parameters:**
  - `authAppBaseUrl`: Base URL of auth application
  - `redirectTo`: URL to redirect to after authentication
  - `path`: Auth path (default: 'login')
- **Returns:** `Promise<string>` - Complete URL with query parameters

---

#### `apps/auth-app/src/utils/nonce.ts`

**`generateNonce()`**

- **Purpose:** Generates nonce (same as consumer app version)
- **Returns:** `Promise<string>`

**`validateNonce(nonce: string | null)`**

- **Purpose:** Validates nonce signature and expiration
- **Parameters:** `nonce` - Nonce string to validate
- **Returns:** `Promise<{ isValid: boolean; error?: string }>`
- **Validation:** Checks timestamp expiration (default: 5 minutes) and HMAC signature

**`getNonceFromUrl(searchParams: URLSearchParams)`**

- **Purpose:** Extracts nonce from URL search parameters
- **Returns:** `string | null`

---

### Token Validation Utilities

#### `apps/app/src/utils/tokenValidation.ts`

**`validateToken(token: string | null)`**

- **Purpose:** Validates Firebase ID token using server-side Firebase Admin SDK
- **Parameters:** `token` - Firebase ID token
- **Returns:** `Promise<TokenValidationResult>`
- **Return Type:**
  ```typescript
  {
    isValid: boolean;
    token: string | null;
    user: unknown;
    error?: string;
    needsRefresh?: boolean;
  }
  ```
- **Implementation:** Calls auth-app's `/api/validate` endpoint for server-side verification

**`validateAndRefreshToken()`**

- **Purpose:** Validates current token and refreshes if needed
- **Returns:** `Promise<string | null>` - Validated/refreshed token or null if invalid
- **Behavior:** Clears invalid tokens automatically

---

### Migration Utilities

#### `apps/app/src/utils/migrateAccounts.ts`

**`runMigration()`**

- **Purpose:** Migrates initial accounts from spreadsheet data to Firestore
- **Returns:** `Promise<void>`
- **Usage:** Processes raw account data and creates financial accounts

**`previewMigration()`**

- **Purpose:** Previews migration without actually creating accounts
- **Returns:** `void`
- **Usage:** Logs account data that would be migrated

**`migrateHistoricalPayments(accountsData: HistoricalPaymentData[])`**

- **Purpose:** Migrates historical payment data for accounts
- **Parameters:** `accountsData` - Array of account payment data
- **Returns:** `Promise<{ success: Array<...>; errors: Array<...>; warnings: Array<...> }>`

**`previewHistoricalPaymentsMigration(accountsData: HistoricalPaymentData[])`**

- **Purpose:** Previews historical payments migration without logging payments
- **Returns:** `void`

**Helper Functions:**

- `parseDate(dateStr: string)`: Parses YYYY-MM-DD format to Date
- `getPaymentIntervalMonths(frequency: string)`: Gets payment interval in months from frequency string
- `mapAccountType(accountName: string)`: Maps account name to account type
- `generateAccountNumber(accountName: string, index: number)`: Generates sanitized account number
- `convertToAccountInput(raw: RawAccountData, index: number)`: Converts raw data to account input
- `parseAmount(amount: number | string)`: Parses amount from string or number
- `findMatchingPeriod(periods: PaymentPeriod[], paymentDate: string)`: Matches payment date to period

---

### Amortization Plan Utilities

#### `apps/app/src/utils/generateAmortizationPlan.ts`

**`generatePlanForAccount(accountNumber: string)`**

- **Purpose:** Generates amortization plan for a single account
- **Returns:** `Promise<void>`

**`generatePlansForAllAccounts(forceRegenerate?: boolean)`**

- **Purpose:** Generates amortization plans for all accounts that don't have periods yet
- **Parameters:**
  - `forceRegenerate`: If true, regenerate even if periods exist (default: false)
- **Returns:** `Promise<{ success: string[]; errors: Array<{ account: string; error: string }> }>`

---

### Mock Data Utilities

#### `apps/app/src/utils/mockFinancialAccounts.ts`

**`generateMockFinancialAccount(userId: string, index: number)`**

- **Purpose:** Generates a single mock financial account for testing
- **Parameters:**
  - `userId`: User ID for the account
  - `index`: Index for account variety
- **Returns:** `FinancialAccount`

**`generateMockFinancialAccounts(userId: string, count?: number)`**

- **Purpose:** Generates multiple mock financial accounts
- **Parameters:**
  - `userId`: User ID for accounts
  - `count`: Number of accounts to generate (default: 5)
- **Returns:** `FinancialAccount[]`

---

### Auth App Utilities

#### `apps/auth-app/src/utils/admin.ts`

**`initializeAdmin()`**

- **Purpose:** Initializes Firebase Admin SDK (supports emulator and production)
- **Returns:** `App` - Firebase Admin app instance
- **Implementation:** Detects emulator mode and initializes accordingly

**`getAdminAuth()`**

- **Purpose:** Gets Firebase Admin Auth instance
- **Returns:** Admin Auth instance

---

#### `apps/auth-app/src/utils/adminValidate.ts`

**`validateTokenWithAdmin(token: string)`**

- **Purpose:** Validates Firebase ID token using Admin SDK with full server-side verification
- **Parameters:** `token` - Firebase ID token
- **Returns:** `Promise<ValidationResponse>`
- **Validation:** Checks signature, expiration, issuer, audience, and revocation status

---

#### `apps/auth-app/src/utils/apiHandler.ts`

**`handleValidateAPI(request: Request)`**

- **Purpose:** Handles API validation request from consumer app
- **Parameters:** `request` - Fetch Request object
- **Returns:** `Promise<Response>` - JSON response with validation result

---

#### `apps/auth-app/src/utils/apiValidate.ts`

**`validateTokenAPI(token: string, user: User | null)`**

- **Purpose:** Validates Firebase ID token (client-side validation)
- **Parameters:**
  - `token`: Firebase ID token
  - `user`: Current Firebase user (optional)
- **Returns:** `Promise<ValidationResponse>`
- **Behavior:** Attempts token refresh if user is provided

---

#### `apps/auth-app/src/utils/config.ts`

**`authConfig`** (exported constant)

- **Purpose:** Authentication configuration object
- **Type:** `AuthConfig`
- **Properties:**
  ```typescript
  {
    defaultReturnUrl: string;
    allowedRedirects: string[];
    enableCookie: boolean;
    cookieName: string;
    cookieMaxAgeSeconds: number;
    cookieDomain?: string;
    cookieSameSite: 'Lax' | 'None' | 'Strict';
  }
  ```

---

#### `apps/auth-app/src/utils/errors.ts`

**`getFriendlyError(error: unknown)`**

- **Purpose:** Converts Firebase errors to user-friendly messages
- **Parameters:** `error` - Error object (FirebaseError, Error, or unknown)
- **Returns:** `string` - Friendly error message

---

#### `apps/auth-app/src/utils/redirect.ts`

**`resolveRedirect(requested: string | null, allowed: string[], fallback: string)`**

- **Purpose:** Resolves redirect URL from requested URL, checking against allowed list
- **Returns:** `string` - Resolved redirect URL (origin only)

**`buildRedirectUrl(target: string, payload: RedirectPayload, originalRedirectTo?: string | null)`**

- **Purpose:** Builds redirect URL with token and authentication parameters
- **Parameters:**
  - `target`: Target URL (origin)
  - `payload`: Redirect payload with token and metadata
  - `originalRedirectTo`: Original redirectTo URL to preserve
- **Returns:** `string` - Complete redirect URL

**`setAuthCookie(token: string, config: RedirectConfig)`**

- **Purpose:** Sets authentication cookie with configured parameters
- **Returns:** `void`

**`completeAuthRedirect(user: User, config: RedirectConfig)`**

- **Purpose:** Completes authentication redirect flow
- **Parameters:**
  - `user`: Authenticated Firebase user
  - `config`: Redirect configuration
- **Returns:** `Promise<void>`
- **Behavior:** Sets cookie, builds redirect URL, and navigates

---

### Firebase Client Package Utilities

#### `packages/firebase-client/src/financial-accounts-utils.ts`

**`calculatePaymentBreakdown(principal: number, rate: number, paymentAmount: number, currency: CurrencyCode)`**

- **Purpose:** Calculates capital and interest split for a payment
- **Parameters:**
  - `principal`: Remaining principal amount
  - `rate`: Monthly interest rate as percentage (e.g., 0.77 for 0.77%)
  - `paymentAmount`: Total payment amount
  - `currency`: Currency code
- **Returns:** `PaymentBreakdown`

**`calculateDaysRemaining(dueDate: Date | string)`**

- **Purpose:** Calculates days remaining until due date
- **Returns:** `number` - Can be negative if overdue

**`getMonthString(date: Date | string)`**

- **Purpose:** Gets month string in YYYY-MM format
- **Returns:** `string`

**`calculateAccountFields(account: FinancialAccount)`**

- **Purpose:** Calculates all derived/calculated fields for a financial account
- **Returns:** `FinancialAccountCalculated`
- **Calculated Fields:**
  - Days remaining to due date
  - Monthly capital and interest breakdown
  - Total amounts by currency
  - Total paid amounts
  - Remaining balance percentage
  - Estimated payoff date
  - Total interest and capital paid

**`getAccountWithCalculated(account: FinancialAccount)`**

- **Purpose:** Gets account with all calculated fields merged
- **Returns:** `FinancialAccountWithCalculated`

**`validateFinancialAccount(account: Partial<FinancialAccount>)`**

- **Purpose:** Validates financial account document
- **Returns:** `string[]` - Array of validation errors (empty if valid)

**`createPaymentLogEntry(valuePaid: number, currency: CurrencyCode, datePaid?: Date, notes?: string)`**

- **Purpose:** Creates a new payment log entry
- **Returns:** `PaymentLogEntry`

**`convertCurrency(amount: CurrencyAmount, targetCurrency: CurrencyCode, exchangeRate: number)`**

- **Purpose:** Converts currency amount to another currency
- **Note:** Placeholder - requires actual exchange rate logic
- **Returns:** `CurrencyAmount`

---

#### `packages/firebase-client/src/amortization.ts`

**`generateAmortizationPlan(account: FinancialAccount, paymentIntervalMonths?: number, endDate?: Date)`**

- **Purpose:** Generates amortization plan (all payment periods) for an account
- **Parameters:**
  - `account`: Financial account to generate plan for
  - `paymentIntervalMonths`: Payment interval in months (default: 1)
  - `endDate`: Optional end date for periodic bills
- **Returns:** `CreatePaymentPeriodInput[]`
- **Behavior:** Handles both periodic bills and fixed-period loans

**`calculateRemainingPrincipal(originalAmount: number, rate: number, monthlyPayment: number, periodsPaid: number)`**

- **Purpose:** Calculates remaining principal after specific number of periods
- **Returns:** `number` - Remaining principal balance

---

#### `packages/firebase-client/src/services.ts`

**`getAuth()`**

- **Purpose:** Gets Firebase Auth instance (singleton)
- **Returns:** `Auth`

**`getFirestore(databaseId?: string)`**

- **Purpose:** Gets Firestore instance (singleton)
- **Parameters:** `databaseId` (optional): Database ID
- **Returns:** `Firestore`

**`getStorage(bucket?: string)`**

- **Purpose:** Gets Firebase Storage instance (singleton)
- **Parameters:** `bucket` (optional): Storage bucket name
- **Returns:** `FirebaseStorage`

**`getFunctions(region?: string)`**

- **Purpose:** Gets Cloud Functions instance (singleton)
- **Parameters:** `region` (optional): Functions region
- **Returns:** `Functions`

**`resetServices()`**

- **Purpose:** Resets all service instances (useful for testing)
- **Returns:** `void`

---

## 3. Constants & Configuration

### Collection Names

**`FINANCIAL_ACCOUNTS_COLLECTION`**

- **Location:** `apps/app/src/services/financialAccounts.ts`
- **Value:** `'financialAccounts'`
- **Purpose:** Firestore collection name for financial accounts

**`PAYMENT_PERIODS_SUBCOLLECTION`**

- **Location:** `apps/app/src/services/paymentPeriods.ts`
- **Value:** `'paymentPeriods'`
- **Purpose:** Firestore subcollection name for payment periods

### Cookie Configuration

**`COOKIE_NAME`**

- **Location:** `apps/app/src/utils/auth.ts`
- **Value:** `'auth_app_token'`
- **Purpose:** Cookie name for storing authentication token

### Nonce Configuration

**`NONCE_SEPARATOR`**

- **Location:** `apps/app/src/utils/nonce.ts`, `apps/auth-app/src/utils/nonce.ts`
- **Value:** `':'`
- **Purpose:** Separator used in nonce message format

**`NONCE_EXPIRY_MS`**

- **Location:** `apps/auth-app/src/utils/nonce.ts`
- **Value:** `5 * 60 * 1000` (5 minutes)
- **Purpose:** Default nonce expiration time in milliseconds

### Auth Configuration

**`authConfig`**

- **Location:** `apps/auth-app/src/utils/config.ts`
- **Type:** `AuthConfig`
- **Properties:**
  - `defaultReturnUrl`: Default redirect URL after authentication
  - `allowedRedirects`: Array of allowed redirect origins
  - `enableCookie`: Whether to enable cookie storage
  - `cookieName`: Cookie name for auth token
  - `cookieMaxAgeSeconds`: Cookie expiration in seconds
  - `cookieDomain`: Optional cookie domain
  - `cookieSameSite`: Cookie SameSite attribute

### Mock Data Constants

**`ACCOUNT_NAMES`**

- **Location:** `apps/app/src/utils/mockFinancialAccounts.ts`
- **Type:** `string[]`
- **Purpose:** Array of account names for mock data generation

**`ACCOUNT_DESCRIPTIONS`**

- **Location:** `apps/app/src/utils/mockFinancialAccounts.ts`
- **Type:** `string[]`
- **Purpose:** Array of account descriptions for mock data

**`ACCOUNT_TYPES`**

- **Location:** `apps/app/src/utils/mockFinancialAccounts.ts`
- **Type:** `AccountType[]`
- **Purpose:** Array of account types for mock data

---

## 4. Type Definitions & Shared Interfaces

### Financial Account Types

**Location:** `packages/firebase-client/src/financial-accounts.ts`

**`CurrencyCode`**

- **Type:** `string`
- **Purpose:** Supported currency codes (COP, USD, EUR, etc.)

**`AccountType`**

- **Type:** Union type
- **Values:** `'loan' | 'credit_card' | 'bill' | 'mortgage' | 'personal_loan' | 'auto_loan' | 'other'`

**`AccountStatus`**

- **Type:** Union type
- **Values:** `'active' | 'paid_off' | 'closed' | 'defaulted' | 'on_hold'`

**`PaymentLogEntry`**

- **Interface:** Payment log entry structure
- **Properties:**
  - `monthPaid: string` (YYYY-MM format)
  - `datePaid: Timestamp | Date`
  - `valuePaid: number`
  - `currency: CurrencyCode`
  - `notes?: string`
  - `createdAt: Timestamp | Date`

**`CurrencyAmount`**

- **Interface:** Amount in specific currency
- **Properties:**
  - `amount: number`
  - `currency: CurrencyCode`

**`PaymentBreakdown`**

- **Interface:** Capital and interest breakdown
- **Properties:**
  - `capital: number`
  - `interest: number`
  - `total: number`
  - `currency: CurrencyCode`

**`FinancialAccount`**

- **Interface:** Main financial account document schema
- **Required Fields:**
  - `accountNumber: string`
  - `accountName: string`
  - `accountDescription: string`
  - `accountType: AccountType`
  - `status: AccountStatus`
  - `totalAmountRemaining: CurrencyAmount`
  - `monthlyPayment: CurrencyAmount`
  - `rate: number`
  - `nextDueDate: Timestamp | Date`
  - `paymentLog: PaymentLogEntry[]`
  - `userId: string`
  - `createdAt: Timestamp | Date`
  - `updatedAt: Timestamp | Date`
- **Optional Fields:**
  - `additionalAmounts?: CurrencyAmount[]`
  - `startDate?: Timestamp | Date`
  - `endDate?: Timestamp | Date`
  - `minimumPayment?: CurrencyAmount`
  - `creditLimit?: CurrencyAmount`
  - `originalAmount?: CurrencyAmount`
  - `numberOfPayments?: number`
  - `remainingPayments?: number`
  - `metadata?: Record<string, unknown>`

**`FinancialAccountCalculated`**

- **Interface:** Calculated fields (not stored in Firestore)
- **Properties:**
  - `daysRemainingToDueDate: number`
  - `nextDueDateMonth: string`
  - `monthlyCapital: CurrencyAmount`
  - `monthlyInterest: CurrencyAmount`
  - `totalAmountsByCurrency: Record<CurrencyCode, number>`
  - `totalPaid: CurrencyAmount`
  - `remainingBalancePercentage: number`
  - `estimatedPayoffDate?: Date`
  - `totalInterestPaid: CurrencyAmount`
  - `totalCapitalPaid: CurrencyAmount`

**`FinancialAccountWithCalculated`**

- **Type:** `FinancialAccount & FinancialAccountCalculated`
- **Purpose:** Complete account with calculated fields

**`CreateFinancialAccountInput`**

- **Type:** `Omit<FinancialAccount, 'createdAt' | 'updatedAt' | 'paymentLog'> & { paymentLog?: PaymentLogEntry[] }`
- **Purpose:** Input type for creating new accounts

**`UpdateFinancialAccountInput`**

- **Type:** `Partial<Omit<FinancialAccount, 'createdAt' | 'userId'>> & { updatedAt: Timestamp | Date }`
- **Purpose:** Input type for updating accounts

**`AddPaymentLogInput`**

- **Type:** `Omit<PaymentLogEntry, 'createdAt'>`
- **Purpose:** Input type for adding payment log entries

---

### Payment Period Types

**Location:** `packages/firebase-client/src/payment-periods.ts`

**`PaymentPeriodStatus`**

- **Type:** Union type
- **Values:** `'pending' | 'paid' | 'partial' | 'overdue'`

**`PaymentPeriod`**

- **Interface:** Payment period document schema
- **Properties:**
  - `accountNumber: string`
  - `periodNumber: number`
  - `dueDate: Timestamp | Date`
  - `amount: number`
  - `currency: CurrencyCode`
  - `amountPaid: number`
  - `status: PaymentPeriodStatus`
  - `capital: number`
  - `interest: number`
  - `remainingPrincipal?: number`
  - `paymentLog: PaymentPeriodPayment[]`
  - `createdAt: Timestamp | Date`
  - `updatedAt: Timestamp | Date`

**`PaymentPeriodPayment`**

- **Interface:** Payment made towards a specific period
- **Properties:**
  - `datePaid: Timestamp | Date`
  - `amount: number`
  - `currency: CurrencyCode`
  - `notes?: string`
  - `createdAt: Timestamp | Date`

**`CreatePaymentPeriodInput`**

- **Type:** `Omit<PaymentPeriod, 'amountPaid' | 'status' | 'paymentLog' | 'createdAt' | 'updatedAt'> & { paymentLog?: PaymentPeriodPayment[] }`
- **Purpose:** Input type for creating payment periods

**`UpdatePaymentPeriodInput`**

- **Type:** `Partial<Omit<PaymentPeriod, 'accountNumber' | 'periodNumber' | 'createdAt'>> & { updatedAt: Timestamp | Date }`
- **Purpose:** Input type for updating payment periods

**`LogPaymentToPeriodInput`**

- **Type:** Object with payment data
- **Properties:**
  - `datePaid: Date`
  - `amount: number`
  - `currency: CurrencyCode`
  - `notes?: string`

---

### Utility Types

**`FilterOptions`**

- **Location:** `apps/app/src/utils/filterAccounts.ts`
- **Interface:** Filter options for accounts
- **Properties:**
  - `search?: string`
  - `status?: AccountStatus[]`
  - `type?: AccountType[]`
  - `currency?: string`

**`PeriodPaymentStatus`**

- **Location:** `apps/app/src/utils/paymentUtils.ts`
- **Type:** Union type
- **Values:** `'missing' | 'incomplete' | 'complete'`

**`PeriodPaymentInfo`**

- **Location:** `apps/app/src/utils/paymentUtils.ts`
- **Interface:** Payment status information for a period
- **Properties:**
  - `period: PaymentPeriod`
  - `status: PeriodPaymentStatus`
  - `amountDue: number`
  - `amountPaid: number`
  - `amountRemaining: number`
  - `hasPaymentLog: boolean`
  - `paymentLogCount: number`

**`AccountPaymentStatus`**

- **Location:** `apps/app/src/utils/paymentUtils.ts`
- **Type:** Union type
- **Values:** `'no_pending' | 'pending' | 'delayed' | 'overdue'`

**`TokenValidationResult`**

- **Location:** `apps/app/src/utils/tokenValidation.ts`
- **Interface:** Token validation result
- **Properties:**
  - `isValid: boolean`
  - `token: string | null`
  - `user: unknown`
  - `error?: string`
  - `needsRefresh?: boolean`

**`ValidationResponse`**

- **Location:** `apps/auth-app/src/utils/apiValidate.ts`, `apps/auth-app/src/utils/adminValidate.ts`
- **Interface:** Validation API response
- **Properties:**
  - `valid: boolean`
  - `error?: string`
  - `refreshedToken?: string`
  - `expiresAt?: number`

**`AuthConfig`**

- **Location:** `apps/auth-app/src/utils/config.ts`
- **Interface:** Authentication configuration
- **Properties:**
  - `defaultReturnUrl: string`
  - `allowedRedirects: string[]`
  - `enableCookie: boolean`
  - `cookieName: string`
  - `cookieMaxAgeSeconds: number`
  - `cookieDomain?: string`
  - `cookieSameSite: 'Lax' | 'None' | 'Strict'`

**`RedirectConfig`**

- **Location:** `apps/auth-app/src/utils/redirect.ts`
- **Interface:** Redirect configuration
- **Properties:** Extends `AuthConfig` with `redirectTo` and `nonce`

**`RedirectPayload`**

- **Location:** `apps/auth-app/src/utils/redirect.ts`
- **Interface:** Redirect payload
- **Properties:**
  - `token: string`
  - `expiresIn: number`
  - `provider: 'firebase'`
  - `nonce?: string | null`

**`NonceData`**

- **Location:** `apps/app/src/utils/nonce.ts`, `apps/auth-app/src/utils/nonce.ts`
- **Interface:** Nonce data structure
- **Properties:**
  - `timestamp: number`
  - `random: string`
  - `hmac: string`

**`RawAccountData`**

- **Location:** `apps/app/src/utils/migrateAccounts.ts`
- **Interface:** Raw account data from spreadsheet
- **Properties:**
  - `due_date: string` (YYYY-MM-DD)
  - `name: string`
  - `start_date: string` (YYYY-MM-DD)
  - `frequency: string`
  - `total_periods: number | 'periodic'`
  - `initial_amount: number`
  - `current_amount: number | null`
  - `principal: number | null`
  - `interest: number | null`
  - `payment: number`
  - `interest_rate: number`

**`HistoricalPaymentData`**

- **Location:** `apps/app/src/utils/migrateAccounts.ts`
- **Interface:** Historical payment data structure
- **Properties:**
  - `id: string`
  - `payments: Array<{ date?: string; period?: string; month?: string; amount: number | string }>`

**`FirebaseConfig`**

- **Location:** `packages/firebase-client/src/types.ts`
- **Interface:** Firebase configuration
- **Properties:**
  - `apiKey: string`
  - `authDomain: string`
  - `projectId: string`
  - `storageBucket: string`
  - `messagingSenderId: string`
  - `appId: string`
  - `measurementId?: string`

**`FirebaseEmulatorConfig`**

- **Location:** `packages/firebase-client/src/types.ts`
- **Interface:** Firebase emulator configuration
- **Properties:**
  - `auth?: { host: string; port: number }`
  - `firestore?: { host: string; port: number }`
  - `storage?: { host: string; port: number }`
  - `functions?: { host: string; port: number }`

**`FirebaseServices`**

- **Location:** `packages/firebase-client/src/types.ts`
- **Interface:** Firebase services
- **Properties:**
  - `auth: Auth`
  - `firestore: Firestore`
  - `storage: FirebaseStorage`
  - `functions: Functions`

**`FirebaseMode`**

- **Location:** `packages/firebase-client/src/types.ts`
- **Type:** Union type
- **Values:** `'emulator' | 'live'`

---

## 5. Services & Modules

### Financial Accounts Service

**Location:** `apps/app/src/services/financialAccounts.ts`

**Purpose:** Service functions for CRUD operations on financial accounts in Firestore.

**Functions:**

**`createFinancialAccount(accountData: Omit<CreateFinancialAccountInput, 'userId'>)`**

- **Purpose:** Creates a new financial account
- **Returns:** `Promise<string>` - Account ID (accountNumber)
- **Behavior:**
  - Extracts userId from auth token
  - Validates account data
  - Converts dates to Firestore Timestamps
  - Uses accountNumber as document ID

**`getFinancialAccount(accountId: string)`**

- **Purpose:** Gets a financial account by ID
- **Returns:** `Promise<FinancialAccount | null>`

**`getUserFinancialAccounts()`**

- **Purpose:** Gets all financial accounts for the current user
- **Returns:** `Promise<FinancialAccount[]>`
- **Behavior:** Filters by userId from auth token

**`updateFinancialAccount(accountId: string, updates: UpdateFinancialAccountInput)`**

- **Purpose:** Updates a financial account
- **Returns:** `Promise<void>`
- **Behavior:** Automatically sets updatedAt timestamp

**`deleteFinancialAccount(accountId: string)`**

- **Purpose:** Soft deletes a financial account (sets status to 'closed')
- **Returns:** `Promise<void>`

**`logPayment(accountId: string, paymentData: {...})`**

- **Purpose:** Logs a payment for a financial account
- **Parameters:**
  - `accountId`: Account number
  - `paymentData`: Payment data object
- **Returns:** `Promise<void>`
- **Behavior:**
  - Finds appropriate payment periods
  - Logs payment to periods
  - Updates account payment log
  - Updates total amount remaining
  - Updates next due date
  - Recalculates account status

**Helper Functions:**

- `decodeTokenPayload(token: string)`: Decodes JWT token to extract user ID
- `getCurrentUserId()`: Gets current user ID from auth token (with fallback for development)

---

### Payment Periods Service

**Location:** `apps/app/src/services/paymentPeriods.ts`

**Purpose:** Service functions for managing payment periods (amortization plan) in Firestore.

**Functions:**

**`createPaymentPeriod(periodData: CreatePaymentPeriodInput)`**

- **Purpose:** Creates a payment period
- **Returns:** `Promise<void>`
- **Behavior:** Converts dates to Timestamps, sets default status to 'pending'

**`getPaymentPeriod(accountNumber: string, periodNumber: number)`**

- **Purpose:** Gets a payment period by account and period number
- **Returns:** `Promise<PaymentPeriod | null>`

**`getPaymentPeriods(accountNumber: string)`**

- **Purpose:** Gets all payment periods for an account
- **Returns:** `Promise<PaymentPeriod[]>`
- **Behavior:** Ordered by periodNumber ascending

**`getUnpaidPaymentPeriods(accountNumber: string, daysAhead?: number)`**

- **Purpose:** Gets unpaid payment periods within date range
- **Parameters:**
  - `accountNumber`: Account number
  - `daysAhead`: Number of days ahead to check (default: 15)
- **Returns:** `Promise<PaymentPeriod[]>`
- **Behavior:** Filters by status ('pending', 'partial', 'overdue') and date

**`updatePaymentPeriod(accountNumber: string, periodNumber: number, updates: UpdatePaymentPeriodInput)`**

- **Purpose:** Updates a payment period
- **Returns:** `Promise<void>`

**`logPaymentToPeriod(accountNumber: string, periodNumber: number, paymentData: LogPaymentToPeriodInput)`**

- **Purpose:** Logs a payment to a specific period
- **Returns:** `Promise<PaymentPeriod>` - Updated period
- **Behavior:**
  - Updates amountPaid
  - Calculates new status based on amount paid
  - Handles bills differently (any payment log means paid)
  - Adds payment to paymentLog array

**`deleteAllPaymentPeriods(accountNumber: string)`**

- **Purpose:** Deletes all payment periods for an account
- **Returns:** `Promise<void>`

**`generateAmortizationPlanForAccount(accountNumber: string, regenerate?: boolean, endDate?: Date)`**

- **Purpose:** Generates and creates all payment periods for an account
- **Parameters:**
  - `accountNumber`: Account number
  - `regenerate`: If true, delete existing periods first (default: false)
  - `endDate`: Optional end date for periodic bills
- **Returns:** `Promise<void>`
- **Behavior:**
  - Handles periodic bills (generates from start to current date)
  - Handles fixed-period loans (generates specified number of periods)
  - For periodic bills, can extend existing periods without regenerating

**`extendPeriodicBillPeriods(accountNumber: string)`**

- **Purpose:** Extends payment periods for periodic bills up to current date
- **Returns:** `Promise<number>` - Number of new periods created
- **Behavior:** Only generates new periods, doesn't regenerate existing ones

**`batchLogPaymentsToPeriods(accountNumber: string, startPeriod: number, endPeriod: number, paymentDate?: Date, notes?: string)`**

- **Purpose:** Batch logs payments for a range of periods
- **Returns:** `Promise<Array<{ periodNumber: number; success: boolean; error?: string }>>`
- **Behavior:** Logs payments for all pending periods in range

**Helper Functions:**

- `getPaymentPeriodsCollection(firestore: Firestore, accountNumber: string)`: Gets subcollection reference
- `getPaymentPeriodRef(firestore: Firestore, accountNumber: string, periodNumber: number)`: Gets document reference
- `calculatePeriodStatus(amount: number, amountPaid: number, isBill?: boolean, hasPaymentLog?: boolean)`: Calculates period status

---

### Firebase Client Services

**Location:** `packages/firebase-client/src/services.ts`

**Purpose:** Provides singleton access to Firebase services (Auth, Firestore, Storage, Functions).

**Pattern:** Singleton pattern with lazy initialization and caching.

**Dependencies:**

- `initialize.ts` - Firebase app initialization
- Firebase SDK modules (auth, firestore, storage, functions)

**Service Getters:**

- `getAuth()`: Returns cached Auth instance
- `getFirestore(databaseId?)`: Returns cached Firestore instance
- `getStorage(bucket?)`: Returns cached Storage instance
- `getFunctions(region?)`: Returns cached Functions instance
- `resetServices()`: Resets all cached instances (for testing)

**Implementation Details:**

- Services are lazily initialized on first access
- Instances are cached in module-level variables
- Supports optional parameters for multi-database/bucket/region scenarios

---

### Firebase Admin Service

**Location:** `apps/auth-app/src/utils/admin.ts`

**Purpose:** Initializes and provides Firebase Admin SDK for server-side operations.

**Pattern:** Singleton pattern with initialization check.

**Functions:**

- `initializeAdmin()`: Initializes Admin SDK (supports emulator and production)
- `getAdminAuth()`: Gets Admin Auth instance

**Initialization Logic:**

- Checks for existing app instance
- Detects emulator mode from environment variables
- In emulator mode: Uses project ID only (no credentials)
- In production: Uses service account credentials (file path, JSON string, or ADC)

**Dependencies:**

- Firebase Admin SDK (`firebase-admin/app`, `firebase-admin/auth`)
- Environment variables for configuration

---

## Summary

This project uses a modular architecture with:

1. **Two custom hooks** (`useAuth`) - one for each app with different authentication strategies
2. **Extensive utility functions** organized by purpose (auth, filtering, formatting, payments, etc.)
3. **Type-safe type definitions** shared across packages via `@rates/firebase-client`
4. **Service modules** following singleton patterns for Firebase services
5. **Configuration objects** for authentication and app settings
6. **Migration utilities** for data import and historical payment processing

All utilities follow TypeScript best practices with proper type definitions, JSDoc-style documentation, and clear separation of concerns.
