/**
 * Renderer-neutral presentation vocabulary for catalogue recipes.
 *
 * CSS remains the authored Web realization for the first Mash catalogue, but
 * adapters should not have to classify CSS properties themselves. These
 * semantic trait names group every public declaration into a portable visual,
 * type, motion, interaction, media, generated-content, or layout axis.
 */

export const MASH_PRESENTATION_VERSION = "1.0.0";

export const MASH_PRESENTATION_VOCABULARY = Object.freeze({
  aspects: [
    "surface",
    "content",
    "edge",
    "focus",
    "elevation",
    "type",
    "motion",
    "interaction",
    "media",
    "generated",
    "layout",
  ],
  eventIntents: ["request", "report"],
  relationKinds: ["requests", "reports"],
  conditionKinds: ["node", "interaction", "environment", "context", "renderer"],
});

const exactTraits = Object.freeze({
  background: "surface.fill",
  "background-color": "surface.fill-color",
  color: "content.ink",
  fill: "content.fill",
  stroke: "content.stroke",
  "stroke-width": "content.stroke-width",
  border: "edge.all",
  "border-color": "edge.color",
  "border-width": "edge.width",
  "border-radius": "edge.radius",
  outline: "focus.ring",
  "outline-color": "focus.color",
  "outline-offset": "focus.offset",
  "box-shadow": "elevation.shadow",
  opacity: "content.opacity",
  font: "type.shorthand",
  "font-family": "type.family",
  "font-size": "type.size",
  "font-weight": "type.weight",
  "line-height": "type.line-height",
  "letter-spacing": "type.tracking",
  "text-align": "type.align",
  "text-overflow": "type.overflow",
  "text-transform": "type.transform",
  "text-underline-offset": "type.underline-offset",
  "white-space": "type.white-space",
  "overflow-wrap": "type.wrap",
  transition: "motion.transition",
  animation: "motion.animation",
  transform: "motion.transform",
  translate: "motion.translate",
  rotate: "motion.rotate",
  "transform-origin": "motion.origin",
  cursor: "interaction.cursor",
  "pointer-events": "interaction.pointer-events",
  "touch-action": "interaction.touch-action",
  "user-select": "interaction.selection",
  appearance: "interaction.appearance",
  "accent-color": "interaction.accent",
  "caret-color": "interaction.caret",
  "object-fit": "media.fit",
  content: "generated.content",
  "scrollbar-width": "layout.scrollbar-width",
});

const toTraitSegment = (value) => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function traitFor(property) {
  if (exactTraits[property]) return exactTraits[property];
  if (property.startsWith("border-")) return `edge.${toTraitSegment(property.slice(7))}`;
  if (property.startsWith("font-")) return `type.${toTraitSegment(property.slice(5))}`;
  if (property.startsWith("text-")) return `type.${toTraitSegment(property.slice(5))}`;
  return `layout.${toTraitSegment(property)}`;
}

function portableValue(value, tokens) {
  const direct = value.match(/^var\((--[\w-]+)\)$/);
  if (direct && tokens.length === 1) {
    return { kind: "token", token: tokens[0], value, tokens };
  }
  const literal = !value.includes("var(") && !value.includes("calc(");
  return { kind: literal ? "literal" : "expression", value, tokens };
}

/** Classify every non-internal declaration into one stable portable trait. */
export function mashPresentationFromDeclarations(declarations, tokensFor) {
  const presentation = {};
  for (const [property, value] of Object.entries(declarations)) {
    if (property.startsWith("--_")) continue;
    const trait = traitFor(property);
    if (presentation[trait]) {
      throw new Error(`Mash presentation trait ${trait} is assigned more than once in one rule.`);
    }
    const tokens = tokensFor(value);
    presentation[trait] = {
      sourceProperty: property,
      ...portableValue(value, tokens),
    };
  }
  return presentation;
}
