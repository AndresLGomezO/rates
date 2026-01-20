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
        // Core purple/indigo gradient palette from glassmorphism design
        // Found in: Dashboard.css, PrivateLayout.css, NewAccountWizard.css
        primary: {
          50: '#f5f7ff',   // Lightest purple tint
          100: '#e6ecff',
          200: '#c4d0ff',
          300: '#9db1ff',
          400: '#6a84ff',
          500: '#6366f1',   // Main primary: #6366f1 (indigo-500)
          600: '#4f46e5',   // Darker indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          // Gradient colors used in buttons and backgrounds
          gradient: {
            start: '#667eea',    // From Dashboard.css .btn-add-new, .account-row::before
            end: '#764ba2',      // From Dashboard.css .btn-add-new
            pink: '#f093fb',     // From PrivateLayout.css gradient, Dashboard.css
            cyan: '#4facfe',     // From PrivateLayout.css gradient, Dashboard.css
            teal: '#00f2fe',     // From PrivateLayout.css gradient
            purple: '#8b5cf6',   // From Dashboard.css .account-row-log-payment
            'purple-dark': '#7c3aed',  // From Dashboard.css hover state
            'purple-light': '#a855f7', // From Dashboard.css hover state
            'indigo-alt': '#7a8ef0',   // From NewAccountWizard.css
            'purple-alt': '#8559b8',   // From NewAccountWizard.css
          },
        },

        // ============================================================================
        // ACCENT COLORS (Cyan/Teal)
        // ============================================================================
        // Used for highlights, info states, auth-app primary
        // Found in: auth-app/src/index.css, Dashboard.css metric cards
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',   // Main accent: #06b6d4 (auth-app button gradient start)
          600: '#0891b2',   // From auth-app/src/index.css .badge
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          // Auth-app specific
          'auth-blue': '#0369a1',  // From auth-app/src/index.css .badge
          'auth-cyan': '#38bdf8',  // From auth-app/src/index.css input focus
        },

        // ============================================================================
        // SEMANTIC COLORS
        // ============================================================================
        
        // Success - Green palette
        // Found in: Dashboard.css .metric-card.income, NewAccountWizard.css success states
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',   // From auth-app/src/index.css .success border
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',   // Standard success
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',   // From auth-app/src/index.css .success text
          900: '#14532d',
          // Specific values from CSS
          'css': '#4caf50',              // From Dashboard.css .metric-change.positive, formatters.ts
          'css-rgba': 'rgba(46, 204, 113, 0.9)',  // From NewAccountWizard.css
          'light': '#ecfdf3',            // From auth-app/src/index.css .success background
        },

        // Warning - Orange/Yellow palette
        // Found in: Dashboard.css .metric-card.pending, .metric-change.warning
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          // Specific values from CSS
          'css': '#ff9800',              // From Dashboard.css .metric-change.warning, formatters.ts
          'css-rgba': 'rgba(255, 152, 0, 0.2)',   // From Dashboard.css .metric-card.pending
          'yellow': '#ffd93d',           // From CSS_AUDIT.md
          'yellow-rgba': 'rgba(255, 193, 7, 1)', // From CSS_AUDIT.md
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

        // Info - Blue palette
        // Found in: Dashboard.css metric cards, formatters.ts
        info: {
          500: '#2196f3',   // From formatters.ts account status 'paid_off'
          600: '#667eea',   // Used as metric primary in Dashboard.css
          'css-rgba': 'rgba(33, 150, 243, 1)', // From CSS_AUDIT.md
        },

        // ============================================================================
        // NEUTRAL COLORS
        // ============================================================================
        // Gray scale for text, borders, surfaces
        // Found throughout all CSS files
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
          // Auth-app specific neutrals (light theme)
          'auth-text': '#0f172a',        // From auth-app/src/index.css :root
          'auth-text-muted': '#475569',  // From auth-app/src/index.css .muted
          'auth-border': '#e2e8f0',      // From auth-app/src/index.css .input border
          'auth-bg': '#f8fafc',          // From auth-app/src/index.css :root, body gradient
          'auth-surface': '#ffffff',      // From auth-app/src/index.css .card
          'auth-gray': '#666',            // From CSS_AUDIT.md
          'auth-gray-dark': '#1e1e1e',    // From CSS_AUDIT.md
          'auth-gray-light': '#e2e8f0',   // From auth-app/src/index.css
        },

        // ============================================================================
        // BACKGROUND & SURFACE COLORS (Glassmorphism)
        // ============================================================================
        // Dark theme backgrounds with opacity for glassmorphism effect
        // Found in: PrivateLayout.css, Dashboard.css, Modal.css
        background: '#020617',           // Base dark background
        surface: 'rgba(15, 23, 42, 0.85)', // Main glass surface
        // White opacity variants for glassmorphism layers
        'surface-light': 'rgba(255, 255, 255, 0.05)',
        'surface-medium': 'rgba(255, 255, 255, 0.1)',
        'surface-heavy': 'rgba(255, 255, 255, 0.15)',
        // Specific opacity values from CSS (mapped as utilities)
        'glass-03': 'rgba(255, 255, 255, 0.03)',
        'glass-05': 'rgba(255, 255, 255, 0.05)',
        'glass-06': 'rgba(255, 255, 255, 0.06)',
        'glass-08': 'rgba(255, 255, 255, 0.08)',
        'glass-10': 'rgba(255, 255, 255, 0.1)',
        'glass-12': 'rgba(255, 255, 255, 0.12)',
        'glass-14': 'rgba(255, 255, 255, 0.14)',
        'glass-15': 'rgba(255, 255, 255, 0.15)',
        'glass-16': 'rgba(255, 255, 255, 0.16)',
        'glass-18': 'rgba(255, 255, 255, 0.18)',
        'glass-20': 'rgba(255, 255, 255, 0.2)',
        'glass-24': 'rgba(255, 255, 255, 0.24)',
        'glass-25': 'rgba(255, 255, 255, 0.25)',
        'glass-30': 'rgba(255, 255, 255, 0.3)',
        'glass-35': 'rgba(255, 255, 255, 0.35)',
        'glass-40': 'rgba(255, 255, 255, 0.4)',
        'glass-50': 'rgba(255, 255, 255, 0.5)',
        'glass-60': 'rgba(255, 255, 255, 0.6)',
        'glass-70': 'rgba(255, 255, 255, 0.7)',
        'glass-75': 'rgba(255, 255, 255, 0.75)',
        'glass-80': 'rgba(255, 255, 255, 0.8)',
        'glass-85': 'rgba(255, 255, 255, 0.85)',
        'glass-90': 'rgba(255, 255, 255, 0.9)',
        'glass-92': 'rgba(255, 255, 255, 0.92)',
        'glass-95': 'rgba(255, 255, 255, 0.95)',
        // Black opacity variants
        'black-10': 'rgba(0, 0, 0, 0.1)',
        'black-18': 'rgba(0, 0, 0, 0.18)',
        'black-20': 'rgba(0, 0, 0, 0.2)',
        'black-25': 'rgba(0, 0, 0, 0.25)',
        'black-60': 'rgba(0, 0, 0, 0.6)',
        // Legacy app colors
        'app-dark': '#242424',           // From apps/app/src/index.css :root
        'app-link': '#646cff',           // From apps/app/src/index.css a
        'app-link-hover': '#535bf2',     // From apps/app/src/index.css a:hover
        'app-light-text': '#213547',      // From apps/app/src/index.css light mode
        'app-light-bg': '#ffffff',       // From apps/app/src/index.css light mode
        'app-light-link': '#747bff',      // From apps/app/src/index.css light mode a:hover
        // Muted gray
        'muted': '#9e9e9e',              // From CSS_AUDIT.md
        'muted-rgba': 'rgba(158, 158, 158, 1)', // From CSS_AUDIT.md
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
        // Base sizes with line heights - mapped from CSS usage
        // Small text / labels (0.65rem - 0.95rem)
        'xs': ['0.65rem', { lineHeight: '1rem' }],      // From Dashboard.css (0.65rem used)
        'xs-sm': ['0.7rem', { lineHeight: '1rem' }],   // From Dashboard.css .metric-split-legend
        'xs-md': ['0.75rem', { lineHeight: '1rem' }],  // From Dashboard.css .metric-label (0.75rem)
        'xs-lg': ['0.8rem', { lineHeight: '1.2rem' }], // From Dashboard.css .metric-change
        'sm-xs': ['0.85rem', { lineHeight: '1.2rem' }], // From Dashboard.css .metric-label, NewAccountWizard.css
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'sm-md': ['0.88rem', { lineHeight: '1.3rem' }], // From NewAccountWizard.css
        'sm-lg': ['0.9rem', { lineHeight: '1.25rem' }],  // From Dashboard.css .btn-secondary, .account-row-log-payment
        'sm-xl': ['0.92rem', { lineHeight: '1.35rem' }], // From NewAccountWizard.css
        'sm-2xl': ['0.95rem', { lineHeight: '1.5rem' }], // From Dashboard.css .summary-card h3, .account-row-main
        
        // Base / Body text (1rem)
        'base': ['1rem', { lineHeight: '1.5rem' }],     // Standard body text
        'base-sm': ['1.05rem', { lineHeight: '1.5rem' }], // From NewAccountWizard.css
        'base-lg': ['1.1rem', { lineHeight: '1.5rem' }],  // From Dashboard.css .account-row-main
        'base-xl': ['1.2rem', { lineHeight: '1.5rem' }],  // From Dashboard.css .account-row-main, NewAccountWizard.css
        
        // Headings (1.25rem - 2.5rem)
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // From Dashboard.css .top-accounts-compact-header
        'xl-sm': ['1.3rem', { lineHeight: '1.5rem' }],  // From Dashboard.css .account-row-main
        'xl-md': ['1.4rem', { lineHeight: '1.5rem' }],  // From NewAccountWizard.css
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // From Dashboard.css .account-row-main
        '2xl-sm': ['1.75rem', { lineHeight: '2rem' }],  // From Dashboard.css .top-accounts-compact-value
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '3xl-sm': ['2rem', { lineHeight: '1.2rem' }],   // From Dashboard.css .metric-value, .top-accounts-compact-value
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '4xl-sm': ['2.5rem', { lineHeight: '1' }],      // From Dashboard.css .dashboard-header h2, .summary-value
        
        // Auth-app pixel sizes (converted to rem)
        'auth-xs': ['0.75rem', { lineHeight: '1rem' }],   // 12px from auth-app
        'auth-sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px from auth-app
        'auth-base': ['0.9375rem', { lineHeight: '1.5rem' }], // 15px from auth-app
        'auth-md': ['1rem', { lineHeight: '1.5rem' }],   // 16px from auth-app
        'auth-lg': ['1.5rem', { lineHeight: '1.75rem' }], // 24px from auth-app .title
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
        
        // Custom spacing values from CSS (fractional rem values)
        // Found in: Dashboard.css, NewAccountWizard.css, various components
        '0.35': '0.35rem',   // 5.6px - From CSS gaps
        '0.4': '0.4rem',     // 6.4px - From CSS gaps
        '0.45': '0.45rem',   // 7.2px - From CSS gaps
        '0.6': '0.6rem',     // 9.6px - From NewAccountWizard.css gaps
        '0.65': '0.65rem',   // 10.4px - From CSS gaps
        '0.7': '0.7rem',     // 11.2px - From CSS gaps
        '0.8': '0.8rem',     // 12.8px - From CSS gaps
        '0.85': '0.85rem',   // 13.6px - From NewAccountWizard.css padding
        '0.9': '0.9rem',     // 14.4px - From NewAccountWizard.css gaps
        '0.95': '0.95rem',   // 15.2px - From NewAccountWizard.css gaps, padding
        
        // Pixel values from auth-app (converted to rem)
        'px-10': '10px',      // From auth-app .input padding
        'px-12': '12px',      // From auth-app .input padding, .badge padding
        'px-16': '16px',      // From auth-app .card gap, .grid gap
        'px-24': '24px',      // From auth-app .card padding
        'px-32': '32px',      // From auth-app .page padding
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
        // Glassmorphism shadows
        'soft': '0 10px 40px rgba(15, 23, 42, 0.35)',           // From styles.css
        'soft-lg': '0 15px 50px rgba(15, 23, 42, 0.4)',         // From styles.css
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.1)',             // From Dashboard.css .btn-secondary
        'soft-sm': '0 15px 40px rgba(15, 23, 42, 0.08)',        // From auth-app .card
        
        // Glassmorphism with color tints
        'glass-purple': '0 4px 12px rgba(102, 126, 234, 0.3)',  // From Dashboard.css .btn-add-new
        'glass-purple-lg': '0 6px 20px rgba(79, 70, 229, 0.35)', // From Dashboard.css .btn-secondary:hover
        'glass-purple-xl': '0 6px 16px rgba(99, 102, 241, 0.4)', // From Dashboard.css .account-row-log-payment:hover
        'glass-cyan': '0 10px 30px rgba(14, 165, 233, 0.35)',   // From auth-app .button
        
        // Inset shadows for depth
        'inset': 'inset 0 0 0 1px rgba(148, 163, 184, 0.3)',   // From styles.css
        'inset-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2)', // From Dashboard.css .account-row
        
        // Focus rings
        'focus': '0 0 0 1px rgba(99, 102, 241, 0.6), 0 0 0 4px rgba(99, 102, 241, 0.25)',
        'focus-accent': '0 0 0 1px rgba(6, 182, 212, 0.6), 0 0 0 4px rgba(6, 182, 212, 0.25)',
        'focus-cyan': '0 0 0 2px #38bdf8',                     // From auth-app .input:focus
        
        // Complex glassmorphism shadows
        'glass-complex': '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)', // From PrivateLayout.css .sidebar
        'glass-complex-lg': '0 12px 40px 0 rgba(31, 38, 135, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)', // From Dashboard.css .summary-card:hover
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
        'fadeIn': 'fadeIn 0.3s ease-in-out',           // From Modal.css overlay
        'fadeIn-slow': 'fadeIn 0.6s ease-out',         // From Dashboard.css .dashboard
        'slideUp': 'slideUp 0.3s ease-out',            // From Modal.css modal content
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
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
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
  plugins: [],
};
