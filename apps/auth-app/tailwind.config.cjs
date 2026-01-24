const uiThemePreset = require('@rates/ui-theme/tailwind.config.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the shared preset
  presets: [uiThemePreset],

  // App-specific content paths
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    // Include shared packages src directories only (excludes node_modules)
    '../../packages/*/src/**/*.{ts,tsx,js,jsx}',
  ],

  // Optional: auth-app-specific overrides
  theme: {
    extend: {
      // Auth-app uses lighter theme, can override colors if needed
      colors: {
        // Keep existing light theme colors for auth-app
        'auth-bg': '#f8fafc',
        'auth-surface': '#ffffff',
        'auth-text': '#0f172a',
        'auth-text-muted': '#475569',
      },
    },
  },
};
