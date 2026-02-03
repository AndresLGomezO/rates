import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Generate build-time information
const buildTime = new Date();
const buildTimestamp = buildTime.toISOString();
const buildDate = buildTime.toISOString().split('T')[0];
const buildTimeOnly = buildTime.toTimeString().split(' ')[0]; // HH:mm:ss
const buildNumber = buildTime.getTime().toString(36).toUpperCase(); // Base36 timestamp as build number

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const aiServiceUrl = env.VITE_AI_SERVICE_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    define: {
      __BUILD_TIME__: JSON.stringify(buildTimestamp),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __BUILD_TIME_ONLY__: JSON.stringify(buildTimeOnly),
      __BUILD_NUMBER__: JSON.stringify(buildNumber),
    },
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: false,
      proxy: {
        '/api/ai': {
          target: aiServiceUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ai/, '/v1'),
        },
      },
    },
  };
});
