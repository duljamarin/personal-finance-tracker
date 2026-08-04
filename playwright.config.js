import { defineConfig, devices } from '@playwright/test';

// WebKit only: the reported bug is iOS Safari specific and does not reproduce
// in Chromium, so testing Chromium here would prove nothing.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Safari'],
  },
  projects: [{ name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: [
    {
      // Production preview of the real app, for the public routes.
      //
      // reuseExistingServer is deliberately FALSE, unlike the Playwright
      // default. This server serves a built bundle from dist/, so reusing a
      // previously-started one silently tests a STALE build: you edit a
      // component, rerun, and get the old bundle's result. That produced a
      // false failure during the iOS overflow work that cost a full rerun to
      // spot. Always rebuild and start fresh - the build is ~5s.
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      // Component harness for the authenticated-only components. Safe to reuse:
      // this is a Vite dev server with HMR, so it always serves current source.
      command: 'npx vite --config e2e/harness/vite.config.js',
      url: 'http://localhost:5199',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
