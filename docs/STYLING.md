# Styling Documentation

**Created:** 2026-01-20  
**Purpose:** Comprehensive documentation of styling approach, Tailwind configuration, design system, and component patterns

---

## 1. Styling Approach

### Primary Methodology

**Tailwind CSS** is the primary and exclusive styling methodology for this project. All component styling is done using Tailwind utility classes.

### PostCSS Configuration

PostCSS is configured at multiple levels:

**Root (`postcss.config.cjs`):**

```javascript
module.exports = {
  plugins: {
    tailwindcss: require('tailwindcss'),
    autoprefixer: require('autoprefixer'),
  },
};
```

**App-level (`apps/app/postcss.config.cjs` & `apps/auth-app/postcss.config.cjs`):**

```javascript
module.exports = {
  plugins: {
    tailwindcss: require('tailwindcss'),
    autoprefixer: require('autoprefixer'),
  },
};
```

Plugins are installed at the workspace root and hoisted by pnpm.

### File Organization

**Styling files structure:**

```
packages/ui-theme/
  ├── styles.css          # Shared design system (base/components/utilities layers)
  └── tailwind.config.cjs # Shared Tailwind configuration preset

apps/app/
  ├── src/
  │   └── index.css       # Imports shared design system
  └── tailwind.config.cjs # Extends shared preset, defines app content paths

apps/auth-app/
  ├── src/
  │   └── index.css       # Imports shared design system + light theme overrides
  └── tailwind.config.cjs # Extends shared preset, defines auth-app content paths
```

### Remaining CSS Files

**Only 3 CSS files remain** (all required for Tailwind setup):

1. **`packages/ui-theme/styles.css`** - Shared design system with `@layer` directives
   - Contains base resets, component classes (`.ds-card`, `.ds-button`, etc.), and utility classes
   - Uses `@apply` directive for reusable component patterns
   - Purpose: Central design system definitions

2. **`apps/app/src/index.css`** - Main app entry point
   - Imports shared design system: `@import '@rates/ui-theme/styles.css';`
   - Purpose: Wrapper to import shared styles

3. **`apps/auth-app/src/index.css`** - Auth app entry point
   - Imports shared design system: `@import '@rates/ui-theme/styles.css';`
   - Adds light theme base layer overrides
   - Purpose: Wrapper to import shared styles + light theme customization

**Migration Status:** All component CSS files have been migrated to Tailwind. See `docs/TAILWIND_MIGRATION_TRACKER.md` for details (100% complete).

### Class Naming and Ordering Conventions

**Class Ordering Convention:**

Classes are ordered in this sequence:

1. **Position** → `absolute`, `fixed`, `relative`, `sticky`
2. **Display** → `flex`, `grid`, `block`, `inline-block`
3. **Sizing** → `w-*`, `h-*`, `max-w-*`, `min-h-*`
4. **Spacing** → `p-*`, `m-*`, `gap-*`, `space-*`
5. **Typography** → `text-*`, `font-*`, `leading-*`, `tracking-*`
6. **Colors** → `bg-*`, `text-*`, `border-*`
7. **Borders** → `border`, `rounded-*`, `border-*`
8. **Effects** → `shadow-*`, `backdrop-blur-*`, `opacity-*`
9. **States** → `hover:`, `focus:`, `active:`, `disabled:`

**Example:**

```tsx
className =
  'absolute flex w-full h-10 p-4 text-sm text-gray-800 bg-white border rounded-lg shadow-md hover:bg-gray-50';
```

**Conditional Classes:**

Use template literals for conditional classes (NO `cn()` or `clsx` utility):

```tsx
className={`base-classes ${
  condition
    ? 'conditional-classes'
    : 'alternative-classes'
}`}
```

**Real example from SearchBar.tsx:**

```tsx
className={`sticky top-0 z-searchbar ${
  isScrolled
    ? 'py-3 px-10 bg-white/8'
    : 'py-6 px-10 bg-white/5'
}`}
```

---

## 2. Tailwind Configuration

### Configuration Architecture

The project uses a **shared preset pattern**:

1. **Base Configuration** (`packages/ui-theme/tailwind.config.cjs`)
   - Contains all theme extensions, colors, typography, spacing, animations
   - Exported as a preset

2. **App Configurations** (`apps/app/tailwind.config.cjs` & `apps/auth-app/tailwind.config.cjs`)
   - Extend the shared preset using `presets: [uiThemePreset]`
   - Define app-specific content paths
   - Optionally override/extend theme values

**Example app config:**

```javascript
const uiThemePreset = require('@rates/ui-theme/tailwind.config.cjs');

module.exports = {
  presets: [uiThemePreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/*/src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      // App-specific overrides
    },
  },
};
```

### Content Paths

**Main app (`apps/app`):**

- `./index.html`
- `./src/**/*.{ts,tsx,js,jsx}`
- `../../packages/*/src/**/*.{ts,tsx,js,jsx}` (shared packages)

**Auth app (`apps/auth-app`):**

- `./index.html`
- `./src/**/*.{ts,tsx,js,jsx}`
- `../../packages/*/src/**/*.{ts,tsx,js,jsx}` (shared packages)

### Custom Theme Extensions

#### Colors

**Primary Colors (Purple/Indigo):**

```javascript
primary: {
  50: '#f5f7ff',
  500: '#6366f1',  // Main primary
  600: '#4f46e5',
  gradient: {
    start: '#667eea',
    end: '#764ba2',
    pink: '#f093fb',
    cyan: '#4facfe',
    teal: '#00f2fe',
    purple: '#8b5cf6',
  },
}
```

**Accent Colors (Cyan/Teal):**

```javascript
accent: {
  500: '#06b6d4',  // Main accent
  600: '#0891b2',
  'auth-blue': '#0369a1',
  'auth-cyan': '#38bdf8',
}
```

**Semantic Colors:**

- `success` (50-900) - Green palette
- `warning` (50-900) - Orange/Yellow palette
- `danger` (50-900) - Red palette
- `info` (500, 600) - Blue palette

**Neutral Colors:**

```javascript
neutral: {
  50: '#f9fafb',
  500: '#6b7280',
  900: '#111827',
  'auth-text': '#0f172a',
  'auth-text-muted': '#475569',
  'auth-border': '#e2e8f0',
  'auth-bg': '#f8fafc',
  'auth-surface': '#ffffff',
}
```

**Background & Surface (Glassmorphism):**

```javascript
background: '#020617',           // Base dark background
surface: 'rgba(15, 23, 42, 0.85)', // Main glass surface
'surface-light': 'rgba(255, 255, 255, 0.05)',
'surface-medium': 'rgba(255, 255, 255, 0.1)',
'surface-heavy': 'rgba(255, 255, 255, 0.15)',
```

#### Typography

**Font Families:**

```javascript
fontFamily: {
  sans: [
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Avenir',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ],
}
```

**Font Sizes:**

```javascript
fontSize: {
  'xs': ['0.65rem', { lineHeight: '1rem' }],
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],
  'base': ['1rem', { lineHeight: '1.5rem' }],
  'lg': ['1.125rem', { lineHeight: '1.75rem' }],
  // ... standard Tailwind sizes
}
```

**Letter Spacing:**

```javascript
letterSpacing: {
  'tightest': '-1px',
  'tighter': '-0.5px',
  'tight': '-0.3px',
  'tight-sm': '-0.2px',
  'wide': '0.5px',
  'normal': '0',
}
```

**Line Heights:**

```javascript
lineHeight: {
  'none': '1',
  'tight': '1.2',
  'snug': '1.3',
  'normal': '1.5',
  'relaxed': '1.35',
}
```

#### Spacing Scale

Standard Tailwind spacing scale (0-24) plus custom fractional values:

```javascript
spacing: {
  0: '0px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  // ... standard scale
  24: '6rem',       // 96px
}
```

**Note:** Components often use arbitrary values (e.g., `gap-[0.4rem]`) instead of custom spacing entries.

#### Border Radius

```javascript
borderRadius: {
  sm: '0.25rem',      // 4px
  DEFAULT: '0.5rem',  // 8px
  md: '0.75rem',      // 12px
  lg: '1rem',         // 16px
  xl: '1.5rem',       // 24px
  '2xl': '2rem',      // 32px
  full: '9999px',
  '8': '8px',
  '10': '10px',
  '12': '12px',
  '16': '16px',
}
```

#### Box Shadows

**Glassmorphism Shadows:**

```javascript
boxShadow: {
  'soft': '0 10px 40px rgba(15, 23, 42, 0.35)',
  'soft-lg': '0 15px 50px rgba(15, 23, 42, 0.4)',
  'soft-md': '0 4px 12px rgba(0, 0, 0, 0.1)',
  'soft-sm': '0 15px 40px rgba(15, 23, 42, 0.08)',
  'glass-purple': '0 4px 12px rgba(102, 126, 234, 0.3)',
  'glass-purple-lg': '0 6px 20px rgba(79, 70, 229, 0.35)',
  'glass-cyan': '0 10px 30px rgba(14, 165, 233, 0.35)',
  'inset': 'inset 0 0 0 1px rgba(148, 163, 184, 0.3)',
  'inset-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
  'focus': '0 0 0 1px rgba(99, 102, 241, 0.6), 0 0 0 4px rgba(99, 102, 241, 0.25)',
  'focus-accent': '0 0 0 1px rgba(6, 182, 212, 0.6), 0 0 0 4px rgba(6, 182, 212, 0.25)',
  'glass-complex': '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
}
```

#### Breakpoints

```javascript
screens: {
  'xs': '480px',
  'sm': '640px',
  'md': '768px',
  'md-sm': '720px',        // Custom
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
  'dashboard-lg': '1280px', // Custom
  'dashboard-md': '1024px',  // Custom
}
```

#### Z-Index Scale

```javascript
zIndex: {
  'overlay': '10',
  'dropdown': '50',
  'sidebar': '100',
  'searchbar': '100',
  'modal': '9999',
}
```

#### Backdrop Blur

```javascript
backdropBlur: {
  'xs': '2px',
  'sm': '10px',
  'DEFAULT': '20px',
  'lg': '20px',
  'xl': '20px',
}
```

### Custom Plugins

**No custom plugins** are currently used. All functionality is achieved through:

- Theme extensions
- `@apply` directives in `styles.css`
- Utility classes

### Safelist Patterns

Dynamic classes that might be purged are safelisted:

```javascript
safelist: [
  // Status colors (used dynamically in components)
  'text-success-500',
  'text-success-css',
  'bg-success-500/10',
  'bg-success-css/10',
  'border-success-500/30',
  'border-success-css/30',
  'text-warning-500',
  'bg-warning-500/10',
  'border-warning-500/30',
  'text-danger-500',
  'bg-danger-500/5',
  'bg-danger-500/10',
  'bg-danger-500/15',
  'bg-danger-500/20',
  'border-danger-500/30',
  'border-danger-500/35',
  'border-danger-500/50',
  'text-primary-500',
  'bg-primary-500/10',
  'bg-primary-500/18',
  'border-primary-500/30',
  'border-primary-500/75',
  'text-accent-500',
  'bg-accent-500/10',
  'border-accent-500/30',
  // Status badge variants
  'status-badge-success',
  'status-badge-warning',
  'status-badge-danger',
  'status-badge-info',
];
```

---

## 3. Design System / Theme

### Color Palette

**Primary Colors (Purple/Indigo):**

- `primary-50` through `primary-900` - Standard scale
- `primary-500` (`#6366f1`) - Main brand color
- `primary-gradient-start` (`#667eea`) - Gradient start
- `primary-gradient-end` (`#764ba2`) - Gradient end

**Usage Examples:**

```tsx
// Background
className = 'bg-primary-500';

// Text
className = 'text-primary-400';

// Border
className = 'border-primary-500/30';

// Gradient
className =
  'bg-gradient-to-br from-primary-gradient-start to-primary-gradient-end';
```

**Accent Colors (Cyan/Teal):**

- `accent-50` through `accent-900` - Standard scale
- `accent-500` (`#06b6d4`) - Main accent color
- `accent-auth-blue` (`#0369a1`) - Auth app specific
- `accent-auth-cyan` (`#38bdf8`) - Auth app input focus

**Semantic Colors:**

- `success-*` - Green palette for success states
- `warning-*` - Orange/Yellow palette for warnings
- `danger-*` - Red palette for errors/danger
- `info-*` - Blue palette for informational states

**Neutral Colors:**

- `neutral-50` through `neutral-900` - Gray scale
- `neutral-50` (`#f9fafb`) - Lightest
- `neutral-900` (`#111827`) - Darkest
- Auth app specific: `neutral-auth-text`, `neutral-auth-text-muted`, etc.

**Background & Surface:**

- `background` (`#020617`) - Base dark background
- `surface` (`rgba(15, 23, 42, 0.85)`) - Main glass surface
- `surface-light` (`rgba(255, 255, 255, 0.05)`)
- `surface-medium` (`rgba(255, 255, 255, 0.1)`)
- `surface-heavy` (`rgba(255, 255, 255, 0.15)`)

**Opacity Variants:**
Components use arbitrary opacity values:

- `bg-white/5` - 5% white opacity
- `bg-white/10` - 10% white opacity
- `bg-white/15` - 15% white opacity
- `bg-white/20` - 20% white opacity
- `border-white/10` - 10% white border opacity

### Typography Scale

**Font Sizes:**

- `text-xs` (`0.65rem`) - Extra small
- `text-sm` (`0.875rem`) - Small
- `text-base` (`1rem`) - Base/body text
- `text-lg` (`1.125rem`) - Large
- `text-xl` (`1.25rem`) - Extra large
- `text-2xl` (`1.5rem`) - 2x large
- `text-3xl` (`1.875rem`) - 3x large
- `text-4xl` (`2.25rem`) - 4x large

**Font Weights:**

- `font-normal` (400)
- `font-medium` (500)
- `font-semibold` (600)
- `font-bold` (700)

**Letter Spacing:**

- `tracking-tightest` (`-1px`) - For large headings
- `tracking-tighter` (`-0.5px`) - For headings
- `tracking-tight` (`-0.3px`) - For body text
- `tracking-wide` (`0.5px`) - For labels/uppercase

**Line Heights:**

- `leading-none` (`1`)
- `leading-tight` (`1.2`)
- `leading-snug` (`1.3`)
- `leading-normal` (`1.5`)
- `leading-relaxed` (`1.35`)

### Spacing System

**Standard Scale:**

- `0` - `0px`
- `0.5` - `0.125rem` (2px)
- `1` - `0.25rem` (4px)
- `2` - `0.5rem` (8px)
- `4` - `1rem` (16px)
- `6` - `1.5rem` (24px)
- `8` - `2rem` (32px)
- `12` - `3rem` (48px)
- `16` - `4rem` (64px)
- `24` - `6rem` (96px)

**Arbitrary Values:**
Components often use arbitrary spacing values:

- `gap-[0.4rem]` - Custom gap
- `px-[0.4rem]` - Custom horizontal padding
- `py-[0.2rem]` - Custom vertical padding

### CSS Variables

**Defined in `packages/ui-theme/styles.css` base layer:**

```css
:root {
  --app-bg: theme('colors.background');
  --app-surface: theme('colors.surface');
  --app-radius: theme('borderRadius.lg');
  --app-shadow-soft: theme('boxShadow.soft');
}
```

**Usage:** These variables are defined but components primarily use Tailwind classes directly. CSS variables are available for edge cases.

### Dark Mode Configuration

**Main App (`apps/app`):**

- **Default theme:** Dark mode
- Dark background (`#020617`)
- Glass surfaces with white opacity (`bg-white/5`, `bg-white/10`, etc.)
- Light text (`text-neutral-50`, `text-white`)
- No toggle - dark mode is fixed

**Auth App (`apps/auth-app`):**

- **Default theme:** Light mode
- Light background (`#f8fafc`)
- White surfaces (`bg-white`)
- Dark text (`text-neutral-auth-text`)
- No toggle - light theme is fixed

**Configuration:**

```css
/* Main app */
:root {
  color-scheme: dark;
}

/* Auth app */
:root {
  color-scheme: light;
}
```

---

## 4. UI Component Library

### External Libraries

**No external UI libraries** are used. The project follows a "build custom components" philosophy.

**Libraries NOT used:**

- ❌ shadcn/ui
- ❌ Material-UI (MUI)
- ❌ Chakra UI
- ❌ Ant Design
- ❌ Radix UI
- ❌ Headless UI

### Design System Components

**Custom component classes** are defined in `packages/ui-theme/styles.css` using `@apply`:

#### Cards

**`.ds-card` / `.ds-card-light`:**

```css
.ds-card-light {
  @apply bg-white/[0.05] backdrop-blur-[20px] border border-white/10 rounded-2xl;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**`.ds-card-medium`:**

```css
.ds-card-medium {
  @apply bg-white/[0.12] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/[0.18] rounded-[20px];
}
```

**`.glass-panel`:**

```css
.glass-panel {
  @apply bg-white/[0.15] backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/[0.18] rounded-[24px];
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
}
```

**`.glass-sidebar`:**

```css
.glass-sidebar {
  @apply bg-white/10 backdrop-blur-[20px] backdrop-saturate-[180%] border-r border-white/[0.18];
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
}
```

#### Buttons

**`.ds-button` (Primary):**

```css
.ds-button {
  @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium;
  @apply bg-primary-500 text-white shadow-soft;
  @apply hover:bg-primary-400 hover:-translate-y-0.5 hover:shadow-soft-lg;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**`.ds-button-secondary`:**

```css
.ds-button-secondary {
  @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium;
  @apply bg-surface border border-neutral-700 text-neutral-100;
  @apply hover:bg-neutral-800 hover:border-neutral-600;
}
```

**`.ds-button-gradient`:**

```css
.ds-button-gradient {
  @apply inline-flex items-center justify-center rounded-xl text-white border border-white/[0.25];
  @apply bg-gradient-to-br from-[#667eea] to-[#764ba2] backdrop-blur-[10px];
  @apply shadow-[0_4px_12px_rgba(102,126,234,0.3)];
  @apply hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)];
}
```

#### Form Elements

**`.ds-input`:**

```css
.ds-input {
  @apply w-full rounded-md border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-50;
  @apply placeholder:text-neutral-500 shadow-inset;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**`.ds-select`:**

```css
.ds-select {
  @apply ds-input;
}
```

**`.ds-label`:**

```css
.ds-label {
  @apply block text-sm font-semibold text-neutral-100 mb-1;
}
```

**`.ds-field`:**

```css
.ds-field {
  @apply grid gap-1;
}
```

#### Status Badges

**`.status-badge`:**

```css
.status-badge {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold;
}

.status-badge-success {
  @apply bg-success-500/20 text-success-400 border border-success-500/30;
}

.status-badge-warning {
  @apply bg-warning-500/20 text-warning-400 border border-warning-500/30;
}

.status-badge-danger {
  @apply bg-danger-500/20 text-danger-400 border border-danger-500/30;
}

.status-badge-info {
  @apply bg-accent-500/20 text-accent-400 border border-accent-500/30;
}
```

#### Messages

**`.ds-error`:**

```css
.ds-error {
  @apply px-3 py-2.5 rounded-lg bg-danger-500/10 text-danger-400 border border-danger-500/30;
}
```

**`.ds-success`:**

```css
.ds-success {
  @apply px-3 py-2.5 rounded-lg bg-success-500/10 text-success-400 border border-success-500/30;
}
```

#### Scrollbars

**`.modal-scrollbar`:**

```css
.modal-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.modal-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.modal-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
```

**`.sidebar-scrollbar`** and **`.main-scrollbar`** - Similar patterns with different widths.

### Class Merging Utilities

**NOT USED** - The project does not use `cn()` or `clsx` utilities. Conditional classes are handled with template literals:

```tsx
// ✅ Current pattern
className={`base-classes ${
  condition
    ? 'conditional-classes'
    : 'alternative-classes'
}`}

// ❌ NOT used
className={cn('base-classes', condition && 'conditional-classes')}
```

---

## 5. Responsive Design

### Breakpoint System

**Standard Tailwind Breakpoints:**

- `sm`: `640px` - Small tablets
- `md`: `768px` - Tablets
- `lg`: `1024px` - Small desktops
- `xl`: `1280px` - Desktops
- `2xl`: `1536px` - Large desktops

**Custom Breakpoints:**

- `xs`: `480px` - Large phones
- `md-sm`: `720px` - Between md and sm
- `dashboard-lg`: `1280px` - Dashboard-specific large breakpoint
- `dashboard-md`: `1024px` - Dashboard-specific medium breakpoint

### Mobile-First Approach

**The project uses a mobile-first approach:**

1. Base styles target mobile devices
2. Breakpoints scale up: `md:`, `lg:`, `xl:`, `2xl:`
3. Components are designed for mobile first, then enhanced for larger screens

**Example:**

```tsx
className = 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base lg:px-8 lg:py-4';
```

### Common Responsive Patterns

**Container Widths:**

```tsx
// Full width on mobile, constrained on desktop
className = 'w-full max-w-[800px] mx-auto md:max-w-full md:m-4';
```

**Grid Layouts:**

```tsx
// Single column on mobile, multi-column on desktop
className = 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3';
```

**Spacing:**

```tsx
// Less padding on mobile, more on desktop
className = 'p-4 md:p-6 lg:p-8';
```

**Typography:**

```tsx
// Smaller text on mobile, larger on desktop
className = 'text-sm md:text-base lg:text-lg';
```

**Visibility:**

```tsx
// Hide on mobile, show on desktop
className = 'hidden md:block';

// Show on mobile, hide on desktop
className = 'block md:hidden';
```

**SearchBar Example:**

```tsx
className={`sticky top-0 z-searchbar ${
  isScrolled
    ? 'px-10 py-3 bg-white/8 md:px-6 md:py-2.5 xs:px-4 xs:py-2'
    : 'px-10 py-6 bg-white/5 md:px-6 md:py-4 xs:px-4 xs:py-3.5'
}`}
```

### Container Queries

**Not currently used.** The project relies on media queries via Tailwind breakpoints.

---

## 6. Component Patterns

### Reusable Class Combinations

**Glassmorphism Card Pattern:**

```tsx
className =
  'bg-white/10 backdrop-blur-[20px] border border-white/10 rounded-2xl';
```

**Centered Flex Pattern:**

```tsx
className = 'flex items-center justify-center';
```

**Gradient Button Pattern:**

```tsx
className =
  'bg-gradient-to-br from-primary-gradient-start to-primary-gradient-end text-white rounded-xl px-4 py-2';
```

**Status Badge Pattern:**

```tsx
className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
  status === 'success'
    ? 'bg-success-500/20 text-success-400 border border-success-500/30'
    : 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
}`}
```

### @apply Directives

**Location:** `@apply` is ONLY used in `packages/ui-theme/styles.css`

**Purpose:** Create reusable component classes (`.ds-card`, `.ds-button`, etc.)

**Example:**

```css
@layer components {
  .ds-card-light {
    @apply bg-white/[0.05] backdrop-blur-[20px] border border-white/10 rounded-2xl;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
```

**Rule:** Components should NOT use `@apply` directly. Use utility classes or design system classes.

### CVA (Class Variance Authority)

**NOT USED** - The project uses template literals for conditional styling:

```tsx
// ✅ Current pattern
className={`px-4 py-2 rounded-lg ${
  variant === 'primary'
    ? 'bg-primary-500 text-white'
    : 'bg-white/10 text-white/70'
}`}

// ❌ NOT used
const buttonVariants = cva('px-4 py-2 rounded-lg', {
  variants: {
    variant: {
      primary: 'bg-primary-500 text-white',
      secondary: 'bg-white/10 text-white/70',
    },
  },
})
```

### Component Variant Strategies

**Conditional Template Literals:**

```tsx
// Single condition
className={`base-classes ${isActive ? 'active-classes' : ''}`}

// Multiple conditions
className={`base-classes ${
  variant === 'primary'
    ? 'primary-classes'
    : variant === 'secondary'
    ? 'secondary-classes'
    : 'default-classes'
}`}

// State-based variants
className={`sticky top-0 ${
  isScrolled
    ? 'py-3 px-10 bg-white/8'
    : 'py-6 px-10 bg-white/5'
}`}
```

**Real Example from SearchBar.tsx:**

```tsx
className={`sticky top-0 z-searchbar pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
  isScrolled
    ? 'px-10 py-3 bg-white/8 backdrop-blur-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] md:px-6 md:py-2.5 xs:px-4 xs:py-2'
    : 'px-10 py-6 bg-white/5 backdrop-blur-[10px] border-b border-white/10 md:px-6 md:py-4 xs:px-4 xs:py-3.5'
} relative after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:pointer-events-none`}
```

### Conditional Styling Patterns

**Boolean State:**

```tsx
className={`account-row ${isExpanded ? 'expanded' : ''}`}
```

**Status-Based:**

```tsx
className={`status-badge ${
  status === 'success'
    ? 'status-badge-success'
    : status === 'warning'
    ? 'status-badge-warning'
    : 'status-badge-danger'
}`}
```

**Array-Based (Filters):**

```tsx
className={`filter-chip ${
  statusFilters.includes(status.value) ? 'active' : ''
}`}
```

**Responsive + Conditional:**

```tsx
className={`sidebar ${sidebarExpanded ? 'px-4' : 'px-3'} ${
  sidebarExpanded ? 'w-[280px]' : 'w-[80px]'
} md:w-[240px] xs:w-[200px]`}
```

---

## 7. Animation & Transitions

### Tailwind Animation Utilities

**Standard Animations:**

- `animate-spin` - Rotating spinner
- `animate-pulse` - Pulsing opacity

**Custom Animations (defined in `tailwind.config.cjs`):**

**`.animate-fadeIn`:**

```javascript
animation: {
  'fadeIn': 'fadeIn 0.2s ease-out',
}
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
}
```

**Usage:**

```tsx
className = 'animate-fadeIn';
```

**`.animate-fadeIn-slow`:**

```javascript
animation: {
  'fadeIn-slow': 'fadeInTransform 0.6s ease-out',
}
keyframes: {
  fadeInTransform: {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
}
```

**Usage:**

```tsx
className = 'animate-fadeIn-slow';
```

**`.animate-slideUp`:**

```javascript
animation: {
  'slideUp': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}
keyframes: {
  slideUp: {
    '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
    '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
  },
}
```

**Usage:**

```tsx
className = 'animate-slideUp';
```

**`.animate-slideDown`:**

```javascript
animation: {
  'slideDown': 'slideDown 0.3s ease-out',
}
keyframes: {
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
}
```

**`.animate-pulse`:**

```javascript
animation: {
  'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
keyframes: {
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.7' },
  },
}
```

**Usage:**

```tsx
className = 'animate-pulse';
```

**`.animate-success-pulse`:**

```javascript
animation: {
  'success-pulse': 'successPulse 0.6s ease-out',
}
keyframes: {
  successPulse: {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.1)' },
  },
}
```

**`.animate-gradient-shift`:**

```javascript
animation: {
  'gradient-shift': 'gradientShift 15s ease infinite',
}
keyframes: {
  gradientShift: {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
  },
}
```

**Usage:**

```tsx
className =
  'animate-gradient-shift bg-gradient-to-br from-primary-gradient-start via-primary-gradient-pink to-primary-gradient-cyan bg-[length:200%_200%]';
```

### Transition Patterns

**Standard Transitions:**

```tsx
// All properties
className = 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

// Specific properties
className = 'transition-[transform,opacity] duration-300 ease-out';

// Color transitions
className = 'transition-colors duration-200 ease-in-out';

// Transform transitions
className =
  'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';
```

**Common Transition Patterns:**

**Hover Effects:**

```tsx
className =
  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg';
```

**Focus States:**

```tsx
className =
  'transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500';
```

**State Changes:**

```tsx
className={`transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
  sidebarExpanded ? 'w-[280px]' : 'w-[80px]'
}`}
```

**Opacity Transitions:**

```tsx
className = 'transition-opacity duration-300 ease opacity-70 hover:opacity-100';
```

### Animation Libraries

**NOT USED** - The project does not use external animation libraries:

- ❌ Framer Motion
- ❌ GSAP
- ❌ React Spring

All animations are achieved through:

- Tailwind animation utilities
- CSS transitions
- Custom keyframes in `tailwind.config.cjs`

### Custom Keyframes

All custom keyframes are defined in `packages/ui-theme/tailwind.config.cjs`:

1. **`fadeIn`** - Simple fade in
2. **`fadeInTransform`** - Fade in with translateY
3. **`slideUp`** - Slide up with scale
4. **`slideDown`** - Slide down
5. **`pulse`** - Opacity pulse
6. **`successPulse`** - Scale pulse for success states
7. **`gradientShift`** - Background position shift for animated gradients

---

## 8. Utility Patterns

### Custom Utilities

**Defined in `packages/ui-theme/styles.css` utilities layer:**

**`.flex-center`:**

```css
.flex-center {
  @apply flex items-center justify-center;
}
```

**Usage:**

```tsx
className = 'flex-center';
```

**`.text-gradient`:**

```css
.text-gradient {
  @apply bg-clip-text text-transparent;
  background-image: linear-gradient(
    135deg,
    theme('colors.primary.500'),
    theme('colors.accent.500')
  );
}
```

**Usage:**

```tsx
className = 'text-gradient';
```

**`.glass-border`:**

```css
.glass-border {
  @apply relative;
}

.glass-border::before {
  @apply absolute inset-0 rounded-lg;
  content: '';
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.3),
    rgba(6, 182, 212, 0.3)
  );
  padding: 1px;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  z-index: -1;
}
```

**`.truncate-2` and `.truncate-3`:**

```css
.truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

**Usage:**

```tsx
className = 'truncate-2'; // Truncate to 2 lines
className = 'truncate-3'; // Truncate to 3 lines
```

### Commonly Used Utility Combinations

**Glassmorphism Card:**

```tsx
className =
  'bg-white/10 backdrop-blur-[20px] border border-white/10 rounded-2xl';
```

**Centered Content:**

```tsx
className = 'flex items-center justify-center';
```

**Full Width Container:**

```tsx
className = 'w-full max-w-[800px] mx-auto';
```

**Responsive Padding:**

```tsx
className = 'p-4 md:p-6 lg:p-8';
```

**Status Colors:**

```tsx
className = 'bg-success-500/10 text-success-400 border border-success-500/30';
className = 'bg-danger-500/10 text-danger-400 border border-danger-500/30';
className = 'bg-warning-500/10 text-warning-400 border border-warning-500/30';
```

**Hover Effects:**

```tsx
className =
  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/20';
```

**Focus States:**

```tsx
className =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
```

### Arbitrary Value Patterns

**Opacity Values:**

```tsx
className = 'bg-white/5'; // 5% opacity
className = 'bg-white/10'; // 10% opacity
className = 'bg-white/15'; // 15% opacity
className = 'bg-white/20'; // 20% opacity
className = 'border-white/10'; // 10% border opacity
```

**Custom Spacing:**

```tsx
className = 'gap-[0.4rem]'; // Custom gap
className = 'px-[0.4rem]'; // Custom padding
className = 'py-[0.2rem]'; // Custom padding
```

**Custom Border Radius:**

```tsx
className = 'rounded-[20px]'; // Custom radius
className = 'rounded-[24px]'; // Custom radius
```

**Custom Shadows:**

```tsx
className = 'shadow-[0_4px_12px_rgba(102,126,234,0.3)]';
className = 'shadow-[0_6px_20px_rgba(79,70,229,0.35)]';
className = 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]';
```

**Custom Backdrop Blur:**

```tsx
className = 'backdrop-blur-[10px]';
className = 'backdrop-blur-[15px]';
className = 'backdrop-blur-[20px]';
```

**Custom Colors:**

```tsx
className = 'bg-[#667eea]'; // Direct hex color
className = 'text-[#0f172a]'; // Direct hex color
className = 'border-[rgba(255,255,255,0.18)]'; // Direct rgba
```

**Custom Transitions:**

```tsx
className = 'transition-[font-size] duration-300';
className = 'transition-[width] duration-400';
className = 'ease-[cubic-bezier(0.4,0,0.2,1)]';
```

### !important Usage

**NOT USED** - The project does not use `!important` in Tailwind classes. Specificity is achieved through:

- Class ordering
- More specific selectors
- Design system classes with `@apply`

---

## Migration Status

**Current Status:** 100% Complete ✅

All components have been migrated from CSS files to Tailwind utility classes. See `docs/TAILWIND_MIGRATION_TRACKER.md` for detailed migration history.

**Remaining CSS Files:** 3 files (all required for Tailwind setup)

- `packages/ui-theme/styles.css` - Design system definitions
- `apps/app/src/index.css` - Import wrapper
- `apps/auth-app/src/index.css` - Import wrapper + light theme

---

## References

- **Migration Tracker:** `docs/TAILWIND_MIGRATION_TRACKER.md`
- **Tailwind Config:** `packages/ui-theme/tailwind.config.cjs`
- **Design System:** `packages/ui-theme/styles.css`
- **Project Rules:** `.cursorrules`

---

**Last Updated:** 2026-01-20
