import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import {
  bindGesture,
  type GestureBindingHandle,
  type MashCommandDetail,
} from "../gesture/gesture.js";
import { type UIDrawer } from "../drawer/drawer.js";
import { type UIResizableHandle, type ResizeDetail } from "../resizable/resizable.js";

export type SidebarSide = "left" | "right";
export type SidebarVariant = "sidebar" | "floating" | "inset";
export type SidebarPeek = "none" | "hover" | "click";
export type SidebarReason =
  "trigger" | "shortcut" | "rail" | "resize" | "imperative" | "escape" | "outside" | "hover";
export interface SidebarOpenChangeDetail {
  open: boolean;
  mode: "desktop" | "mobile" | "peek";
  reason: SidebarReason;
}
const booleanAttribute = {
  fromAttribute: (value: string | null) => value !== "false",
  toAttribute: (value: boolean) => String(value),
};
const optionalBooleanAttribute = {
  fromAttribute: (value: string | null) => (value === null ? undefined : value !== "false"),
  toAttribute: (value: boolean | undefined) => (value === undefined ? null : String(value)),
};
let sidebarId = 0;

/**
 * A responsive navigation layout assembled from Mash's scroll, resize and drawer primitives.
 * Authored content stays in the light DOM through collapse, peek and mobile reprojection.
 * Navigation semantics belong to the slotted tree, links, menus or other application controls.
 *
 * @tag ui-sidebar
 * @summary Composes a resizable navigation rail, temporary peek and responsive modal drawer.
 * @example Workspace layout
 * <ui-sidebar persist="false">
 *   <strong slot="header">Workspace</strong>
 *   <nav slot="navigation" aria-label="Workspace"><a href="#home">Home</a></nav>
 *   <span slot="footer">Local workspace</span>
 *   <strong slot="content-header">Home</strong>
 *   <p>Your workspace content.</p>
 * </ui-sidebar>
 * @slot header - Fixed navigation header; compose search, workspace menus and actions here.
 * @slot navigation - Independently scrollable navigation, such as a tree or list of links.
 * @slot footer - Fixed navigation footer; compose account menus and callouts here.
 * @slot trigger - Optional authored toggle; the fallback is an accessible icon button.
 * @slot content-header - Content toolbar alongside the toggle.
 * @slot - Main application content, preserved while the navigation changes mode.
 * @csspart root - Coordinated sidebar and inset layout.
 * @csspart rail-viewport - Desktop width reservation and clipping boundary.
 * @csspart panel - Desktop navigation surface, also used by peek.
 * @csspart header - Fixed navigation header.
 * @csspart navigation - Navigation scroll-area host.
 * @csspart viewport - Native navigation scroll viewport.
 * @csspart scroll-content - Content inside the navigation viewport.
 * @csspart scrollbar - Navigation scrollbar.
 * @csspart scroll-track - Navigation scrollbar track.
 * @csspart scroll-thumb - Navigation scrollbar thumb.
 * @csspart footer - Fixed navigation footer.
 * @csspart inset - Main content surface.
 * @csspart toolbar - Main content toolbar.
 * @csspart content-header - Authored content toolbar projection.
 * @csspart content - Main content region.
 * @csspart trigger - Toggle binding and fallback button.
 * @csspart trigger-icon - Semantic toggle icon host.
 * @csspart trigger-glyph - Toggle icon realization.
 * @csspart trigger-source - Toggle SVG source.
 * @csspart rail - Resize handle host.
 * @csspart resize - Focusable resize separator, delegated to ui-resizable-handle.
 * @csspart resize-grip - Resize affordance.
 * @csspart edge - Collapsed peek target.
 * @csspart drawer - The composed mobile overlay host.
 * @csspart drawer-backdrop - Modal dismissal boundary.
 * @csspart drawer-positioner - Modal drawer placement.
 * @csspart drawer-popup - Mobile drawer surface.
 * @csspart drawer-title - Accessible drawer title.
 * @csspart drawer-content - Mobile navigation container.
 * @csspart close - Mobile close button.
 * @cssprop --mash-sidebar-width - Desktop preferred width; overrides the width attribute visually.
 * @cssprop --mash-sidebar-width-mobile - Mobile drawer width.
 * @cssstate expanded - Desktop navigation reserves space.
 * @cssstate mobile - Available layout width is below mobile-breakpoint.
 * @cssstate mobile-open - Mobile drawer is open; desktop preference is unaffected.
 * @cssstate peeking - Desktop navigation floats over content without pinning.
 * @cssstate resizing - The resize handle owns a live drag.
 * @fires {CustomEvent<SidebarOpenChangeDetail>} ui-sidebar-open-change - Cancelable request; controlled desktop state remains owned by the application.
 * @fires {CustomEvent<{width: number}>} ui-sidebar-resize - Committed desktop width in CSS pixels.
 * @mashnode root root
 * @mashnode header header root
 * @mashnode navigation navigation root
 * @mashnode footer footer root
 * @mashnode inset content root
 * @mashnode trigger control root
 * @mashnode content-header header inset
 * @mashrole slot default content inset
 * @mashrole slot header header header
 * @mashrole slot navigation navigation navigation
 * @mashrole slot footer footer footer
 * @mashrole slot trigger trigger trigger
 * @mashrole slot content-header header content-header
 */
export class UISidebar extends LitElement {
  static override properties = {
    open: { converter: optionalBooleanAttribute, reflect: true },
    defaultOpen: { attribute: "default-open", converter: booleanAttribute },
    persist: { converter: booleanAttribute, reflect: true },
    storageKey: { type: String, attribute: "storage-key" },
    side: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    collapsible: { type: String, reflect: true },
    peek: { type: String, reflect: true },
    shortcut: { type: String },
    mobileBreakpoint: { type: Number, attribute: "mobile-breakpoint" },
    width: { type: String },
    widthMobile: { type: String, attribute: "width-mobile" },
    minWidth: { type: Number, attribute: "min-width" },
    maxWidth: { type: Number, attribute: "max-width" },
    rail: { converter: booleanAttribute, reflect: true },
    bordered: { converter: booleanAttribute, reflect: true },
    label: { type: String },
    _mobile: { state: true },
    _mobileOpen: { state: true },
    _peeking: { state: true },
  };
  /** Controlled desktop state; undefined leaves state internal. Attribute accepts true/false. */
  declare open: boolean | undefined;
  /** Initial uncontrolled desktop state. */
  declare defaultOpen: boolean;
  /** Persist accepted desktop changes in a seven-day SameSite cookie. */
  declare persist: boolean;
  /** Cookie key; use distinct keys for independent persistent sidebars. */
  declare storageKey: string;
  /** Physical edge of the layout. */
  declare side: SidebarSide;
  /** Surface relationship between navigation and content. */
  declare variant: SidebarVariant;
  /** none keeps a static column and disables collapse, peek and mobile conversion. */
  declare collapsible: "offcanvas" | "none";
  /** How the collapsed edge temporarily reveals navigation. */
  declare peek: SidebarPeek;
  /** Bare key, auto for side-aware brackets, or none/null to disable. Scoped to focus inside this layout. */
  declare shortcut: string | null;
  /** Available host width below which navigation becomes a drawer. */
  declare mobileBreakpoint: number;
  /** Preferred desktop CSS width, clamped by min-width and max-width. */
  declare width: string;
  /** Preferred mobile CSS width. */
  declare widthMobile: string;
  /** Minimum drag width in CSS pixels. */
  declare minWidth: number;
  /** Maximum drag width in CSS pixels. */
  declare maxWidth: number;
  /** Show the pointer and keyboard resize separator. */
  declare rail: boolean;
  /** Draw the inner edge of the standard sidebar surface. */
  declare bordered: boolean;
  /** Accessible navigation and drawer name. */
  declare label: string;
  declare private _mobile: boolean;
  declare private _mobileOpen: boolean;
  declare private _peeking: boolean;
  static override styles = baseStyles;
  readonly #internals = this.attachInternals();
  readonly #panelId = `mash-sidebar-${++sidebarId}`;
  #desktopOpen = true;
  #initialized = false;
  #observer?: ResizeObserver;
  #abort?: AbortController;
  #key?: GestureBindingHandle;
  #hoverTimer?: ReturnType<typeof setTimeout>;
  #resizeOrigin = 0;
  #resizeTravel = 0;
  #resizeCancelled = false;
  #focusReturn?: HTMLElement;

  constructor() {
    super();
    this.open = undefined;
    this.defaultOpen = true;
    this.persist = true;
    this.storageKey = "mash-sidebar-state";
    this.side = "left";
    this.variant = "sidebar";
    this.collapsible = "offcanvas";
    this.peek = "none";
    this.shortcut = "auto";
    this.mobileBreakpoint = 768;
    this.width = "16rem";
    this.widthMobile = "18rem";
    this.minWidth = 160;
    this.maxWidth = 360;
    this.rail = true;
    this.bordered = true;
    this.label = "Workspace navigation";
    this._mobile = false;
    this._mobileOpen = false;
    this._peeking = false;
  }
  /** Effective desktop preference. Mobile and peek never mutate it. */
  get expanded(): boolean {
    return this.collapsible === "none" || (this.open ?? this.#desktopOpen);
  }
  get mobile(): boolean {
    return this._mobile;
  }
  get mobileOpen(): boolean {
    return this._mobileOpen;
  }
  get peeking(): boolean {
    return this._peeking;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#initialized) {
      this.#desktopOpen = this.defaultOpen;
      if (this.persist && this.storageKey) {
        try {
          const stored = this.ownerDocument.cookie
            .split("; ")
            .find((value) => value.startsWith(encodeURIComponent(this.storageKey) + "="))
            ?.split("=")[1];
          if (stored === "true" || stored === "false") this.#desktopOpen = stored === "true";
        } catch {
          /* Storage restrictions do not prevent navigation. */
        }
      }
      this.#initialized = true;
    }
    const signal = (this.#abort = new AbortController()).signal;
    this.addEventListener("mash-command", this.#command, { signal });
    this.addEventListener("keydown", this.#escape, { signal });
    this.addEventListener(
      "pointercancel",
      () => {
        this.#resizeCancelled = true;
      },
      { signal, capture: true },
    );
    this.ownerDocument.addEventListener("pointerdown", this.#outside, { signal });
    this.#observer = new ResizeObserver(() => this.#measure());
    this.#observer.observe(this);
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#abort?.abort();
    this.#key?.destroy();
    this.#key = undefined;
    clearTimeout(this.#hoverTimer);
    this.#internals.states.delete("resizing");
    super.disconnectedCallback();
  }
  #persist(): void {
    if (!this.persist || !this.storageKey) return;
    try {
      this.ownerDocument.cookie = `${encodeURIComponent(this.storageKey)}=${this.expanded}; Path=/; Max-Age=604800; SameSite=Lax`;
    } catch {
      /* Optional storage. */
    }
  }
  #request(open: boolean, mode: SidebarOpenChangeDetail["mode"], reason: SidebarReason): void {
    if (this.collapsible === "none") return;
    const current =
      mode === "mobile" ? this._mobileOpen : mode === "peek" ? this._peeking : this.expanded;
    if (current === open) return;
    const accepted = this.dispatchEvent(
      new CustomEvent<SidebarOpenChangeDetail>("ui-sidebar-open-change", {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { open, mode, reason },
      }),
    );
    if (!accepted) return;
    if (mode === "desktop") {
      if (this.open === undefined) {
        this.#desktopOpen = open;
        this.#persist();
      }
      this._peeking = false;
    } else if (mode === "mobile") this._mobileOpen = open;
    else this._peeking = open;
    this.requestUpdate();
    if (!open && mode !== "peek")
      void this.updateComplete.then(() => {
        if (this._mobileOpen || (!this._mobile && this.expanded)) return;
        this.#returnFocus();
      });
  }
  /** Open the desktop rail or the independent mobile drawer. */
  show(reason: SidebarReason = "imperative"): void {
    this.#request(true, this._mobile ? "mobile" : "desktop", reason);
  }
  /** Close the desktop rail or mobile drawer. */
  hide(reason: SidebarReason = "imperative"): void {
    this.#request(false, this._mobile ? "mobile" : "desktop", reason);
  }
  /** Toggle the effective mode; a peek becomes pinned. */
  toggle(reason: SidebarReason = "imperative"): void {
    this.#request(
      !(this._mobile ? this._mobileOpen : this.expanded),
      this._mobile ? "mobile" : "desktop",
      reason,
    );
  }
  /** Transient desktop reveal; never reserves space or persists. */
  showPeek(reason: SidebarReason = "imperative"): void {
    if (!this._mobile && !this.expanded && this.peek !== "none")
      this.#request(true, "peek", reason);
  }
  dismissPeek(reason: SidebarReason = "imperative"): void {
    this.#request(false, "peek", reason);
  }
  #returnFocus(): void {
    const target = this.#focusReturn?.isConnected
      ? this.#focusReturn
      : (this.querySelector<HTMLElement>(':scope > [slot="trigger"]') ??
        this.renderRoot.querySelector<HTMLElement>('button[part="trigger"]'));
    target?.focus();
  }
  #toggle = (event: Event): void => {
    this.#focusReturn = event
      .composedPath()
      .find(
        (node) =>
          node instanceof HTMLElement &&
          (node.matches("button,ui-button,[href]") || node.getAttribute("role") === "button"),
      ) as HTMLElement | undefined;
    this.toggle("trigger");
  };
  #escape = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !event.defaultPrevented && this._peeking) {
      event.preventDefault();
      event.stopPropagation();
      this.dismissPeek("escape");
      this.#returnFocus();
    }
  };
  #outside = (event: Event): void => {
    if (!this._peeking) return;
    const panel = this.renderRoot.querySelector('[part="panel"]');
    const edge = this.renderRoot.querySelector('[part="edge"]');
    if (!event.composedPath().includes(panel!) && !event.composedPath().includes(edge!))
      this.dismissPeek("outside");
  };
  #command = (event: Event): void => {
    const detail = (event as CustomEvent<MashCommandDetail>).detail;
    if (detail.command !== "sidebar.toggle" || event.target !== this) return;
    event.stopPropagation();
    if (detail.phase === "ended") this.toggle("shortcut");
  };
  #bindKey(): void {
    this.#key?.destroy();
    this.#key = undefined;
    if (!this.shortcut || this.shortcut === "none" || this.collapsible === "none") return;
    this.#key = bindGesture(this, {
      command: "sidebar.toggle",
      gesture: {
        kind: "key",
        key: this.shortcut === "auto" ? (this.side === "left" ? "[" : "]") : this.shortcut,
        modifiers: [],
        repeat: false,
        preventDefault: "recognized",
      },
      when: (context) => {
        const path = context.event.composedPath();
        return (
          path.find((node) => node instanceof UISidebar) === this &&
          !path.some(
            (node) =>
              node instanceof HTMLElement &&
              (node.isContentEditable ||
                node.matches("input,textarea,select,[role=textbox],[role=combobox]")),
          )
        );
      },
    });
  }
  #hover = (open: boolean): void => {
    clearTimeout(this.#hoverTimer);
    if (this.peek !== "hover" || this._mobile || this.expanded) return;
    this.#hoverTimer = setTimeout(
      () => {
        if (open) this.showPeek("hover");
        else if (
          !this.matches(":focus-within") ||
          !this.renderRoot.querySelector('[part="panel"]')?.matches(":focus-within")
        )
          this.dismissPeek("hover");
      },
      open ? 120 : 180,
    );
  };
  #measure(): void {
    const available = this.clientWidth;
    if (available > 0) {
      const mobile = this.collapsible !== "none" && available < Math.max(0, this.mobileBreakpoint);
      if (mobile !== this._mobile) {
        this._mobile = mobile;
        this._mobileOpen = false;
        this._peeking = false;
      }
    }
    const handle = this.renderRoot.querySelector<UIResizableHandle>("ui-resizable-handle");
    const panel = this.renderRoot.querySelector<HTMLElement>('[part="panel"]');
    if (handle && panel)
      handle.setRange(panel.offsetWidth, this.#minimum, this.#maximum, this.#panelId);
  }
  get #minimum(): number {
    return Number.isFinite(this.minWidth) ? Math.max(80, this.minWidth) : 160;
  }
  get #maximum(): number {
    return Math.max(this.#minimum, Number.isFinite(this.maxWidth) ? this.maxWidth : 360);
  }
  #resize = (event: CustomEvent<ResizeDetail>): void => {
    event.stopPropagation();
    if (!this.expanded || this._mobile || !this.rail || this.collapsible === "none") return;
    const panel = this.renderRoot.querySelector<HTMLElement>('[part="panel"]')!;
    const handle = event.currentTarget as UIResizableHandle;
    if (event.detail.phase === "start") {
      this.#resizeOrigin = panel.offsetWidth;
      this.#resizeTravel = 0;
      this.#resizeCancelled = false;
      handle.resizing = true;
      this.#internals.states.add("resizing");
      return;
    }
    if (event.detail.phase === "move") {
      const scale = this.getBoundingClientRect().width / this.offsetWidth || 1;
      this.#resizeTravel += (event.detail.delta / scale) * (this.side === "right" ? -1 : 1);
      const width = Math.max(
        this.#minimum,
        Math.min(this.#maximum, this.#resizeOrigin + this.#resizeTravel),
      );
      this.width = `${width}px`;
      return;
    }
    handle.resizing = false;
    this.#internals.states.delete("resizing");
    if (this.#resizeCancelled) {
      this.width = `${this.#resizeOrigin}px`;
      return;
    }
    if (Math.abs(this.#resizeTravel) < 2) this.hide("rail");
    else if (this.#resizeOrigin + this.#resizeTravel < this.#minimum - 24) {
      this.width = `${this.#resizeOrigin}px`;
      this.hide("resize");
    } else
      this.dispatchEvent(
        new CustomEvent("ui-sidebar-resize", {
          bubbles: true,
          composed: true,
          detail: {
            width: Math.max(
              this.#minimum,
              Math.min(this.#maximum, this.#resizeOrigin + this.#resizeTravel),
            ),
          },
        }),
      );
  };
  protected override updated(changed: PropertyValues): void {
    this.style.setProperty("--_mash-sidebar-width", this.width);
    this.style.setProperty("--_mash-sidebar-width-mobile", this.widthMobile);
    this.style.setProperty("--_mash-sidebar-min", `${this.#minimum}px`);
    this.style.setProperty("--_mash-sidebar-max", `${this.#maximum}px`);
    for (const [state, on] of [
      ["expanded", this.expanded],
      ["mobile", this._mobile],
      ["mobile-open", this._mobileOpen],
      ["peeking", this._peeking],
    ] as const) {
      if (on) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (!this.#key || changed.has("shortcut") || changed.has("side") || changed.has("collapsible"))
      this.#bindKey();
    if (changed.has("open") && changed.get("open") !== undefined) this.#persist();
    this.#measure();
    const drawer = this.renderRoot.querySelector<UIDrawer>("ui-drawer");
    if (drawer && this._mobileOpen && !drawer.open) drawer.show();
    else if (drawer && !this._mobileOpen && drawer.open) drawer.dismiss();
    const trigger = this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
    if (trigger)
      trigger.setAttribute(
        "aria-expanded",
        String(this._mobile ? this._mobileOpen : this.expanded),
      );
  }
  #navigation(): TemplateResult {
    return html`<div
        part="header"
        ?hidden=${![...this.children].some((node) => node.slot === "header")}
      >
        <slot name="header" @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      <ui-scroll-area
        part="navigation"
        label=${this.label}
        mode="always"
        exportparts="viewport:viewport,content:scroll-content,block-scrollbar:scrollbar,block-track:scroll-track,block-thumb:scroll-thumb"
        ><slot name="navigation"></slot
      ></ui-scroll-area>
      <div part="footer" ?hidden=${![...this.children].some((node) => node.slot === "footer")}>
        <slot name="footer" @slotchange=${() => this.requestUpdate()}></slot>
      </div>`;
  }
  protected override render(): TemplateResult {
    return html`<div part="root">
      <div part="rail-viewport" ?hidden=${this._mobile}>
        <aside
          part="panel"
          id=${this.#panelId}
          aria-label=${this.label}
          aria-hidden=${!this.expanded && !this._peeking ? "true" : "false"}
          .inert=${!this.expanded && !this._peeking}
          @pointerenter=${() => this.#hover(true)}
          @pointerleave=${() => this.#hover(false)}
        >
          ${this._mobile ? nothing : this.#navigation()}
        </aside>
        <ui-resizable-handle
          part="rail"
          exportparts="control:resize,grip:resize-grip"
          label="Resize or collapse sidebar"
          ?hidden=${!this.expanded || !this.rail || this.collapsible === "none"}
          @ui-resize=${this.#resize}
        ></ui-resizable-handle>
        <button
          part="edge"
          aria-label="Peek sidebar"
          aria-expanded=${String(this._peeking)}
          ?hidden=${this.expanded || this.peek === "none" || this.collapsible === "none"}
          @click=${() => {
            if (this._peeking) this.dismissPeek();
            else this.showPeek();
          }}
          @pointerenter=${() => this.#hover(true)}
          @pointerleave=${() => this.#hover(false)}
        ></button>
      </div>
      <section part="inset" .inert=${this._mobileOpen}>
        <header part="toolbar">
          <span
            part="trigger"
            ?hidden=${this.collapsible === "none"}
            @click=${this.#toggle}
            @pointerenter=${() => this.#hover(true)}
            @pointerleave=${() => this.#hover(false)}
            ><slot name="trigger"
              ><button
                part="trigger"
                aria-label="Toggle sidebar"
                aria-expanded=${String(this._mobile ? this._mobileOpen : this.expanded)}
                aria-controls=${this.#panelId}
                title=${this.shortcut === "auto" ? `Toggle sidebar (${this.side === "left" ? "[" : "]"})` : "Toggle sidebar"}
              >
                <ui-icon
                  part="trigger-icon"
                  exportparts="root:trigger-glyph,source:trigger-source"
                  name="navigation.menu"
                  label=""
                ></ui-icon></button></slot></span
          ><span part="content-header"><slot name="content-header"></slot></span>
        </header>
        <div part="content"><slot></slot></div>
      </section>
      <ui-drawer
        part="drawer"
        side=${this.side === "right" ? "end" : "start"}
        label=${this.label}
        exportparts="backdrop:drawer-backdrop,positioner:drawer-positioner,popup:drawer-popup,title:drawer-title,content:drawer-content"
        @ui-drawer-open-change=${(event: CustomEvent<{ open: boolean; reason: string }>) => {
          event.stopPropagation();
          if (event.detail.open !== this._mobileOpen)
            this.#request(
              event.detail.open,
              "mobile",
              event.detail.reason === "escape" ? "escape" : "outside",
            );
          this.requestUpdate();
        }}
        >${this._mobile ? this.#navigation() : nothing}<button
          slot="close"
          part="close"
          aria-label="Close sidebar"
        >
          Close
        </button></ui-drawer
      >
    </div>`;
  }
}
