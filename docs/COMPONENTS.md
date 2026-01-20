## 1. Component Inventory

### apps/app (Main “Rates” app)

#### Layout Components

- **`components/PrivateLayout`** (Layout, client)
  - Shell for authenticated area: sidebar navigation, search bar, scrollable content area.
  - Wraps pages like `Dashboard`, `AccountsByType`, `AccountDetail`, `MigrateAccounts`.

- **`components/PublicLayout`** (Layout, client)
  - Simple public layout for the `/login` page (centered auth card).

#### Routing / Guard Components

- **`components/ProtectedRoute`** (Feature/Guard, client)
  - Wraps children and redirects to `/login` when the user is not authenticated.

- **`components/AuthRedirectHandler`** (Feature/Utility, client)
  - Mounted at the root of the router; inspects URL for auth token + `redirectTo`.
  - Validates token via `utils/tokenValidation` and navigates back to the original path.

#### UI / Reusable Components

- **`components/Modal`** (UI, client)
  - Generic modal dialog with overlay, header, close button and scroll-locked body.

- **`components/SearchBar`** (UI/Feature, client)
  - Global search input with filter button; syncs `search` and filter-related params to URL.

- **`components/Filters`** (UI/Feature, client)
  - Chip-style filter panel for account `status`, `type`, `currency`, and optional `daysAhead`.

#### Feature Components

- **`components/NewAccountWizard`** (Feature, client)
  - Multi-step modal wizard to create a new financial account.

- **`components/CreateAccountForm`** (Feature, client)
  - Form used inside `AccountsByType`’s modal to create/edit a single account of a given type.

- **`components/LogPaymentModal`** (Feature, client)
  - Modal to log a single payment for an account (optionally bound to a specific period).

- **`components/BatchPaymentModal`** (Feature, client)
  - Modal to batch-log payments across a range of pending periods for an account.

#### Page Components

- **`pages/Dashboard`** (Page, client)
  - Main overview page: loads all accounts + periods and shows metrics, charts, pending payments, and `NewAccountWizard` and `LogPaymentModal`.

- **`pages/AccountsByType`** (Page, client)
  - Lists, filters, creates, edits, deletes accounts of a specific `AccountType`.

- **`pages/AccountDetail`** (Page, client)
  - Detailed single-account view with metrics, charts, amortization schedule and `BatchPaymentModal`.

- **`pages/MigrateAccounts`** (Page, client)
  - Operational/migration UI for seeding accounts and historical payments, managing amortization plans, and batch-adding payments.

- **`pages/Login`** (`apps/app`) (Page, client)
  - Consumer app login entry that delegates auth to the auth-app and redirects accordingly.

#### Context

- **`contexts/AuthContext`** (`apps/app`) (Utility/State, client)
  - Provides token, `isAuthenticated`, `redirectToAuth`, and `signOut` for the consumer app.

---

### apps/auth-app (Authentication service)

#### Layout / Shell

- **`App`** (Layout, client)
  - Auth shell with header and `Outlet` for child routes. Branded “Auth Service”.

- **`routes.tsx` → `AppRouter`** (Utility, client)
  - Declares SPA routes for `Landing`, `Login`, `Signup`, `Session`, `Validate`, `Logout`, `ApiValidate`.

#### Guard / Utility Components

- **`components/NonceGuard`** (Feature/Guard, client)
  - Wraps sensitive flows to verify a nonce from URL via `utils/nonce`.

#### Page Components

- **`pages/Landing`** (Page, client)
  - Marketing / explainer screen describing how the auth service works.

- **`pages/Login`** (`apps/auth-app`) (Page, client)
  - Email/password login, nonce validation and redirect back to consumer app.

- **`pages/Signup`** (`apps/auth-app`) (Page, client)
  - Email/password signup, nonce validation and redirect back to consumer app.

- **`pages/Session`** (`apps/auth-app`) (Page, client)
  - Shows active session details and lets user continue to app or sign out.

- **`pages/Validate`** (Page, client)
  - Human-friendly token validation page; can also respond with JSON if `format=json`.

- **`pages/ApiValidate`** (Page, client-like API endpoint)
  - Token validation “endpoint” that writes a JSON document into `document.documentElement`.

- **`pages/Logout`** (Page, client)
  - Handles logout flow, nonce validation, cookie clearing and redirect back to app.

#### Context

- **`contexts/AuthContext`** (`apps/auth-app`) (Utility/State, client)
  - Encapsulates Firebase Auth user, `signIn`, `signUp`, `signOut`, etc. for the auth service.

---

### Shared / Non-Component Modules

These are not React components but are used heavily by components:

- **`apps/app/src/services/*`** – Firebase-backed data fetching and writes (`financialAccounts`, `paymentPeriods`).
- **`apps/app/src/utils/*`** – formatting, filtering, auth helpers, payment calculations.
- **`packages/firebase-client/src/*`** – shared domain types, financial account services, amortization + periods utilities used by the app components.

All React components in this repo are **client-side components** (Vite/React SPA) – there is no server component / RSC / Next.js usage.

---

## 2. Component Architecture

### High-Level Routing & Layout

- **Root router (`apps/app/src/main.tsx`)**
  - Wraps the app in `AuthProvider` and defines routes within a top-level element that always renders `AuthRedirectHandler` + `Outlet`.
  - Child routes wrap pages in `ProtectedRoute` + `PrivateLayout` (for authenticated routes) or `PublicLayout` (for `/login`).

- **Private Shell (`PrivateLayout`) hierarchy**
  - `PrivateLayout`
    - `SearchBar`
      - `Modal` → `Filters` (opened when user clicks filters button)
    - `main-content-scrollable` container
      - Routed content: `Dashboard` | `AccountsByType` | `AccountDetail` | `MigrateAccounts`

- **Public Shell (`PublicLayout`) hierarchy**
  - `PublicLayout`
    - `Login` (consumer app login screen)

### Feature Component Relationships

- **Dashboard**
  - Fetches user accounts via `services/financialAccounts`.
  - For each account, loads periods via `services/paymentPeriods`.
  - Renders:
    - Metrics and charts (using `recharts`).
    - Pending payments list where each row can:
      - Navigate to `AccountDetail`.
      - Open `LogPaymentModal` for a specific period.
    - A “New account” button that opens `NewAccountWizard` (in a `Modal`).
  - Uses URL `search`/filters managed by `SearchBar`/`Filters`.

- **AccountsByType**
  - Loaded for `path: 'accounts/:type'` under `PrivateLayout`.
  - Uses `Modal` + `CreateAccountForm` for creating/editing accounts.
  - Interacts with `services/financialAccounts` for CRUD.

- **AccountDetail**
  - Routed at `path: 'account/:accountNumber'`.
  - Fetches single account + calculated view (`getAccountWithCalculated`) and payment periods.
  - Uses many local pure helpers for chart data shaping; renders multiple `recharts` charts.
  - Offers:
    - Plan generation/regeneration via `services/paymentPeriods`.
    - Batch payment operations via `BatchPaymentModal`.

- **MigrateAccounts**
  - Standalone operational page under authenticated shell.
  - Uses utilities from `utils/migrateAccounts`, `services/paymentPeriods`, Firebase client helpers.
  - Also embeds `BatchPaymentModal` for batch payments.

- **Auth flows**
  - **Consumer app (`apps/app`):**
    - `AuthContext` stores token and provides `redirectToAuth(path)` and `signOut()`.
    - `ProtectedRoute` uses `isAuthenticated` from context to gate routes and redirect to `/login`.
    - `AuthRedirectHandler` is responsible for “coming back” from auth-app, validating ID tokens and cleaning URL params before pushing to the original route.
  - **Auth service (`apps/auth-app`):**
    - `AppRouter` defines child routes under `App` (header + `Outlet`).
    - `AuthContext` handles Firebase Auth user state (signIn/signUp/signOut).
    - `NonceGuard` is used around sensitive operations (e.g. login/signup/redirect) in pages.
    - Pages like `Login`, `Signup`, `Session`, `Logout`, `Validate`, `ApiValidate` orchestrate redirect, cookie setting and token validation.

### Shared / Reusable vs Feature-Specific

- **Shared / Reusable**
  - `Modal`: used by `NewAccountWizard`, `CreateAccountForm` modals, `LogPaymentModal`, `BatchPaymentModal`, `AccountsByType` delete confirmation, etc.
  - `SearchBar` + `Filters`: used at top of all authenticated pages via `PrivateLayout`.
  - `AuthContext` (both apps): encapsulates auth concerns away from components.

- **Feature-Specific**
  - `NewAccountWizard`, `CreateAccountForm`, `LogPaymentModal`, `BatchPaymentModal` are specific to financial-accounts domain.
  - Pages (`Dashboard`, `AccountsByType`, `AccountDetail`, `MigrateAccounts`, and all auth-app pages) are feature-specific.

No explicit compound component pattern (like `Modal.Header`, `Modal.Body`) is used; composition is done via children and wrapping components.

---

## 3. Props & Interfaces (Key Components)

This section focuses on the most important components and omits very small/simple ones unless they have non-trivial props.

### `Modal`

```ts
type ModalProps = {
  isOpen: boolean; // required, controls visibility
  onClose: () => void; // required, called on overlay click, close button, or Escape
  title?: string; // optional, when present renders header
  children: React.ReactNode;
};
```

- **Defaults/behavior**:
  - No internal state; controlled by `isOpen`.
  - When open, sets `document.body.style.overflow = 'hidden'` and adds `modal-open` class.
  - Closes on overlay click, Escape key, or close button.

### `PrivateLayout`

```ts
type PrivateLayoutProps = PropsWithChildren<{}>;
```

- **Internal behavior**:
  - Local `sidebarExpanded` state (boolean).
  - Local `accountsMenuOpen` state, auto-opens based on current route (`/accounts/...`).
  - Uses `useAuth().signOut` for sign-out button.

### `PublicLayout`

```ts
type PublicLayoutProps = PropsWithChildren<{}>;
```

- Simple wrapper; has no additional props or state.

### `ProtectedRoute`

```ts
type ProtectedRouteProps = PropsWithChildren<{}>;
```

- Uses `useAuth()`:
  - If `!isAuthenticated`, `useEffect` navigates to `/login` (replace).
  - Renders `null` while redirecting; renders `children` only when authenticated.

### `AuthRedirectHandler`

Props: **none** (relies on router + auth utilities).

- Uses:
  - `getRedirectToFromUrl`, `getAuthToken`, `isValidTokenFormat` from `utils/auth`.
  - `validateToken` from `utils/tokenValidation`.
- Behavior:
  - Extracts `redirectTo` from URL, reads token (which also strips auth params from URL).
  - Validates token; on success, navigates to target path (same-origin only) with auth query params removed.

### `SearchBar`

Props: **none** (derives behavior from URL + location).

- Internal state:
  - `searchQuery: string`, `isScrolled: boolean`, `isFiltersModalOpen: boolean`.
  - Debounced URL updates via `useEffect` and a `setTimeout` ref.
- Behavior:
  - Syncs `search` query parameter with `searchQuery` state.
  - Computes filter “badge” count and whether filters are active from URL params.
  - When filters button is clicked, opens a `Modal` containing `Filters` with:
    - `hideAccountType`: inferred from route (true on `/accounts/:type`).
    - `showDaysFilter`: true on `/` and `/dashboard`.

### `Filters`

```ts
interface FiltersProps {
  hideAccountType?: boolean; // default false
  showDaysFilter?: boolean; // default false
}
```

- All props are **optional** with sensible defaults.
- Uses `useSearchParams` to read and modify `status`, `type`, `currency`, `daysAhead` query params.

### `NewAccountWizard`

```ts
type WizardStep = 'type' | 'details' | 'review' | 'success';

interface NewAccountWizardProps {
  isOpen: boolean;                            // required
  onClose: () => void;                        // required
  onCreated?: (id: string, type: AccountType) // optional callback
}
```

- **Internal state**:
  - `step: WizardStep` (initial `'type'`).
  - `selectedType: AccountType | null`.
  - `saving: boolean`, `error: string | null`, `createdAccountId: string | null`.
  - `formData` object (strings for all fields, plus `status` and `currency` enums).
- **Derived values**:
  - `detailsErrors: Record<string,string>` from `useMemo`.
  - `canContinueFromType`, `canContinueFromDetails`.
  - `progressIndex`, `primaryCurrencyPreview`.
- **Important behaviors**:
  - `useEffect` on `isOpen` resets all internal state when opened.
  - `buildAccountPayload` constructs `Omit<CreateFinancialAccountInput, 'userId'>`, conditionally including optional fields.
  - `handleCreate` calls `createFinancialAccount` (service), then calls `onCreated` and moves to `success` step.

### `CreateAccountForm`

```ts
interface CreateAccountFormProps {
  accountType: AccountType; // required
  onSubmit: (
    data: Omit<CreateFinancialAccountInput, 'userId'> // required
  ) => void | Promise<void>;
  onCancel: () => void; // required
  isSubmitting?: boolean; // optional, default false
  initialData?: FinancialAccount; // optional (edit mode)
  mode?: 'create' | 'edit'; // optional, default 'create'
}
```

- **Required vs optional**:
  - `accountType`, `onSubmit`, `onCancel` are required.
  - `isSubmitting`, `initialData`, `mode` are optional.
- **State**:
  - `formData` (mirroring a financial account payload) initialized from `initialData` when provided.
  - `errors: Record<string,string>` for validation messages.
- **Validation rules**:
  - Required text fields: `accountNumber`, `accountName`, `accountDescription`.
  - Positive numbers for `totalAmountRemaining`, `monthlyPayment`.
  - Interest `rate` between 0–100.
  - `nextDueDate` required.
  - `numberOfPayments`: optional for `bill` (if provided must be > 0), required and > 0 for other `accountType`s.
- **Submit behavior**:
  - On valid submit and when `!isSubmitting`, builds `Omit<CreateFinancialAccountInput,'userId'>` with conditional inclusion of optional numeric/date fields and passes it to `onSubmit`.

### `LogPaymentModal`

```ts
interface LogPaymentModalProps {
  isOpen: boolean; // required
  onClose: () => void; // required
  account: FinancialAccount | null; // required, but component returns null if null
  period: PaymentPeriod | null; // optional: if null, logs generic account payment
  onPaymentLogged: () => void; // required callback after success
}
```

- **State**: `paymentDate`, `paymentAmount`, `notes`, `isSubmitting`, `error`.
- **Initialization**:
  - On `account`/`period`/`isOpen` change, sets:
    - `paymentDate` to today.
    - `paymentAmount` to remaining for the period or account’s `monthlyPayment.amount`.
- **Submit behavior**:
  - Validates amount (>= 0), warns on 0 payments for non-bills via browser `confirm`.
  - Requires `paymentDate`.
  - Calls:
    - `logPaymentToPeriod` when `period` present.
    - Else `logPayment` on the account.
  - On success, resets form and calls `onPaymentLogged` then `onClose`.

### `BatchPaymentModal`

```ts
interface BatchPaymentModalProps {
  isOpen: boolean; // required
  onClose: () => void; // required
  account: FinancialAccount | null; // required, but component returns null if null
  onPaymentsLogged: () => void; // required callback if any payments succeeded
}
```

- **State**:
  - Period data: `periods`, `_allPeriods`, `currentPeriodNumber`, `startPeriod`, `endPeriod`.
  - UI: `loading`, `useCustomDate`, `customPaymentDate`, `notes`, `isSubmitting`, `error`, and `result` summary.
- **Important behaviors**:
  - `useEffect` on `(account, isOpen)` resets internal state and either clears everything or loads periods.
  - `loadPeriods(account)` fetches all periods, then:
    - Filters to pending periods with `dueDate <= today`.
    - Determines `currentPeriodNumber`.
    - Picks sensible defaults for `startPeriod`/`endPeriod`.
  - `handleSubmit` validates:
    - `startPeriod <= endPeriod`.
    - `endPeriod <= currentPeriodNumber`.
    - At least one pending period in range.
    - `customPaymentDate` if `useCustomDate`.
  - Calls `batchLogPaymentsToPeriods` and populates `result` with success/failure counts and details.

### `Dashboard` (Page)

Props: none (router page).

- Internally:
  - Loads `accounts` (`getUserFinancialAccounts`), then for each account loads `PaymentPeriod`s (`getPaymentPeriods`).
  - Derives:
    - `filteredPeriods` based on URL `search`, `status`, `type`, `currency`.
    - `metrics`, multiple `useMemo`-based datasets for charts, top accounts, breakdowns.
    - `pendingPeriods` for the pending list.
  - Opens `LogPaymentModal` and `NewAccountWizard` via local boolean + selected account/period state.

### `AccountsByType` (Page)

Props: none (router-driven via `useParams`).

- Reads `type: AccountType` from URL.
- State:
  - `accounts` list, `loading`, `error`.
  - Modal state `isModalOpen`, `saving`, `editingAccount`, `deletingAccount`.
- Uses:
  - `CreateAccountForm` with `mode="create" | "edit"` and `initialData` when editing.
  - `Modal` for create/edit and delete confirmation.
  - `filterAccounts` utility to apply URL filters.
  - Services `createFinancialAccount`, `updateFinancialAccount`, `deleteFinancialAccount`.

### `AccountDetail` (Page)

Props: none (router-driven).

- Reads `accountNumber` from URL.
- State:
  - `account`, `calculatedAccount`, `paymentPeriods`.
  - `loading`, `error`, `isGeneratingPlan`, `planError`.
  - `isBatchPaymentModalOpen`.
- Behavior:
  - `loadAccountData` fetches account, calculates derived fields (`getAccountWithCalculated`), and loads periods.
  - `handleGeneratePlan` / `handleRegeneratePlan` call `generateAmortizationPlanForAccount` and `extendPeriodicBillPeriods`.
  - Prepares multiple chart datasets via pure helper functions and `useMemo`.
  - Uses `BatchPaymentModal` and reloads data after batch operations.

### `MigrateAccounts` (Page)

Props: none.

- Multiple state clusters:
  - Migration preview/run logs and errors.
  - Current accounts and their plan status (`AccountPlanStatus`).
  - Historical payments migration text area, preview/run results.
  - Batch-payment modal state (`BatchPaymentModal`).
- Uses many utilities from `utils/migrateAccounts`, `packages/firebase-client` and Firestore directly (`getFirestore`, `collection`, `getDocs`).

### Auth-App Pages (`apps/auth-app/src/pages/*`)

Each of these is a top-level page that uses:

- `useAuth` (from auth-app `AuthContext`) to access `user`, `signIn`, `signUp`, `signOut`.
- `useSearchParams` to read `redirectTo` and `nonce`.
- Utilities:
  - `authConfig` (allowed redirect origins, default return URL, cookie settings).
  - `getNonceFromUrl`, `validateNonce` (security).
  - `completeAuthRedirect` / `resolveRedirect` (redirect logic).
  - `getFriendlyError` for consistent error messages.

Required/optional props are internal (URL state) rather than passed explicitly.

---

## 4. Component Patterns

### General Patterns

- **Layout + Routed Pages**
  - Pages are rendered inside layout components (`PrivateLayout`, `PublicLayout`, `App`) via React Router routes.
  - Guards (`ProtectedRoute`, `NonceGuard`) wrap children rather than being integrated into route definitions directly, keeping concerns separated.

- **Modal Pattern**
  - `Modal` is a **controlled component**:
    - `isOpen` and `onClose` managed by parents.
    - Children supply arbitrary content (forms, wizards, confirmation dialogs).
  - Specialized modals (`NewAccountWizard`, `LogPaymentModal`, `BatchPaymentModal`, create/edit/delete modals in `AccountsByType` and `MigrateAccounts`) compose `Modal` instead of re-implementing overlay logic.

- **URL-Driven State**
  - `SearchBar` and `Filters` drive filtering via `useSearchParams`, making views shareable/bookmarkable.
  - Many components consume URL params (`Dashboard`, `AccountsByType`, multiple auth-app pages).

- **Context for Auth**
  - Both apps use an `AuthContext` implemented via React Context + custom hooks:
    - Consumer app: token-only context that exposes redirect helpers.
    - Auth app: full Firebase `user` object with `signIn`, `signUp`, `signOut`.

- **Derived Data via `useMemo`**
  - Heavily used in `Dashboard` and `AccountDetail` to derive metrics, chart data, and filtered lists from base data.

### Specific Patterns

- **Guard Components**
  - `ProtectedRoute`: checks auth state and navigates away on failure (consumer app).
  - `NonceGuard`: checks nonce validity before rendering children (auth-app).

- **“Controller + View” via Services**
  - Pages like `Dashboard`, `AccountsByType`, `AccountDetail`, `MigrateAccounts` act as controllers:
    - Fetch data via `services/*` or `packages/firebase-client`.
    - Transform data.
    - Pass into UI components (forms, charts, modals).

- **Controlled Forms**
  - `CreateAccountForm`, `NewAccountWizard` forms, and auth-app `Login`/`Signup` pages are all **controlled**:
    - Inputs bound to component state.
    - Validation runs on submit and/or on change.

- **No HOCs / Render Props**
  - The project favors hooks and simple component composition over HOCs or render prop APIs.

---

## 5. State Management & Data Fetching

### Local State Patterns

- **Hooks used**
  - `useState` for component-local state (forms, toggles, selection, loading flags).
  - `useEffect` for:
    - Data fetching (e.g. `loadAccounts`, `loadPaymentPeriods`, token/nonce validation).
    - Responding to `isOpen` changes in modals (`NewAccountWizard`, `LogPaymentModal`, `BatchPaymentModal`).
    - Router side-effects (redirects in `ProtectedRoute`, `AuthRedirectHandler`, auth-app pages).
  - `useMemo` and `useCallback` for memoizing derived data and callbacks.
  - `useRef` in `SearchBar` (debounce timer + DOM ref) and `AuthRedirectHandler` (one-time redirect guard).
  - `useSyncExternalStore` in `apps/app` `AuthContext` to keep token state consistent with storage.

### Global State / Context

- **Auth Context (both apps)**
  - Single source of truth for authentication state per app.
  - Exposes high-level methods (`redirectToAuth`, `signOut`, `signIn`, `signUp`) and flags (`isAuthenticated`, `loading`).
  - No Redux, Zustand, MobX or other global state libraries are used.

### Data Fetching

- **Consumer app (`apps/app`)**
  - Uses custom service modules:
    - `services/financialAccounts`: `getUserFinancialAccounts`, `getFinancialAccount`, `createFinancialAccount`, `updateFinancialAccount`, `deleteFinancialAccount`, `logPayment`.
    - `services/paymentPeriods`: `getPaymentPeriods`, `generateAmortizationPlanForAccount`, `extendPeriodicBillPeriods`, `batchLogPaymentsToPeriods`, `logPaymentToPeriod`.
  - Data fetching is done inside `useEffect` or `useCallback`-wrapped async functions in pages and feature components.

- **Auth app (`apps/auth-app`)**
  - `AuthContext` wraps Firebase Auth and exposes async methods.
  - Token validation uses utilities like `validateTokenAPI`, `apiValidate`, and Admin-like behavior via API handlers, but all from the client perspective.
  - Some pages (`Validate`, `ApiValidate`) write JSON responses directly into `document.documentElement.innerHTML` to behave like API endpoints.

- **Shared Firebase Client (`packages/firebase-client`)**
  - Provides typed accessors and helpers for financial accounts and payment periods.
  - Used in both consumer app services and migration utilities.

### Controlled vs Uncontrolled Inputs

- All major inputs are **controlled**:
  - Account creation/edit forms (`CreateAccountForm`, `NewAccountWizard`).
  - Payment logging (`LogPaymentModal`, `BatchPaymentModal`).
  - Auth flows (`Login`, `Signup` in auth-app).
  - Filters and search fields (via `SearchBar`, `Filters`).

There are no uncontrolled form elements; form state is always in React state and validated before calling services.
