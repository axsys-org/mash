/**
 * Style Dictionary configuration.
 *
 * The build runs once for the theme-independent layers and once per theme.
 * It has to be split that way because every theme defines the *same* token ids
 * (`color.action` exists in both light and dark) — a single dictionary
 * containing both would be a name collision, not a design system.
 *
 *   base build:   reference/** + semantic/**            -> reference.css, semantic.css
 *   theme build:  reference/** + themes/<name>.json     -> theme-<name>.css
 *
 * Every build includes the reference layer, because the semantic and theme
 * layers alias into it and Style Dictionary needs the targets present to
 * resolve them. Only the base build *emits* the primitives.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { cssTransforms } from "./transforms.mjs";
import { isReferenceToken, isSemanticToken, isThemeToken } from "./layers.mjs";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

export const SRC_DIR = path.join(packageRoot, "src");
export const DIST_DIR = path.join(packageRoot, "dist");

const glob = (...segments) => path.join(SRC_DIR, ...segments);

const REFERENCE_SOURCES = glob("reference", "*.json");
const SEMANTIC_SOURCES = glob("semantic", "*.json");
const themeSource = (theme) => glob("themes", `${theme}.json`);

/**
 * How each theme's variables get scoped.
 *
 * `light` claims `:root` so it is the default with no markup required.
 * `dark` applies when explicitly opted into — which is what makes a nested
 * `[data-theme="dark"]` subtree work — and when the OS asks for it, except
 * inside a subtree that explicitly opted back into light.
 */
const THEME_SCOPES = {
  light: {
    selectors: [":root", '[data-theme="light"]'],
  },
  dark: {
    selectors: ['[data-theme="dark"]'],
    mediaQuery: "prefers-color-scheme: dark",
    mediaSelectors: [':root:not([data-theme="light"])'],
  },
};

const scopeFor = (theme) => THEME_SCOPES[theme] ?? { selectors: [`[data-theme="${theme}"]`] };

const cssPlatform = (files) => ({
  css: {
    transforms: cssTransforms,
    buildPath: `${DIST_DIR}/`,
    files,
  },
});

/** Reference primitives + theme-independent semantics. */
export function baseConfig() {
  return {
    usesDtcg: true,
    source: [REFERENCE_SOURCES, SEMANTIC_SOURCES],
    // Style Dictionary warns whenever a file references tokens that its own
    // filter excluded. That is structural here: semantic.css and theme-*.css
    // reference the primitives in reference.css *on purpose*, so the warning
    // fires on every build and says nothing. Silencing it does not lose the
    // guarantee — scripts/build.mjs re-checks the generated CSS directly and
    // fails if any emitted var() has no definition in any file.
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: cssPlatform([
      {
        destination: "reference.css",
        format: "mash/css-vars",
        filter: isReferenceToken,
        options: {
          outputReferences: false,
          showDescriptions: false,
          selectors: [":root"],
          sources: "src/reference/*.json",
          description:
            "Reference primitives: the raw design values, before any of them mean\nanything. Every literal colour, step and duration in the system is authored\nhere exactly once.\n\nThese are inspectable on purpose, but they are not the public API. Components\nand application code must use the semantic layer instead — see semantic.css\nand theme-*.css.",
        },
      },
      {
        destination: "semantic.css",
        format: "mash/css-vars",
        filter: isSemanticToken,
        options: {
          outputReferences: true,
          selectors: [":root"],
          sources: "src/semantic/*.json",
          description:
            "Semantic design language: the theme-independent half.\n\nThese names describe roles, not values — what a gap is for, what a radius\nbelongs to. They resolve to reference primitives via var(), so you can trace\nany value back to its origin in the browser inspector.\n\nSemantic colour is theme-dependent and lives in theme-*.css instead.",
        },
      },
    ]),
  };
}

/** One theme's semantic colour layer. */
export function themeConfig(theme) {
  const scope = scopeFor(theme);
  return {
    usesDtcg: true,
    source: [REFERENCE_SOURCES, themeSource(theme)],
    // Style Dictionary warns whenever a file references tokens that its own
    // filter excluded. That is structural here: semantic.css and theme-*.css
    // reference the primitives in reference.css *on purpose*, so the warning
    // fires on every build and says nothing. Silencing it does not lose the
    // guarantee — scripts/build.mjs re-checks the generated CSS directly and
    // fails if any emitted var() has no definition in any file.
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: cssPlatform([
      {
        destination: `theme-${theme}.css`,
        format: "mash/css-vars",
        filter: isThemeToken,
        options: {
          outputReferences: true,
          ...scope,
          sources: `src/themes/${theme}.json`,
          description: `Semantic colour for the "${theme}" theme.\n\nEvery value here is a var() into reference.css, so reference.css must be\nloaded first. Themes nest: applying [data-theme] to any element re-scopes\nthese variables for that subtree.`,
        },
      },
    ]),
  };
}

export { isReferenceToken, isSemanticToken, isThemeToken };
