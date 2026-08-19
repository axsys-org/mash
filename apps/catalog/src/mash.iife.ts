import referenceCss from "@mash/tokens/reference.css?inline";
import semanticCss from "@mash/tokens/semantic.css?inline";
import darkThemeCss from "@mash/tokens/theme-dark.css?inline";
import lightThemeCss from "@mash/tokens/theme-light.css?inline";

import "@mash/ui/register";
import "@mash/shrine/register";

const STYLE_MARKER = "data-mash-tokens";

// A second copy of the bundle is harmless: registration modules guard their
// definitions, and the marker prevents duplicate token styles.
if (!document.head.querySelector(`style[${STYLE_MARKER}]`)) {
  const style = document.createElement("style");
  style.setAttribute(STYLE_MARKER, "");
  style.textContent = [referenceCss, semanticCss, lightThemeCss, darkThemeCss].join("\n");
  document.head.append(style);
}

// Vite exposes these named exports on globalThis.Mash in the IIFE build. The
// elements register as a side effect, so markup-only consumers need not touch
// the global at all; it is still useful for instanceof checks and imperative
// construction.
export * from "@mash/ui";
export * from "@mash/shrine";
