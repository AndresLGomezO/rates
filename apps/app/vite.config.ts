import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks
          if (id.includes('node_modules')) {
            // Firebase SDK (large)
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Recharts (large charting library)
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // All other node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Slightly higher limit after splitting
  },
});
