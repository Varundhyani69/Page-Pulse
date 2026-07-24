import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development, proxy /api requests to the Express server so
// the frontend dev server and backend can run on different ports without
// CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
