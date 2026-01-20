# Tailwind CSS Setup - Monorepo Migration Guide

## Overview

This document describes the Tailwind CSS setup for the rates monorepo, including the shared design system package and app-level configurations.

## Architecture

### Shared Design System Package

**Location**: `packages/ui-theme`

This package serves as the **single source of truth** for all design tokens and Tailwind configuration:

- **`tailwind.config.cjs`**: Base Tailwind preset with colors, typography, spacing, shadows, animations, etc.
- **`styles.css`**: Tailwind directives (`@tailwind base/components/utilities`) + shared component classes
- **`tokens.ts`**: TypeScript design tokens for programmatic access
- **`index.cjs`**: Re-exports for convenience

### App-Level Configurations

Each app (`apps/app` and `apps/auth-app`) has:

- **`tailwind.config.cjs`**: Extends the shared preset, defines app-specific `content` paths
- **`postcss.config.cjs`**: Passthrough to root PostCSS config

### Root Configuration

- **`postcss.config.cjs`**: Shared PostCSS pipeline (Tailwind + Autoprefixer)

## Installation

### Step 1: Install Dependencies

From the repository root:

```bash
pnpm add -D -w tailwindcss postcss autoprefixer
```

The `-w` flag installs these at the workspace root, ensuring a single version across all apps.

### Step 2: Install Workspace Dependencies

After creating the `packages/ui-theme` package, install workspace dependencies:

```bash
pnpm install
```

This will link `@rates/ui-theme` to both apps.

## File Structure

```
rates/
├── packages/
│   └── ui-theme/
│       ├── package.json
│       ├── tailwind.config.cjs    # Base preset (no content paths)
│       ├── styles.css              # Tailwind directives + components
│       ├── tokens.ts               # TypeScript design tokens
│       └── index.cjs               # Re-exports
├── postcss.config.cjs              # Root PostCSS config
├── apps/
│   ├── app/
│   │   ├── tailwind.config.cjs     # Extends ui-theme preset
│   │   ├── postcss.config.cjs      # Passthrough to root
│   │   └── src/
│   │       └── index.css           # Imports @rates/ui-theme/styles.css
│   └── auth-app/
│       ├── tailwind.config.cjs     # Extends ui-theme preset
│       ├── postcss.config.cjs      # Passthrough to root
│       └── src/
│           └── index.css            # Imports @rates/ui-theme/styles.css
```

## How It Works

### 1. Shared Preset Pattern

The `packages/ui-theme/tailwind.config.cjs` exports a Tailwind config **without** `content` paths. Apps extend it via `presets`:

```js
// apps/app/tailwind.config.cjs
const uiThemePreset = require('@rates/ui-theme/tailwind.config.cjs');

module.exports = {
  presets: [uiThemePreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/**/*.{ts,tsx,js,jsx}',
  ],
};
```

### 2. CSS Import Pattern

Each app imports the shared styles in their `index.css`:

```css
/* apps/app/src/index.css */
@import '@rates/ui-theme/styles.css';

/* Legacy styles can coexist below */
```

### 3. PostCSS Pipeline

Vite automatically processes CSS through PostCSS. The root `postcss.config.cjs` is shared:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Each app's `postcss.config.cjs` simply re-exports the root config for explicit resolution.

## Design System Tokens

### Colors

- **Primary**: Purple/indigo gradient (`primary-500: #6366f1`)
- **Accent**: Cyan/teal (`accent-500: #06b6d4`)
- **Semantic**: Success, warning, danger
- **Neutral**: Gray scale (`neutral-50` to `neutral-900`)
- **Background/Surface**: Dark theme glassmorphism (`background: #020617`, `surface: rgba(15, 23, 42, 0.85)`)

### Typography

- **Font families**: `sans` (Inter + system stack), `mono` (monospace stack)
- **Font sizes**: `xs` through `4xl` with line heights

### Spacing

- Standard Tailwind spacing scale (`0` through `24`)

### Border Radius

- `sm`, `DEFAULT`, `md`, `lg`, `xl`, `2xl`, `full`

### Shadows

- `soft`: Glassmorphism shadow
- `inset`: Inset border effect
- `focus`: Focus ring styles

### Animations

- `fadeIn`, `slideUp`, `slideDown`
- `spin`, `pulse`
- `success-pulse`, `gradient-shift`

## Shared Component Classes

The `styles.css` file includes pre-built component classes:

- **`.ds-card`**: Glassmorphism card
- **`.glass-panel`**: Glass panel with backdrop blur
- **`.ds-button`**: Primary button
- **`.ds-button-secondary`**: Secondary button
- **`.ds-input`**: Input field
- **`.ds-select`**: Select dropdown
- **`.ds-label`**: Form label
- **`.ds-field`**: Form field wrapper
- **`.status-badge-*`**: Status badges (success, warning, danger, info)
- **`.ds-error`**: Error message
- **`.ds-success`**: Success message
- **`.modal-overlay`**: Modal overlay
- **`.modal-content`**: Modal content container
- **`.custom-scrollbar`**: Custom scrollbar styling

## Migration Strategy

### Phase 1: Setup (✅ Complete)

- [x] Install Tailwind dependencies
- [x] Create `packages/ui-theme` package
- [x] Create shared Tailwind preset
- [x] Create shared styles.css
- [x] Create app-level configs
- [x] Update app CSS imports

### Phase 2: Gradual Migration

1. **Start with easy components** (per CSS_AUDIT.md):
   - `PublicLayout.css` → Tailwind classes
   - `Filters.css` → Tailwind classes
   - `CreateAccountForm.css` → Tailwind classes
   - `LogPaymentModal.css` → Tailwind classes

2. **Migrate medium complexity**:
   - `Modal.css` → Tailwind + component classes
   - `SearchBar.css` → Tailwind utilities
   - `AccountDetail.css` → Tailwind classes
   - `NewAccountWizard.css` → Tailwind classes

3. **Tackle complex files**:
   - `Dashboard.css` → Split into components, migrate to Tailwind
   - `PrivateLayout.css` → Migrate layout and background

### Phase 3: Cleanup

- Remove legacy CSS files after migration
- Update component imports
- Remove unused CSS classes

## Usage Examples

### Using Tailwind Classes

```tsx
// Before (CSS)
<div className="account-card">...</div>

// After (Tailwind)
<div className="glass-panel p-6 rounded-lg">...</div>
```

### Using Component Classes

```tsx
// Using shared component classes
<button className="ds-button">Submit</button>
<input className="ds-input" type="text" />
<div className="ds-card">Card content</div>
```

### Using Design Tokens (TypeScript)

```tsx
import { colors, spacing } from '@rates/ui-theme/tokens';

const chartColor = colors.primary[500];
const padding = spacing[4];
```

## Parallel Builds

Each app can build independently:

```bash
# Build main app
pnpm --filter app build

# Build auth app
pnpm --filter auth-app build

# Both can run in parallel without conflicts
```

## Troubleshooting

### CSS Not Loading

1. Ensure `@rates/ui-theme` is installed: `pnpm install`
2. Check that `index.css` imports `@rates/ui-theme/styles.css`
3. Verify PostCSS config is present
4. Restart Vite dev server

### Tailwind Classes Not Working

1. Check `content` paths in `tailwind.config.cjs` include your files
2. Ensure file extensions match (`tsx`, `jsx`, etc.)
3. Verify Tailwind preset is loaded correctly

### Design Tokens Not Found

1. Ensure `@rates/ui-theme` is in app's `package.json` dependencies
2. Check import path: `@rates/ui-theme/tokens`
3. Run `pnpm install` to link workspace packages

## Next Steps

1. **Install dependencies** (requires network access):

   ```bash
   pnpm add -D -w tailwindcss postcss autoprefixer
   pnpm install
   ```

2. **Test the setup**:

   ```bash
   pnpm --filter app dev
   ```

   Verify Tailwind classes work in the browser.

3. **Start migrating components**:
   - Begin with easy files (see Migration Strategy)
   - Use Tailwind classes alongside existing CSS
   - Gradually remove legacy CSS

4. **Customize design tokens**:
   - Update `packages/ui-theme/tailwind.config.cjs` as needed
   - All apps will pick up changes automatically

## References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Presets](https://tailwindcss.com/docs/presets)
- [PostCSS Configuration](https://tailwindcss.com/docs/using-with-preprocessors)
- Project CSS Audit: `docs/CSS_AUDIT.md`
