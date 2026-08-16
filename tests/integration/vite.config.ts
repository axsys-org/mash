import { defineConfig } from "vite";

/**
 * Serves the integration fixture. Playwright starts this via its `webServer`
 * config; it is not part of any package build.
 */
export default defineConfig({
  root: "fixture",
  optimizeDeps: {
    exclude: ["@mash/ui", "@mash/tokens"],
  },
});
