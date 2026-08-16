/**
 * Value and name transforms.
 *
 * There are deliberately very few of these, and none of them convert units.
 * A dimension authored as `0.75rem` comes out as `0.75rem`; a duration authored
 * as `120ms` comes out as `120ms`. If you want px you author px. This is the
 * single most useful property of the whole token build: the generated CSS says
 * what the JSON said, so nobody has to reverse-engineer a conversion chain to
 * answer "why is this 14.4px?".
 *
 * Colour is the one exception, and only because DTCG's colour value is a
 * structured object rather than a string. Style Dictionary's built-in
 * `color/oklch` serialises it, which keeps us on a standard implementation
 * instead of a hand-rolled one.
 */

import { cssVarName } from "./layers.mjs";

/** DTCG dimension / duration values are `{ value, unit }` objects. */
const serialiseMeasure = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "value" in value) {
    return `${value.value}${value.unit ?? ""}`;
  }
  return String(value);
};

export const transforms = [
  {
    name: "mash/name/css",
    type: "name",
    transform: (token) => cssVarName(token),
  },

  {
    name: "mash/dimension/css",
    type: "value",
    transitive: true,
    filter: (token) => token.$type === "dimension",
    transform: (token) => serialiseMeasure(token.$value),
  },

  {
    name: "mash/duration/css",
    type: "value",
    transitive: true,
    filter: (token) => token.$type === "duration",
    transform: (token) => serialiseMeasure(token.$value),
  },
];

/**
 * The transform pipeline for the CSS platform.
 *
 * `attribute/cti` populates the category/type/item attributes that some
 * built-in transforms still read. The rest are ours, plus three built-ins that
 * serialise DTCG's structured value types into their CSS spellings.
 */
export const cssTransforms = [
  "attribute/cti",
  "mash/name/css",
  "mash/dimension/css",
  "mash/duration/css",
  "color/oklch",
  "fontFamily/css",
  "cubicBezier/css",
];

export function registerTransforms(StyleDictionary) {
  for (const transform of transforms) {
    StyleDictionary.registerTransform(transform);
  }
}
