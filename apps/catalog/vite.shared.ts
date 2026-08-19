import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";

/**
 * Fail early when either catalog build is run against a cold workspace.
 *
 * Both the catalog application and the single-file browser distribution
 * consume generated package artifacts. Keeping the guard shared means the
 * friendly failure cannot drift between those two builds.
 */
export function requireBuiltPackages(
  required: readonly string[] = [
    "@mash/tokens/tokens.css",
    "@mash/ui/custom-elements.json",
    "@mash/shrine/custom-elements.json",
  ],
): Plugin {
  return {
    name: "mash:require-built-packages",
    enforce: "pre",
    buildStart() {
      const missing = required.filter((specifier) => {
        try {
          return !existsSync(fileURLToPath(import.meta.resolve(specifier)));
        } catch {
          return true;
        }
      });

      if (missing.length > 0) {
        this.error(
          `this build consumes generated artifacts that do not exist yet:\n` +
            missing.map((specifier) => `  ${specifier}`).join("\n") +
            `\n\nBuild the workspace packages first. From the repository root:\n` +
            `  pnpm build:catalog    (builds tokens, components and the catalog in order)`,
        );
      }
    },
  };
}
