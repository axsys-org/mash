import { resolve } from "node:path";
import process from "node:process";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

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

/**
 * Deployment metadata, read once, here.
 *
 * This is the *only* place the build reads the environment. Vercel exposes the
 * git context to the build as `VERCEL_*`; GitHub Actions exposes its own set.
 * Both are optional — a local `vite build` gets nulls, and src/build-info.ts
 * renders "local development".
 *
 * https://vercel.com/docs/environment-variables/system-environment-variables
 */
function buildInfo() {
  const env = process.env;

  // On a pull request GITHUB_REF_NAME is "184/merge", which is not a branch
  // anyone recognises; GITHUB_HEAD_REF is the source branch.
  const branch = env.VERCEL_GIT_COMMIT_REF ?? env.GITHUB_HEAD_REF ?? env.GITHUB_REF_NAME ?? null;

  const repo =
    env.GITHUB_REPOSITORY ??
    (env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG
      ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`
      : null);

  return {
    env: env.VERCEL_ENV ?? (env.CI ? "ci" : "local"),
    branch: branch || null,
    sha: env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? null,
    pr: env.VERCEL_GIT_PULL_REQUEST_ID ?? null,
    repo: repo || null,
  };
}

export default defineConfig({
  plugins: [tailwindcss(), requireBuiltPackages()],

  // Frozen into the bundle at build time. Vite's own `import.meta.env` would
  // require every variable to be renamed with a VITE_ prefix in the deployment
  // platform; one define keeps the platform's names where they are documented.
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo()),
  },

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
    exclude: ["@mash/ui", "@mash/shrine", "@mash/tokens"],
  },
});
