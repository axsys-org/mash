import { html, type PropertyValues, type TemplateResult } from "lit";

import {
  bindGesture,
  type GestureBindingHandle,
  type MashCommandDetail,
} from "../gesture/gesture.js";

import { UICheckable } from "../internal/checkable.js";

/** The switch's physical control scale. */
export type SwitchSize = "inherit" | "compact" | "default" | "sm" | "small" | "md" | "medium";

/** Which side the visible label occupies relative to the track. */
export type SwitchLabelSide = "left" | "right";

/**
 * A binary setting exposed with switch semantics.
 *
 * Like `ui-checkbox`, this is a behaviour-only definition. A Mash catalogue
 * styles its stable parts, while another product can present the same state and
 * event contract in its own visual language.
 *
 * @tag ui-switch
 * @summary Turns a binary setting on or off.
 *
 * @example Setting
 * <div class="demo button-showcase-row">
 *   <ui-switch name="desktop-notifications" checked>Desktop notifications</ui-switch>
 * </div>
 *
 * @example Switch sizes
 * <div class="demo button-showcase-row">
 *   <ui-switch size="small" checked>Small</ui-switch>
 *   <ui-switch size="medium" checked>Medium</ui-switch>
 *   <ui-switch size="medium" label-side="left" checked>Label left</ui-switch>
 * </div>
 *
 * @slot - Visible label for the setting.
 * @slot track - Optional authored content within the switch track.
 * @slot thumb - Optional authored content within the movable switch thumb.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native checkbox exposed as a `switch`.
 * @csspart track - The independently styleable switch track.
 * @csspart thumb - The independently styleable switch thumb.
 * @csspart label - The projected setting label.
 *
 * @cssstate checked - Matches `:state(checked)` while on.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate required - Matches `:state(required)` while selection is required.
 *
 * @fires {CustomEvent<{ checked: boolean }>} ui-switch-change - Emitted after user interaction changes the setting.
 *
 * @mashnode root root
 * @mashnode control control root
 * @mashnode track track control
 * @mashnode thumb thumb track
 * @mashnode label label root
 * @mashnode checked checked control
 * @mashnode disabled disabled control
 * @mashnode required required control
 * @mashnode name name control
 * @mashnode value value control
 * @mashnode size size control
 * @mashaxis size control-size
 * @mashnode label-side label-side label
 * @mashrole slot default label label
 */
export class UISwitch extends UICheckable {
  static override properties = {
    ...UICheckable.properties,
    size: { type: String, reflect: true },
    label: { type: String, reflect: true },
    labelSide: { type: String, attribute: "label-side", reflect: true },
  };

  /** Semantic physical scale. `sm` and `md` aliases match compact control notation. */
  declare size: SwitchSize;
  /** Visible label fallback when no label content is slotted. */
  declare label: string;
  /** Places the visible label before or after the switch track. */
  declare labelSide: SwitchLabelSide;

  protected readonly changeEventName = "ui-switch-change";
  protected readonly controlRole = "switch";

  constructor() {
    super();
    this.size = "inherit";
    this.label = "";
    this.labelSide = "right";
  }

  protected override get fallbackLabel(): string {
    return this.label;
  }

  #drag: GestureBindingHandle | undefined;
  #abort: AbortController | undefined;
  #origin = 0;
  #position = 0;
  #suppressClick = false;

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this.#drag) this.#bindDrag();
    if (this.renderRoot.querySelector<HTMLInputElement>("input")?.disabled) this.#resetDrag();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#drag?.destroy();
    this.#drag = undefined;
    this.#abort?.abort();
    this.#resetDrag();
    super.disconnectedCallback();
  }

  #bindDrag(): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input");
    if (!input) return;
    const signal = (this.#abort = new AbortController()).signal;
    this.addEventListener(
      "pointerdown",
      () => {
        this.#suppressClick = false;
      },
      { signal },
    );
    input.addEventListener(
      "click",
      (event) => {
        if (this.#suppressClick && event.detail !== 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { signal, capture: true },
    );
    input.addEventListener(
      "mash-command",
      (event) => {
        const detail = (event as CustomEvent<MashCommandDetail>).detail;
        if (detail.command !== "switch.drag") return;
        event.stopPropagation();
        if (detail.phase === "cancelled" || input.disabled) {
          this.#resetDrag();
          return;
        }
        if (detail.phase === "began") {
          this.#origin = this.checked ? 1 : 0;
          this.#suppressClick = true;
          this.setAttribute("data-dragging", "");
        }
        const track = this.renderRoot.querySelector<HTMLElement>('[part="track"]')!;
        const style = getComputedStyle(this);
        // CSS geometry is measured in the rendered track's coordinate space, including preview scaling.
        const scale = track.getBoundingClientRect().width / track.offsetWidth || 1;
        const direction = style.direction === "rtl" ? -1 : 1;
        const movement = (detail.value.movement?.x ?? 0) / scale;
        // The public recipe can use rem, px or calc; resolved track/thumb dimensions stay authoritative.
        const thumb = this.renderRoot.querySelector<HTMLElement>('[part="thumb"]')!;
        const actualTravel =
          track.clientWidth -
          thumb.offsetWidth -
          2 * parseFloat(getComputedStyle(thumb).insetInlineStart);
        const distance = Number.isFinite(actualTravel) ? actualTravel : 0;
        if (distance > 0)
          this.#position = Math.max(
            0,
            Math.min(1, this.#origin + (direction * movement) / distance),
          );
        this.style.setProperty("--_mash-switch-progress", String(this.#position));
        if (detail.phase === "ended") {
          const next = this.#position >= 0.5;
          this.#resetDrag();
          if (next !== this.checked) input.click();
        }
      },
      { signal },
    );
    this.#drag = bindGesture(input, {
      command: "switch.drag",
      gesture: {
        kind: "drag",
        axis: "x",
        threshold: 2,
        capture: true,
        preventDefault: "recognized",
      },
      when: () => !input.disabled,
    });
  }

  #resetDrag(): void {
    this.removeAttribute("data-dragging");
    this.style.removeProperty("--_mash-switch-progress");
  }

  protected override renderCheckableParts(): TemplateResult {
    return html`
      <span part="track">
        <slot name="track"></slot>
        <span part="thumb"><slot name="thumb"></slot></span>
      </span>
    `;
  }

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
