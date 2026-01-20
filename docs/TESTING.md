## 1. Testing Stack

- **Current status**: There is **no automated test framework** (no Jest, Vitest, Cypress, Playwright, Testing Library, etc.) configured in this repository.
- **Configured tooling**:
  - **TypeScript**: Strict compiler options shared via `tsconfig.base.json` and extended by each app/package (`apps/app/tsconfig.json`, `apps/auth-app/tsconfig.json`, `packages/firebase-client/tsconfig.json`).
  - **ESLint**: Monorepo base config in `eslint.config.js`, extended by each app (`apps/app/eslint.config.js`, `apps/auth-app/eslint.config.js`).
  - **Prettier**: Used via root and per-package `format` / `format:check` scripts (no custom config file present, using Prettier defaults).
  - **Monorepo scripts** (root `package.json`):
    - `lint` / `lint:fix`: Runs ESLint across `./apps/*` and `./packages/*`.
    - `format` / `format:check`: Runs Prettier across the workspace.
    - `type-check`: Runs `tsc --noEmit` for apps and packages.
    - `check`: Composite command that runs `format:check`, `lint`, and `type-check`.
- **Test runner configuration**: None yet. When adding tests, Vitest or Jest would typically be wired in via app-level `package.json` scripts and a `vitest.config.ts` or `jest.config.ts` file.

---

## 2. Test Structure

- **Current status**: There are **no test files** in the repository:
  - No `*.test.*` / `*.spec.*` files.
  - No `__tests__` directories.
  - No `tests` folders.
- **Naming conventions (recommended)**:
  - **Unit tests**:
    - For components/pages: `SomeComponent.test.tsx` colocated next to the component in `src/components` or `src/pages`.
    - For utilities: `someUtil.test.ts` colocated next to the file in `src/utils` or `packages/firebase-client/src`.
  - **Integration tests**:
    - `SomeFeature.integration.test.tsx` or `.ts` in a `__tests__` folder next to the feature root, e.g. `src/pages/__tests__`.
  - **E2E tests**:
    - If using Playwright: `*.e2e.ts` under `apps/app/e2e/`.
    - If using Cypress: tests under `apps/app/cypress/e2e/` with `*.cy.ts`.
- **Test categories (recommended mapping)**:
  - **Unit**:
    - Pure utility modules such as `src/utils/formatters.ts`, `src/utils/paymentUtils.ts`, `packages/firebase-client/src/financial-accounts-utils.ts`.
    - Small presentational React components (e.g. `src/components/SearchBar.tsx`).
  - **Integration**:
    - Components that coordinate multiple services/contexts or talk to Firebase via client abstractions, e.g. `src/pages/Dashboard.tsx`, `src/pages/AccountDetail.tsx`, and the `AuthContext` flows.
  - **E2E**:
    - Cross-page user journeys like login, account creation, and logging a payment in the main app; and signup/login/validate flows in `auth-app`.

---

## 3. Unit Tests

> **Note**: The patterns below describe how unit tests should be structured once a test runner (e.g. Vitest) is added. They are not yet present in the codebase.

- **Component testing patterns (recommended)**:
  - Use **React Testing Library** (RTL) with Vitest or Jest.
  - Colocate tests next to components (e.g. `src/components/SearchBar.test.tsx`).
  - Prefer testing via the **public UI surface** (text, roles, labels) instead of implementation details.

Example unit test for a small component like `SearchBar`:

```ts
// src/components/SearchBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onSearch when the user types a query', () => {
    const handleSearch = vi.fn();

    render(<SearchBar value="" onSearch={handleSearch} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'savings' } });

    expect(handleSearch).toHaveBeenCalledWith('savings');
  });
});
```

- **Hook testing approaches (recommended)**:
  - Extract complex logic from components into **custom hooks** (e.g. `useFilteredAccounts`, `useAuthStatus`).
  - Test them via `@testing-library/react`’s `renderHook` (or `@testing-library/react-hooks` if added).

Example hook test for a hypothetical `useFilteredAccounts` hook:

```ts
// src/hooks/useFilteredAccounts.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFilteredAccounts } from './useFilteredAccounts';

describe('useFilteredAccounts', () => {
  it('filters accounts by type', () => {
    const accounts = [
      { id: '1', type: 'savings' },
      { id: '2', type: 'loan' },
    ];

    const { result } = renderHook(() =>
      useFilteredAccounts({ accounts, type: 'savings' })
    );

    expect(result.current).toEqual([{ id: '1', type: 'savings' }]);
  });
});
```

- **Utility function test coverage (recommended)**:
  - Treat utilities as the foundation for correctness and give them **near-100% coverage**.
  - Typical candidates:
    - `src/utils/formatters.ts` (date/number formatting).
    - `src/utils/paymentUtils.ts`, `src/utils/generateAmortizationPlan.ts`.
    - `packages/firebase-client/src/amortization.ts`, `payment-periods.ts`, and the financial account helpers.

Example utility test for a function in `paymentUtils.ts`:

```ts
// src/utils/paymentUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayment } from './paymentUtils';

describe('calculateMonthlyPayment', () => {
  it('computes the correct payment for a simple loan', () => {
    const payment = calculateMonthlyPayment({
      principal: 10000,
      annualRatePercent: 5,
      termMonths: 24,
    });

    expect(payment).toBeCloseTo(438.71, 2);
  });
});
```

---

## 4. Integration Tests

> **Note**: No integration tests are currently implemented. The patterns below describe how to structure them once a test framework and mocking utilities are added.

- **API mocking strategies (recommended)**:
  - For **Firebase** and other HTTP APIs:
    - Use **MSW (Mock Service Worker)** to intercept network calls in tests.
    - For Firebase SDK calls that are not HTTP, wrap them in thin services (e.g. in `packages/firebase-client`) and mock those modules directly.

Example integration test with MSW for a Dashboard page:

```ts
// src/pages/Dashboard.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { server } from '../test/server'; // MSW server setup
import { Dashboard } from './Dashboard';

describe('Dashboard (integration)', () => {
  it('shows account totals after loading data', async () => {
    render(<Dashboard />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/total balance/i)).toBeInTheDocument(),
    );
  });
});
```

- **Database/service mocking approaches (recommended)**:
  - **Firebase client**:
    - Mock the **public functions** of `@rates/firebase-client` (e.g. `getAccounts`, `getPaymentPeriods`) rather than the raw SDK.
    - Provide pre-built test fixtures (e.g. `mockFinancialAccounts.ts` already under `src/utils`) to keep scenarios realistic.
  - **Auth**:
    - Mock `AuthContext` values in tests by wrapping components with a custom `renderWithAuth` helper.

Example service mocking pattern:

```ts
// src/pages/AccountDetail.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as financialServices from '@rates/firebase-client';
import { AccountDetail } from './AccountDetail';

vi.mock('@rates/firebase-client');

describe('AccountDetail (integration)', () => {
  it('renders account information from the service', async () => {
    vi.mocked(financialServices.getAccountById).mockResolvedValue({
      id: 'account-1',
      name: 'Savings',
      balance: 1000,
    });

    render(<AccountDetail accountId="account-1" />);

    await waitFor(() =>
      expect(screen.getByText(/savings/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });
});
```

- **Integration test scenarios (recommended)**:
  - **Main app (`apps/app`)**:
    - Dashboard loads accounts and aggregates balances from Firebase.
    - Account detail view shows amortization schedules and payments.
    - Logging a new payment updates the account view.
  - **Auth app (`apps/auth-app`)**:
    - Signup + email validation flow.
    - Login and session management.
    - Logout and redirect back to the public landing page.

---

## 5. End-to-End Tests

- **Current status**: No E2E tooling or specs are present (no Cypress/Playwright configs or `e2e` directories).
- **Recommended tooling**:
  - **Playwright**:
    - Lives well in a monorepo.
    - Easy cross-browser coverage and screenshots/video.
  - **Cypress** (alternative):
    - Strong interactive DX and good for rapid test authoring.

Example Playwright E2E test for a basic login + dashboard flow:

```ts
// apps/app/e2e/login-and-dashboard.e2e.ts
import { test, expect } from '@playwright/test';

test('user can log in and see dashboard', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.getByRole('link', { name: /log in/i }).click();

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page.getByText(/dashboard/i)).toBeVisible();
  await expect(page.getByText(/total balance/i)).toBeVisible();
});
```

- **Page object patterns (recommended)**:
  - For more complex flows, introduce simple page objects like `LoginPage`, `DashboardPage`, etc. to encapsulate selectors and actions.

Example page object snippet:

```ts
// apps/app/e2e/pages/DashboardPage.ts
import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async assertLoaded() {
    await expect(this.page.getByText(/dashboard/i)).toBeVisible();
  }
}
```

- **Critical user flows to cover (recommended)**:
  - Auth app:
    - Signup → email validation → login → redirect back to main app.
    - Logout from auth app and main app.
  - Main app:
    - First-time user: create an account (`CreateAccountForm` / `NewAccountWizard`).
    - Returning user: filter accounts, open account detail, log a payment, and verify updated balance.

---

## 6. Code Quality Tools

- **Linting setup (ESLint)**:
  - **Root config**: `eslint.config.js` (shared across monorepo):
    - Extends `@eslint/js` recommended and `typescript-eslint` recommended rules.
    - Applies to `**/*.{ts,tsx}`.
    - Ignores build artifacts (`dist`, `build`, `node_modules`, `.pnpm-store`, `coverage`, and config files including `vite.config.ts`).
    - Key rules:
      - `@typescript-eslint/no-unused-vars` with `_`-prefixed ignore convention.
      - `@typescript-eslint/no-explicit-any`: `warn`.
      - Various TypeScript best-practices `warn` rules for nullish coalescing, optional chaining, etc.
  - **App-level configs**:
    - `apps/app/eslint.config.js` and `apps/auth-app/eslint.config.js`:
      - Extend the base config and add React-specific rules (`react-hooks`, `react-refresh`).
      - Use `typescript-eslint` `recommendedTypeChecked` configs.
      - Enable type-aware rules via `parserOptions.project = './tsconfig.json'`.
      - Enforce strict async rules like:
        - `@typescript-eslint/no-floating-promises`: `error`.
        - `@typescript-eslint/no-misused-promises`: `error`.
        - `@typescript-eslint/await-thenable`: `error`.
        - Several `no-unsafe-*` rules as `warn`.
  - **Scripts**:
    - Root:
      - `pnpm lint`: `pnpm --filter "./apps/*" --filter "./packages/*" lint`.
    - Each app/package:
      - `lint`: `eslint . --max-warnings 0`.
      - `lint:fix`: `eslint . --fix`.

- **Formatting tools (Prettier)**:
  - **Usage**:
    - Root:
      - `format`: `prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"`.
      - `format:check`: `prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}"`.
    - Apps:
      - Similar `format` / `format:check` scripts.
    - `packages/firebase-client`:
      - Formats TS/JS/JSON/MD.
  - **Configuration**:
    - No explicit Prettier config file found (`.prettierrc`), so default Prettier conventions apply.

- **Type checking strictness (TypeScript)**:
  - **Shared base (`tsconfig.base.json`)**:
    - `strict: true` (enables all strict TypeScript checks).
    - `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`.
    - `isolatedModules: true`, `noEmit: true` (type-check only).
  - **Per project**:
    - `apps/app/tsconfig.json` and `apps/auth-app/tsconfig.json` extend the base, configure React JSX and path aliases.
    - `packages/firebase-client/tsconfig.json` extends the base and configures `outDir`, `rootDir`, declarations, and source maps.
  - **Scripts**:
    - Root: `type-check` runs `tsc --noEmit` for apps and packages.
    - Each app/package: `type-check`: `tsc --noEmit`.

- **Pre-commit hooks (Husky, lint-staged)**:
  - **Husky**:
    - Root `package.json` defines `"prepare": "husky"`, which initializes Husky when dependencies are installed.
    - No `.husky` directory is present in the repo snapshot, so **no concrete hooks** are currently configured.
  - **lint-staged**:
    - No `lint-staged` configuration files or dependencies were found.

---

## 7. CI Quality Gates

- **Current status**:
  - No `.github/workflows` or other CI configuration files are present, so there are **no automated CI quality gates** defined in the repository.
  - Automated code coverage tooling (e.g. Istanbul/nyc, `vitest --coverage`, Codecov) is not configured.

- **Recommended CI checks (once CI is added)**:
  - **Core quality pipeline**:
    - `pnpm install` (with workspace support).
    - `pnpm check` (root script that runs `format:check`, `lint`, `type-check`).
    - `pnpm test` (to be added once a test runner exists, running unit + integration tests).
  - **Coverage requirements** (recommended starting point):
    - Global coverage threshold: 80% lines/branches for core apps and `packages/firebase-client`.
    - Per-file threshold overrides for especially critical modules (e.g. finance calculations, authentication guards).
  - **Automated review tools** (optional but recommended):
    - Type-aware ESLint in CI (already achievable via `pnpm lint`).
    - Future integrations such as Codecov, Dependabot, or Renovate for dependency updates.

---

## Summary

- **Today**: The project has strong **static quality gates** (strict TypeScript, ESLint, Prettier, monorepo `check` script) but **no runtime tests (unit/integration/E2E)** or CI configured.
- **Next steps**:
  - Introduce a test runner (Vitest or Jest) in each app/package, following the file naming and examples above.
  - Add integration tests for key flows (auth, dashboard, account details) and E2E coverage with Playwright or Cypress.
  - Wire these into a CI pipeline that runs `pnpm check`, `pnpm test`, and enforces coverage thresholds on pull requests.
