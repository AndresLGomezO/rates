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

  // Optional: app-specific overrides
  theme: {
    extend: {
      // App-specific z-indices if needed
      zIndex: {
        modal: '9999',
      },
    },
  },
};
