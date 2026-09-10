import { resolve } from "node:path";

import { defineConfig } from "vite";

import { catalogData } from "./vite.catalog-data.js";
import { requireBuiltPackages } from "./vite.shared.js";

/**
 * `apps/catalog` is the *only* place Vite is used in this repo.
 *
 * The component package is compiled by tsc into a plain ES module graph and
 * never goes through a bundler, so nothing here affects the canonical package
 * artifacts. Vite serves the catalog during development and emits the static
 * catalog Vercel serves; vite.iife.config.ts produces the explicitly secondary
 * single-file browser distribution.
 */

export default defineConfig({
  plugins: [catalogData(), requireBuiltPackages()],

  // Separate entries for the catalogue and its isolated preview documents. The frame
  // needs to be a real document rather than a srcdoc blob so that its module
  // imports resolve the same way the catalog's do.
  build: {
    minify: "esbuild",
    // Preserve ::part selectors: wrapping them in :is() invalidates their rules.
    cssMinify: "esbuild",
    rollupOptions: {
      output: {
        // Keep renderer dependencies lazy; an explicit group also isolates the
        // bundler runtime instead of hoisting shared helpers into the chart chunk.
        codeSplitting: {
          groups: [
            {
              name: "chart-engine",
              test: /node_modules\/(?:echarts|zrender|tslib)\//,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        fixture: resolve(import.meta.dirname, "fixture.html"),
        sharedFixture: resolve(import.meta.dirname, "shared-fixture.html"),
      },
    },
  },

  server: {
    port: 5173,

    // The workspace packages are pnpm symlinks into ../../packages. Vite
    // ignores node_modules when watching, so the negation is what makes an
    // edit to a component or a token refresh the page.
    watch: {
      ignored: ["!**/node_modules/@mash/**"],
    },
  },

  // Never pre-bundle the workspace packages. Pre-bundling would snapshot them
  // into .vite/deps, and rebuilding @mash/ui would leave the catalog serving a
  // stale copy until the cache was manually cleared.
  optimizeDeps: {
    exclude: ["@mash/ui", "@mash/shrine", "@mash/tokens"],
  },
});
