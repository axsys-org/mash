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
    "focus-visible:focus-ring",
    "type-body",
    "duration-control",
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
    /\.focus-visible\\:focus-ring:focus-visible\s*{[^}]*outline-offset: var\(--border-focus-ring-offset\)/s,
  );
  assert.match(css, /\.type-body\s*{[^}]*font-size: var\(--type-body-font-size\)/s);
  assert.match(css, /\.duration-control\s*{[^}]*transition-duration: var\(--duration-control\)/s);
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
