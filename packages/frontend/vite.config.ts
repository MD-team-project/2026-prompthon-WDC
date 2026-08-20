import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Types-only workspace package, consumed as source. No build step for it.
      '@prompthon/shared': fileURLToPath(new URL('../shared/src/types.ts', import.meta.url)),
    },
  },
  server: {
    // Only used when VITE_USE_MOCK is false. BE's port, changeable by agreement.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Dev-only force-discovery trigger, used by discovery-demo.html.
      '/internal': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      // Multi-page build: the two demo screens are separate HTML entries,
      // opened directly by URL rather than routed to from the main app.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        deviceDemo: fileURLToPath(new URL('./device-demo.html', import.meta.url)),
        discoveryDemo: fileURLToPath(new URL('./discovery-demo.html', import.meta.url)),
      },
    },
  },
  test: {
    // No jsdom. The one critical check is on a pure reducer, so there is
    // nothing here that needs a DOM.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // PBT-08 requires the seed to be visible on every run. Vitest intercepts
    // console output by default and attaches it to a task, which swallows a log
    // written from a setup file. Turning interception off is what keeps the seed
    // line printed.
    disableConsoleIntercept: true,
  },
});
