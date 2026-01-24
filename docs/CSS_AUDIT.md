## CSS Audit

### 1. CSS Inventory

- **apps/app**
  - `src/index.css` — ~60 lines — **Global app shell, root and body resets** (shared across all private app pages)
  - `src/pages/Dashboard.css` — ~1,430 lines — **Dashboard layout, account list, metrics, charts, responsive states**
  - `src/pages/AccountDetail.css` — ~540 lines — **Account detail page layout, metrics, charts, tables, responsive**
  - `src/components/PrivateLayout.css` — ~580 lines — **Private layout shell (sidebar, main content), global gradient background**
  - `src/components/PublicLayout.css` — ~70 lines — **Public auth layout (login shell)**
  - `src/components/SearchBar.css` — ~310 lines — **Sticky search bar, search input, filter trigger**
  - `src/components/Filters.css` — ~160 lines — **Filters panel content, chips, clear button**
  - `src/components/Modal.css` — ~170 lines — **Modal overlay, glassmorphism shell, header/body**
  - `src/components/CreateAccountForm.css` — ~150 lines — **Create-account form fields, actions**
  - `src/components/NewAccountWizard.css` — ~420 lines — **New account wizard steps, form, success state**
  - `src/components/LogPaymentModal.css` — ~175 lines — **Log payment form inside modal**

- **apps/auth-app**
  - `src/index.css` — ~190 lines — **Global auth-app page shell, card, basic form controls**

- **Shared vs app-specific**
  - **Shared-like/global styles**
    - `apps/app/src/index.css`: root, `html`, `body`, `#root`, color-scheme, base `a` styles.
    - `apps/auth-app/src/index.css`: root, `body`, basic layout classes (`.page`, `.card`, `.grid`, `.button`, etc.).
    - `PrivateLayout.css`: effectively global app chrome (background, sidebar, scrollbars), affects all private routes.
    - `PublicLayout.css`: global chrome for unauthenticated routes (login shell).
  - **App-specific / feature-specific styles**
    - `Dashboard.css`, `AccountDetail.css`: tightly coupled to corresponding page components.
    - `CreateAccountForm.css`, `NewAccountWizard.css`, `LogPaymentModal.css`, `Filters.css`, `SearchBar.css`, `Modal.css`: scoped to specific components and flows, though many share glassmorphism tokens.

### 2. Patterns Analysis

- **Colors (unique values observed)**
  - **Neutrals / text / surfaces**
    - `white`, `#ffffff`, `rgba(255, 255, 255, X)` with many opacities: `0.03`, `0.05`, `0.06`, `0.08`, `0.1`, `0.12`, `0.14`, `0.15`, `0.16`, `0.18`, `0.2`, `0.24`, `0.25`, `0.3`, `0.35`, `0.4`, `0.5`, `0.6`, `0.7`, `0.75`, `0.8`, `0.85`, `0.9`, `0.92`, `0.95`.
    - `rgba(0, 0, 0, X)` with `0.1`, `0.18`, `0.2`, `0.25`, `0.6`.
    - Text and surfaces in auth-app: `#0f172a`, `#1e1e1e`, `#666`, `#475569`, `#e2e8f0`, `#f8fafc`, `#ffffff`, `#242424`.
  - **Brand / primary gradients and accents**
    - Core purple/indigo: `#667eea`, `#764ba2`, `#6366f1`, `#8b5cf6`, `#7a8ef0`, `#8559b8`.
    - Extended gradient palette: `#f093fb`, `#4facfe`, `#00f2fe`, `#00f2fe`, `#7c3aed`, `#a855f7`.
    - Auth-app primary: `#06b6d4`, `#6366f1`, `#0369a1`.
  - **Status / semantic colors**
    - Success: `rgba(46, 204, 113, X)`, `#4caf50`, `#166534`, `#bbf7d0`, `#ecfdf3`.
    - Warning/pending: `rgba(255, 152, 0, X)`, `#ff9800`, `#ffd93d`, `rgba(255, 193, 7, X)`.
    - Error/danger: `#ff6b6b`, `rgba(255, 107, 107, X)`, `#f44336`, `#b91c1c`, `#fef2f2`, `#fecdd3`.
    - Info/primary states: `#2196f3`, `rgba(33, 150, 243, X)`, `#667eea` (as metric primary), `#4facfe`, `#f093fb`.
    - Muted: `#9e9e9e`, `rgba(158, 158, 158, X)`.
  - **Other**
    - Gradients with `rgba` stops for glassmorphism: repeated across `Dashboard.css`, `NewAccountWizard.css`, `PrivateLayout.css`, `Filters.css`, `SearchBar.css`, `Modal.css`.

- **Font sizes (representative values)**
  - Root/page headings: `2.5rem`, `2rem`, `1.75rem`, `1.5rem`, `1.4rem`, `1.3rem`, `1.25rem`, `1.2rem`, `1.1rem`, `1.05rem`, `1rem`.
  - Small text / labels: `0.95rem`, `0.92rem`, `0.9rem`, `0.88rem`, `0.86rem`, `0.85rem`, `0.8rem`, `0.75rem`, `0.7rem`, `0.65rem`.
  - Auth-app uses pixel sizes: `24px`, `16px`, `15px`, `14px`, `12px`.

- **Spacing values (margin/padding/gap, representative set)**
  - Gaps: `0.25rem`, `0.35rem`, `0.4rem`, `0.45rem`, `0.5rem`, `0.6rem`, `0.65rem`, `0.7rem`, `0.75rem`, `0.8rem`, `0.85rem`, `0.9rem`, `0.95rem`, `1rem`, `1.25rem`, `1.5rem`, `1.75rem`, `2rem`, `2.5rem`, `3rem`, `4rem`.
  - Padding: variety of `0.4rem–3rem` and `24px`, `32px` in auth-app.
  - Margins: `0`, `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`, `2.5rem`, `3rem`.
  - Layout widths: `max-width: 1400px`, `max-width: 960px`, `max-width: 800px`, `max-width: 400px`.

- **Breakpoints / media queries**
  - `@media (max-width: 1280px)` (Dashboard charts grid).
  - `@media (min-width: 1280px)` and combination `(min-width: 769px) and (max-width: 1279px)` for dashboard chart columns.
  - `@media (max-width: 1024px)` (Dashboard rows and account grids).
  - `@media (max-width: 768px)` used widely in `Dashboard.css`, `AccountDetail.css`, `CreateAccountForm.css`, `PrivateLayout.css`, `SearchBar.css`, `Filters.css`, `Modal.css`.
  - `@media (max-width: 720px)` in `NewAccountWizard.css`.
  - `@media (max-width: 480px)` used in `Dashboard.css`, `PrivateLayout.css`, `SearchBar.css`, `Filters.css`.
  - `@media (prefers-color-scheme: light)` in `apps/app/src/index.css`.

- **z-index usage**
  - `z-index: 9999` — `Modal.css` overlay (top-most).
  - `z-index: 100` — sidebar (`PrivateLayout.css`), search bar container (`SearchBar.css`).
  - `z-index: 10` / `1` — metric-split content, gradient overlays, etc.
  - Most components rely on stacking context from positioning rather than many explicit `z-index` values.

### 3. Component Styles Mapping

- **Global / layout**
  - `apps/app/src/index.css`
    - Styles `:root`, `html`, `body`, `#root`, base `a` element.
    - Affects **all components** in `apps/app` (global reset and theme).
  - `apps/app/src/components/PrivateLayout.css`
    - Maps to `PrivateLayout.tsx`.
    - Styles `.private-layout`, `.sidebar`, `.main-content`, scrollbars, and body modifiers `body.modal-open`.
    - Effectively styles **every private route** via layout shell.
  - `apps/app/src/components/PublicLayout.css`
    - Maps to `PublicLayout.tsx`.
    - Styles public login shell and shared `.btn-primary` / `.btn-secondary` patterns used by auth entry points.

- **Pages**
  - `apps/app/src/pages/Dashboard.css`
    - Maps to `Dashboard.tsx` and partially to `AccountsByType.tsx` (through `.account-card` legacy styles).
    - Styles `.dashboard`, header, `.accounts-summary`, `.account-row*`, `.metrics-grid`, `.chart-card`, `.top-accounts-compact*`, `.status-summary`, responsive states.
    - Some classes (`.account-card`, `.status-badge`) are also referenced in other contexts (`AccountsByType`) → **multi-component usage**.
  - `apps/app/src/pages/AccountDetail.css`
    - Maps to `AccountDetail.tsx`.
    - Styles `.account-detail`, `.account-detail-header*`, `.account-metrics-grid`, charts, payments table, periods list, loading/error/empty states.

- **Modals and flows**
  - `apps/app/src/components/Modal.css`
    - Maps to `Modal.tsx`, which is used by multiple features (log payment, batch payment, new account wizard, filters, etc.).
    - Global modal overlay and container; **shared by multiple modal content components**.
  - `apps/app/src/components/LogPaymentModal.css`
    - Maps to `LogPaymentModal.tsx`.
    - Contains form layout, labels, buttons, inline error styles.
  - `apps/app/src/components/NewAccountWizard.css`
    - Maps to `NewAccountWizard.tsx`.
    - Includes stepper, forms, review, success state, buttons, and keyframe animation.
  - `apps/app/src/components/CreateAccountForm.css`
    - Maps to `CreateAccountForm.tsx`.
    - Used standalone and potentially inside modals; shares patterns with `LogPaymentModal.css` (labels, required markers, buttons).

- **Search and filters**
  - `apps/app/src/components/SearchBar.css`
    - Maps to `SearchBar.tsx`.
    - Sticky search bar at top of content, interacts with layout (position: sticky on top with `z-index: 100`).
  - `apps/app/src/components/Filters.css`
    - Maps to `Filters.tsx`.
    - Filters panel content; often used _inside_ `Modal` component.

- **Auth app**
  - `apps/auth-app/src/index.css`
    - Global styles for `auth-app` routes (e.g., `Landing.tsx`, `Login.tsx`, `Signup.tsx`, `Session.tsx`, `Validate.tsx`, `Logout.tsx`).
    - Styles `.page`, `.card`, `.header`, `.form`, `.button`, `.badge`, `.error`, `.success`, `.token-box`.

- **Global styles and resets**
  - `apps/app/src/index.css`:
    - Global root color scheme, typography, resets for `html`, `body`, `a`.
  - `apps/auth-app/src/index.css`:
    - Global root, body, anchor, layout card grid.
  - `PrivateLayout.css`:
    - Background gradients and layout that sit _behind_ all private pages.
  - No traditional CSS reset library, but base `box-sizing` and `margin: 0` patterns cover many reset needs.

### 4. Complexity Assessment

- **Complex selectors / nesting / combinators**
  - Selectors are mostly flat with **1–2 levels** (`.account-row-details.visible`, `.wizard-step.active .wizard-step-dot`, `.dashboard .charts-section`).
  - Pseudo-elements `::before` / `::after` are used heavily for gradient borders and separators.
  - No SCSS-style deep nesting; complexity mainly from many variants per component rather than selector depth.

- **Animations / keyframes**
  - `Dashboard.css`
    - `@keyframes fadeIn` (dashboard entry).
    - `@keyframes spin` (loading spinner).
    - `@keyframes pulse` (overdue values pulsing).
  - `AccountDetail.css`
    - `@keyframes fadeIn` (page entry).
    - `@keyframes spin` (loading spinner).
  - `NewAccountWizard.css`
    - `@keyframes successPulse` for success icon.
  - `Modal.css`
    - `@keyframes fadeIn` (overlay).
    - `@keyframes slideUp` (modal content).
  - `PrivateLayout.css`
    - `@keyframes gradientShift` (background animation).
    - `@keyframes slideDown` (submenu).

- **CSS variables**
  - No custom CSS variables (e.g., `--color-primary`) are defined in the current CSS files.
  - A few browser/system variables are used implicitly (e.g., `font-family` with system stacks), but no project-wide tokens yet.

- **Pseudo-elements and pseudo-classes**
  - Pseudo-elements:
    - `::before`, `::after` used for:
      - Decorative gradient lines and borders (`.dashboard-header::after`, `.summary-card::before`, `.account-card::before`, `.modal-header::after`, `.sidebar-header::after`, `.sidebar-footer::before`).
      - Scrollbar styling (`::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`).
  - Pseudo-classes:
    - `:hover`, `:active`, `:focus`, `:focus-within`, `:disabled`, `:last-child`.
    - `:root` for global theming; `@media (prefers-color-scheme: light)` for theme adjustments.

### 5. Migration Difficulty Rating (per CSS file)

- **apps/app**
  - `src/index.css` — **Medium**
    - Global resets and theme, small but critical; must be migrated carefully to avoid regressions.
  - `src/pages/Dashboard.css` — **Hard**
    - Large file with many components, complex responsive grid configurations, multiple animations, and shared utility classes (`.account-card`, `.status-badge`) used beyond just `Dashboard`.
    - Mixed responsibilities (cards, lists, charts, states) suggest it should be split during migration.
  - `src/pages/AccountDetail.css` — **Medium**
    - Moderately large, but scoped to a single page; animations and tables, but selectors remain flat.
  - `src/components/PrivateLayout.css` — **Hard**
    - Controls global gradient background, sidebar behavior, scrollbars, body modifiers, responsive layout.
    - High impact on all private routes; migrating requires careful consideration of z-index and scrolling.
  - `src/components/PublicLayout.css` — **Easy**
    - Simple layout and button styles; few selectors, small surface area.
  - `src/components/SearchBar.css` — **Medium**
    - Sticky behavior, transformations on scroll state, and multiple responsive tweaks.
    - Uses z-index and position interplay, but still localized.
  - `src/components/Filters.css` — **Easy**
    - Filter chips and panel content; small, flat selectors; minimal responsive behavior.
  - `src/components/Modal.css` — **Medium**
    - Shared overlay and content shell, includes keyframe animations and scrollbars; critical shared primitive.
  - `src/components/CreateAccountForm.css` — **Easy**
    - Controlled form fields and buttons, straightforward layout and a single breakpoint.
  - `src/components/NewAccountWizard.css` — **Medium**
    - Larger feature-specific file, includes forms, grids, animations, and responsive adjustments.
  - `src/components/LogPaymentModal.css` — **Easy**
    - Form styles and buttons, local in scope, no complex layout constructs.

- **apps/auth-app**
  - `src/index.css` — **Medium**
    - Global auth layout and component primitives (cards, buttons, alerts) with consistent but separate design system; modest size but high reuse within `auth-app`.

---

This audit can be used as a migration roadmap:

- Start with **Easy** files (`PublicLayout.css`, `Filters.css`, `CreateAccountForm.css`, `LogPaymentModal.css`) to establish tokens and patterns.
- Migrate **Medium** files next, extracting shared design tokens (colors, spacing, radii, typography) into CSS variables or a design tokens layer.
- Tackle **Hard** files (`Dashboard.css`, `PrivateLayout.css`) last, splitting them by responsibility (layout shell vs content, cards vs tables vs charts) as part of the migration.
