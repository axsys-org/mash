import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression, against the catalog's *production* build.
 *
 * Two deliberate choices:
 *
 * 1. The subject is `apps/catalog/dist`, served by `vite preview` — the same
 *    bytes Vercel serves as the PR preview. A screenshot suite that photographs
 *    a dev server proves something nobody looks at.
 *
 * 2. Each state is reached by its deep link. That makes the URL contract part
 *    of what is under test: if `?variant=quiet&theme=dark` stops restoring
 *    state, these fail, and the links designers paste into PR comments are
 *    exactly the links CI exercises.
 *
 * Chromium only. Cross-engine pixel differences are large and uninteresting;
 * the cross-browser *behaviour* matrix lives in tests/integration.
 *
 * See ./README.md for the platform constraint on baselines.
 */

const PORT = 5175;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  // A baseline that does not exist yet is written rather than treated as a
  // failure. Baselines are platform-specific (see README), so the first run on
  // a new platform is a seeding run, not a regression.
  updateSnapshots: "missing",

  // Keyed by platform, because a Linux baseline and a macOS baseline of the
  // same component are legitimately different images.
  snapshotPathTemplate: "snapshots/{platform}/{arg}{ext}",

  expect: {
    toHaveScreenshot: {
      // Font rasterisation differs slightly even between runs on the same
      // machine. Small enough to catch a colour or spacing change, loose
      // enough not to fail on a resampled glyph edge.
      maxDiffPixelRatio: 0.01,
    },
  },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],

  webServer: {
    // Serves apps/catalog/dist. Run `pnpm build && pnpm build:catalog` first —
    // vite preview does not build.
    command: `pnpm --filter @mash/catalog exec vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !isCI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
