import { buildBadge } from "./build-info.js";
import { controlsFor, defaultState, type Control } from "./controls.js";
import { el } from "./dom.js";
import { controlsPreviewAllowed, exampleNamed, examplesFor } from "./examples.js";
import { familiesFor } from "./families.js";
import {
  compatibleTokens,
  findOverride,
  layoutChoicesForProperty,
  layoutIntentForProperty,
  overrideForRule,
  playgroundStyle,
  portableConditions,
  recipePatch,
  removeOverride,
  tokenReferences,
  upsertOverride,
  validateRecipeValue,
  type RecipeOverride,
  type RecipePatchValue,
  type RecipeValueKind,
} from "./recipe-patch.js";
import {
  components,
  catalogueNodeFor,
  componentForNode,
  layoutRulesFor,
  provenance,
  recipeRulesFor,
  themes,
  tokenByCssVar,
  tokens,
  valueOf,
  type ComponentSchema,
  type Described,
  type MashBinding,
  type MashLayoutValue,
  type MashNode,
  type MashRecipeRule,
} from "./schema.js";

export interface State {
  tagName: string;
  attrs: Record<string, string | boolean>;
  theme: string;
  /** Content projected into each declared slot, including the default `""` slot. */
  slots: Record<string, string>;
  /**
   * Name of the `@example` being shown, or null for the controls-driven
   * preview. Components that ship examples open on their first one, since a
   * curated demo is a better first impression than an empty element.
   */
  example: string | null;
  /** Globally stable semantic node selected in the SurfaceTree inspector. */
  node: string | null;
  /** Optional Web binding selected through a concrete preview realization. */
  binding: string | null;
  density: "compact" | "comfortable" | "spacious";
  edits: RecipeOverride[];
}

export function initialState(component: ComponentSchema): State {
  return {
    tagName: component.tagName,
    attrs: defaultState(component),
    theme: themes[0] ?? "light",
    slots: Object.fromEntries(
      component.slots.map((slot) => [slot.name, slot.name ? "" : defaultSlotContent(component)]),
    ),
    example: examplesFor(component)[0]?.name ?? null,
    node: null,
    binding: null,
    density: "comfortable",
    edits: [],
  };
}

function defaultSlotContent(component: ComponentSchema): string {
  const role = component.slots.find((slot) => slot.name === "")?.mash?.role;
  if (!role || !["content", "label", "title", "description", "message", "value"].includes(role)) {
    return "";
  }
  const bare = component.tagName.replace(/^[a-z]+-/, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** `dist/confirm/register.js` in `@mash/shrine` -> `@mash/shrine/confirm/register`. */
function importSpecifier(component: ComponentSchema): string {
  if (!component.registerPath) return component.packageName;
  const subpath = component.registerPath.replace(/^dist\//, "").replace(/\.js$/, "");
  return `${component.packageName}/${subpath}`;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Build the live element from the current state.
 *
 * Takes the target `Document` because the preview lives inside the stage
 * iframe: nodes have to be created by the document that will own them.
 */
export function buildPreview(doc: Document, component: ComponentSchema, state: State): HTMLElement {
  const node = doc.createElement(component.tagName);

  for (const [name, value] of Object.entries(state.attrs)) {
    if (value === false) {
      const attribute = component.attributes.find((candidate) => candidate.name === name);
      const property = attribute?.fieldName;
      if (property) (node as unknown as Record<string, unknown>)[property] = false;
    }
    if (value === false || value === "") continue;
    node.setAttribute(name, value === true ? "" : String(value));
  }

  for (const slot of component.slots) {
    const content = state.slots[slot.name];
    if (!content) continue;

    if (!slot.name) {
      node.append(doc.createTextNode(content));
      continue;
    }

    const fill = doc.createElement("span");
    fill.slot = slot.name;
    fill.className = "slot-fill";
    fill.textContent = content;
    node.append(fill);
  }

  return node;
}

/** The markup a consumer would write to reproduce what is on the stage. */
export function markupFor(component: ComponentSchema, state: State): string {
  const example = exampleNamed(component, state.example);
  if (example) return example.code;

  const controls = controlsFor(component);
  const attrs = controls
    .filter((control) => state.attrs[control.attribute] !== control.fallback)
    .map((control) => {
      const value = state.attrs[control.attribute];
      return value === true ? control.attribute : `${control.attribute}="${String(value)}"`;
    });

  const open = [component.tagName, ...attrs].join(attrs.length > 1 ? "\n  " : " ");
  const children = component.slots
    .filter((slot) => state.slots[slot.name])
    .map((slot) =>
      slot.name
        ? `  <span slot="${slot.name}">${state.slots[slot.name]}</span>`
        : `  ${state.slots[slot.name]}`,
    );

  return `<${open}>\n${children.join("\n")}\n</${component.tagName}>`;
}

// ---------------------------------------------------------------------------
// Token provenance
// ---------------------------------------------------------------------------

/**
 * Which design tokens a rendered component's active styling contract uses.
 *
 * A headless component has only technical baseline CSS in its own shadow root;
 * visual tokens belong to the explicitly imported catalogue recipe. Read both
 * sources rather than keeping a duplicate token list, so the catalogue stays
 * honest when a recipe evolves.
 *
 * Works across the iframe boundary because the stage is same-origin.
 */
function selectorMatchesInstance(node: Element, selector: string): boolean {
  const part = selector.match(/^(.*)::part\(([^)]+)\)(.*)$/);
  try {
    if (!part) return node.matches(selector.trim());
    if (!node.matches(part[1]!.trim())) return false;
    const stateSelector = part[3]!.trim();
    const targets = node.shadowRoot?.querySelectorAll(`[part~="${part[2]}"]`) ?? [];
    return [...targets].some((target) => !stateSelector || target.matches(stateSelector));
  } catch {
    return false;
  }
}

function tokensUsedBy(nodes: Element[]): string[] {
  const componentCss = nodes
    .flatMap((node) =>
      node.shadowRoot
        ? [...node.shadowRoot.adoptedStyleSheets].flatMap((sheet) => {
            try {
              return [...sheet.cssRules].map((rule) => rule.cssText);
            } catch {
              return [];
            }
          })
        : [],
    )
    .join("\n");

  const tagNames = new Set(nodes.map((node) => node.localName));
  const tagPattern = new RegExp(`(^|[^\\w-])(${[...tagNames].join("|")})(?=$|[^\\w-])`);
  const rules = (cssRules: CSSRuleList | CSSRule[]): CSSRule[] =>
    [...cssRules].flatMap((rule) => {
      const nested = "cssRules" in rule ? rules((rule as CSSGroupingRule).cssRules) : [];
      return [rule, ...nested];
    });
  const recipeCss = nodes[0]
    ? [...nodes[0].ownerDocument.styleSheets]
        .flatMap((sheet) => {
          try {
            return rules(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter(
          (rule): rule is CSSStyleRule =>
            "selectorText" in rule &&
            tagPattern.test((rule as CSSStyleRule).selectorText) &&
            (rule as CSSStyleRule).selectorText
              .split(",")
              .some((selector) => nodes.some((node) => selectorMatchesInstance(node, selector))),
        )
        .map((rule) => rule.cssText)
        .join("\n")
    : "";

  const cssText = [componentCss, recipeCss].join("\n");

  const found = new Set<string>();
  for (const match of cssText.matchAll(/var\((--[\w-]+)/g)) {
    const name = match[1];
    if (name && tokenByCssVar.has(name)) found.add(name);
  }
  return [...found].sort();
}

function recipeSpecifier(component: ComponentSchema): string {
  return component.packageName === "@mash/shrine"
    ? "@mash/shrine/catalogue/mash.css"
    : "@mash/ui/catalogue/mash.css";
}

function swatch(value: string): HTMLElement | null {
  return value.startsWith("oklch(")
    ? el("span", { class: "swatch", style: `background:${value}` })
    : null;
}

function provenanceRow(cssVar: string, theme: string): HTMLElement {
  const token = tokenByCssVar.get(cssVar)!;
  const steps = provenance(token, theme);
  const final = steps.at(-1);

  return el(
    "li",
    { class: "provenance" },
    el(
      "div",
      { class: "provenance-head" },
      el("code", { class: "token-var", text: cssVar }),
      final ? swatch(final.value) : null,
      el("span", { class: "token-value", text: final?.value ?? "" }),
    ),
    el(
      "ol",
      { class: "provenance-chain" },
      ...steps.map((step) =>
        el(
          "li",
          {},
          el("span", { class: `layer layer-${step.layer}`, text: step.layer }),
          el("code", { text: step.id }),
        ),
      ),
    ),
    token.description ? el("p", { class: "token-description", text: token.description }) : null,
  );
}

// ---------------------------------------------------------------------------
// API tables
// ---------------------------------------------------------------------------

function describedList(title: string, items: Described[], emptyNote: string): HTMLElement {
  if (items.length === 0) {
    return el(
      "section",
      { class: "api-block api-block-empty" },
      el("h3", { text: title }),
      el("p", { class: "note", text: emptyNote }),
    );
  }

  return el(
    "section",
    { class: "api-block" },
    el("h3", { text: title }),
    el(
      "dl",
      {},
      ...items.flatMap((item) => [
        el("dt", {}, el("code", { text: item.name || "(default)" })),
        el("dd", { text: item.description ?? "" }),
      ]),
    ),
  );
}

function attributeTable(component: ComponentSchema): HTMLElement {
  return el(
    "section",
    { class: "api-block" },
    el("h3", { text: "Attributes" }),
    el(
      "table",
      {},
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          el("th", { text: "Name" }),
          el("th", { text: "Type" }),
          el("th", { text: "Default" }),
          el("th", { text: "Description" }),
        ),
      ),
      el(
        "tbody",
        {},
        ...component.attributes.map((attribute) =>
          el(
            "tr",
            {},
            el("td", {}, el("code", { text: attribute.name })),
            el("td", {}, el("code", { class: "type", text: attribute.type?.text ?? "" })),
            el("td", {}, el("code", { text: attribute.default ?? "" })),
            el("td", { text: attribute.description ?? "" }),
          ),
        ),
      ),
    ),
  );
}

let showSurfaceTree = false;

function measureLabel(measure: MashLayoutValue): string {
  const source =
    measure.token ?? (measure.tokens.length > 0 ? measure.tokens.join(" + ") : measure.value);
  return `${source} [${measure.kind}]`;
}

function layoutLabels(rules: MashRecipeRule[]): string[] {
  const labels = new Set<string>();
  for (const rule of rules) {
    const layout = rule.layout;
    if (!layout) continue;
    if (layout.group) {
      labels.add(
        `group ${layout.group.kind}${layout.group.orientation ? `:${layout.group.orientation}` : ""}${layout.group.wrap && layout.group.wrap !== "none" ? ` wrap:${layout.group.wrap}` : ""}`,
      );
    }
    if (layout.align) labels.add(`align ${layout.align}`);
    if (layout.distribute) labels.add(`distribute ${layout.distribute}`);
    if (layout.gap?.inline) labels.add(`gap inline ${measureLabel(layout.gap.inline)}`);
    if (layout.gap?.block) labels.add(`gap block ${measureLabel(layout.gap.block)}`);
    for (const axis of ["inline", "block"] as const) {
      const dimensions = layout.dimensions?.[axis];
      if (!dimensions) continue;
      for (const bound of ["min", "ideal", "max"] as const) {
        const measure = dimensions[bound];
        if (measure) labels.add(`${axis} ${bound} ${measureLabel(measure)}`);
      }
    }
    for (const region of ["inset", "margin", "anchor"] as const) {
      const edges = layout[region];
      if (!edges) continue;
      for (const edge of ["blockStart", "blockEnd", "inlineStart", "inlineEnd"] as const) {
        const measure = edges[edge];
        if (measure) labels.add(`${region} ${edge} ${measureLabel(measure)}`);
      }
    }
    if (layout.anchor?.mode) labels.add(`anchor ${layout.anchor.mode}`);
    if (layout.anchor?.layer) labels.add(`layer ${measureLabel(layout.anchor.layer)}`);
    if (layout.self?.align) labels.add(`self align ${layout.self.align}`);
    if (layout.self?.distribute) labels.add(`self distribute ${layout.self.distribute}`);
    if (layout.self?.basis) labels.add(`self basis ${measureLabel(layout.self.basis)}`);
    if (layout.self?.grow) labels.add(`self grow ${measureLabel(layout.self.grow)}`);
    if (layout.self?.shrink) labels.add(`self shrink ${measureLabel(layout.self.shrink)}`);
    if (layout.self?.gridRow) labels.add(`grid row ${measureLabel(layout.self.gridRow)}`);
    if (layout.self?.gridColumn) labels.add(`grid column ${measureLabel(layout.self.gridColumn)}`);
    if (layout.grid?.columns) labels.add(`grid columns ${measureLabel(layout.grid.columns)}`);
    if (layout.grid?.rows) labels.add(`grid rows ${measureLabel(layout.grid.rows)}`);
    if (layout.grid?.autoFlow) labels.add(`grid flow ${measureLabel(layout.grid.autoFlow)}`);
    if (layout.aspectRatio) labels.add(`aspect ${measureLabel(layout.aspectRatio)}`);
    if (layout.overflow?.inline) labels.add(`overflow inline ${layout.overflow.inline}`);
    if (layout.overflow?.block) labels.add(`overflow block ${layout.overflow.block}`);
  }
  return [...labels];
}

function conditionLabel(condition: MashRecipeRule["when"]["conditions"][number]): string {
  if (condition.kind === "node") {
    const node = condition.nodeAddress.split("/node/").at(-1);
    return `when ${node} ${condition.operator}${condition.value ? ` ${condition.value}` : ""}`;
  }
  if (condition.kind === "interaction") {
    return `when ${condition.active ? "" : "not "}${condition.state}`;
  }
  if (condition.kind === "environment") {
    return `when ${condition.feature} ${condition.value}`;
  }
  if (condition.kind === "context") {
    return `when context ${condition.name} ${condition.operator}${condition.value ? ` ${condition.value}` : ""}`;
  }
  return `web-only ${condition.selector}`;
}

function bindingValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function fallbackLabel(binding: MashBinding): string | null {
  if (binding.default.kind === "value") return `default ${bindingValue(binding.default.value)}`;
  if (binding.fallback.kind === "empty") return "fallback empty";
  if (binding.fallback.kind === "literal") {
    return `fallback ${bindingValue(binding.fallback.value)}`;
  }
  if (binding.fallback.kind === "binding") {
    return `fallback ${binding.fallback.bindingAddress.split("/binding/").at(-1)}`;
  }
  if (binding.fallback.kind === "chain") {
    return `fallback ${binding.fallback.bindingAddresses
      .map((address) => address.split("/binding/").at(-1))
      .join(" → ")}`;
  }
  return null;
}

function eventRelationLabels(binding: MashBinding): string[] {
  return (binding.relations ?? []).map(
    (relation) =>
      `${relation.kind} ${relation.path.join(".")} → ${relation.nodeAddress.split("/node/").at(-1)}`,
  );
}

function bindingName(component: ComponentSchema, binding: MashBinding): string {
  const base = `${binding.kind}:${binding.name || "default"}`;
  if (binding.kind !== "attribute") return base;
  const property = component.attributes.find(
    (attribute) => attribute.mash?.address === binding.address,
  )?.fieldName;
  return property && property !== binding.name ? `${base} ↔ property:${property}` : base;
}

function setSurfaceHighlight(
  frame: HTMLIFrameElement,
  address: string | null,
  bindingAddress: string | null = null,
  showAll = showSurfaceTree,
): void {
  const boxes = frame.contentDocument?.querySelectorAll<HTMLElement>(".mash-semantic-box") ?? [];
  for (const box of boxes) {
    const bindings = JSON.parse(box.dataset.mashBindingAddresses ?? "[]") as string[];
    const selected =
      box.dataset.mashNodeAddress === address &&
      (!bindingAddress || bindings.includes(bindingAddress));
    box.hidden = !(showAll || selected);
    box.dataset.selected = selected ? "true" : "false";
  }
}

function tokenTrace(tokenId: string, theme: string): string {
  const token = tokens[tokenId];
  if (!token) return tokenId;
  return provenance(token, theme)
    .map((step) => `${step.id} = ${step.value}`)
    .join(" → ");
}

function portableExpression(value: string): string {
  return value.replace(/var\((--[\w-]+)\)/g, (source, cssVar: string) => {
    const token = tokenByCssVar.get(cssVar);
    return token ? `{${token.id}}` : source;
  });
}

function originalPatchValue(
  presentation: MashRecipeRule["presentation"][string],
): RecipePatchValue {
  if (presentation.kind === "token" && presentation.token) {
    return { kind: "token", token: presentation.token };
  }
  return {
    kind: presentation.kind,
    value:
      presentation.kind === "expression"
        ? portableExpression(presentation.value)
        : presentation.value,
    ...(presentation.kind === "expression" ? { tokens: presentation.tokens } : {}),
  };
}

function valueForKind(
  kind: RecipeValueKind,
  current: RecipePatchValue,
  tokenOptions: ReturnType<typeof compatibleTokens>,
): RecipePatchValue {
  if (kind === "token") return { kind, token: current.token ?? tokenOptions[0]?.id ?? "" };
  if (kind === "inherited") return { kind, value: "inherit" };
  const currentValue = current.value ?? "";
  if (kind === "expression") {
    const value =
      current.kind === "expression"
        ? currentValue
        : tokenOptions[0]
          ? `{${tokenOptions[0].id}}`
          : "calc(1 * 1)";
    return { kind, value, tokens: tokenReferences(value) };
  }
  return { kind, value: current.kind === "literal" ? currentValue || "initial" : "initial" };
}

function copyPatchButton(patch: string): HTMLElement {
  const button = el("button", {
    type: "button",
    class: "copy-link",
    text: "copy portable patch",
  });
  button.addEventListener("click", () => {
    const restore = () =>
      globalThis.setTimeout(() => (button.textContent = "copy portable patch"), 1200);
    navigator.clipboard?.writeText(patch).then(
      () => {
        button.textContent = "copied";
        restore();
      },
      () => {
        button.textContent = "copy failed";
        restore();
      },
    );
  });
  return button;
}

function recipeEditor(
  state: State,
  callbacks: AppCallbacks,
  node: MashNode,
  rules: MashRecipeRule[],
): HTMLElement {
  const patch = JSON.stringify(recipePatch(state.edits), null, 2);
  const renderField = (
    ruleIndex: number,
    trait: string,
    presentation: MashRecipeRule["presentation"][string],
  ) => {
    const original = originalPatchValue(presentation);
    const withValue = overrideForRule(node.address, trait, rules, ruleIndex, original);
    const { value: _value, ...target } = withValue;
    const override = findOverride(state.edits, target);
    const current = override?.value ?? original;
    const tokenOptions = compatibleTokens(trait, presentation.tokens);
    const error = el("span", { class: "recipe-field-error" });
    const commit = (value: RecipePatchValue) => {
      if (value.kind === "expression" && value.value) value.tokens = tokenReferences(value.value);
      const problem = validateRecipeValue(
        value,
        trait,
        presentation.sourceProperty,
        presentation.tokens,
        (property, candidate) => CSS.supports(property, candidate),
      );
      error.textContent = problem ?? "";
      if (problem) return;
      callbacks.update({
        edits: upsertOverride(
          state.edits,
          overrideForRule(node.address, trait, rules, ruleIndex, value),
        ),
      });
    };
    const valueControl =
      current.kind === "token"
        ? el(
            "select",
            {
              class: "recipe-value-control",
              onchange: (event: Event) =>
                commit({ kind: "token", token: (event.target as HTMLSelectElement).value }),
            },
            ...(tokenOptions.length
              ? tokenOptions.map((token) =>
                  el("option", {
                    value: token.id,
                    selected: token.id === current.token,
                    text: `${token.id} · ${valueOf(token, state.theme)}`,
                  }),
                )
              : [el("option", { disabled: true, text: "No compatible token type" })]),
          )
        : current.kind === "inherited"
          ? el(
              "select",
              {
                class: "recipe-value-control",
                onchange: (event: Event) =>
                  commit({ kind: "inherited", value: (event.target as HTMLSelectElement).value }),
              },
              ...["inherit", "initial", "unset", "revert", "revert-layer"].map((value) =>
                el("option", {
                  value,
                  selected: value === current.value,
                  text: value,
                }),
              ),
            )
          : el("input", {
              class: "recipe-value-control",
              type: "text",
              value: current.value ?? "",
              onchange: (event: Event) =>
                commit({
                  kind: current.kind,
                  value: (event.target as HTMLInputElement).value,
                }),
            });
    const layoutIntents = layoutIntentForProperty(presentation.sourceProperty);
    const layoutChoices = layoutChoicesForProperty(presentation.sourceProperty);
    const renderedValueControl =
      current.kind === "literal" && layoutChoices.length > 0
        ? el(
            "select",
            {
              class: "recipe-value-control",
              onchange: (event: Event) =>
                commit({ kind: "literal", value: (event.target as HTMLSelectElement).value }),
            },
            ...(!current.value || layoutChoices.includes(current.value)
              ? []
              : [
                  el("option", {
                    selected: true,
                    disabled: true,
                    value: current.value,
                    text: `original ${current.value}`,
                  }),
                ]),
            ...layoutChoices.map((value) =>
              el("option", {
                value,
                selected: value === current.value,
                text: value,
              }),
            ),
          )
        : valueControl;

    return el(
      "div",
      {
        class: override ? "recipe-field is-overridden" : "recipe-field",
        "data-recipe-trait": trait,
      },
      el(
        "div",
        { class: "recipe-field-heading" },
        el("code", { text: trait }),
        override ? el("span", { class: "recipe-override-badge", text: "overridden" }) : null,
        ...layoutIntents.map((intent) =>
          el("span", { class: "layout-chip", text: `layout.${intent}` }),
        ),
      ),
      el("span", {
        class: "recipe-field-original",
        text: `${presentation.sourceProperty} · original ${presentation.token ?? presentation.value} [${presentation.kind}]`,
      }),
      el(
        "div",
        { class: "recipe-field-controls" },
        el(
          "select",
          {
            class: "recipe-kind-control",
            onchange: (event: Event) =>
              commit(
                valueForKind(
                  (event.target as HTMLSelectElement).value as RecipeValueKind,
                  current,
                  tokenOptions,
                ),
              ),
          },
          ...(["token", "literal", "expression", "inherited"] as const).map((kind) =>
            el("option", {
              value: kind,
              selected: kind === current.kind,
              disabled: kind === "token" && tokenOptions.length === 0,
              text: kind,
            }),
          ),
        ),
        renderedValueControl,
        override
          ? el("button", {
              type: "button",
              class: "recipe-reset",
              text: "reset",
              onclick: () => callbacks.update({ edits: removeOverride(state.edits, target) }),
            })
          : null,
      ),
      error,
    );
  };

  return el(
    "section",
    { class: "recipe-editor" },
    el(
      "div",
      { class: "recipe-editor-heading" },
      el(
        "div",
        {},
        el("h5", { text: "Live recipe" }),
        el("span", { text: `${state.edits.length} edits` }),
      ),
      copyPatchButton(patch),
      state.edits.length
        ? el("button", {
            type: "button",
            class: "recipe-reset",
            text: "clear all",
            onclick: () => callbacks.update({ edits: [] }),
          })
        : null,
    ),
    el("p", {
      class: "note",
      text: "Controls come from portable recipe traits and typed token metadata. Each edit stays scoped to this semantic node and recipe condition.",
    }),
    ...rules.map((rule, ruleIndex) =>
      el(
        "details",
        {
          class: "recipe-editor-rule",
          "data-editor-rule-index": ruleIndex,
          open: ruleIndex === 0,
        },
        el(
          "summary",
          {},
          el("span", { class: "surface-rule-state", text: "awaiting preview" }),
          el("span", {
            text: portableConditions(rule).map(conditionLabel).join(" · ") || "default condition",
          }),
        ),
        el(
          "div",
          { class: "recipe-editor-fields" },
          ...Object.entries(rule.presentation).map(([trait, presentation]) =>
            renderField(ruleIndex, trait, presentation),
          ),
        ),
      ),
    ),
    el(
      "details",
      { class: "recipe-patch-export" },
      el("summary", { text: "Portable recipe patch" }),
      el("pre", { class: "code" }, el("code", { text: patch })),
    ),
  );
}

function selectedNodeInspector(state: State, callbacks: AppCallbacks): HTMLElement | null {
  if (!state.node) return null;
  const owner = componentForNode(state.node);
  const node = owner?.mash?.nodes.find((candidate) => candidate.address === state.node);
  if (!owner || !node) return null;

  const parent = owner.mash?.nodes.find((candidate) => candidate.address === node.parent);
  const children = owner.mash?.nodes.filter((candidate) => candidate.parent === node.address) ?? [];
  const rules = recipeRulesFor(owner.packageName, node.address);
  const ruleTokens = [
    ...new Set(
      rules.flatMap((rule) =>
        Object.values(rule.presentation).flatMap((presentation) => presentation.tokens),
      ),
    ),
  ].sort();

  return el(
    "article",
    { class: "surface-selection", "data-selected-node-address": node.address },
    el(
      "div",
      { class: "surface-selection-heading" },
      el("div", {}, el("h4", { text: node.id }), el("code", { text: node.address })),
      el("span", { class: "surface-realization-summary", text: "awaiting preview" }),
    ),
    el(
      "dl",
      { class: "surface-selection-facts" },
      el("div", {}, el("dt", { text: "contract" }), el("dd", { text: owner.tagName })),
      el("div", {}, el("dt", { text: "role" }), el("dd", { text: node.role })),
      el("div", {}, el("dt", { text: "family" }), el("dd", { text: node.family })),
      el("div", {}, el("dt", { text: "ownership" }), el("dd", { text: node.ownership })),
      el("div", {}, el("dt", { text: "shared" }), el("dd", { text: String(node.shared) })),
      el(
        "div",
        {},
        el("dt", { text: "topology" }),
        el("dd", {
          text: `${parent ? `parent ${parent.id}` : "root"} · ${children.length ? `children ${children.map((child) => child.id).join(", ")}` : "leaf"}`,
        }),
      ),
    ),
    el("h5", { text: `Bindings (${node.bindings.length})` }),
    el(
      "div",
      { class: "surface-selection-bindings" },
      ...(node.bindings.length
        ? node.bindings.map((binding) =>
            el(
              "div",
              {
                class:
                  binding.address === state.binding
                    ? "surface-binding-detail is-selected"
                    : "surface-binding-detail",
                "data-selected-binding-address": binding.address,
              },
              el("code", { text: bindingName(owner, binding) }),
              el("span", {
                text: `${binding.mapping} · ${binding.availability} · ${binding.direction}`,
              }),
              el("span", { text: `value ${binding.value.kind}` }),
              fallbackLabel(binding) ? el("span", { text: fallbackLabel(binding)! }) : null,
              ...eventRelationLabels(binding).map((label) => el("span", { text: label })),
              el("strong", { class: "surface-binding-effective", text: "awaiting preview" }),
            ),
          )
        : [el("p", { class: "note", text: "Semantic-only node with no Web binding." })]),
    ),
    el("h5", { text: `Recipe provenance (${rules.length})` }),
    el(
      "div",
      { class: "surface-selection-rules" },
      ...(rules.length
        ? rules.map((rule, index) =>
            el(
              "details",
              {
                class: "surface-rule",
                "data-selected-rule-index": index,
              },
              el(
                "summary",
                {},
                el("span", { class: "surface-rule-state", text: "awaiting preview" }),
                el("code", { text: rule.when.web.selector }),
              ),
              el(
                "div",
                { class: "surface-rule-body" },
                ...rule.when.conditions.map((condition) =>
                  el("code", { class: "layout-chip", text: conditionLabel(condition) }),
                ),
                ...layoutLabels([rule]).map((label) =>
                  el("code", { class: "layout-chip", text: label }),
                ),
                ...Object.entries(rule.presentation).map(([trait, presentation]) =>
                  el("code", {
                    class: "surface-trait",
                    text: `${trait} ← ${presentation.token ?? presentation.value} [${presentation.kind}]`,
                  }),
                ),
              ),
            ),
          )
        : [el("p", { class: "note", text: "No direct recipe; this node is contract-only." })]),
    ),
    el("h5", { text: `Token provenance (${ruleTokens.length})` }),
    el(
      "ul",
      { class: "surface-token-traces" },
      ...(ruleTokens.length
        ? ruleTokens.map((token) =>
            el("li", {}, el("code", { text: tokenTrace(token, state.theme) })),
          )
        : [el("li", { class: "note", text: "No token dependency on this node." })]),
    ),
    recipeEditor(state, callbacks, node, rules),
  );
}

function mashContractTree(
  component: ComponentSchema,
  state: State,
  callbacks: AppCallbacks,
  frame: HTMLIFrameElement,
): HTMLElement {
  const nodes = component.mash?.nodes ?? [];
  const children = new Map<string | undefined, MashNode[]>();
  for (const node of nodes) {
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node);
    children.set(node.parent, siblings);
  }

  const renderNodes = (parent?: string): HTMLElement =>
    el(
      "ol",
      { class: parent ? "surface-tree-children" : "surface-tree" },
      ...(children.get(parent) ?? []).map((node) => {
        const catalogueNode = catalogueNodeFor(component.packageName, node.address);
        const coverage = `${catalogueNode?.coverage ?? "contract-only"} · ${catalogueNode?.layout ?? "unconstrained"}`;
        const select = () => callbacks.update({ node: node.address, binding: null });
        const row = el(
          "div",
          {
            class: node.address === state.node ? "surface-node is-selected" : "surface-node",
            role: "button",
            tabindex: "0",
            "aria-pressed": String(node.address === state.node),
            "data-mash-node-address": node.address,
            onmouseenter: () => setSurfaceHighlight(frame, node.address),
            onmouseleave: () => setSurfaceHighlight(frame, state.node, state.binding),
            onclick: select,
            onkeydown: (event: KeyboardEvent) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              select();
            },
          },
          el(
            "div",
            { class: "surface-node-identity" },
            el("code", { class: "surface-node-id", text: node.id }),
            el("code", { class: "surface-node-role", text: node.role }),
            el("span", { class: "surface-node-owner", text: node.ownership }),
          ),
          el(
            "div",
            { class: "surface-node-layout", "data-mash-layout-address": node.address },
            el("span", { class: "layout-empty", text: `${coverage} · awaiting preview` }),
          ),
          el(
            "div",
            { class: "surface-node-bindings" },
            ...(node.bindings.length > 0
              ? node.bindings.map((binding) =>
                  el(
                    "div",
                    {
                      class: "surface-binding",
                      "data-mash-binding-address": binding.address,
                    },
                    el("code", {
                      class: "surface-binding-name",
                      text: bindingName(component, binding),
                    }),
                    el("span", { text: binding.mapping }),
                    el("span", { text: binding.availability }),
                    el("span", { text: binding.direction }),
                    fallbackLabel(binding)
                      ? el("span", {
                          class: "surface-binding-fallback",
                          text: fallbackLabel(binding)!,
                        })
                      : null,
                    ...eventRelationLabels(binding).map((label) =>
                      el("span", { class: "surface-binding-report", text: label }),
                    ),
                    el("span", { class: "surface-binding-effective", text: "awaiting preview" }),
                  ),
                )
              : [el("span", { text: "semantic only" })]),
          ),
        );
        return el("li", {}, row, children.has(node.address) ? renderNodes(node.address) : null);
      }),
    );

  const toggle = el("button", {
    type: "button",
    class: showSurfaceTree ? "surface-toggle is-active" : "surface-toggle",
    text: showSurfaceTree ? "hide semantic map" : "show semantic map",
    onclick: () => {
      showSurfaceTree = !showSurfaceTree;
      toggle.classList.toggle("is-active", showSurfaceTree);
      toggle.textContent = showSurfaceTree ? "hide semantic map" : "show semantic map";
      setSurfaceHighlight(frame, state.node, state.binding, showSurfaceTree);
    },
  });

  return el(
    "section",
    { class: "api-block surface-tree-block" },
    el("div", { class: "surface-tree-heading" }, el("h3", { text: "SurfaceTree" }), toggle),
    el("p", {
      class: "note surface-contract-note",
      text: component.mash
        ? `${component.mash.address} · contract v${component.mash.version} · Web bindings, fallbacks, portable conditions, presentation, layout, and tokens are generated from the package contract`
        : "No renderer-neutral contract metadata.",
    }),
    selectedNodeInspector(state, callbacks),
    nodes.length > 0 ? renderNodes() : null,
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function controlField(
  control: Control,
  state: State,
  onChange: (attribute: string, value: string | boolean) => void,
): HTMLElement {
  const label = el("span", { class: "control-label", text: control.attribute });
  const hint = control.description
    ? el("span", { class: "control-hint", text: control.description })
    : null;

  if (control.kind === "enum") {
    return el(
      "div",
      { class: "control" },
      label,
      el(
        "div",
        { class: "segmented" },
        ...control.options.map((option) =>
          el("button", {
            type: "button",
            class: state.attrs[control.attribute] === option ? "segment is-active" : "segment",
            text: option,
            onclick: () => onChange(control.attribute, option),
          }),
        ),
      ),
      hint,
    );
  }

  if (control.kind === "boolean") {
    return el(
      "div",
      { class: "control" },
      el(
        "label",
        { class: "toggle" },
        el("input", {
          type: "checkbox",
          checked: state.attrs[control.attribute] === true,
          onchange: (event: Event) =>
            onChange(control.attribute, (event.target as HTMLInputElement).checked),
        }),
        el("span", { text: control.attribute }),
      ),
      hint,
    );
  }

  return el(
    "div",
    { class: "control" },
    label,
    el("input", {
      type: "text",
      class: "text-input",
      value: String(state.attrs[control.attribute] ?? ""),
      oninput: (event: Event) =>
        onChange(control.attribute, (event.target as HTMLInputElement).value),
    }),
    hint,
  );
}

// ---------------------------------------------------------------------------
// The stage frame
// ---------------------------------------------------------------------------

/**
 * The preview runs in an iframe.
 *
 * A component is allowed to be full-page — `sh-triptych` is `100dvh` — and
 * there is no CSS the catalog can write that bounds a viewport unit. Giving the
 * preview its own document gives it its own viewport, so `100dvh` means the
 * height of the frame.
 *
 * The cost is that the frame must never be re-parented: moving an iframe in the
 * DOM discards its browsing context and reloads it. That is why the page below
 * is mounted once and then updated in place, rather than re-rendered wholesale
 * on every keystroke.
 */
const STAGE_URL = "/stage.html";

function frameDocument(frame: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve) => {
    const ready = () => {
      const doc = frame.contentDocument;
      // stage.ts sets this after registering components, so this resolves only
      // once the frame's own registry is populated.
      return doc?.documentElement?.dataset.stageReady === "true" ? doc : null;
    };

    const settled = ready();
    if (settled) {
      resolve(settled);
      return;
    }

    const poll = globalThis.setInterval(() => {
      const doc = ready();
      if (doc) {
        globalThis.clearInterval(poll);
        resolve(doc);
      }
    }, 16);
  });
}

interface Mounted {
  root: HTMLElement;
  tagName: string;
  above: HTMLElement;
  below: HTMLElement;
  frame: HTMLIFrameElement;
  document: Promise<Document>;
  tokenList: HTMLElement;
  callbacks: AppCallbacks;
}

let mounted: Mounted | null = null;

/** Guards against an older sync finishing after a newer one. */
let syncToken = 0;

function elementsAcrossSurface(root: Document | ShadowRoot): Element[] {
  const found = [...root.querySelectorAll("*")];
  return found.flatMap((element) => [
    element,
    ...(element.shadowRoot ? elementsAcrossSurface(element.shadowRoot) : []),
  ]);
}

function installSurfaceOverlay(
  doc: Document,
  onSelect: (nodeAddress: string, bindingAddress: string | null) => void,
): void {
  doc.querySelector(".mash-semantic-overlay")?.remove();
  const overlay = doc.createElement("div");
  overlay.className = "mash-semantic-overlay";

  const schemas = new Map(components.map((component) => [component.tagName, component]));
  const instances = elementsAcrossSurface(doc).filter(
    (element): element is HTMLElement =>
      element instanceof (doc.defaultView?.HTMLElement ?? HTMLElement) &&
      schemas.has(element.localName),
  );

  for (const instance of instances) {
    const component = schemas.get(instance.localName);
    if (!component?.mash) continue;
    for (const node of component.mash.nodes) {
      const targets = new Map<Element, MashBinding[]>();
      const realize = (target: Element, binding: MashBinding) => {
        const bindings = targets.get(target) ?? [];
        if (!bindings.some((candidate) => candidate.address === binding.address)) {
          bindings.push(binding);
        }
        targets.set(target, bindings);
      };
      for (const binding of node.bindings) {
        if (binding.kind === "part") {
          for (const target of instance.shadowRoot?.querySelectorAll(`[part~="${binding.name}"]`) ??
            []) {
            realize(target, binding);
          }
        }
        if (binding.kind === "slot") {
          const selector = binding.name ? `slot[name="${binding.name}"]` : "slot:not([name])";
          for (const slot of instance.shadowRoot?.querySelectorAll<HTMLSlotElement>(selector) ??
            []) {
            const assigned = slot.assignedElements({ flatten: true });
            if (assigned.length > 0) assigned.forEach((target) => realize(target, binding));
            else realize(slot, binding);
          }
        }
        if (["attribute", "state", "event"].includes(binding.kind)) realize(instance, binding);
      }
      if (targets.size === 0 && !node.parent) targets.set(instance, []);

      for (const [target, bindings] of targets) {
        const rect = target.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const box = doc.createElement("button");
        box.type = "button";
        box.className = "mash-semantic-box";
        box.dataset.mashNodeAddress = node.address;
        box.dataset.mashBindingAddresses = JSON.stringify(
          bindings.map((binding) => binding.address),
        );
        box.hidden = !showSurfaceTree;
        box.style.left = `${rect.left}px`;
        box.style.top = `${rect.top}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${rect.height}px`;
        box.setAttribute(
          "aria-label",
          `Inspect ${instance.localName} ${node.id}${bindings.length ? ` through ${bindings.map((binding) => bindingName(component, binding)).join(", ")}` : ""}`,
        );
        box.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(node.address, bindings.length === 1 ? bindings[0]!.address : null);
        });
        const label = doc.createElement("span");
        label.textContent = `${instance.localName} · ${node.id}${bindings.length ? ` · ${bindings.map((binding) => `${binding.kind}:${binding.name || "default"}`).join(" + ")}` : ""}`;
        box.append(label);
        overlay.append(box);
      }
    }
  }

  doc.body.append(overlay);
}

const overlayDocuments = new WeakSet<Document>();
const overlayRefreshes = new WeakMap<Document, () => void>();

function installOverlayRefresh(doc: Document, refresh: () => void): void {
  overlayRefreshes.set(doc, refresh);
  if (overlayDocuments.has(doc)) return;
  overlayDocuments.add(doc);
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame =
      doc.defaultView?.requestAnimationFrame(() => {
        frame = 0;
        overlayRefreshes.get(doc)?.();
      }) ?? 0;
  };
  doc.addEventListener("scroll", schedule, true);
  doc.addEventListener("slotchange", schedule, true);
  doc.addEventListener("click", schedule, true);
  doc.addEventListener("input", schedule, true);
  doc.addEventListener("change", schedule, true);
  doc.addEventListener("focusin", schedule, true);
  doc.addEventListener("focusout", schedule, true);
  doc.defaultView?.addEventListener("resize", schedule);
}

function slotIsAuthored(instance: Element, name: string): boolean {
  if (name) {
    return [...instance.children].some((child) => child.getAttribute("slot") === name);
  }
  return [...instance.childNodes].some((child) => {
    if (child.nodeType === Node.TEXT_NODE) return Boolean(child.textContent?.trim());
    return child.nodeType === Node.ELEMENT_NODE && !(child as Element).hasAttribute("slot");
  });
}

function bindingEffectiveState(binding: MashBinding, instances: Element[]): string {
  const count = (predicate: (instance: Element) => boolean) => instances.filter(predicate).length;
  const fraction = (matched: number) =>
    instances.length > 1 ? `${matched}/${instances.length} instances` : matched ? "yes" : "no";

  if (binding.kind === "attribute") {
    const present = count((instance) => instance.hasAttribute(binding.name));
    if (present) return `present ${fraction(present)}`;
    return binding.default.kind === "value"
      ? `effective default ${bindingValue(binding.default.value)}`
      : "omitted";
  }
  if (binding.kind === "slot") {
    const authored = count((instance) => slotIsAuthored(instance, binding.name));
    if (authored) return `authored ${fraction(authored)}`;
    const fallback = fallbackLabel(binding);
    return fallback ? `effective ${fallback.replace(/^fallback /, "")}` : "unfilled";
  }
  if (binding.kind === "part") {
    const realized = count((instance) =>
      Boolean(instance.shadowRoot?.querySelector(`[part~="${binding.name}"]`)),
    );
    return `realized ${fraction(realized)}`;
  }
  if (binding.kind === "state") {
    const active = count((instance) => instance.matches(`:state(${binding.name})`));
    return `active ${fraction(active)}`;
  }
  const related = binding.relations?.length ?? 0;
  return related > 0
    ? `${binding.intent} · ${related} related node${related === 1 ? "" : "s"}`
    : `${binding.intent ?? "output"} available`;
}

function syncBindingProof(
  current: Mounted,
  component: ComponentSchema,
  instances: Element[],
): void {
  const note = current.root.querySelector<HTMLElement>(".surface-contract-note");
  if (note) {
    note.dataset.instanceCount = String(instances.length);
    if (!note.textContent?.includes("preview instance")) {
      note.textContent = `${note.textContent} · ${instances.length} preview instance${instances.length === 1 ? "" : "s"}`;
    }
  }
  for (const binding of component.mash?.bindings ?? []) {
    const row = current.root.querySelector<HTMLElement>(
      `[data-mash-binding-address="${binding.address}"]`,
    );
    const effective = row?.querySelector<HTMLElement>(".surface-binding-effective");
    if (effective) effective.textContent = bindingEffectiveState(binding, instances);
  }
}

function recipeRuleActive(rule: MashRecipeRule, instances: Element[]): boolean {
  const view = instances[0]?.ownerDocument.defaultView;
  if (!view) return false;
  for (const context of rule.when.web.context) {
    if (context.startsWith("@media ") && !view.matchMedia(context.slice(7)).matches) return false;
    if (context.startsWith("@supports ") && !view.CSS.supports(context.slice(10))) return false;
  }
  return rule.when.web.selector
    .split(",")
    .some((selector) => instances.some((instance) => selectorMatchesInstance(instance, selector)));
}

function syncLayoutProof(current: Mounted, component: ComponentSchema, instances: Element[]): void {
  for (const node of component.mash?.nodes ?? []) {
    const container = current.root.querySelector<HTMLElement>(
      `[data-mash-layout-address="${node.address}"]`,
    );
    if (!container) continue;
    const catalogueNode = catalogueNodeFor(component.packageName, node.address);
    const rules = layoutRulesFor(component.packageName, node.address);
    const active = rules.filter((rule) => recipeRuleActive(rule, instances));
    const labels = layoutLabels(active);
    const conditions = [
      ...new Set(active.flatMap((rule) => rule.when.conditions.map(conditionLabel))),
    ];
    const aspects = [
      ...new Set(
        active.flatMap((rule) =>
          Object.keys(rule.presentation).map((trait) => trait.split(".")[0]),
        ),
      ),
    ];
    const nodeTokens = [
      ...new Set(
        active.flatMap((rule) => Object.values(rule.presentation).flatMap((trait) => trait.tokens)),
      ),
    ].sort();
    const coverage = `${catalogueNode?.coverage ?? "contract-only"} · ${catalogueNode?.layout ?? "unconstrained"}`;
    container.replaceChildren(
      el("span", {
        class: "layout-empty",
        text: `${coverage} · active ${active.length}/${rules.length}`,
      }),
      ...labels.map((label) => el("code", { class: "layout-chip", text: label })),
      ...conditions.map((label) => el("code", { class: "layout-chip", text: label })),
      ...aspects.map((aspect) => el("code", { class: "layout-chip", text: `trait ${aspect}` })),
      ...nodeTokens.map((token) => el("code", { class: "surface-node-token", text: token })),
    );
  }
}

function syncSelectedProof(current: Mounted, state: State, instances: Element[]): void {
  if (!state.node) return;
  const owner = componentForNode(state.node);
  const node = owner?.mash?.nodes.find((candidate) => candidate.address === state.node);
  if (!owner || !node) return;
  const ownedInstances = instances.filter((instance) => instance.localName === owner.tagName);
  const panel = current.root.querySelector<HTMLElement>(
    `[data-selected-node-address="${state.node}"]`,
  );
  if (!panel) return;

  const rules = recipeRulesFor(owner.packageName, node.address);
  const active = rules.map((rule) => recipeRuleActive(rule, ownedInstances));
  const boxes = [
    ...(current.frame.contentDocument?.querySelectorAll<HTMLElement>(".mash-semantic-box") ?? []),
  ].filter((box) => box.dataset.mashNodeAddress === node.address);
  const summary = panel.querySelector<HTMLElement>(".surface-realization-summary");
  if (summary) {
    summary.textContent = `${boxes.length} region${boxes.length === 1 ? "" : "s"} · ${ownedInstances.length} instance${ownedInstances.length === 1 ? "" : "s"} · active ${active.filter(Boolean).length}/${rules.length} rules`;
    summary.classList.toggle("is-missing", boxes.length === 0 || ownedInstances.length === 0);
  }

  for (const binding of node.bindings) {
    const detail = panel.querySelector<HTMLElement>(
      `[data-selected-binding-address="${binding.address}"]`,
    );
    const effective = detail?.querySelector<HTMLElement>(".surface-binding-effective");
    if (!detail || !effective) continue;
    const result = bindingEffectiveState(binding, ownedInstances);
    effective.textContent = result;
    detail.classList.toggle(
      "is-missing",
      result === "unfilled" || result === "omitted" || result.endsWith("no"),
    );
  }

  active.forEach((isActive, index) => {
    for (const rule of panel.querySelectorAll<HTMLElement>(
      `[data-selected-rule-index="${index}"], [data-editor-rule-index="${index}"]`,
    )) {
      const status = rule.querySelector<HTMLElement>(".surface-rule-state");
      rule.classList.toggle("is-active", isActive);
      if (status) status.textContent = isActive ? "active" : "inactive";
    }
  });
}

async function syncStage(current: Mounted, component: ComponentSchema, state: State) {
  const ticket = ++syncToken;
  const doc = await current.document;
  if (ticket !== syncToken) return;

  doc.documentElement.dataset.theme = state.theme;
  doc.documentElement.dataset.density = state.density;
  let playground = doc.querySelector<HTMLStyleElement>("#mash-playground-patch");
  if (!playground) {
    playground = doc.createElement("style");
    playground.id = "mash-playground-patch";
    doc.head.append(playground);
  }
  playground.textContent = playgroundStyle(state.edits);

  const example = exampleNamed(component, state.example);
  if (example) {
    doc.body.innerHTML = example.code;
  } else {
    doc.body.replaceChildren(buildPreview(doc, component, state));
  }

  const nodes = [...doc.querySelectorAll(component.tagName)];
  const node = nodes[0];
  if (!node) return;

  const frameWindow = current.frame.contentWindow;
  await frameWindow?.customElements.whenDefined(component.tagName);
  await Promise.all(
    nodes.map((instance) => (instance as { updateComplete?: Promise<unknown> }).updateComplete),
  );
  if (frameWindow) {
    await new Promise<void>((resolve) => frameWindow.requestAnimationFrame(() => resolve()));
  }
  if (ticket !== syncToken) return;

  // A component that fills its frame gets the whole surface; anything that
  // sizes to its content is centred on a padded canvas. Measured rather than
  // declared, so it needs no per-component configuration.
  const fills = node.getBoundingClientRect().height >= doc.documentElement.clientHeight - 96;
  const anchored = component.attributes.some((attribute) => attribute.name === "placement");
  doc.documentElement.dataset.layout = anchored ? "anchor" : fills ? "fill" : "center";
  const refreshProof = () => {
    installSurfaceOverlay(doc, (nodeAddress, bindingAddress) =>
      current.callbacks.update({ node: nodeAddress, binding: bindingAddress }),
    );
    setSurfaceHighlight(current.frame, state.node, state.binding, showSurfaceTree);
    const allInstances = elementsAcrossSurface(doc).filter((element) =>
      components.some((candidate) => candidate.tagName === element.localName),
    );
    syncBindingProof(current, component, nodes);
    syncLayoutProof(current, component, nodes);
    syncSelectedProof(current, state, allInstances);
    const used = tokensUsedBy(allInstances);
    current.tokenList.replaceChildren(
      ...(used.length > 0
        ? used.map((cssVar) => provenanceRow(cssVar, state.theme))
        : [el("li", { class: "note", text: "No active design tokens referenced." })]),
    );
  };
  refreshProof();
  installOverlayRefresh(doc, refreshProof);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export interface AppCallbacks {
  select(tagName: string): void;
  update(patch: Partial<State>): void;
  setAttr(attribute: string, value: string | boolean): void;
}

/**
 * Copy the current address.
 *
 * The whole reason the controls are reflected in the URL is so a reviewer can
 * paste one into a PR comment; this saves them a trip to the address bar.
 * `navigator.clipboard` is unavailable on insecure origins, so the button
 * simply reports that rather than failing silently.
 */
function copyLinkButton(): HTMLElement {
  const button = el("button", {
    type: "button",
    class: "copy-link",
    text: "copy link",
    title: "Copy a link that reproduces this component and its current state",
  });

  button.addEventListener("click", () => {
    const restore = () => globalThis.setTimeout(() => (button.textContent = "copy link"), 1200);
    navigator.clipboard?.writeText(location.href).then(
      () => {
        button.textContent = "copied";
        restore();
      },
      () => {
        button.textContent = "copy failed";
        restore();
      },
    );
  });

  return button;
}

/** Everything above the stage: heading and controls. Rebuilt on every change. */
function aboveStage(
  component: ComponentSchema,
  state: State,
  callbacks: AppCallbacks,
): (HTMLElement | null)[] {
  const showingExample = exampleNamed(component, state.example) !== null;
  const examples = examplesFor(component);
  const canShowControls = controlsPreviewAllowed(component);

  return [
    el(
      "div",
      { class: "component-heading" },
      el("h2", { class: "component-title", text: component.tagName }),
      el("span", { class: "package-badge", text: component.packageName }),
      copyLinkButton(),
    ),
    component.summary ? el("p", { class: "summary", text: component.summary }) : null,
    component.description ? el("p", { class: "description", text: component.description }) : null,

    el(
      "section",
      { class: "panel" },
      el("h3", { text: "Controls" }),
      el(
        "div",
        { class: "controls" },

        examples.length > 0
          ? el(
              "div",
              { class: "control" },
              el("span", { class: "control-label", text: "example" }),
              el(
                "div",
                { class: "segmented" },
                ...examples.map((example) =>
                  el("button", {
                    type: "button",
                    class: state.example === example.name ? "segment is-active" : "segment",
                    text: example.name,
                    onclick: () => callbacks.update({ example: example.name }),
                  }),
                ),
                ...(canShowControls
                  ? [
                      el("button", {
                        type: "button",
                        class: state.example === null ? "segment is-active" : "segment",
                        text: "controls",
                        onclick: () => callbacks.update({ example: null }),
                      }),
                    ]
                  : []),
              ),
              el("span", {
                class: "control-hint",
                text: canShowControls
                  ? "Examples show intended composition; controls render this element in isolation."
                  : "This is composition-only: its children are part of the component contract.",
              }),
            )
          : null,

        // Attribute controls drive the synthesized preview. An example is fixed
        // markup, so showing them alongside it would imply they do something.
        ...(showingExample
          ? [
              el("p", {
                class: "note",
                text: canShowControls
                  ? "Showing an authored example. Switch to “controls” to drive the component's attributes and slots directly."
                  : "The example provides the required child elements and slot relationships.",
              }),
            ]
          : [
              ...controlsFor(component).map((control) =>
                controlField(control, state, callbacks.setAttr),
              ),

              ...component.slots.map((slot) =>
                el(
                  "div",
                  { class: "control" },
                  el("span", {
                    class: "control-label",
                    text: slot.name ? `${slot.name} slot` : "default slot",
                  }),
                  el("input", {
                    type: "text",
                    class: "text-input",
                    value: state.slots[slot.name] ?? "",
                    oninput: (event: Event) =>
                      callbacks.update({
                        slots: {
                          ...state.slots,
                          [slot.name]: (event.target as HTMLInputElement).value,
                        },
                      }),
                  }),
                  slot.description
                    ? el("span", { class: "control-hint", text: slot.description })
                    : null,
                ),
              ),
            ]),

        el(
          "div",
          { class: "control" },
          el("span", { class: "control-label", text: "theme" }),
          el(
            "div",
            { class: "segmented" },
            ...themes.map((theme) =>
              el("button", {
                type: "button",
                class: state.theme === theme ? "segment is-active" : "segment",
                text: theme,
                onclick: () => callbacks.update({ theme }),
              }),
            ),
          ),
          el("span", {
            class: "control-hint",
            text: "Applied to the catalog and preview roots; nested components can still override it.",
          }),
        ),
        el(
          "div",
          { class: "control" },
          el("span", { class: "control-label", text: "density" }),
          el(
            "div",
            { class: "segmented" },
            ...(["compact", "comfortable", "spacious"] as const).map((density) =>
              el("button", {
                type: "button",
                class: state.density === density ? "segment is-active" : "segment",
                text: density,
                onclick: () => callbacks.update({ density }),
              }),
            ),
          ),
          el("span", {
            class: "control-hint",
            text: "Changes the preview's semantic control spacing without clearing recipe edits.",
          }),
        ),
      ),
    ),
  ];
}

/** Everything below the stage: usage, API tables, token provenance. */
function belowStage(
  component: ComponentSchema,
  state: State,
  callbacks: AppCallbacks,
  tokenList: HTMLElement,
  frame: HTMLIFrameElement,
): (HTMLElement | null)[] {
  return [
    el(
      "section",
      { class: "panel" },
      el("h3", { text: "Usage" }),
      el("pre", { class: "code" }, el("code", { text: markupFor(component, state) })),
      el(
        "pre",
        { class: "code" },
        el("code", {
          text: [
            `import "${importSpecifier(component)}";`,
            `import "@mash/tokens/tokens.css";`,
            `import "${recipeSpecifier(component)}";`,
          ].join("\n"),
        }),
      ),
      component.registerPath
        ? el("p", {
            class: "note",
            text: `Registered by ${component.registerPath}; the class alone is defined in ${component.modulePath} and registers nothing.`,
          })
        : null,
    ),

    el(
      "section",
      { class: "panel" },
      el("h3", { text: "API" }),
      el("p", { class: "note", text: "Read from custom-elements.json." }),
      mashContractTree(component, state, callbacks, frame),
      attributeTable(component),
      describedList("Slots", component.slots, "No slots."),
      describedList("Parts", component.cssParts, "No exposed parts."),
      describedList(
        "CSS properties",
        component.cssProperties,
        "No public CSS properties — recipes style its documented parts and reflected state.",
      ),
      describedList("Custom states", component.cssStates, "No custom states."),
      describedList("Events", component.events, "No events."),
    ),

    el(
      "section",
      { class: "panel" },
      el("h3", { text: "Tokens used" }),
      el("p", {
        class: "note",
        text: "Extracted from active recipe rules that target this component, then traced through tokens.json to the primitive that holds the value.",
      }),
      tokenList,
    ),
  ];
}

/**
 * Build the persistent page structure.
 *
 * Runs once per selected component. Switching components does reload the stage
 * frame, which is both acceptable and desirable — it guarantees a clean
 * document rather than one carrying the previous component's leftovers.
 */
function mountShell(root: HTMLElement, state: State, callbacks: AppCallbacks): Mounted {
  const above = el("div", { class: "stack" });
  const below = el("div", { class: "stack" });
  const tokenList = el("ul", { class: "token-list" });

  const frame = el("iframe", {
    class: "stage-frame",
    src: STAGE_URL,
    title: "Component preview",
  }) as HTMLIFrameElement;

  root.replaceChildren(
    el(
      "header",
      { class: "masthead" },
      el(
        "div",
        { class: "masthead-text" },
        el("h1", { text: "mash" }),
        el("p", {
          text: "Design system catalog — everything below is read from generated schemas.",
        }),
      ),
      buildBadge(),
    ),

    el(
      "div",
      { class: "layout" },

      el(
        "nav",
        { class: "sidebar" },
        el("h2", { text: "Components" }),
        ...familiesFor(components).map((family) =>
          el(
            "section",
            { class: "component-family" },
            el("h3", { class: "family-title", text: family.title }),
            el("p", { class: "family-description", text: family.description }),
            el(
              "ul",
              {},
              ...family.components.map((entry) =>
                el(
                  "li",
                  {},
                  el("button", {
                    type: "button",
                    class: entry.tagName === state.tagName ? "nav-item is-active" : "nav-item",
                    text: entry.tagName,
                    onclick: () => callbacks.select(entry.tagName),
                  }),
                ),
              ),
            ),
          ),
        ),
      ),

      // The stage sits between two containers whose *children* are replaced on
      // each update. The containers themselves, and the frame, are never moved.
      el("main", { class: "content" }, above, el("div", { class: "stage-shell" }, frame), below),
    ),
  );

  return {
    root,
    tagName: state.tagName,
    above,
    below,
    frame,
    tokenList,
    callbacks,
    document: frameDocument(frame),
  };
}

export function render(root: HTMLElement, state: State, callbacks: AppCallbacks): void {
  const component = components.find((c) => c.tagName === state.tagName);
  if (!component) throw new Error(`unknown component ${state.tagName}`);

  // Keep the catalog chrome and the isolated preview on the same explicit
  // theme. Without this, a light preview on a dark-system device still leaves
  // the masthead, controls and API panels on the dark media-query theme, which
  // makes the selected light mode look like a partial or inverted mapping.
  document.documentElement.dataset.theme = state.theme;

  if (!mounted || mounted.root !== root || mounted.tagName !== state.tagName) {
    mounted = mountShell(root, state, callbacks);
  }

  const present = (node: HTMLElement | null): node is HTMLElement => node !== null;

  mounted.above.replaceChildren(...aboveStage(component, state, callbacks).filter(present));
  mounted.below.replaceChildren(
    ...belowStage(component, state, callbacks, mounted.tokenList, mounted.frame).filter(present),
  );

  void syncStage(mounted, component, state);
}

export { components, valueOf };
