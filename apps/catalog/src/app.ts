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
}

export function initialState(component: ComponentSchema): State {
  return {
    tagName: component.tagName,
    attrs: defaultState(component),
    theme: themes[0] ?? "light",
    slots: {},
    label: defaultLabel(component),
  };
}

function defaultLabel(component: ComponentSchema): string {
  const bare = component.tagName.replace(/^ui-/, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/** Build the live element from the current state. */
function buildPreview(component: ComponentSchema, state: State): HTMLElement {
  const node = document.createElement(component.tagName);

  for (const [name, value] of Object.entries(state.attrs)) {
    if (value === false || value === "") continue;
    node.setAttribute(name, value === true ? "" : String(value));
  }

  if (state.label) node.append(document.createTextNode(state.label));

  for (const slot of component.slots) {
    if (!slot.name || !state.slots[slot.name]) continue;
    node.append(el("span", { slot: slot.name, class: "slot-fill", text: slot.name }));
  }

  return node;
}

/** The markup a consumer would write to reproduce the current state. */
function markupFor(component: ComponentSchema, state: State): string {
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

function describedList(title: string, items: Described[], emptyNote: string): HTMLElement | null {
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
// Page
// ---------------------------------------------------------------------------

export interface AppCallbacks {
  select(tagName: string): void;
  update(patch: Partial<State>): void;
  setAttr(attribute: string, value: string | boolean): void;
}

export function render(root: HTMLElement, state: State, callbacks: AppCallbacks): void {
  const component = components.find((c) => c.tagName === state.tagName);
  if (!component) throw new Error(`unknown component ${state.tagName}`);

  const preview = buildPreview(component, state);
  const stage = el("div", { class: "stage", "data-theme": state.theme }, preview);
  const tokenList = el("ul", { class: "token-list" });

  const namedSlots = component.slots.filter((slot) => slot.name);

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

      el(
        "main",
        { class: "content" },

        el("h2", { class: "component-title", text: component.tagName }),
        component.summary ? el("p", { class: "summary", text: component.summary }) : null,
        component.description
          ? el("p", { class: "description", text: component.description })
          : null,

        el(
          "section",
          { class: "panel" },
          el("h3", { text: "Controls" }),
          el(
            "div",
            { class: "controls" },

            ...controlsFor(component).map((control) =>
              controlField(control, state, callbacks.setAttr),
            ),

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
                text: "Applied to the stage below, not the page — which is also how theme nesting works.",
              }),
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
          ),
        ),

        stage,

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
                `import "@mash/ui/${component.tagName.replace(/^ui-/, "")}/register";`,
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
      ),
    ),
  );

  // The element must have rendered before its adopted stylesheets exist, so
  // token extraction waits on the component's own render cycle.
  //
  // Deliberately not requestAnimationFrame: a backgrounded tab never paints,
  // and this panel is content rather than animation — it has to fill in whether
  // or not the page is visible.
  void (async () => {
    await customElements.whenDefined(component.tagName);
    await (preview as { updateComplete?: Promise<unknown> }).updateComplete;

    const used = tokensUsedBy(preview);
    tokenList.replaceChildren(
      ...(used.length > 0
        ? used.map((cssVar) => provenanceRow(cssVar, state.theme))
        : [el("li", { class: "note", text: "No design tokens referenced." })]),
    );
  })();
}

export { components, valueOf };
