import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * Component tests run in a real browser, not in jsdom — see the equivalent
 * config in @mash/ui for why.
 *
 * Chromium is the default because it is the fastest loop. CI runs the same
 * suite across Chromium, Firefox and WebKit via BROWSERS.
 */
const SUPPORTED = ["chromium", "firefox", "webkit"] as const;
type SupportedBrowser = (typeof SUPPORTED)[number];

const isSupported = (name: string): name is SupportedBrowser =>
  (SUPPORTED as readonly string[]).includes(name);

const browsers = (process.env.BROWSERS ?? "chromium")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

// Validate here rather than letting an unknown name reach Playwright, where it
// surfaces as a launch failure with no mention of BROWSERS.
for (const name of browsers) {
  if (!isSupported(name)) {
    throw new Error(
      `BROWSERS contains unsupported browser "${name}". Supported: ${SUPPORTED.join(", ")}.`,
    );
  }
}

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-support/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright({
        contextOptions: { hasTouch: process.env.POINTER === "coarse" },
      }),
      headless: true,
      screenshotFailures: false,
      instances: browsers.filter(isSupported).map((browser) => ({ browser })),
    },
  },
});
