import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { compile } from "tailwindcss";

import { renderTailwindCss } from "../scripts/render-tailwind.mjs";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_DIR = path.join(PACKAGE_ROOT, "dist");

async function loadStylesheet(id, base) {
  const file = path.resolve(base, id);
  return {
    path: file,
    base: path.dirname(file),
    content: await readFile(file, "utf8"),
  };
}

test("maps every public token without registering reference primitives", async () => {
  const css = await readFile(path.join(DIST_DIR, "tailwind.css"), "utf8");
  const { tokens } = JSON.parse(await readFile(path.join(DIST_DIR, "tokens.json"), "utf8"));
  const publicTokens = Object.values(tokens).filter((token) => token.layer !== "reference");
  const referenceTokens = Object.values(tokens).filter((token) => token.layer === "reference");

  assert.match(css, /@theme reference inline/);
  assert.ok(publicTokens.length > 0);
  for (const token of publicTokens) {
    assert.ok(css.includes(`var(${token.cssVar})`), `${token.id} is not mapped by the adapter`);
  }
  for (const token of referenceTokens) {
    assert.ok(
      !css.includes(`var(${token.cssVar})`),
      `${token.id} leaked into Tailwind's theme or utility namespace`,
    );
  }
  assert.doesNotMatch(css, /--(?:color|spacing|radius)-reference-/);
  assert.doesNotMatch(css, /--color-(?:text|fill|separator|action)-[^:]+-(?:opaque|vibrant):/);
});

test("keeps material thickness, backdrop tuning, and semantic vibrancy independent", async () => {
  const { tokens } = JSON.parse(await readFile(path.join(DIST_DIR, "tokens.json"), "utf8"));
  const materialRoles = ["ultraThin", "thin", "regular", "thick", "ultraThick"];

  for (const role of materialRoles) {
    assert.equal(tokens[`blur.backgroundMaterial.${role}`].value, "15px");
    assert.ok(tokens[`color.backgroundMaterial${role[0].toUpperCase()}${role.slice(1)}`]);
  }

  assert.ok(tokens["effect.material.backdropSaturation.standard"]);
  assert.equal(
    tokens["effect.material.luminance.wideGamut"].aliasOf,
    "effect.reference.material.luminance.wideGamut",
  );
  assert.equal(
    tokens["effect.material.luminance.highDynamicRange"].aliasOf,
    "effect.reference.material.luminance.highDynamicRange",
  );
  assert.equal(
    tokens["effect.material.highlightAlpha.wideGamut"].aliasOf,
    "effect.reference.material.highlightAlpha.wideGamut",
  );
  assert.equal(
    tokens["effect.material.highlightAlpha.highDynamicRange"].aliasOf,
    "effect.reference.material.highlightAlpha.highDynamicRange",
  );
  assert.deepEqual(tokens["color.backgroundMaterialHighlight"].values, {
    light: "oklch(1.0000 0.0000 0.00 / 0.13)",
    dark: "oklch(1.0000 0.0000 0.00 / 0.13)",
  });
  assert.deepEqual(tokens["color.backgroundMaterialShadow"].values, {
    light: "oklch(0.0000 0.0000 0.00 / 0.13)",
    dark: "oklch(0.0000 0.0000 0.00 / 0.13)",
  });
  assert.equal(tokens["border.material"].value, "0.5px");
  assert.ok(tokens["color.textOpaque"]);
  assert.ok(tokens["color.textVibrant"]);
  assert.ok(tokens["color.fillPrimaryOpaque"]);
  assert.ok(tokens["color.fillPrimaryVibrant"]);
  assert.deepEqual(tokens["color.labelSource"].aliasOf, {
    light: "color.reference.neutral.1000",
    dark: "color.reference.neutral.0",
  });
  assert.deepEqual(tokens["opacity.labelSecondary"].values, {
    light: 0.5,
    dark: 0.55,
  });
  assert.equal(tokens["type.body.fontSize"].value, "0.875rem");
  assert.equal(tokens["type.largeTitle.lineHeight"].value, 1.230769);
  assert.equal(
    Object.keys(tokens).some((id) => id.startsWith("effect.vibrancy.")),
    false,
  );
});

test("keeps opaque control foundations separate from opt-in material fills", async () => {
  const { tokens } = JSON.parse(await readFile(path.join(DIST_DIR, "tokens.json"), "utf8"));
  for (const theme of ["light", "dark"]) {
    for (const id of [
      "color.surface",
      "color.surfaceSunken",
      "color.neutral",
      "color.neutralPressed",
      "color.border",
    ]) {
      assert.doesNotMatch(tokens[id].values[theme], /\//, `${id} must be opaque in ${theme}`);
      assert.match(tokens[id].aliasOf[theme], /color\.reference\.(neutral|gray)\./);
    }
    assert.notEqual(tokens["color.action"].values[theme], tokens["color.onAction"].values[theme]);
    assert.notEqual(
      tokens["color.neutral"].values[theme],
      tokens["color.neutralPressed"].values[theme],
    );
  }
});

test("automatically adapts typed layout dimensions and stacking layers", () => {
  const css = renderTailwindCss({
    "layout.dimension.panel": {
      id: "layout.dimension.panel",
      layer: "semantic",
      cssVar: "--layout-dimension-panel",
    },
    "layer.overlay": {
      id: "layer.overlay",
      layer: "semantic",
      cssVar: "--layer-overlay",
    },
  });

  assert.match(css, /--spacing-panel: var\(--layout-dimension-panel\);/);
  assert.match(css, /@utility z-overlay\s*{[^}]*z-index: var\(--layer-overlay\);/s);
});

test("compiles layout, surface, typography, focus, and motion utilities with Tailwind v4", async () => {
  const adapter = await readFile(path.join(DIST_DIR, "tailwind.css"), "utf8");
  const compiler = await compile(`${adapter}\n@tailwind utilities;`, {
    base: DIST_DIR,
    loadStylesheet,
  });
  const css = compiler.build([
    "bg-overlay",
    "p-container-inline",
    "rounded-container",
    "ease-control",
    "stack",
    "surface-raised",
    "material-ultra-thin",
    "material-thin",
    "material-regular",
    "material-thick",
    "material-ultra-thick",
    "vibrant-label-primary",
    "vibrant-fill-secondary",
    "vibrant-separator",
    "vibrant-accent-action",
    "focus-visible:focus-ring",
    "type-body",
    "type-caption2",
    "type-large-title",
    "duration-control",
    "translate-x-motion-short",
    "blur-motion-subtle",
    "scale-motion-pressed",
    "opacity-motion-muted",
    "rotate-motion-quarter",
    "w-scrollbar-hit-area-compact",
    "animate-fade-in",
    "backdrop-blur-progressive",
    "backdrop-blur-progressive-1",
    "fixed",
    "inset-[0]",
    "inset-x-[0]",
    "top-[0]",
    "h-compact",
    "z-overlay",
    "bg-red-500",
    "p-4",
    "rounded-lg",
  ]);

  assert.match(css, /\.bg-overlay\s*{[^}]*background-color: var\(--color-overlay\)/s);
  assert.match(css, /\.p-container-inline\s*{[^}]*padding: var\(--space-container-inline\)/s);
  assert.match(css, /\.rounded-container\s*{[^}]*border-radius: var\(--radius-container\)/s);
  assert.match(css, /\.ease-control\s*{[^}]*transition-timing-function: var\(--easing-control\)/s);
  assert.match(css, /\.stack\s*{[^}]*gap: var\(--space-stack\)/s);
  assert.match(css, /\.surface-raised\s*{[^}]*background-color: var\(--color-surface-raised\)/s);
  assert.match(
    css,
    /\.material-thin\s*{[^}]*--color-text: var\(--mash-material-label-primary\).*?background-color: var\(--color-surface-raised\).*?@supports.*?background-color: var\(--mash-material-background, var\(--color-background-material-thin\)\).*?backdrop-filter: var\(--mash-material-backdrop, blur\(var\(--blur-background-material-thin\)\) saturate\(var\(--mash-material-backdrop-saturation, var\(--effect-material-backdrop-saturation-standard\)\)\)\)/s,
  );
  assert.match(
    css,
    /\.material-thin\s*{.*?@supports.*?background-image: linear-gradient\(\s*to bottom,\s*var\(--mash-material-background-highlight, transparent\),\s*transparent 62%\s*\)/s,
  );
  assert.match(
    css,
    /\.material-thin\s*{.*?@supports \(dynamic-range-limit: constrained\)\s*{[^}]*dynamic-range-limit: var\(--mash-material-dynamic-range-limit, standard\)/s,
  );
  assert.match(
    css,
    /\.material-thin\s*{[^}]*--mash-material-compositor: var\(--mash-vibrancy-blend-mode, normal\)/s,
  );
  assert.match(
    css,
    /\.material-thin\s*{[^}]*--_mash-component-surface-sunken: var\(--mash-material-fill-quaternary\);[^}]*--_mash-component-divider: var\(--mash-material-separator\);/s,
  );
  assert.doesNotMatch(css, /\.material-thin\s*{[^}]*--_mash-component-surface: transparent/s);
  assert.match(
    css,
    /\.material-ultra-thin\s*{.*?var\(--color-background-material-ultra-thin\).*?var\(--blur-background-material-ultra-thin\)/s,
  );
  assert.match(
    css,
    /\.material-regular\s*{.*?var\(--color-background-material-regular\).*?var\(--blur-background-material-regular\)/s,
  );
  assert.match(
    css,
    /\.material-thick\s*{.*?var\(--color-background-material-thick\).*?var\(--blur-background-material-thick\)/s,
  );
  assert.match(
    css,
    /\.material-ultra-thick\s*{.*?var\(--color-background-material-ultra-thick\).*?var\(--blur-background-material-ultra-thick\)/s,
  );
  assert.match(css, /@property --mash-material-backdrop-saturation/);
  assert.match(css, /@property --mash-material-luminance/);
  assert.match(css, /@property --mash-material-highlight-alpha/);
  assert.match(
    css,
    /\[data-vibrancy="vibrant"\][^{]*{[^}]*var\(--effect-material-backdrop-saturation-enhanced\)/s,
  );
  assert.match(
    css,
    /@media \(color-gamut: p3\)\s*{[^}]*--mash-material-luminance: var\(--effect-material-luminance-wide-gamut\)[^}]*--mash-material-background-highlight: color\(display-p3 1 1 1 \/ var\(--mash-material-highlight-alpha\)\)[^}]*--mash-material-selection-background: var\(--color-menu-selection\)/s,
  );
  assert.match(
    css,
    /@media \(dynamic-range: high\)\s*{[^}]*--mash-material-luminance: var\(--effect-material-luminance-high-dynamic-range\)[^}]*--mash-material-dynamic-range-limit: constrained/s,
  );
  assert.match(css, /\[data-vibrancy="reduced"\][^{]*{[^}]*--mash-material-backdrop: none/s);
  assert.match(
    css,
    /\[data-vibrancy="vibrant"\][^{]*{[^}]*--mash-material-background-highlight: var\(--color-background-material-highlight\)/s,
  );
  assert.match(
    css,
    /\[data-vibrancy="reduced"\][^{]*{[^}]*--mash-material-background-highlight: transparent/s,
  );
  assert.match(
    css,
    /\[data-theme="light"\][^{]*{[^}]*--mash-material-separator-source: var\(--color-separator-strong-vibrant\)/s,
  );
  assert.match(
    css,
    /\[data-theme="dark"\][^{]*{[^}]*--mash-material-separator-source: var\(--color-background-material-highlight\)/s,
  );
  assert.match(
    css,
    /\[data-vibrancy="reduced"\][^{]*{[^}]*--mash-material-separator-source: var\(--color-separator-strong-opaque\)/s,
  );
  assert.match(css, /\[data-theme="light"\][^{]*{[^}]*--mash-vibrancy-theme-blend-mode: multiply/s);
  assert.match(
    css,
    /\[data-theme="dark"\][^{]*{[^}]*--mash-vibrancy-theme-blend-mode: plus-lighter/s,
  );
  assert.match(
    css,
    /--mash-opaque-label-primary: rgb\(from var\(--mash-label-source, var\(--color-text-opaque\)\) r g b \/ var\(--opacity-label-primary\)\)/,
  );
  assert.match(
    css,
    /\[data-vibrancy="vibrant"\][^{]*{[^}]*--mash-vibrancy-blend-mode: var\(--mash-vibrancy-theme-blend-mode\)/s,
  );
  assert.match(
    css,
    /\.vibrant-label-primary\s*{[^}]*color: var\(--mash-material-label-primary\)[^}]*mix-blend-mode:/s,
  );
  assert.match(
    css,
    /\.vibrant-fill-secondary\s*{[^}]*background-color: var\(--mash-material-fill-secondary\)/s,
  );
  assert.match(css, /prefers-reduced-transparency: reduce/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /forced-colors: active/);
  assert.match(
    css,
    /\.focus-visible\\:focus-ring:focus-visible\s*{[^}]*outline-offset: var\(--border-focus-ring-offset\)/s,
  );
  assert.match(css, /\.type-body\s*{[^}]*font-size: var\(--type-body-font-size\)/s);
  assert.match(css, /\.type-caption2\s*{[^}]*font-size: var\(--type-caption2-font-size\)/s);
  assert.match(css, /\.type-large-title\s*{[^}]*font-size: var\(--type-large-title-font-size\)/s);
  assert.match(css, /\.duration-control\s*{[^}]*transition-duration: var\(--duration-control\)/s);
  assert.match(css, /\.translate-x-motion-short\s*{[^}]*var\(--motion-distance-short\)/s);
  assert.match(css, /\.blur-motion-subtle\s*{[^}]*var\(--motion-blur-subtle\)/s);
  assert.match(css, /\.scale-motion-pressed\s*{[^}]*scale: var\(--motion-scale-pressed\)/s);
  assert.match(css, /\.opacity-motion-muted\s*{[^}]*opacity: var\(--motion-opacity-muted\)/s);
  assert.match(
    css,
    /\.rotate-motion-quarter\s*{[^}]*rotate: calc\(var\(--motion-rotation-quarter\) \* 1turn\)/s,
  );
  assert.match(css, /\.w-scrollbar-hit-area-compact\s*{[^}]*var\(--scrollbar-hit-area-compact\)/s);
  assert.match(css, /\.animate-fade-in\s*{[^}]*animation: semantic-fade-in/s);
  assert.match(
    css,
    /\.backdrop-blur-progressive\s*{.*?> :nth-child\(6\)\s*{[^}]*backdrop-filter: blur\(var\(--blur-progressive-6\)\)/s,
  );
  assert.match(
    css,
    /&::after\s*{[^}]*background: linear-gradient\(to bottom, var\(--color-overlay\) 60%, transparent\)/s,
  );
  assert.match(
    css,
    /\.backdrop-blur-progressive-1\s*{[^}]*--tw-backdrop-blur: blur\(var\(--blur-progressive-1\)\)/s,
  );
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.fixed\s*{[^}]*position: fixed/s);
  assert.match(css, /\.inset-\\\[0\\\]\s*{[^}]*inset: 0/s);
  assert.match(css, /\.inset-x-\\\[0\\\]\s*{[^}]*inset-inline: 0/s);
  assert.match(css, /\.top-\\\[0\\\]\s*{[^}]*top: 0/s);
  assert.match(css, /\.h-compact\s*{[^}]*height: var\(--layout-dimension-compact\)/s);
  assert.match(css, /\.z-overlay\s*{[^}]*z-index: var\(--layer-overlay\)/s);
  assert.doesNotMatch(css, /\.bg-red-500\b/);
  assert.doesNotMatch(css, /\.p-4\b/);
  assert.doesNotMatch(css, /\.rounded-lg\b/);

  // The complete token cascade is bundled during Tailwind compilation rather
  // than leaving package-relative imports pointing at the consuming app.
  assert.match(css, /--color-overlay: var\(--ref-color-shadow-overlay\);/);
  assert.doesNotMatch(css, /@import/);
});
