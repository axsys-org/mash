import { defineConfig, devices } from "@playwright/test";

/**
 * Integration tests: composed behaviour and environment.
 *
 * These are deliberately not a second copy of the component tests. Vitest
 * Browser Mode covers a single component in isolation; this suite covers what
 * only shows up once components are combined with each other and with the
 * environment — themes nested inside themes, a form spanning several shadow
 * roots, right-to-left, reduced motion, forced colors.
 *
 * Chromium is the default. Set ALL_BROWSERS=1 for the full matrix, which is
 * what the release/main CI job does.
 */

const PORT = 5174;
const allBrowsers = Boolean(process.env.ALL_BROWSERS);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    ...(allBrowsers
      ? [
          { name: "firefox", use: devices["Desktop Firefox"] },
          { name: "webkit", use: devices["Desktop Safari"] },
        ]
      : []),
  ],

  webServer: {
    // `pnpm exec` rather than a bare `vite`: Playwright spawns this through a
    // plain shell that does not have node_modules/.bin on its PATH.
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !isCI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
