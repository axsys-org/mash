import { resolve } from "node:path";

import { defineConfig } from "vite";

import { requireBuiltPackages } from "./vite.shared.js";

/**
 * Secondary browser distribution.
 *
 * The package builds remain native ES module graphs. This build bundles that
 * same code, Lit, registration side effects, and the token CSS into one
 * classic script for consumers that want a single <script src> integration.
 */
export default defineConfig({
  plugins: [
    requireBuiltPackages([
      "@mash/tokens/reference.css",
      "@mash/tokens/semantic.css",
      "@mash/tokens/theme-dark.css",
      "@mash/tokens/theme-light.css",
      "@mash/ui/register",
      "@mash/shrine/register",
    ]),
  ],
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/mash.iife.ts"),
      formats: ["iife"],
      name: "Mash",
      fileName: () => "mash.js",
    },
  },
});
