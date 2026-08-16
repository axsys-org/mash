import { resolve } from "node:path";

import { defineConfig } from "vite";

/**
 * The catalog is the *only* place Vite is used in this repo.
 *
 * The component package is compiled by tsc into a plain ES module graph and
 * never goes through a bundler, so nothing here affects what ships. Vite's job
 * is purely to serve the catalog during development.
 */
export default defineConfig({
  // Two pages: the catalog itself, and the preview frame it embeds. The frame
  // needs to be a real document rather than a srcdoc blob so that its module
  // imports resolve the same way the catalog's do.
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        stage: resolve(import.meta.dirname, "stage.html"),
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
    exclude: ["@mash/ui", "@mash/tokens"],
  },
});
