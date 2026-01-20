# Tailwind CSS Color Mapping Reference

This document provides a reference for how existing CSS colors map to Tailwind theme tokens.

## Color Mapping Strategy

Colors are organized into semantic groups:

1. **Primary/Brand** - Purple/indigo gradients for main UI elements
2. **Accent** - Cyan/teal for highlights and info states
3. **Semantic** - Success, warning, danger, info
4. **Neutral** - Grays for text, borders, surfaces
5. **Background/Surface** - Glassmorphism backgrounds with opacity

## Primary Colors

### Primary Palette

- `primary-500`: `#6366f1` - Main primary color (indigo-500)
- `primary-600`: `#4f46e5` - Darker variant
- `primary-gradient-start`: `#667eea` - Gradient start (from `.btn-add-new`)
- `primary-gradient-end`: `#764ba2` - Gradient end (from `.btn-add-new`)

### Primary Gradient Colors

Used in glassmorphism gradients:

- `primary-gradient-pink`: `#f093fb` - From PrivateLayout.css background
- `primary-gradient-cyan`: `#4facfe` - From PrivateLayout.css background
- `primary-gradient-teal`: `#00f2fe` - From PrivateLayout.css background
- `primary-gradient-purple`: `#8b5cf6` - From Dashboard.css `.account-row-log-payment`

## Accent Colors

- `accent-500`: `#06b6d4` - Main accent (cyan-500)
- `accent-600`: `#0891b2` - Darker variant
- `accent-auth-blue`: `#0369a1` - Auth app badge color
- `accent-auth-cyan`: `#38bdf8` - Auth app input focus

## Semantic Colors

### Success (Green)

- `success-500`: `#22c55e` - Standard Tailwind success
- `success-css`: `#4caf50` - From Dashboard.css `.metric-change.positive`
- `success-light`: `#ecfdf3` - From auth-app `.success` background

### Warning (Orange/Yellow)

- `warning-500`: `#f59e0b` - Standard Tailwind warning
- `warning-css`: `#ff9800` - From Dashboard.css `.metric-change.warning`
- `warning-yellow`: `#ffd93d` - Alternative yellow

### Danger (Red)

- `danger-500`: `#ef4444` - Standard Tailwind danger
- `danger-css`: `#ff6b6b` - From NewAccountWizard.css
- `danger-f44336`: `#f44336` - From formatters.ts
- `danger-light`: `#fef2f2` - From auth-app `.error` background
- `danger-border`: `#fecdd3` - From auth-app `.error` border

### Info (Blue)

- `info-500`: `#2196f3` - From formatters.ts account status
- `info-600`: `#667eea` - Used as metric primary

## Neutral Colors

### Standard Grays

- `neutral-50` through `neutral-900` - Standard Tailwind gray scale

### Auth App Specific (Light Theme)

- `neutral-auth-text`: `#0f172a` - Main text color
- `neutral-auth-text-muted`: `#475569` - Muted text
- `neutral-auth-border`: `#e2e8f0` - Input borders
- `neutral-auth-bg`: `#f8fafc` - Background
- `neutral-auth-surface`: `#ffffff` - Card/surface background

## Glassmorphism Opacity Variants

White opacity variants for glassmorphism effects:

- `glass-03` through `glass-95` - Various opacity levels (0.03 to 0.95)
- Common values:
  - `glass-08`: `rgba(255, 255, 255, 0.08)` - Light glass surface
  - `glass-12`: `rgba(255, 255, 255, 0.12)` - Medium glass surface
  - `glass-15`: `rgba(255, 255, 255, 0.15)` - Heavy glass surface
  - `glass-25`: `rgba(255, 255, 255, 0.25)` - Border opacity

Black opacity variants:

- `black-10`, `black-18`, `black-20`, `black-25`, `black-60`

## Background & Surface

- `background`: `#020617` - Base dark background
- `surface`: `rgba(15, 23, 42, 0.85)` - Main glass surface
- `surface-light`: `rgba(255, 255, 255, 0.05)`
- `surface-medium`: `rgba(255, 255, 255, 0.1)`
- `surface-heavy`: `rgba(255, 255, 255, 0.15)`

## Usage Examples

### In Tailwind Classes

```tsx
// Primary button
<button className="bg-primary-500 hover:bg-primary-600">Click</button>

// Gradient button
<div className="bg-gradient-to-r from-primary-gradient-start to-primary-gradient-end">Gradient</div>

// Glassmorphism card
<div className="bg-glass-12 backdrop-blur-xl border border-glass-25">Card</div>

// Success badge
<span className="bg-success-light text-success-800 border border-success-200">Success</span>
```

### In TypeScript/JavaScript

```tsx
import { colors } from '@rates/ui-theme/tokens';

const chartColor = colors.primary[500];
const successColor = colors.success.css;
```

## Migration Notes

When migrating CSS to Tailwind:

1. **Replace hex colors** with Tailwind classes:
   - `color: #6366f1` → `text-primary-500`
   - `background: #667eea` → `bg-primary-gradient-start`

2. **Replace rgba colors** with glassmorphism utilities:
   - `background: rgba(255, 255, 255, 0.12)` → `bg-glass-12`
   - `border: rgba(255, 255, 255, 0.25)` → `border-glass-25`

3. **Use semantic names** for maintainability:
   - `color: #4caf50` → `text-success-css` (or `text-success-500` if standardizing)

4. **Gradients** can use Tailwind gradient utilities:
   - `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
   - → `bg-gradient-to-br from-primary-gradient-start to-primary-gradient-end`
