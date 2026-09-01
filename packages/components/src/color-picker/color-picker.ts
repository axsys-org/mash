import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/** Normalizes supported three-, four-, six-, and eight-digit hex colors. */
export function normalizeHexColor(value: string): string | null {
  const match = value.trim().match(/^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (!match?.[1]) return null;
  const raw = match[1];
  const expanded =
    raw.length <= 4
      ? raw
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : raw;
  return `#${expanded.toUpperCase()}`;
}

interface ColorChannels {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function channelsFromHex(value: string): ColorChannels | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  const red = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const green = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(raw.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  if (delta > 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100,
    alpha: raw.length === 8 ? (Number.parseInt(raw.slice(6, 8), 16) / 255) * 100 : 100,
  };
}

function hexFromChannels(channels: ColorChannels): string {
  const hue = ((channels.hue % 360) + 360) % 360;
  const saturation = clamp(channels.saturation, 0, 100) / 100;
  const lightness = clamp(channels.lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, intermediate, 0]
      : segment < 2
        ? [intermediate, chroma, 0]
        : segment < 3
          ? [0, chroma, intermediate]
          : segment < 4
            ? [0, intermediate, chroma]
            : segment < 5
              ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate];
  const match = lightness - chroma / 2;
  const byte = (channel: number): string =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  const alpha = Math.round((clamp(channels.alpha, 0, 100) / 100) * 255);
  return `#${byte(red)}${byte(green)}${byte(blue)}${alpha < 255 ? alpha.toString(16).padStart(2, "0").toUpperCase() : ""}`;
}

/**
 * An unstyled color-picker state and overlay coordinator.
 *
 * The picker owns committed versus transient preview values, open/dismiss
 * behavior, and swatch event coordination. Applications own the palette,
 * sliders, text input, layout, and every visual decision through the authored
 * palette slot and semantic component parts.
 *
 * @tag ui-color-picker
 * @summary Coordinates color preview, commit, and an authored picker popup.
 *
 * @example Accent color
 * <ui-color-picker label="Accent color" value="#0A84FF">
 *   <ui-button slot="trigger">Choose color</ui-button>
 *   <ui-color-swatch value="#0A84FF">Blue</ui-color-swatch>
 *   <ui-color-swatch value="#30D158">Green</ui-color-swatch>
 *   <ui-color-swatch value="#FF453A">Red</ui-color-swatch>
 * </ui-color-picker>
 *
 * @slot trigger - The control that opens or closes the picker.
 * @slot preview - The authored committed or transient color preview.
 * @slot - The authored palette.
 * @slot hue - A hue control using a zero-through-360 value.
 * @slot saturation - A saturation control using a zero-through-100 value.
 * @slot lightness - A lightness control using a zero-through-100 value.
 * @slot alpha - An alpha control using a zero-through-100 value.
 * @slot hex - A text-entry control for the normalized hex value.
 * @slot clear - An optional action that clears the committed color.
 * @slot actions - Additional authored color-editing actions.
 * @slot close - An optional explicit dismiss action.
 *
 * @csspart root - The color-picker behavior root.
 * @csspart trigger - The trigger binding.
 * @csspart backdrop - The dismissible overlay layer.
 * @csspart positioner - The anchor-relative placement owner.
 * @csspart popup - The picker popup.
 * @csspart content - The authored palette binding.
 * @csspart preview - The authored color preview binding.
 * @csspart palette - The authored palette binding.
 * @csspart controls - The HSLA and text-entry control group.
 * @csspart hue - The authored hue-control binding.
 * @csspart saturation - The authored saturation-control binding.
 * @csspart lightness - The authored lightness-control binding.
 * @csspart alpha - The authored alpha-control binding.
 * @csspart hex - The authored hex-input binding.
 * @csspart clear - The authored clear-action binding.
 * @csspart actions - The authored action group.
 * @csspart close - The explicit dismiss binding.
 *
 * @cssstate open - Matches `:state(open)` while the picker popup is visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 * @cssstate previewing - Matches `:state(previewing)` while a transient color is active.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-color-picker-open-change - Reports an open-state change and why it occurred.
 * @fires {CustomEvent<{value: string}>} ui-color-change - Reports a committed color.
 * @fires {CustomEvent<{value: string | null}>} ui-color-preview - Reports a transient preview.
 *
 * @mashnode root control
 * @mashnode trigger trigger root
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode content content popup
 * @mashnode preview preview content
 * @mashnode palette list content
 * @mashnode controls group content
 * @mashnode hue hue controls
 * @mashnode saturation saturation controls
 * @mashnode lightness lightness controls
 * @mashnode alpha alpha controls
 * @mashnode hex hex controls
 * @mashnode actions actions content
 * @mashnode clear clear actions
 * @mashnode close close popup
 * @mashnode value value root
 * @mashnode previewing previewing root
 * @mashnode label label root
 * @mashnode open open root
 * @mashnode disabled disabled root
 * @mashnode change change root
 * @mashnode preview-change change root
 * @mashrole part root control root
 * @mashrole slot default list palette
 * @mashrole part palette list palette
 * @mashrole part controls group controls
 * @mashrole slot preview preview preview
 * @mashrole part preview preview preview
 * @mashrole slot hue hue hue
 * @mashrole part hue hue hue
 * @mashrole slot saturation saturation saturation
 * @mashrole part saturation saturation saturation
 * @mashrole slot lightness lightness lightness
 * @mashrole part lightness lightness lightness
 * @mashrole slot alpha alpha alpha
 * @mashrole part alpha alpha alpha
 * @mashrole slot hex hex hex
 * @mashrole part hex hex hex
 * @mashrole slot clear clear clear
 * @mashrole part clear clear clear
 * @mashrole event ui-color-change change change
 * @mashrole event ui-color-preview change preview-change
 */
export class UIColorPicker extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    value: { type: String, reflect: true },
    preview: { type: String, reflect: true },
    hue: { type: Number, reflect: true },
    saturation: { type: Number, reflect: true },
    lightness: { type: Number, reflect: true },
    alpha: { type: Number, reflect: true },
  };

  /** Committed normalized hex color. */
  declare value: string;
  /** Transient normalized hex color, or empty while not previewing. */
  declare preview: string;
  /** Hue channel in degrees. */
  declare hue: number;
  /** Saturation channel from zero through 100. */
  declare saturation: number;
  /** Lightness channel from zero through 100. */
  declare lightness: number;
  /** Alpha channel from zero through 100. */
  declare alpha: number;

  protected readonly overlayRole = "dialog" as const;
  constructor() {
    super();
    this.value = "";
    this.preview = "";
    this.hue = 0;
    this.saturation = 0;
    this.lightness = 0;
    this.alpha = 100;
    this.addEventListener("ui-color-select", this.#onSelect as EventListener);
    this.addEventListener("ui-color-swatch-preview", this.#onPreview as EventListener);
    this.addEventListener("ui-slider-input", this.#onChannelInput as EventListener);
    this.addEventListener("ui-slider-change", this.#onChannelChange as EventListener);
    this.addEventListener("input", this.#onHexInput);
    this.addEventListener("change", this.#onHexChange);
    this.addEventListener("keydown", this.#onHexKeydown);
    this.addEventListener("click", this.#onClearClick);
  }

  protected emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-color-picker-open-change", {
        detail: { open, reason },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #applyChannels(value: string): void {
    const channels = channelsFromHex(value);
    if (!channels) return;
    this.hue = channels.hue;
    this.saturation = channels.saturation;
    this.lightness = channels.lightness;
    this.alpha = channels.alpha;
  }

  #authoredControl(event: Event): HTMLElement | null {
    return (
      (event
        .composedPath()
        .find((node) => node instanceof HTMLElement && node.parentElement === this && node.slot) as
        HTMLElement | undefined) ?? null
    );
  }

  #setChannel(name: "hue" | "saturation" | "lightness" | "alpha", value: number): string {
    this[name] = name === "hue" ? ((value % 360) + 360) % 360 : clamp(Number(value), 0, 100);
    return hexFromChannels(this);
  }

  #onChannelInput = (event: CustomEvent<{ value: number }>): void => {
    const control = this.#authoredControl(event);
    const channel = control?.slot;
    if (!channel || !["hue", "saturation", "lightness", "alpha"].includes(channel)) return;
    this.previewColor(
      this.#setChannel(channel as "hue" | "saturation" | "lightness" | "alpha", event.detail.value),
    );
  };

  #onChannelChange = (event: CustomEvent<{ value: number }>): void => {
    const control = this.#authoredControl(event);
    const channel = control?.slot;
    if (!channel || !["hue", "saturation", "lightness", "alpha"].includes(channel)) return;
    this.commitColor(
      this.#setChannel(channel as "hue" | "saturation" | "lightness" | "alpha", event.detail.value),
      false,
    );
  };

  #onHexInput = (event: Event): void => {
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    this.previewColor(control.value ?? control.getAttribute("value") ?? "");
  };

  #onHexChange = (event: Event): void => {
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    this.commitColor(control.value ?? control.getAttribute("value") ?? "", false);
  };

  #onHexKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter") return;
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    if (this.commitColor(control.value ?? control.getAttribute("value") ?? "")) {
      event.preventDefault();
    }
  };

  #onClearClick = (event: Event): void => {
    const control = this.#authoredControl(event);
    if (control?.slot !== "clear") return;
    this.clearColor();
  };

  #syncAuthoredControls(): void {
    const values: Record<string, string | number> = {
      preview: this.preview || this.value,
      hue: this.hue,
      saturation: this.saturation,
      lightness: this.lightness,
      alpha: this.alpha,
      hex: this.preview || this.value,
    };
    for (const [slot, value] of Object.entries(values)) {
      for (const element of this.querySelectorAll<HTMLElement>(`:scope > [slot="${slot}"]`)) {
        if ("value" in element) (element as HTMLElement & { value: string | number }).value = value;
      }
    }
    for (const swatch of this.querySelectorAll<HTMLElement & { selected?: boolean }>(
      ":scope > ui-color-swatch",
    )) {
      swatch.selected = normalizeHexColor(swatch.getAttribute("value") ?? "") === this.value;
    }
  }

  /** Applies a transient color without changing the committed value. */
  previewColor(value: string | null): boolean {
    const normalized = value === null ? null : normalizeHexColor(value);
    if (value !== null && !normalized) return false;
    this.preview = normalized ?? "";
    if (normalized) this.#applyChannels(normalized);
    this.dispatchEvent(
      new CustomEvent<{ value: string | null }>("ui-color-preview", {
        detail: { value: normalized },
        bubbles: true,
        composed: true,
      }),
    );
    return true;
  }

  /** Commits a supported hex color and optionally dismisses the popup. */
  commitColor(value: string, close = true): boolean {
    const normalized = normalizeHexColor(value);
    if (!normalized) return false;
    this.value = normalized;
    this.preview = normalized;
    this.#applyChannels(normalized);
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-color-change", {
        detail: { value: normalized },
        bubbles: true,
        composed: true,
      }),
    );
    if (close) this.requestOpenChange(false, "select");
    return true;
  }

  /** Clears the committed and transient values while keeping the picker open by default. */
  clearColor(close = false): void {
    this.value = "";
    this.preview = "";
    this.hue = 0;
    this.saturation = 0;
    this.lightness = 0;
    this.alpha = 100;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-color-change", {
        detail: { value: "" },
        bubbles: true,
        composed: true,
      }),
    );
    if (close) this.requestOpenChange(false, "clear");
  }

  #onSelect = (event: CustomEvent<{ value: string }>): void => {
    event.stopPropagation();
    this.commitColor(event.detail.value);
  };

  #onPreview = (event: CustomEvent<{ value: string | null }>): void => {
    event.stopPropagation();
    this.previewColor(event.detail.value);
  };

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("value") && this.value) this.#applyChannels(this.value);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has("preview")) {
      if (this.preview && this.preview !== this.value)
        this.overlayInternals.states.add("previewing");
      else this.overlayInternals.states.delete("previewing");
    }
    queueMicrotask(() => this.#syncAuthoredControls());
  }

  protected override renderAuthoredContent(): TemplateResult {
    return html`
      <div part="content">
        <div part="preview">
          <slot name="preview" @slotchange=${this.#syncAuthoredControls}></slot>
        </div>
        <div part="palette"><slot @slotchange=${this.#syncAuthoredControls}></slot></div>
        <div part="controls">
          <div part="hue"><slot name="hue" @slotchange=${this.#syncAuthoredControls}></slot></div>
          <div part="saturation">
            <slot name="saturation" @slotchange=${this.#syncAuthoredControls}></slot>
          </div>
          <div part="lightness">
            <slot name="lightness" @slotchange=${this.#syncAuthoredControls}></slot>
          </div>
          <div part="alpha">
            <slot name="alpha" @slotchange=${this.#syncAuthoredControls}></slot>
          </div>
          <div part="hex"><slot name="hex" @slotchange=${this.#syncAuthoredControls}></slot></div>
        </div>
        <div part="actions">
          <div part="clear"><slot name="clear"></slot></div>
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    return html`<div part="root">${this.renderOverlay()}</div>`;
  }
}

/**
 * An unstyled selectable color in a picker palette.
 *
 * @tag ui-color-swatch
 * @summary Previews and commits one semantic color value.
 * @example Accent swatch
 * <ui-color-swatch value="#0A84FF" selected>System blue</ui-color-swatch>
 * @slot - The swatch label. Falls back to the normalized hex value.
 * @csspart control - The native radio-like action.
 * @csspart swatch - The color-value realization.
 * @csspart label - The authored label binding.
 * @cssstate selected - Matches `:state(selected)` for the committed color.
 * @cssstate disabled - Matches `:state(disabled)` while selection is unavailable.
 * @fires {CustomEvent<{value: string}>} ui-color-select - Requests color commitment.
 * @fires {CustomEvent<{value: string | null}>} ui-color-swatch-preview - Requests preview enter or exit.
 * @mashnode control option
 * @mashnode swatch color control
 * @mashnode label label control
 * @mashnode value value control
 * @mashnode selected selected control
 * @mashnode disabled disabled control
 * @mashnode select select control
 * @mashnode preview change control
 * @mashrole part control option control
 * @mashrole part swatch color swatch
 * @mashrole slot default value value
 * @mashrole part label value value
 * @mashfallback slot default bindings attribute:value
 * @mashrole event ui-color-select select select
 * @mashrole event ui-color-swatch-preview change preview
 */
export class UIColorSwatch extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Supported hex color value. */
  declare value: string;
  /** Accessible and visible fallback label. */
  declare label: string;
  /** Whether this is the committed palette color. */
  declare selected: boolean;
  /** Prevents preview and selection. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "#000000";
    this.label = "";
    this.selected = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #normalized(): string {
    return normalizeHexColor(this.value) ?? "#000000";
  }

  #select = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-color-select", {
        detail: { value: this.#normalized },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #preview = (value: string | null): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string | null }>("ui-color-swatch-preview", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  protected override updated(changed: PropertyValues<this>): void {
    for (const state of ["selected", "disabled"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  protected override render(): TemplateResult {
    return html`
      <button
        part="control"
        type="button"
        role="radio"
        aria-label=${this.label || this.#normalized}
        aria-checked=${this.selected ? "true" : "false"}
        ?disabled=${this.disabled}
        @click=${this.#select}
        @pointerenter=${() => this.#preview(this.#normalized)}
        @pointerleave=${() => this.#preview(null)}
        @focus=${() => this.#preview(this.#normalized)}
        @blur=${() => this.#preview(null)}
      >
        <span
          part="swatch"
          aria-hidden="true"
          style=${`background-color:${this.#normalized}`}
        ></span>
        <span part="label"><slot>${this.label || this.#normalized}</slot></span>
      </button>
    `;
  }
}
