import { buildBadge } from "./build-info.js";
import { controlsFor, defaultState, type Control } from "./controls.js";
import { el } from "./dom.js";
import { controlsPreviewAllowed, exampleNamed, examplesFor } from "./examples.js";
import { familiesFor } from "./families.js";
import {
  components,
  provenance,
  themes,
  tokenByCssVar,
  valueOf,
  type ComponentSchema,
  type Described,
} from "./schema.js";
import { applyStageLayout, applyStageUtilityRecipes, stageClassName } from "./utility-recipes.js";

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
  };
}

function defaultSlotContent(component: ComponentSchema): string {
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
    fill.className = stageClassName("slot-fill");
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

/** Tokens referenced by active component and opt-in catalogue rules. */
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
      ...steps.map((step, index) =>
        el(
          "li",
          { class: "provenance-step" },
          index > 0 ? el("span", { class: "provenance-arrow", text: "→" }) : null,
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
      el("h3", { class: "api-heading", text: title }),
      el("p", { class: "note api-empty-note", text: emptyNote }),
    );
  }

  return el(
    "section",
    { class: "api-block" },
    el("h3", { class: "api-heading", text: title }),
    el(
      "dl",
      { class: "api-list" },
      ...items.flatMap((item) => [
        el("dt", { class: "api-term" }, el("code", { text: item.name || "(default)" })),
        el("dd", { class: "api-description", text: item.description ?? "" }),
      ]),
    ),
  );
}

function attributeTable(component: ComponentSchema): HTMLElement {
  return el(
    "section",
    { class: "api-block" },
    el("h3", { class: "api-heading", text: "Attributes" }),
    el(
      "table",
      { class: "api-table" },
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          el("th", { class: "api-cell api-th", text: "Name" }),
          el("th", { class: "api-cell api-th", text: "Type" }),
          el("th", { class: "api-cell api-th", text: "Default" }),
          el("th", { class: "api-cell api-th", text: "Description" }),
        ),
      ),
      el(
        "tbody",
        {},
        ...component.attributes.map((attribute) =>
          el(
            "tr",
            {},
            el("td", { class: "api-cell" }, el("code", { text: attribute.name })),
            el(
              "td",
              { class: "api-cell" },
              el("code", { class: "type", text: attribute.type?.text ?? "" }),
            ),
            el("td", { class: "api-cell" }, el("code", { text: attribute.default ?? "" })),
            el("td", { class: "api-cell", text: attribute.description ?? "" }),
          ),
        ),
      ),
    ),
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
}

let mounted: Mounted | null = null;

/** Guards against an older sync finishing after a newer one. */
let syncToken = 0;

async function syncStage(current: Mounted, component: ComponentSchema, state: State) {
  const ticket = ++syncToken;
  const doc = await current.document;
  if (ticket !== syncToken) return;

  doc.documentElement.dataset.theme = state.theme;

  const example = exampleNamed(component, state.example);
  if (example) {
    doc.body.innerHTML = example.code;
  } else {
    doc.body.replaceChildren(buildPreview(doc, component, state));
  }
  applyStageUtilityRecipes(doc.body);

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
  const layout = example?.stageLayout ?? (anchored ? "anchor" : fills ? "fill" : "center");
  doc.documentElement.dataset.layout = layout;
  applyStageLayout(doc, layout);

  const used = tokensUsedBy(nodes);
  current.tokenList.replaceChildren(
    ...(used.length > 0
      ? used.map((cssVar) => provenanceRow(cssVar, state.theme))
      : [el("li", { class: "note", text: "No design tokens referenced." })]),
  );
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
      el("h3", { class: "panel-heading", text: "Controls" }),
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
      ),
    ),
  ];
}

/** Everything below the stage: usage, API tables, token provenance. */
function belowStage(
  component: ComponentSchema,
  state: State,
  tokenList: HTMLElement,
): (HTMLElement | null)[] {
  return [
    el(
      "section",
      { class: "panel" },
      el("h3", { class: "panel-heading", text: "Usage" }),
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
      el("p", {
        class: "note",
        text: "tokens.css is the minimal component token cascade. Tailwind applications import tailwind.css once from their CSS entrypoint instead; it includes the same cascade and the semantic utility vocabulary.",
      }),
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
      el("h3", { class: "panel-heading", text: "API" }),
      el("p", { class: "note", text: "Read from custom-elements.json." }),
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
      el("h3", { class: "panel-heading", text: "Tokens used" }),
      el("p", {
        class: "note",
        text: "Extracted from active catalogue rules, then traced through tokens.json to the primitive that holds the value.",
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
  const above = el("div", { class: "catalog-sections" });
  const below = el("div", { class: "catalog-sections" });
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
        el("h1", { class: "masthead-title", text: "mash" }),
        el("p", {
          class: "masthead-subtitle",
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
        el("h2", { class: "sidebar-heading", text: "Components" }),
        ...familiesFor(components).map((family) =>
          el(
            "section",
            { class: "component-family" },
            el("h3", { class: "family-title", text: family.title }),
            el("p", { class: "family-description", text: family.description }),
            el(
              "ul",
              { class: "sidebar-list" },
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
  mounted.below.replaceChildren(...belowStage(component, state, mounted.tokenList).filter(present));

  void syncStage(mounted, component, state);
}

export { components, valueOf };
