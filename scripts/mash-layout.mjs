/**
 * Renderer-neutral layout vocabulary for catalogue recipes.
 *
 * These values describe how semantic Mash nodes are composed. They are not
 * component attributes and they do not create layout components: a catalogue
 * attaches them directly to slot/anatomy nodes, and each renderer translates
 * them into its own layout system.
 */

export const MASH_LAYOUT_VERSION = "1.0.0";

export const MASH_LAYOUT_VOCABULARY = Object.freeze({
  axes: ["block", "inline", "depth"],
  groups: ["none", "contents", "flow", "grid", "overlay"],
  alignments: ["leading", "center", "trailing", "stretch", "baseline"],
  distributions: ["leading", "center", "trailing", "between", "around", "evenly", "stretch"],
  overflow: ["visible", "clip", "hidden", "auto", "scroll"],
  positions: ["flow", "relative", "absolute", "fixed", "sticky"],
  dimensions: ["min", "preferred", "max"],
});

const alignment = Object.freeze({
  start: "leading",
  "flex-start": "leading",
  left: "leading",
  center: "center",
  end: "trailing",
  "flex-end": "trailing",
  right: "trailing",
  stretch: "stretch",
  baseline: "baseline",
});

const distribution = Object.freeze({
  ...alignment,
  "space-between": "between",
  "space-around": "around",
  "space-evenly": "evenly",
});

const position = Object.freeze({
  static: "flow",
  relative: "relative",
  absolute: "absolute",
  fixed: "fixed",
  sticky: "sticky",
});

const overflow = Object.freeze({
  visible: "visible",
  clip: "clip",
  hidden: "hidden",
  auto: "auto",
  scroll: "scroll",
});

const measure = (value, tokensFor) =>
  value === undefined ? undefined : { value, tokens: tokensFor(value) };

const first = (declarations, ...properties) => {
  for (const property of properties) {
    if (declarations[property] !== undefined) return declarations[property];
  }
  return undefined;
};

const splitCssValues = (value) => {
  if (!value) return [];
  const values = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (/\s/.test(char) && depth === 0) {
      if (value.slice(start, index).trim()) values.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (value.slice(start).trim()) values.push(value.slice(start).trim());
  return values;
};

const expandBox = (value) => {
  const [a, b = a, c = a, d = b] = splitCssValues(value);
  return { blockStart: a, inlineEnd: b, blockEnd: c, inlineStart: d };
};

const expandAxis = (value) => {
  const [start, end = start] = splitCssValues(value);
  return { start, end };
};

const compact = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, compact(child)]),
  );
  return Object.fromEntries(
    Object.entries(result).filter(
      ([, child]) =>
        child !== undefined &&
        !(
          child &&
          typeof child === "object" &&
          !Array.isArray(child) &&
          Object.keys(child).length === 0
        ),
    ),
  );
};

/**
 * Normalize the layout-bearing subset of a Web recipe declaration into Mash
 * logical axes and semantic values. The original declarations remain in the
 * recipe as the Web realization; this is the portable composition contract.
 */
export function mashLayoutFromDeclarations(declarations, tokensFor) {
  const display = declarations.display;
  const direction = declarations["flex-direction"] ?? "row";
  let group;
  if (display === "none") group = { kind: "none" };
  else if (display === "contents") group = { kind: "contents" };
  else if (display === "flex" || display === "inline-flex") {
    group = {
      kind: "flow",
      axis: direction.startsWith("column") ? "block" : "inline",
      reverse: direction.endsWith("reverse"),
      wrap: declarations["flex-wrap"] === "wrap",
    };
  } else if (display === "grid" || display === "inline-grid") {
    group = {
      kind: "grid",
      axis: declarations["grid-auto-flow"]?.startsWith("column") ? "inline" : "block",
    };
  } else if (display === "block" || display === "inline" || display === "inline-block") {
    group = { kind: "flow", axis: "block" };
  }

  const inline = compact({
    min: measure(first(declarations, "min-inline-size", "min-width"), tokensFor),
    preferred: measure(first(declarations, "inline-size", "width"), tokensFor),
    max: measure(first(declarations, "max-inline-size", "max-width"), tokensFor),
  });
  const block = compact({
    min: measure(first(declarations, "min-block-size", "min-height"), tokensFor),
    preferred: measure(first(declarations, "block-size", "height"), tokensFor),
    max: measure(first(declarations, "max-block-size", "max-height"), tokensFor),
  });

  const allPadding = declarations.padding;
  const inlinePadding = declarations["padding-inline"];
  const blockPadding = declarations["padding-block"];
  const boxPadding = expandBox(allPadding);
  const logicalInlinePadding = expandAxis(inlinePadding);
  const logicalBlockPadding = expandAxis(blockPadding);
  const inset = compact({
    blockStart: measure(
      first(declarations, "padding-block-start") ??
        logicalBlockPadding.start ??
        boxPadding.blockStart,
      tokensFor,
    ),
    blockEnd: measure(
      first(declarations, "padding-block-end") ?? logicalBlockPadding.end ?? boxPadding.blockEnd,
      tokensFor,
    ),
    inlineStart: measure(
      first(declarations, "padding-inline-start") ??
        logicalInlinePadding.start ??
        boxPadding.inlineStart,
      tokensFor,
    ),
    inlineEnd: measure(
      first(declarations, "padding-inline-end") ?? logicalInlinePadding.end ?? boxPadding.inlineEnd,
      tokensFor,
    ),
  });

  const commonOverflow = declarations.overflow;
  const semantic = compact({
    group,
    align: alignment[declarations["align-items"] ?? declarations["align-self"]],
    justify: distribution[declarations["justify-content"] ?? declarations["justify-self"]],
    gap: measure(declarations.gap, tokensFor),
    dimensions:
      Object.keys(inline).length > 0 || Object.keys(block).length > 0
        ? compact({ inline, block })
        : undefined,
    inset: Object.keys(inset).length > 0 ? inset : undefined,
    overflow:
      commonOverflow || declarations["overflow-inline"] || declarations["overflow-block"]
        ? {
            inline: overflow[declarations["overflow-inline"] ?? commonOverflow],
            block: overflow[declarations["overflow-block"] ?? commonOverflow],
          }
        : undefined,
    position: position[declarations.position],
  });

  return Object.keys(semantic).length > 0 ? semantic : undefined;
}
