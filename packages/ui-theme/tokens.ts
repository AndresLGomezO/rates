/**
 * Design Tokens - TypeScript Export
 *
 * Exported design tokens for programmatic access (e.g., charts, inline styles, calculations).
 * These values match the Tailwind config in tailwind.config.cjs.
 *
 * Usage:
 *   import { colors, spacing, breakpoints } from '@rates/ui-theme/tokens';
 */

export const colors = {
  primary: {
    500: '#6366f1',
    600: '#4f46e5',
    gradient: {
      start: '#667eea',
      end: '#764ba2',
      pink: '#f093fb',
      cyan: '#4facfe',
      teal: '#00f2fe',
      purple: '#8b5cf6',
    },
  },
  accent: {
    500: '#06b6d4',
    600: '#0891b2',
    'auth-blue': '#0369a1',
    'auth-cyan': '#38bdf8',
  },
  success: {
    500: '#22c55e',
    css: '#4caf50',
    light: '#ecfdf3',
  },
  warning: {
    500: '#f59e0b',
    css: '#ff9800',
    yellow: '#ffd93d',
  },
  danger: {
    500: '#ef4444',
    css: '#ff6b6b',
    f44336: '#f44336',
    light: '#fef2f2',
    border: '#fecdd3',
  },
  info: {
    500: '#2196f3',
    600: '#667eea',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    'auth-text': '#0f172a',
    'auth-text-muted': '#475569',
    'auth-border': '#e2e8f0',
    'auth-bg': '#f8fafc',
    'auth-surface': '#ffffff',
  },
  background: '#020617',
  surface: 'rgba(15, 23, 42, 0.85)',
} as const;

export const spacing = {
  0: '0px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  // Custom fractional values
  '0.35': '0.35rem',
  '0.4': '0.4rem',
  '0.45': '0.45rem',
  '0.6': '0.6rem',
  '0.65': '0.65rem',
  '0.7': '0.7rem',
  '0.8': '0.8rem',
  '0.85': '0.85rem',
  '0.9': '0.9rem',
  '0.95': '0.95rem',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  DEFAULT: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
  '8': '8px',
  '10': '10px',
  '12': '12px',
  '16': '16px',
} as const;

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  'md-sm': '720px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  'dashboard-lg': '1280px',
  'dashboard-md': '1024px',
} as const;

export const zIndex = {
  overlay: 10,
  dropdown: 50,
  sidebar: 100,
  searchbar: 100,
  modal: 9999,
} as const;

export const fontSize = {
  xs: '0.65rem',
  'xs-sm': '0.7rem',
  'xs-md': '0.75rem',
  'xs-lg': '0.8rem',
  'sm-xs': '0.85rem',
  sm: '0.875rem',
  'sm-md': '0.88rem',
  'sm-lg': '0.9rem',
  'sm-xl': '0.92rem',
  'sm-2xl': '0.95rem',
  base: '1rem',
  'base-sm': '1.05rem',
  'base-lg': '1.1rem',
  'base-xl': '1.2rem',
  lg: '1.125rem',
  xl: '1.25rem',
  'xl-sm': '1.3rem',
  'xl-md': '1.4rem',
  '2xl': '1.5rem',
  '2xl-sm': '1.75rem',
  '3xl': '1.875rem',
  '3xl-sm': '2rem',
  '4xl': '2.25rem',
  '4xl-sm': '2.5rem',
} as const;

export const letterSpacing = {
  tightest: '-1px',
  tighter: '-0.5px',
  tight: '-0.3px',
  'tight-sm': '-0.2px',
  normal: '0',
  wide: '0.5px',
} as const;
