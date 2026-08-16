import { controlsFor, defaultState, type Control } from "./controls.js";
import { el } from "./dom.js";
import {
  components,
  provenance,
  themes,
  tokenByCssVar,
  valueOf,
  type ComponentSchema,
  type Described,
} from "./schema.js";

export interface State {
  tagName: string;
  attrs: Record<string, string | boolean>;
  theme: string;
  /** Which named slots are currently filled with placeholder content. */
  slots: Record<string, boolean>;
  /** Text projected into the default slot. */
  label: string;
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
    slots: {},
    label: defaultLabel(component),
    example: component.examples[0]?.name ?? null,
  };
}

function defaultLabel(component: ComponentSchema): string {
  const bare = component.tagName.replace(/^[a-z]+-/, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** `dist/confirm/register.js` in `@mash/shrine` -> `@mash/shrine/confirm/register`. */
function importSpecifier(component: ComponentSchema): string {
  if (!component.registerPath) return component.packageName;
  const subpath = component.registerPath.replace(/^dist\//, "").replace(/\.js$/, "");
  return `${component.packageName}/${subpath}`;
}

const exampleNamed = (component: ComponentSchema, name: string | null) =>
  name === null ? null : (component.examples.find((example) => example.name === name) ?? null);

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Build the live element from the current state.
 *
 * Takes the target `Document` because the preview lives inside the stage
 * iframe: nodes have to be created by the document that will own them.
 */
function buildPreview(doc: Document, component: ComponentSchema, state: State): HTMLElement {
  const node = doc.createElement(component.tagName);

  for (const [name, value] of Object.entries(state.attrs)) {
    if (value === false || value === "") continue;
    node.setAttribute(name, value === true ? "" : String(value));
  }

  if (state.label) node.append(doc.createTextNode(state.label));

  for (const slot of component.slots) {
    if (!slot.name || !state.slots[slot.name]) continue;
    const fill = doc.createElement("span");
    fill.slot = slot.name;
    fill.className = "slot-fill";
    fill.textContent = slot.name;
    node.append(fill);
  }

  return node;
}

/** The markup a consumer would write to reproduce what is on the stage. */
function markupFor(component: ComponentSchema, state: State): string {
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
  const children = [
    ...component.slots
      .filter((slot) => slot.name && state.slots[slot.name])
      .map((slot) => `  <span slot="${slot.name}">${slot.name}</span>`),
    state.label ? `  ${state.label}` : "",
  ].filter(Boolean);

  return `<${open}>\n${children.join("\n")}\n</${component.tagName}>`;
}

// ---------------------------------------------------------------------------
// Token provenance
// ---------------------------------------------------------------------------

/**
 * Which design tokens a rendered component actually uses.
 *
 * Read from the element's own adopted stylesheets rather than from a list kept
 * somewhere: whatever the component's CSS references is, by definition, what it
 * uses. Private `--_*` variables and public component properties are not in the
 * token graph, so they fall out naturally.
 *
 * Works across the iframe boundary because the stage is same-origin.
 */
function tokensUsedBy(node: Element): string[] {
  const root = node.shadowRoot;
  if (!root) return [];

  const cssText = [...root.adoptedStyleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");

  const found = new Set<string>();
  for (const match of cssText.matchAll(/var\((--[\w-]+)/g)) {
    const name = match[1];
    if (name && tokenByCssVar.has(name)) found.add(name);
  }
  return [...found].sort();
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
      return doc?.documentElement.dataset.stageReady === "true" ? doc : null;
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

  const node = doc.querySelector(component.tagName);
  if (!node) return;

  const frameWindow = current.frame.contentWindow;
  await frameWindow?.customElements.whenDefined(component.tagName);
  await (node as { updateComplete?: Promise<unknown> }).updateComplete;
  if (ticket !== syncToken) return;

  // A component that fills its frame gets the whole surface; anything that
  // sizes to its content is centred on a padded canvas. Measured rather than
  // declared, so it needs no per-component configuration.
  const fills = node.getBoundingClientRect().height >= doc.documentElement.clientHeight - 96;
  doc.documentElement.dataset.layout = fills ? "fill" : "center";

  const used = tokensUsedBy(node);
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

/** Everything above the stage: heading and controls. Rebuilt on every change. */
function aboveStage(
  component: ComponentSchema,
  state: State,
  callbacks: AppCallbacks,
): (HTMLElement | null)[] {
  const namedSlots = component.slots.filter((slot) => slot.name);
  const showingExample = exampleNamed(component, state.example) !== null;

  return [
    el(
      "div",
      { class: "component-heading" },
      el("h2", { class: "component-title", text: component.tagName }),
      el("span", { class: "package-badge", text: component.packageName }),
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

        component.examples.length > 0
          ? el(
              "div",
              { class: "control" },
              el("span", { class: "control-label", text: "example" }),
              el(
                "div",
                { class: "segmented" },
                ...component.examples.map((example) =>
                  el("button", {
                    type: "button",
                    class: state.example === example.name ? "segment is-active" : "segment",
                    text: example.name,
                    onclick: () => callbacks.update({ example: example.name }),
                  }),
                ),
                el("button", {
                  type: "button",
                  class: state.example === null ? "segment is-active" : "segment",
                  text: "controls",
                  onclick: () => callbacks.update({ example: null }),
                }),
              ),
              el("span", {
                class: "control-hint",
                text: "Examples come from the component's @example JSDoc, via custom-elements.json.",
              }),
            )
          : null,

        // Attribute controls drive the synthesized preview. An example is fixed
        // markup, so showing them alongside it would imply they do something.
        ...(showingExample
          ? [
              el("p", {
                class: "note",
                text: "Showing a fixed example. Switch to “controls” to drive the component's attributes and slots directly.",
              }),
            ]
          : [
              ...controlsFor(component).map((control) =>
                controlField(control, state, callbacks.setAttr),
              ),

              el(
                "div",
                { class: "control" },
                el("span", { class: "control-label", text: "label" }),
                el("input", {
                  type: "text",
                  class: "text-input",
                  value: state.label,
                  oninput: (event: Event) =>
                    callbacks.update({ label: (event.target as HTMLInputElement).value }),
                }),
                el("span", { class: "control-hint", text: "Content for the default slot." }),
              ),

              namedSlots.length > 0
                ? el(
                    "div",
                    { class: "control" },
                    el("span", { class: "control-label", text: "slots" }),
                    el(
                      "div",
                      { class: "slot-toggles" },
                      ...namedSlots.map((slot) =>
                        el(
                          "label",
                          { class: "toggle" },
                          el("input", {
                            type: "checkbox",
                            checked: state.slots[slot.name] === true,
                            onchange: (event: Event) =>
                              callbacks.update({
                                slots: {
                                  ...state.slots,
                                  [slot.name]: (event.target as HTMLInputElement).checked,
                                },
                              }),
                          }),
                          el("span", { text: slot.name }),
                        ),
                      ),
                    ),
                  )
                : null,
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
            text: "Applied to the preview frame's root, which is also how theme nesting works.",
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
      el("h3", { text: "Usage" }),
      el("pre", { class: "code" }, el("code", { text: markupFor(component, state) })),
      el(
        "pre",
        { class: "code" },
        el("code", {
          text: [
            `import "${importSpecifier(component)}";`,
            `import "@mash/tokens/tokens.css";`,
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
      attributeTable(component),
      describedList("Slots", component.slots, "No slots."),
      describedList("Parts", component.cssParts, "No exposed parts."),
      describedList(
        "CSS properties",
        component.cssProperties,
        "No public CSS properties — this component is styled entirely through the shared semantic tokens.",
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
        text: "Extracted from the rendered component's own stylesheets, then traced through tokens.json to the primitive that holds the value.",
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
      el("h1", { text: "mash" }),
      el("p", { text: "Design system catalog — everything below is read from generated schemas." }),
    ),

    el(
      "div",
      { class: "layout" },

      el(
        "nav",
        { class: "sidebar" },
        el("h2", { text: "Components" }),
        el(
          "ul",
          {},
          ...components.map((entry) =>
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

  if (!mounted || mounted.root !== root || mounted.tagName !== state.tagName) {
    mounted = mountShell(root, state, callbacks);
  }

  const present = (node: HTMLElement | null): node is HTMLElement => node !== null;

  mounted.above.replaceChildren(...aboveStage(component, state, callbacks).filter(present));
  mounted.below.replaceChildren(...belowStage(component, state, mounted.tokenList).filter(present));

  void syncStage(mounted, component, state);
}

export { components, valueOf };
