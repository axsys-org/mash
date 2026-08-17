/**
 * Layer classification and CSS naming.
 *
 * The token graph has three layers, and almost every build decision keys off
 * which layer a token belongs to:
 *
 *   reference -> raw primitives.       Literal values. Emitted to reference.css.
 *   semantic  -> theme-independent.    Aliases reference. Emitted to semantic.css.
 *   theme     -> theme-dependent.      Aliases reference. Emitted to theme-<name>.css.
 *
 * Keeping this in one module means the naming rules, the file filters and the
 * validator all agree on what a layer is, rather than each re-deriving it.
 */

export const LAYER = Object.freeze({
  REFERENCE: "reference",
  SEMANTIC: "semantic",
  THEME: "theme",
});

const posix = (p) => String(p ?? "").replace(/\\/g, "/");

/**
 * A token is a reference primitive iff its id is `<category>.reference.<...>`,
 * e.g. `color.reference.blue.600`. That shape is deliberate: it makes the
 * layer visible in the token id itself, so a reviewer reading a diff can tell
 * a primitive from a semantic token without opening another file.
 */
export function isReferenceToken(token) {
  return token.path[1] === LAYER.REFERENCE;
}

export function isThemeToken(token) {
  return posix(token.filePath).includes("/src/themes/");
}

export function layerOf(token) {
  if (isReferenceToken(token)) return LAYER.REFERENCE;
  if (isThemeToken(token)) return LAYER.THEME;
  return LAYER.SEMANTIC;
}

export const isSemanticToken = (token) => layerOf(token) === LAYER.SEMANTIC;

/** `actionHover` -> `action-hover`, `600` -> `600`, `surfaceRaised` -> `surface-raised`. */
export const kebab = (segment) =>
  String(segment)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

/**
 * The CSS custom property name for a token, without the leading `--`.
 *
 * Style Dictionary's own `name/kebab` would flatten the full path, which would
 * leak the `reference` path segment into the public API as
 * `--color-reference-blue-600`. Instead primitives get a short, obviously
 * namespaced `--ref-*` prefix and the semantic layer gets the clean names that
 * components and consumers actually write against:
 *
 *   color.reference.blue.600    ->  --ref-color-blue-600
 *   color.actionHover           ->  --color-action-hover
 *   space.controlInline         ->  --space-control-inline
 *   type.body.fontSize          ->  --type-body-font-size
 */
export function cssVarName(token) {
  const path = token.path;
  const segments = isReferenceToken(token) ? ["ref", path[0], ...path.slice(2)] : [...path];
  return segments.map(kebab).join("-");
}
