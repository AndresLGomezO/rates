/** @type {import('tailwindcss').Config} */
/**
 * Tailwind CSS Configuration - Faithful CSS Migration
 * 
 * This configuration maps existing CSS values from the codebase audit (CSS_AUDIT.md)
 * to Tailwind theme tokens. All values are derived from actual CSS files to ensure
 * design consistency during migration.
 * 
 * Source files analyzed:
 * - apps/app/src/pages/Dashboard.css (~1,430 lines)
 * - apps/app/src/components/PrivateLayout.css (~580 lines)
 * - apps/app/src/components/Modal.css, SearchBar.css, Filters.css, etc.
 * - apps/auth-app/src/index.css (~190 lines)
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        // ============================================================================
        // PRIMARY / BRAND COLORS
        // ============================================================================
        // Deep navy blue palette - bank-inspired, sophisticated, trustworthy
        // Replaces purple/indigo with elegant navy tones
        primary: {
          50: '#e8edf5',   // Lightest navy tint
          100: '#d1dceb',
          200: '#a3b9d7',
          300: '#7596c3',
          400: '#4773af',
          500: '#1e3a8a',   // Main primary: Deep navy blue (bank-inspired)
          600: '#1e40af',   // Rich navy
          700: '#1e3a8a',   // Darker navy
          800: '#172554',   // Deep navy
          900: '#0f172a',   // Darkest navy (almost black)
          // Gradient colors - sophisticated navy to slate transitions
          gradient: {
            start: '#1e40af',    // Rich navy start
            end: '#334155',      // Slate end
            navy: '#1e3a8a',     // Deep navy
            slate: '#475569',    // Medium slate
            dark: '#0f172a',     // Darkest
            blue: '#2563eb',      // Bright blue accent
          },
        },

        // ============================================================================
        // ACCENT COLORS (Gold/Amber - Premium, Wealth)
        // ============================================================================
        // Sophisticated gold/amber palette replacing cyan/teal
        // Used for highlights, premium features, auth-app primary
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',   // Main accent: Rich gold (premium feel)
          600: '#b45309',   // Darker gold
          700: '#92400e',   // Deep amber
          800: '#78350f',   // Dark amber
          900: '#451a03',   // Darkest amber
          // Auth-app specific - maintaining some blue for auth flows
          'auth-blue': '#1e40af',  // Navy blue for auth
          'auth-cyan': '#3b82f6',  // Bright blue for focus states
        },

        // ============================================================================
        // SEMANTIC COLORS
        // ============================================================================
        
        // Success - Deep emerald/teal palette (professional, sophisticated)
        // Found in: Dashboard.css .metric-card.income, NewAccountWizard.css success states
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',   // Professional emerald green
          600: '#059669',
          700: '#047857',
          800: '#065f46',   // Deep emerald
          900: '#064e3b',
          // Specific values from CSS - updated to match new palette
          'css': '#10b981',              // Professional emerald
          'css-rgba': 'rgba(16, 185, 129, 0.9)',  // Updated emerald
          'light': '#d1fae5',            // Light emerald background
        },

        // Warning - Amber/Gold palette (sophisticated, premium)
        // Found in: Dashboard.css .metric-card.pending, .metric-change.warning
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',   // Rich amber (matches accent)
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
          // Specific values from CSS - updated to sophisticated amber
          'css': '#d97706',              // Rich amber
          'css-rgba': 'rgba(217, 119, 6, 0.2)',   // Amber with opacity
          'yellow': '#fbbf24',           // Bright amber
          'yellow-rgba': 'rgba(251, 191, 36, 1)', // Bright amber solid
        },

        // Danger - Red palette
        // Found in: Dashboard.css .metric-card.outcome, NewAccountWizard.css error states
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',   // From auth-app/src/index.css .error text
          800: '#991b1b',
          900: '#7f1d1d',
          // Specific values from CSS
          'css': '#ff6b6b',              // From NewAccountWizard.css, CSS_AUDIT.md
          'css-rgba': 'rgba(255, 107, 107, 0.15)', // From NewAccountWizard.css
          'f44336': '#f44336',           // From formatters.ts, CSS_AUDIT.md
          'light': '#fef2f2',             // From auth-app/src/index.css .error background
          'border': '#fecdd3',            // From auth-app/src/index.css .error border
          'text-light': '#ffb3b3',        // From NewAccountWizard.css
        },

        // Info - Deep blue palette (trust, stability)
        // Found in: Dashboard.css metric cards, formatters.ts
        info: {
          500: '#2563eb',   // Bright blue (trustworthy)
          600: '#1e40af',   // Deep navy blue
          700: '#1e3a8a',   // Darker navy
          'css-rgba': 'rgba(37, 99, 235, 1)', // Updated blue
        },

        // ============================================================================
        // NEUTRAL COLORS
        // ============================================================================
        // Sophisticated slate/gray scale - darker, more refined
        // Found throughout all CSS files
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          // Auth-app specific neutrals (light theme - kept lighter for contrast)
          'auth-text': '#0f172a',        // Dark text
          'auth-text-muted': '#475569',  // Muted slate
          'auth-border': '#e2e8f0',      // Light border
          'auth-bg': '#f8fafc',          // Light background
          'auth-surface': '#ffffff',      // White surface
          'auth-gray': '#64748b',        // Medium slate
          'auth-gray-dark': '#1e293b',    // Dark slate
          'auth-gray-light': '#e2e8f0',   // Light slate
        },

        // ============================================================================
        // BACKGROUND & SURFACE COLORS (Glassmorphism)
        // ============================================================================
        // Darker, sophisticated backgrounds - bank-inspired charcoal and navy
        // Found in: PrivateLayout.css, Dashboard.css, Modal.css
        background: '#0a0e1a',           // Base dark background (darker charcoal with navy tint)
        surface: 'rgba(15, 23, 42, 0.9)', // Main glass surface (darker, more opaque)
        // White opacity variants for glassmorphism layers (slightly reduced for darker feel)
        'surface-light': 'rgba(255, 255, 255, 0.04)',
        'surface-medium': 'rgba(255, 255, 255, 0.08)',
        'surface-heavy': 'rgba(255, 255, 255, 0.12)',
        // Note: Components use arbitrary opacity values (bg-white/10, bg-white/15, etc.)
        // instead of theme values, so glass-* variants are not needed
        // Black opacity variants (enhanced for darker theme)
        'black-10': 'rgba(0, 0, 0, 0.15)',
        'black-18': 'rgba(0, 0, 0, 0.25)',
        'black-20': 'rgba(0, 0, 0, 0.3)',
        'black-25': 'rgba(0, 0, 0, 0.35)',
        'black-60': 'rgba(0, 0, 0, 0.7)',
        // Note: Legacy app colors removed - not used in codebase
        // Muted gray (updated to slate)
        'muted': '#64748b',              // Medium slate
        'muted-rgba': 'rgba(100, 116, 139, 1)', // Medium slate solid
      },

      // ============================================================================
      // TYPOGRAPHY
      // ============================================================================
      fontFamily: {
        // Sans-serif stack - matches existing CSS
        // From: apps/app/src/index.css, apps/auth-app/src/index.css
        sans: [
          'Inter',                        // Primary font
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Avenir',                       // From apps/app/src/index.css
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        // Monospace stack - matches existing CSS
        // From: apps/auth-app/src/index.css .token-box
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },

      fontSize: {
        // Base sizes with line heights - standard Tailwind sizes
        // Components use standard Tailwind sizes (text-xs, text-sm, text-base, etc.)
        // or arbitrary values (text-[0.95rem]) instead of custom variants
        'xs': ['0.65rem', { lineHeight: '1rem' }],      // Custom: From Dashboard.css (0.65rem used)
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],     // Standard body text
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      letterSpacing: {
        // Negative tracking for large headings
        'tightest': '-1px',              // From Dashboard.css .summary-value
        'tighter': '-0.5px',             // From Dashboard.css .dashboard-header h2, .metric-value
        'tight': '-0.3px',               // From Dashboard.css .account-row-main, NewAccountWizard.css
        'tight-sm': '-0.2px',           // From NewAccountWizard.css
        // Positive tracking for labels/uppercase
        'wide': '0.5px',                 // From Dashboard.css .summary-card h3, .metric-label
        'normal': '0',                   // Default
      },

      lineHeight: {
        // Custom line heights from CSS
        'none': '1',
        'tight': '1.2',                  // From Dashboard.css .metric-value, .top-accounts-compact-value
        'snug': '1.3',                   // From NewAccountWizard.css
        'normal': '1.5',                 // Standard body text
        'relaxed': '1.35',               // From NewAccountWizard.css
      },

      // ============================================================================
      // SPACING SCALE
      // ============================================================================
      // Mapped from CSS margin/padding/gap values
      // Values normalized to rem-based scale matching Tailwind defaults + custom additions
      spacing: {
        // Standard Tailwind scale (0 - 24)
        0: '0px',
        0.5: '0.125rem',   // 2px
        1: '0.25rem',      // 4px
        1.5: '0.375rem',   // 6px
        2: '0.5rem',       // 8px
        2.5: '0.625rem',   // 10px
        3: '0.75rem',     // 12px
        3.5: '0.875rem',   // 14px
        4: '1rem',        // 16px
        5: '1.25rem',     // 20px
        6: '1.5rem',      // 24px
        7: '1.75rem',     // 28px
        8: '2rem',        // 32px
        10: '2.5rem',     // 40px
        12: '3rem',       // 48px
        16: '4rem',       // 64px
        20: '5rem',       // 80px
        24: '6rem',       // 96px
        
        // Note: Components use arbitrary values (e.g., gap-[0.4rem]) instead of custom spacing entries
        // Custom fractional values removed - not used in codebase
        // Invalid px-* entries removed - Tailwind spacing config uses numeric keys only
      },

      // ============================================================================
      // BORDER RADIUS
      // ============================================================================
      borderRadius: {
        none: '0',
        sm: '0.25rem',      // 4px
        DEFAULT: '0.5rem',  // 8px - Standard border radius
        md: '0.75rem',      // 12px
        lg: '1rem',         // 16px - From Dashboard.css .account-row, .summary-card
        xl: '1.5rem',       // 24px - From Dashboard.css .btn-secondary border-radius: 12px (but also 16px used)
        '2xl': '2rem',      // 32px
        full: '9999px',     // Fully rounded - From auth-app .badge
        
        // Specific values from CSS
        '8': '8px',         // From auth-app .input, .select border-radius
        '10': '10px',       // From auth-app .button, .error, .success border-radius
        '12': '12px',       // From Dashboard.css .btn-secondary, .btn-add-new
        '16': '16px',       // From Dashboard.css .account-row, auth-app .card
      },

      // ============================================================================
      // BOX SHADOWS
      // ============================================================================
      boxShadow: {
        // Glassmorphism shadows - darker, more sophisticated
        'soft': '0 10px 40px rgba(10, 14, 26, 0.5)',           // Darker background shadow
        'soft-lg': '0 15px 50px rgba(10, 14, 26, 0.6)',         // Larger dark shadow
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.2)',             // Medium shadow
        'soft-sm': '0 15px 40px rgba(10, 14, 26, 0.15)',        // Subtle shadow
        
        // Glassmorphism with color tints - navy and gold
        'glass-navy': '0 4px 12px rgba(30, 58, 138, 0.4)',     // Navy shadow
        'glass-navy-lg': '0 6px 20px rgba(30, 64, 175, 0.45)', // Large navy shadow
        'glass-navy-xl': '0 6px 16px rgba(30, 58, 138, 0.5)',  // Extra large navy shadow
        'glass-gold': '0 10px 30px rgba(217, 119, 6, 0.35)',   // Gold accent shadow
        
        // Inset shadows for depth
        'inset': 'inset 0 0 0 1px rgba(71, 85, 105, 0.4)',   // Darker slate inset
        'inset-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15)', // Softer white inset for darker theme
        
        // Focus rings - navy and gold
        'focus': '0 0 0 1px rgba(30, 58, 138, 0.7), 0 0 0 4px rgba(30, 58, 138, 0.3)',
        'focus-accent': '0 0 0 1px rgba(217, 119, 6, 0.7), 0 0 0 4px rgba(217, 119, 6, 0.3)',
        'focus-blue': '0 0 0 2px #2563eb',                     // Bright blue focus
        
        // Complex glassmorphism shadows - darker, sophisticated
        'glass-complex': '0 8px 32px 0 rgba(10, 14, 26, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)', // Darker sidebar shadow
        'glass-complex-lg': '0 12px 40px 0 rgba(10, 14, 26, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)', // Darker card hover shadow
      },

      // ============================================================================
      // BREAKPOINTS / SCREENS
      // ============================================================================
      // Mapped from media queries in CSS files
      screens: {
        // Custom breakpoints from CSS usage
        'xs': '480px',      // From Dashboard.css, PrivateLayout.css, SearchBar.css, Filters.css
        'sm': '640px',      // Tailwind default
        'md': '768px',      // Widely used: Dashboard.css, AccountDetail.css, CreateAccountForm.css, PrivateLayout.css, SearchBar.css, Filters.css, Modal.css
        'md-sm': '720px',   // From NewAccountWizard.css
        'lg': '1024px',     // From Dashboard.css .accounts-summary
        'xl': '1280px',     // From Dashboard.css charts grid (max-width: 1280px)
        '2xl': '1536px',    // Tailwind default
        
        // Content-based breakpoints (preserved for specific layouts)
        'dashboard-lg': '1280px',  // Dashboard charts grid breakpoint
        'dashboard-md': '1024px',  // Dashboard rows and account grids
      },

      // ============================================================================
      // Z-INDEX SCALE
      // ============================================================================
      zIndex: {
        'overlay': '10',      // From Dashboard.css .metric-split content, gradient overlays
        'dropdown': '50',     // Standard dropdown
        'sidebar': '100',     // From PrivateLayout.css .sidebar, SearchBar.css search bar container
        'searchbar': '100',    // From SearchBar.css
        'modal': '9999',      // From Modal.css overlay (top-most)
      },

      // ============================================================================
      // BACKDROP BLUR
      // ============================================================================
      backdropBlur: {
        'xs': '2px',
        'sm': '10px',         // From Dashboard.css .btn-secondary, .btn-add-new
        'DEFAULT': '20px',    // From Dashboard.css .account-row, .metric-card, PrivateLayout.css .sidebar
        'lg': '20px',
        'xl': '20px',
      },

      // ============================================================================
      // ANIMATIONS & KEYFRAMES
      // ============================================================================
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-out',              // From Modal.css overlay
        'fadeIn-slow': 'fadeInTransform 0.6s ease-out', // From Dashboard.css .dashboard (with transform)
        'slideUp': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // From Modal.css modal content
        'slideDown': 'slideDown 0.3s ease-out',       // From PrivateLayout.css submenu
        'spin': 'spin 1s linear infinite',             // From Dashboard.css, AccountDetail.css loading spinner
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', // From Dashboard.css overdue values
        'success-pulse': 'successPulse 0.6s ease-out', // From NewAccountWizard.css success icon
        'gradient-shift': 'gradientShift 15s ease infinite', // From PrivateLayout.css background animation
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Extended fadeIn with transform (from Dashboard.css)
        fadeInTransform: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        successPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },

      // ============================================================================
      // MAX WIDTHS (Layout Constraints)
      // ============================================================================
      maxWidth: {
        // Layout widths from CSS
        'layout-sm': '400px',   // From CSS_AUDIT.md
        'layout-md': '800px',   // From CSS_AUDIT.md
        'layout-lg': '960px',   // From auth-app .card, CSS_AUDIT.md
        'layout-xl': '1400px',  // From CSS_AUDIT.md
      },
    },
  },
  // Safelist for dynamic classes that might be purged
  // These classes are used with template literals and conditional rendering
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
  ],
  plugins: [],
};
