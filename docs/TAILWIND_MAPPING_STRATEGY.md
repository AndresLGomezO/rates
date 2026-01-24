# Tailwind CSS Mapping Strategy

This document explains how existing CSS values were mapped to Tailwind theme tokens during the migration.

## Overview

The Tailwind configuration (`packages/ui-theme/tailwind.config.cjs`) was created by analyzing all CSS files in the codebase and mapping their values to Tailwind theme tokens. This ensures **design fidelity** during migration - no visual changes, only implementation changes.

## Mapping Methodology

### 1. Color Palette Mapping

**Process:**

1. Extracted all unique color values from CSS files
2. Grouped colors by semantic meaning (primary, accent, success, etc.)
3. Created Tailwind color scales where patterns existed
4. Preserved exact hex values for one-off colors

**Key Decisions:**

- **Primary colors**: Mapped purple/indigo gradients to `primary-*` scale
- **Gradient colors**: Created `primary-gradient-*` tokens for gradient stops
- **Glassmorphism**: Created `glass-*` opacity variants for white/black rgba values
- **Semantic colors**: Mapped success/warning/danger to standard scales + CSS-specific values
- **Auth app colors**: Created `neutral-auth-*` tokens for light theme

**Example Mapping:**

```css
/* Before (CSS) */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* After (Tailwind) */
className="bg-gradient-to-br from-primary-gradient-start to-primary-gradient-end"
```

### 2. Typography Scale Mapping

**Process:**

1. Collected all `font-size` values from CSS
2. Grouped by usage patterns (headings, body, labels, small text)
3. Mapped to Tailwind `fontSize` scale with line heights
4. Created custom sizes for fractional rem values

**Key Decisions:**

- **Base scale**: Used Tailwind defaults (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
- **Custom sizes**: Added fractional sizes (`sm-xs`, `sm-md`, `xl-sm`, etc.) for exact matches
- **Line heights**: Preserved from CSS or inferred from usage
- **Letter spacing**: Mapped negative tracking (`tight`, `tighter`, `tightest`) and positive (`wide`)

**Example Mapping:**

```css
/* Before (CSS) */
font-size: 0.95rem;
letter-spacing: 0.5px;

/* After (Tailwind) */
className="text-sm-2xl tracking-wide"
```

### 3. Spacing Scale Mapping

**Process:**

1. Collected all `margin`, `padding`, and `gap` values
2. Normalized to rem-based scale
3. Mapped to Tailwind spacing scale
4. Added custom fractional values where needed

**Key Decisions:**

- **Standard scale**: Used Tailwind defaults (0, 0.5, 1, 1.5, 2, etc.)
- **Fractional values**: Added custom spacing tokens (`0.35`, `0.4`, `0.6`, `0.85`, `0.9`, `0.95`) for exact matches
- **Pixel values**: Converted auth-app pixel values to rem equivalents

**Example Mapping:**

```css
/* Before (CSS) */
gap: 0.9rem;
padding: 24px;

/* After (Tailwind) */
className="gap-0.9 p-px-24"
```

### 4. Breakpoint Mapping

**Process:**

1. Extracted all media query breakpoints from CSS
2. Mapped to Tailwind `screens` configuration
3. Preserved content-based breakpoints (not just device-based)

**Key Decisions:**

- **Standard breakpoints**: Used Tailwind defaults (sm, md, lg, xl, 2xl)
- **Custom breakpoints**: Added `xs` (480px) and `md-sm` (720px) for specific layouts
- **Content-based**: Preserved `dashboard-lg` and `dashboard-md` for layout-specific needs

**Example Mapping:**

```css
/* Before (CSS) */
@media (max-width: 768px) { ... }

/* After (Tailwind) */
className="md:block"
```

### 5. Border Radius Mapping

**Process:**

1. Collected all `border-radius` values
2. Mapped to Tailwind `borderRadius` scale
3. Preserved pixel values where rem conversion would lose precision

**Key Decisions:**

- **Standard scale**: Used Tailwind defaults (sm, md, lg, xl, 2xl, full)
- **Pixel values**: Added `8`, `10`, `12`, `16` for exact pixel matches from auth-app

**Example Mapping:**

```css
/* Before (CSS) */
border-radius: 12px;

/* After (Tailwind) */
className="rounded-12"
```

### 6. Box Shadow Mapping

**Process:**

1. Collected all `box-shadow` values
2. Created semantic shadow tokens
3. Preserved complex glassmorphism shadows

**Key Decisions:**

- **Glassmorphism shadows**: Created `soft`, `soft-lg`, `glass-purple`, etc.
- **Complex shadows**: Preserved multi-layer shadows as single tokens
- **Focus rings**: Created `focus` and `focus-accent` for accessibility

**Example Mapping:**

```css
/* Before (CSS) */
box-shadow: 0 10px 40px rgba(15, 23, 42, 0.35);

/* After (Tailwind) */
className="shadow-soft"
```

## Design Token Organization

### Centralized Package Structure

```
packages/ui-theme/
├── tailwind.config.cjs    # Tailwind theme configuration (preset)
├── styles.css             # Tailwind directives + component classes
├── tokens.ts              # TypeScript exports for programmatic access
└── index.cjs              # Re-exports
```

### How Apps Consume

1. **Extend preset** in app-level `tailwind.config.cjs`:

   ```js
   const uiThemePreset = require('@rates/ui-theme/tailwind.config.cjs');
   module.exports = { presets: [uiThemePreset] };
   ```

2. **Import styles** in app `index.css`:

   ```css
   @import '@rates/ui-theme/styles.css';
   ```

3. **Use tokens** in TypeScript (optional):
   ```ts
   import { colors, spacing } from '@rates/ui-theme/tokens';
   ```

## Migration Guidelines

### When Migrating CSS to Tailwind

1. **Start with easy files** (per CSS_AUDIT.md):
   - `PublicLayout.css` → Use Tailwind utilities
   - `Filters.css` → Use Tailwind utilities
   - `CreateAccountForm.css` → Use Tailwind utilities

2. **Replace colors**:
   - Hex values → Tailwind color classes
   - rgba values → Glassmorphism utilities (`glass-*`)

3. **Replace spacing**:
   - `margin`, `padding`, `gap` → Tailwind spacing utilities
   - Use custom fractional values when exact match needed

4. **Replace typography**:
   - `font-size` → Tailwind `text-*` classes
   - `letter-spacing` → Tailwind `tracking-*` classes
   - `line-height` → Implicit in fontSize config or use `leading-*`

5. **Replace breakpoints**:
   - Media queries → Tailwind responsive prefixes (`sm:`, `md:`, etc.)

6. **Replace shadows**:
   - `box-shadow` → Tailwind `shadow-*` classes

### Example Migration

**Before (CSS):**

```css
.account-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.35);
}

.account-card h3 {
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
}
```

**After (Tailwind):**

```tsx
<div className="bg-glass-12 border border-glass-15 rounded-lg p-6 shadow-soft">
  <h3 className="text-sm-2xl tracking-wide mb-3">Account</h3>
</div>
```

## Benefits of This Approach

1. **Design Fidelity**: Exact visual match during migration
2. **Single Source of Truth**: All design tokens in one place
3. **Type Safety**: TypeScript tokens for programmatic access
4. **Maintainability**: Change once, update everywhere
5. **Scalability**: Easy to add new tokens as needed
6. **Consistency**: Prevents design drift across apps

## Next Steps

1. **Test the configuration**: Verify Tailwind classes work correctly
2. **Start migration**: Begin with easy files (see CSS_AUDIT.md)
3. **Iterate**: Update tokens as patterns emerge during migration
4. **Document**: Add usage examples as you migrate components

## References

- `docs/CSS_AUDIT.md` - Original CSS analysis
- `docs/TAILWIND_SETUP.md` - Setup instructions
- `docs/TAILWIND_COLOR_MAPPING.md` - Color reference guide
- `packages/ui-theme/tailwind.config.cjs` - Complete configuration
