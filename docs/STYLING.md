## 1. Styling Approach

- **Methodology**
  - The project uses **global and component/page-scoped CSS files** imported into React components (e.g. `import './Dashboard.css';`).
  - Styling is applied via **plain CSS class names** (no CSS Modules, no CSS-in-JS, no utility frameworks like Tailwind).
  - Layout and visual hierarchy rely heavily on **Flexbox** and **CSS Grid**.

- **Preprocessors / Tooling**
  - No Sass/SCSS/LESS is used; all styles are authored in **plain CSS**.
  - Vite’s default **PostCSS pipeline** is present via the build tooling, but there are **no custom PostCSS plugins** configured in this repo.

- **File Organization**
  - **Global app styles**
    - `apps/app/src/index.css`: base reset, typography, global layout primitives, color-scheme.
    - `apps/auth-app/src/index.css`: base styles for the auth app landing/login UI.
  - **Component-scoped styles (main app)**
    - Layout & shell: `PrivateLayout.css`, `PublicLayout.css`, `Modal.css`, `SearchBar.css`, `Filters.css`.
    - Forms & flows: `CreateAccountForm.css`, `NewAccountWizard.css`, `LogPaymentModal.css`.
  - **Page-scoped styles (main app)**
    - Dashboard and accounts: `Dashboard.css`, `AccountDetail.css`.

**Example: component importing its CSS**

```tsx
// apps/app/src/components/NewAccountWizard.tsx
import { Modal } from './Modal';
import './NewAccountWizard.css';

export function NewAccountWizard(/* props */) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a new account">
      <div className="new-account-wizard">{/* ... */}</div>
    </Modal>
  );
}
```

## 2. Design System / Theme

- **Color Palette**
  - Core gradients for backgrounds and accents:
    - Private shell gradient (sidebar + app background):
      - `#667eea`, `#764ba2`, `#f093fb`, `#4facfe`, `#00f2fe` (`.private-layout`, `Dashboard` cards and accents).
    - Primary button/CTA gradients:
      - `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
      - `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`
      - Variants for hover states with slightly lighter endpoints.
  - Status and semantic colors:
    - **Success/positive**: `#4caf50`, `#2ecc71`.
    - **Warning**: `#ff9800`, `#ffd93d`.
    - **Error/danger**: `#f44336`, `#ff6b6b`.
    - **Info/primary text on light**: `#0f172a`, `#475569` (auth app).
  - Surfaces use translucent white on dark/gradient backgrounds:
    - `background: rgba(255, 255, 255, 0.05–0.2);`
    - Borders: `rgba(255, 255, 255, 0.1–0.3);`
    - Combined with `backdrop-filter: blur(...)` for a **glassmorphism** effect.

- **CSS Variables**
  - Global root variables are minimal; the main app uses:
    - `:root` (in `apps/app/src/index.css`) to set typography and `color-scheme`.
  - The auth app sets base colors on `:root` for background and text but does not define a large token set of CSS variables.

- **Typography**
  - Base font family:
    - Main app: `Inter, system-ui, Avenir, Helvetica, Arial, sans-serif`.
    - Auth app: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`
  - Headings:
    - Large titles around **2–2.5rem** (`Dashboard`, `AccountDetail` headers).
    - Section titles around **1.25–1.75rem** (`.section-title`, `.chart-title`).
  - Body text:
    - Defaults to `1rem` line-height `1.5`.
    - Muted descriptions use slightly smaller sizes (`0.85–0.95rem`) with reduced opacity.
  - Mono fonts (IDs, account numbers, tokens):
    - `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`.

- **Spacing & Radii**
  - Spacing (approximate scale):
    - `0.25rem–0.5rem`: chips, small gaps.
    - `0.75rem–1rem`: button paddings, compact cards.
    - `1.5rem–2.5rem`: card padding, page gutters, section spacing.
  - Border-radius scale:
    - **6–8px**: buttons, small controls.
    - **10–12px**: inputs, modals, status badges.
    - **16–24px**: large cards (`Dashboard`, `AccountDetail`, `Modal`).

**Example: button + card design tokens in CSS**

```css
/* apps/app/src/components/LogPaymentModal.css */
.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

/* apps/app/src/pages/Dashboard.css */
.summary-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
}
```

## 3. UI Component Library

- **Libraries Used**
  - No external UI component libraries (e.g. MUI, Chakra, shadcn, Radix) are used.
  - The only major visual library is **Recharts** for charts and data visualizations.

- **Custom Components**
  - **Layout & Shell**
    - `PrivateLayout` (sidebar shell, gradient background, sticky search bar).
    - `PublicLayout` (centered auth/login card over gradient background).
  - **Overlays**
    - `Modal`: generic glassmorphic dialog used across the app.
    - `LogPaymentModal`, `BatchPaymentModal`, `NewAccountWizard`: feature-specific modals that compose `Modal`.
  - **Forms & Filters**
    - `CreateAccountForm`, `NewAccountWizard` form stepper, `Filters`, `SearchBar`.

- **Recharts usage**

```tsx
// apps/app/src/pages/Dashboard.tsx
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="outcome" stroke="#ff6b6b" />
    <Line type="monotone" dataKey="income" stroke="#4caf50" />
  </LineChart>
</ResponsiveContainer>;
```

## 4. Responsive Design

- **Breakpoint System**
  - Responsive behavior is implemented via **hand-written media queries** in each CSS file.
  - Common breakpoints:
    - `@media (max-width: 1024px) { ... }` – tablet / small desktop adjustments.
    - `@media (max-width: 768px) { ... }` – primary mobile breakpoint.
    - `@media (max-width: 480px) { ... }` – compact/mobile-small refinement.
    - Occasionally `@media (min-width: 1280px)` for “xl” desktop chart layouts.

- **Approach**
  - Layout is broadly **desktop-first**, then refined at smaller widths via `max-width` breakpoints.
  - Many grids (`Dashboard`, `AccountDetail`, filters, wizard) use `grid-template-columns: repeat(auto-fit/minmax(...))` to flow naturally across screen sizes.

- **Responsive Patterns & Utilities**
  - **Grids collapsing to single column**:
    - Cards and stats sections go from multi-column to `1fr` at `<= 768px`.
  - **Sidebar & main content**:
    - Sidebar width reduces at `768px` and `480px`, and main content `margin-left` is updated accordingly.
  - **Forms & CTAs**:
    - Many `form-row` grids collapse from 2 columns to 1 on mobile, with buttons stacked full-width.
  - **Sticky header search**:
    - `.search-bar-container` is `position: sticky; top: 0;` and compacts when the main scroll container is scrolled.

**Example: responsive grid collapse**

```css
/* apps/app/src/pages/Dashboard.css */
.dashboard .charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

@media (max-width: 768px) {
  .dashboard .charts-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
```

## 5. Animation & Transitions

- **Animation Libraries**
  - No external animation libraries (Framer Motion, GSAP, etc.) are used.
  - All animations and transitions are implemented with **CSS `transition` and `@keyframes`**.

- **Common Animation Patterns**
  - **Glassmorphic hover lift**:
    - Cards and buttons often use `transform: translateY(-2px)` or `scale(1.05)` + box-shadow changes on hover.
  - **Gradient motion**:
    - The main background (`.private-layout`) uses `@keyframes gradientShift` to animate the background position over **15s**.
  - **State feedback**:
    - Overdue/alert values sometimes pulse in opacity to draw attention (`@keyframes pulse`).

- **Defined Keyframes**
  - `gradientShift` in `PrivateLayout.css`:
    - Animates `background-position` across a multi-stop gradient for a subtle animated background.
  - `fadeIn` in `Dashboard.css` and `AccountDetail.css`:
    - Fades and slides content in on initial render.
  - `slideUp` and `fadeIn` in `Modal.css`:
    - Overlay fades in; modal content slides up slightly while scaling.
  - `successPulse` in `NewAccountWizard.css`:
    - Scales the success icon in the final wizard step with a short pulse.
  - `spin` in `Dashboard.css` and `AccountDetail.css`:
    - Simple loading spinner rotation.

**Example: modal and success animations**

```css
/* apps/app/src/components/Modal.css */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* apps/app/src/components/NewAccountWizard.css */
@keyframes successPulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

These conventions should be followed for new components to keep the visual language consistent: use the existing gradients and semantic colors, prefer Glassmorphism-style cards and buttons, reuse the established breakpoints, and animate with CSS transitions/keyframes rather than new JS animation libraries.
