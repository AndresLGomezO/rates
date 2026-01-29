import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiPlugin } from './vite.plugin.api';

// Generate build-time information
const buildTime = new Date();
const buildTimestamp = buildTime.toISOString();
const buildDate = buildTime.toISOString().split('T')[0];
const buildTimeOnly = buildTime.toTimeString().split(' ')[0]; // HH:mm:ss
const buildNumber = buildTime.getTime().toString(36).toUpperCase(); // Base36 timestamp as build number

export default defineConfig(({ mode }) => {
  // Load .env into process.env so server-side code (API plugin, Firebase Admin)
  // can read FIREBASE_PROJECT_ID, VITE_FIREBASE_PROJECT_ID, etc.
  const envDir = process.cwd();
  const loaded = loadEnv(mode ?? 'development', envDir, '');
  for (const [k, v] of Object.entries(loaded)) {
    if (v !== undefined && process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  // Force production mode if NODE_ENV is production
  const isProduction =
    process.env.NODE_ENV === 'production' || mode === 'production';

  return {
    plugins: [react(), apiPlugin()],
    define: {
      __BUILD_TIME__: JSON.stringify(buildTimestamp),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __BUILD_TIME_ONLY__: JSON.stringify(buildTimeOnly),
      __BUILD_NUMBER__: JSON.stringify(buildNumber),
      // Explicitly set PROD based on NODE_ENV and mode
      'import.meta.env.PROD': JSON.stringify(isProduction),
      'import.meta.env.DEV': JSON.stringify(!isProduction),
    },
    server: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: false,
    },
    // Ensure environment variables are properly loaded
    envPrefix: 'VITE_',
  };
});
