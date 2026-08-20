/**
 * Renderer-neutral layout vocabulary for catalogue recipes.
 *
 * These values describe how semantic Mash nodes are composed. They are not
 * component attributes and they do not create layout components: a catalogue
 * attaches them directly to slot/anatomy nodes, and each renderer translates
 * them into its own layout system.
 */

export const MASH_LAYOUT_VERSION = "2.0.0";

export const MASH_LAYOUT_VOCABULARY = Object.freeze({
  orientations: ["block", "inline", "depth"],
  groups: ["none", "contents", "flow", "grid", "overlay"],
  alignments: ["leading", "center", "trailing", "stretch", "baseline"],
  distributions: ["leading", "center", "trailing", "between", "around", "evenly", "stretch"],
  wraps: ["none", "forward", "reverse"],
  overflow: ["visible", "clip", "hidden", "auto", "scroll"],
  anchors: ["flow", "relative", "absolute", "fixed", "sticky"],
  dimensions: ["min", "ideal", "max"],
  edges: ["blockStart", "blockEnd", "inlineStart", "inlineEnd"],
  valueKinds: ["token", "literal", "expression", "inherited"],
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

const inheritedValues = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** Classify a renderer-authored value without losing its original expression. */
export function mashLayoutValue(value, tokensFor) {
  if (value === undefined) return undefined;
  const tokens = tokensFor(value);
  const direct = value.match(/^var\((--[\w-]+)\)$/);
  if (direct && tokens.length === 1) {
    return { kind: "token", token: tokens[0], value, tokens };
  }
  if (inheritedValues.has(value.trim())) return { kind: "inherited", value, tokens };
  const literal = !value.includes("var(") && !value.includes("calc(");
  return { kind: literal ? "literal" : "expression", value, tokens };
}

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
      orientation: direction.startsWith("column") ? "block" : "inline",
      reverse: direction.endsWith("reverse"),
      wrap:
        declarations["flex-wrap"] === "wrap-reverse"
          ? "reverse"
          : declarations["flex-wrap"] === "wrap"
            ? "forward"
            : "none",
    };
  } else if (display === "grid" || display === "inline-grid") {
    group = {
      kind: "grid",
      orientation: declarations["grid-auto-flow"]?.startsWith("column") ? "inline" : "block",
    };
  } else if (display === "block" || display === "inline" || display === "inline-block") {
    group = { kind: "flow", orientation: "block", wrap: "none" };
  }

  const inline = compact({
    min: mashLayoutValue(first(declarations, "min-inline-size", "min-width"), tokensFor),
    ideal: mashLayoutValue(first(declarations, "inline-size", "width"), tokensFor),
    max: mashLayoutValue(first(declarations, "max-inline-size", "max-width"), tokensFor),
  });
  const block = compact({
    min: mashLayoutValue(first(declarations, "min-block-size", "min-height"), tokensFor),
    ideal: mashLayoutValue(first(declarations, "block-size", "height"), tokensFor),
    max: mashLayoutValue(first(declarations, "max-block-size", "max-height"), tokensFor),
  });

  const allPadding = declarations.padding;
  const inlinePadding = declarations["padding-inline"];
  const blockPadding = declarations["padding-block"];
  const boxPadding = expandBox(allPadding);
  const logicalInlinePadding = expandAxis(inlinePadding);
  const logicalBlockPadding = expandAxis(blockPadding);
  const inset = compact({
    blockStart: mashLayoutValue(
      first(declarations, "padding-block-start") ??
        logicalBlockPadding.start ??
        boxPadding.blockStart,
      tokensFor,
    ),
    blockEnd: mashLayoutValue(
      first(declarations, "padding-block-end") ?? logicalBlockPadding.end ?? boxPadding.blockEnd,
      tokensFor,
    ),
    inlineStart: mashLayoutValue(
      first(declarations, "padding-inline-start") ??
        logicalInlinePadding.start ??
        boxPadding.inlineStart,
      tokensFor,
    ),
    inlineEnd: mashLayoutValue(
      first(declarations, "padding-inline-end") ?? logicalInlinePadding.end ?? boxPadding.inlineEnd,
      tokensFor,
    ),
  });

  const allMargin = declarations.margin;
  const inlineMargin = declarations["margin-inline"];
  const blockMargin = declarations["margin-block"];
  const boxMargin = expandBox(allMargin);
  const logicalInlineMargin = expandAxis(inlineMargin);
  const logicalBlockMargin = expandAxis(blockMargin);
  const margin = compact({
    blockStart: mashLayoutValue(
      first(declarations, "margin-block-start") ?? logicalBlockMargin.start ?? boxMargin.blockStart,
      tokensFor,
    ),
    blockEnd: mashLayoutValue(
      first(declarations, "margin-block-end") ?? logicalBlockMargin.end ?? boxMargin.blockEnd,
      tokensFor,
    ),
    inlineStart: mashLayoutValue(
      first(declarations, "margin-inline-start") ??
        logicalInlineMargin.start ??
        boxMargin.inlineStart,
      tokensFor,
    ),
    inlineEnd: mashLayoutValue(
      first(declarations, "margin-inline-end") ?? logicalInlineMargin.end ?? boxMargin.inlineEnd,
      tokensFor,
    ),
  });

  const allPlacement = expandBox(declarations.inset);
  const inlinePlacement = expandAxis(declarations["inset-inline"]);
  const blockPlacement = expandAxis(declarations["inset-block"]);
  const anchor = compact({
    mode: position[declarations.position],
    blockStart: mashLayoutValue(
      first(declarations, "inset-block-start") ?? blockPlacement.start ?? allPlacement.blockStart,
      tokensFor,
    ),
    blockEnd: mashLayoutValue(
      first(declarations, "inset-block-end") ?? blockPlacement.end ?? allPlacement.blockEnd,
      tokensFor,
    ),
    inlineStart: mashLayoutValue(
      first(declarations, "inset-inline-start") ??
        inlinePlacement.start ??
        allPlacement.inlineStart,
      tokensFor,
    ),
    inlineEnd: mashLayoutValue(
      first(declarations, "inset-inline-end") ?? inlinePlacement.end ?? allPlacement.inlineEnd,
      tokensFor,
    ),
    layer: mashLayoutValue(declarations["z-index"], tokensFor),
  });

  const gapValues = splitCssValues(declarations.gap);
  const blockGap = first(declarations, "row-gap") ?? gapValues[0];
  const inlineGap = first(declarations, "column-gap") ?? gapValues[1] ?? gapValues[0];
  const gap = compact({
    inline: mashLayoutValue(inlineGap, tokensFor),
    block: mashLayoutValue(blockGap, tokensFor),
  });

  const self = compact({
    align: alignment[declarations["align-self"]],
    distribute: distribution[declarations["justify-self"]],
    grow: mashLayoutValue(declarations["flex-grow"], tokensFor),
    shrink: mashLayoutValue(declarations["flex-shrink"], tokensFor),
    basis: mashLayoutValue(declarations["flex-basis"], tokensFor),
    gridRow: mashLayoutValue(declarations["grid-row"], tokensFor),
    gridColumn: mashLayoutValue(declarations["grid-column"], tokensFor),
  });

  const grid = compact({
    columns: mashLayoutValue(declarations["grid-template-columns"], tokensFor),
    rows: mashLayoutValue(declarations["grid-template-rows"], tokensFor),
    autoFlow: mashLayoutValue(declarations["grid-auto-flow"], tokensFor),
  });

  const commonOverflow = declarations.overflow;
  const semantic = compact({
    group,
    align: alignment[declarations["align-items"] ?? splitCssValues(declarations["place-items"])[0]],
    distribute:
      distribution[
        declarations["justify-content"] ?? splitCssValues(declarations["place-content"])[0]
      ],
    gap: Object.keys(gap).length > 0 ? gap : undefined,
    dimensions:
      Object.keys(inline).length > 0 || Object.keys(block).length > 0
        ? compact({ inline, block })
        : undefined,
    inset: Object.keys(inset).length > 0 ? inset : undefined,
    margin: Object.keys(margin).length > 0 ? margin : undefined,
    anchor: Object.keys(anchor).length > 0 ? anchor : undefined,
    self: Object.keys(self).length > 0 ? self : undefined,
    grid: Object.keys(grid).length > 0 ? grid : undefined,
    aspectRatio: mashLayoutValue(declarations["aspect-ratio"], tokensFor),
    overflow:
      commonOverflow || declarations["overflow-inline"] || declarations["overflow-block"]
        ? {
            inline: overflow[declarations["overflow-inline"] ?? commonOverflow],
            block: overflow[declarations["overflow-block"] ?? commonOverflow],
          }
        : undefined,
  });

  return Object.keys(semantic).length > 0 ? semantic : undefined;
}
