import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";
import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

import {
  normalizeHexColor,
  channelsFromHex,
  hexFromChannels,
  clamp,
  parseColor,
  type ColorFormat,
  type ParsedColor,
} from "./color-value.js";
export { normalizeHexColor, parseColor } from "./color-value.js";
export type { ColorFormat, ParsedColor } from "./color-value.js";

/**
 * A color selector with an inline surface or an anchored popup.
 *
 * The picker owns committed versus transient preview values, open/dismiss
 * behavior, a saturation/value plane, keyboard channel controls, and four color formats.
 * Applications can replace the composed controls through named slots and supply
 * their own palette. Public parts and semantic recipes own appearance.
 *
 * @tag ui-color-picker
 * @summary Edits HEX, RGB, HSL and OKLCH colors with opacity, swatches and screen sampling.
 * @csspart format - The format selector host.
 * @csspart format-row - Format, color value and eyedropper controls.
 * @csspart format-trigger - The composed select trigger.
 * @csspart format-positioner - The composed select positioner.
 * @csspart format-popup - The composed select popup.
 * @csspart format-list - The composed format list.
 * @csspart format-option - The composed format choices.
 * @csspart channel-label - Slider label.
 * @csspart channel-value - Slider value.
 * @csspart format-choice - Format option host.
 * @csspart channel-root - The composed slider layout.
 * @csspart hue-track - Hue spectrum rail.
 * @csspart hue-thumb - Hue position indicator.
 * @csspart hue-control - Native hue input within the Mash slider.
 * @csspart alpha-track - Opacity rail.
 * @csspart alpha-thumb - Opacity position indicator.
 * @csspart alpha-control - Native opacity input within the Mash slider.
 * @csspart channel-fill - The slider fill layer.
 * @csspart color-input - The composed text field.
 * @csspart eyedropper - Screen color action.
 * @csspart error - Invalid-input feedback.
 * @fires {CustomEvent<{format: ColorFormat}>} ui-color-format-change - Reports format selection.
 * @csspart plane - Pointer and keyboard saturation/value surface.
 * @csspart thumb - Current position on the color plane.
 * @csspart channel - Composed channel controls.
 * @csspart hex-input - Composed color-value input host.
 * @mashnode plane color controls
 * @mashnode thumb value plane
 * @mashnode channel channel controls
 * @mashnode hex-input value hex
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
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the popup is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the popup is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 * @cssstate previewing - Matches `:state(previewing)` while a transient color is active.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-color-picker-open-change - Reports an open-state change and why it occurred.
 * @fires {CustomEvent<{value: string, formattedValue: string, parsed: ParsedColor | null}>} ui-color-change - Reports canonical hex plus the selected representation and parsed channels.
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
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
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
    format: { type: String, reflect: true },
    hideEyedropper: { type: Boolean, attribute: "hide-eyedropper", reflect: true },
    _error: { state: true },
    ...UIAnchoredOverlay.properties,
    value: { type: String, reflect: true },
    preview: { type: String, reflect: true },
    hue: { type: Number, reflect: true },
    saturation: { type: Number, reflect: true },
    lightness: { type: Number, reflect: true },
    alpha: { type: Number, reflect: true },
    inline: { type: Boolean, reflect: true },
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
  /** Display the complete picker directly, without a popup or trigger. */
  declare inline: boolean;
  /** Text representation used by the editor; committed value stays canonical hex. */
  declare format: ColorFormat;
  /** Hide the native eyedropper even in supporting browsers. */
  declare hideEyedropper: boolean;
  declare private _error: string;
  #eyeAbort: AbortController | undefined;
  get parsedColor(): ParsedColor | null {
    return parseColor(this.preview || this.value);
  }
  get formattedValue(): string {
    return this.parsedColor?.[this.format] ?? "";
  }

  protected readonly overlayRole = "dialog" as const;
  constructor() {
    super();
    this.value = "";
    this.preview = "";
    this.hue = 0;
    this.saturation = 0;
    this.lightness = 0;
    this.alpha = 100;
    this.inline = false;
    this.format = "hex";
    this.hideEyedropper = false;
    this._error = "";
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
    if (channels.saturation > 0) this.hue = channels.hue;
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
    if (this.disabled) return;
    const control = this.#authoredControl(event);
    const channel = control?.slot;
    if (!channel || !["hue", "saturation", "lightness", "alpha"].includes(channel)) return;
    this.previewColor(
      this.#setChannel(channel as "hue" | "saturation" | "lightness" | "alpha", event.detail.value),
    );
  };

  #onChannelChange = (event: CustomEvent<{ value: number }>): void => {
    if (this.disabled) return;
    const control = this.#authoredControl(event);
    const channel = control?.slot;
    if (!channel || !["hue", "saturation", "lightness", "alpha"].includes(channel)) return;
    this.commitColor(
      this.#setChannel(channel as "hue" | "saturation" | "lightness" | "alpha", event.detail.value),
      false,
    );
  };

  #onHexInput = (event: Event): void => {
    if (this.disabled) return;
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    this.previewColor(control.value ?? control.getAttribute("value") ?? "");
  };

  #onHexChange = (event: Event): void => {
    if (this.disabled) return;
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    this.commitColor(control.value ?? control.getAttribute("value") ?? "", false);
  };

  #onHexKeydown = (event: KeyboardEvent): void => {
    if (this.disabled) return;
    if (event.key !== "Enter") return;
    const control = this.#authoredControl(event) as (HTMLElement & { value?: string }) | null;
    if (control?.slot !== "hex") return;
    if (this.commitColor(control.value ?? control.getAttribute("value") ?? "")) {
      event.preventDefault();
    }
  };

  #onClearClick = (event: Event): void => {
    if (this.disabled) return;
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
    const normalized = value === null ? null : (parseColor(value)?.hex ?? null);
    if (value !== null && !normalized) return false;
    this.preview = normalized ?? "";
    this.#applyChannels(normalized || this.value);
    this.dispatchEvent(
      new CustomEvent<{ value: string | null }>("ui-color-preview", {
        detail: { value: normalized },
        bubbles: true,
        composed: true,
      }),
    );
    return true;
  }

  /** Commits a supported color and optionally dismisses the popup. */
  commitColor(value: string, close = true): boolean {
    const normalized = parseColor(value)?.hex;
    if (!normalized) return false;
    this.value = normalized;
    this.preview = normalized;
    this.#applyChannels(normalized);
    this.dispatchEvent(
      new CustomEvent("ui-color-change", {
        detail: {
          value: normalized,
          formattedValue: this.formattedValue,
          parsed: this.parsedColor,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this._error = "";
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
      new CustomEvent("ui-color-change", {
        detail: { value: "", formattedValue: "", parsed: null },
        bubbles: true,
        composed: true,
      }),
    );
    if (close) this.requestOpenChange(false, "clear");
  }

  #onSelect = (event: CustomEvent<{ value: string }>): void => {
    event.stopPropagation();
    if (this.disabled) return;
    this.commitColor(event.detail.value);
  };

  #onPreview = (event: CustomEvent<{ value: string | null }>): void => {
    event.stopPropagation();
    if (this.disabled) return;
    this.previewColor(event.detail.value);
  };

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has("value")) {
      if (this.value) {
        const normalized = parseColor(this.value)?.hex;
        if (normalized) this.value = normalized;
        this.#applyChannels(this.value);
      }
      if (!changed.has("preview")) this.preview = "";
    }
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
    const light = this.lightness / 100;
    const value = light + (this.saturation / 100) * Math.min(light, 1 - light);
    const saturation = value === 0 ? 0 : 2 * (1 - light / value);
    return html`
      <div part="content">
        <div
          part="plane"
          role="group"
          aria-label="Saturation and brightness"
          tabindex=${this.disabled ? "-1" : "0"}
          aria-disabled=${this.disabled ? "true" : "false"}
          aria-description="Arrow keys adjust saturation and brightness. Hold Shift for larger steps."
          @keydown=${this.#planeKey}
          @pointercancel=${this.#planeUp}
          style=${`position:relative;background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${this.hue} 100% 50%))`}
          @pointerdown=${this.#planeDown}
          @pointermove=${this.#planeMove}
          @pointerup=${this.#planeUp}
        >
          <span
            part="thumb"
            style=${`position:absolute;left:${saturation * 100}%;top:${(1 - value) * 100}%;transform:translate(-50%,-50%)`}
          ></span>
        </div>
        <div part="preview">
          <slot
            name="preview"
            @slotchange=${(event: Event) => {
              hideEmptySlot(event);
              this.#syncAuthoredControls();
            }}
          ></slot>
        </div>
        <div part="palette">
          <slot
            @slotchange=${(event: Event) => {
              hideEmptySlot(event);
              this.#syncAuthoredControls();
            }}
          ></slot>
        </div>
        <div part="controls">
          <div part="hue">
            <slot name="hue" @slotchange=${this.#syncAuthoredControls}>
              <ui-slider
                part="channel"
                exportparts="root:channel-root, label:channel-label, thumb-value:channel-value, track:hue-track, thumb:hue-thumb, control:hue-control, indicator:channel-fill"
                label="Hue"
                min="0"
                max="359"
                .value=${this.hue}
                ?disabled=${this.disabled}
                @ui-slider-input=${(e: CustomEvent<{ value: number }>) => this.#editChannel("hue", e)}
                @ui-slider-change=${(e: CustomEvent<{ value: number }>) => this.#editChannel("hue", e)}
              ></ui-slider>
            </slot>
          </div>
          <div part="alpha">
            <slot name="alpha" @slotchange=${this.#syncAuthoredControls}>
              <ui-slider
                part="channel"
                exportparts="root:channel-root, label:channel-label, thumb-value:channel-value, track:alpha-track, thumb:alpha-thumb, control:alpha-control, indicator:channel-fill"
                label="Opacity"
                min="0"
                max="100"
                .value=${this.alpha}
                ?disabled=${this.disabled}
                style=${`--mash-color-opaque:${(this.preview || this.value || "#000000").slice(0, 7)}`}
                @ui-slider-input=${(e: CustomEvent<{ value: number }>) => this.#editChannel("alpha", e)}
                @ui-slider-change=${(e: CustomEvent<{ value: number }>) => this.#editChannel("alpha", e)}
              ></ui-slider>
            </slot>
          </div>
          <div part="saturation"><slot name="saturation" @slotchange=${hideEmptySlot}></slot></div>
          <div part="lightness"><slot name="lightness" @slotchange=${hideEmptySlot}></slot></div>
          <div part="format-row">
            <ui-select
              part="format"
              exportparts="trigger:format-trigger, positioner:format-positioner, popup:format-popup, list:format-list"
              label="Color format"
              .value=${this.format}
              ?disabled=${this.disabled}
              @ui-select-change=${(e: CustomEvent<{ value: ColorFormat }>) => {
                e.stopPropagation();
                this.format = e.detail.value;
                this._error = "";
                this.dispatchEvent(
                  new CustomEvent("ui-color-format-change", {
                    detail: { format: this.format },
                    bubbles: true,
                    composed: true,
                  }),
                );
              }}
            >
              ${["hex", "rgb", "hsl", "oklch"].map((format) => html`<ui-option part="format-choice" exportparts="control:format-option" value=${format}>${format.toUpperCase()}</ui-option>`)}
            </ui-select>
            <div part="hex">
              <slot name="hex" @slotchange=${this.#syncAuthoredControls}>
                <ui-input
                  part="hex-input"
                  exportparts="control:color-input"
                  ?disabled=${this.disabled}
                  label=${this.format === "hex" ? "Hex color" : `${this.format.toUpperCase()} color`}
                  .value=${this.formattedValue}
                  @change=${(e: Event) => {
                    const control = e.target as HTMLElement & { value: string };
                    if (!this.commitColor(control.value, false)) {
                      control.value = this.formattedValue;
                      this._error = "Enter a valid color. Previous value restored.";
                    }
                  }}
                ></ui-input>
              </slot>
            </div>
            ${!this.hideEyedropper && "EyeDropper" in window ? html`<ui-button exportparts="control:eyedropper" aria-label="Pick screen color" ?disabled=${this.disabled} @click=${this.#pickScreen}>Pick</ui-button>` : ""}
          </div>
          <span part="error" role="status" ?hidden=${!this._error}>${this._error}</span>
        </div>
        <div part="actions">
          <div part="clear"><slot name="clear"></slot></div>
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    return html`<div part="root">
      ${this.inline ? this.renderAuthoredContent() : this.renderOverlay()}
    </div>`;
  }
  #planeDown = (event: PointerEvent): void => {
    if (this.disabled || event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.#choosePlane(event);
  };
  #planeMove = (event: PointerEvent): void => {
    if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId))
      this.#choosePlane(event);
  };
  #editChannel(name: "hue" | "alpha", event: CustomEvent<{ value: number }>): void {
    event.stopPropagation();
    if (!this.disabled) this.commitColor(this.#setChannel(name, event.detail.value), false);
  }
  #planeKey = (event: KeyboardEvent): void => {
    if (this.disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
      return;
    event.preventDefault();
    const light = this.lightness / 100;
    let value = light + (this.saturation / 100) * Math.min(light, 1 - light);
    let saturation = value === 0 ? 0 : 2 * (1 - light / value);
    const step = event.shiftKey ? 0.1 : 0.01;
    if (event.key === "ArrowLeft") saturation -= step;
    if (event.key === "ArrowRight") saturation += step;
    if (event.key === "ArrowUp") value += step;
    if (event.key === "ArrowDown") value -= step;
    this.#commitPlane(clamp(saturation, 0, 1), clamp(value, 0, 1));
  };
  #pickScreen = async (): Promise<void> => {
    if (this.disabled || this.hideEyedropper || !("EyeDropper" in window)) return;
    this.#eyeAbort?.abort();
    const abort = (this.#eyeAbort = new AbortController());
    const EyeDropper = (
      window as unknown as {
        EyeDropper: new () => {
          open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }>;
        };
      }
    ).EyeDropper;
    try {
      const result = await new EyeDropper().open({ signal: abort.signal });
      if (this.isConnected && !this.disabled) this.commitColor(result.sRGBHex, false);
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        this._error = "Screen color selection is unavailable. Enter a color instead.";
    }
  };
  override disconnectedCallback(): void {
    this.#eyeAbort?.abort();
    super.disconnectedCallback();
  }
  #planeUp = (event: PointerEvent): void => {
    const plane = event.currentTarget as HTMLElement;
    if (plane.hasPointerCapture(event.pointerId)) plane.releasePointerCapture(event.pointerId);
  };
  #choosePlane(event: PointerEvent): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const saturation = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const value = 1 - clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    this.#commitPlane(saturation, value);
  }
  #commitPlane(saturation: number, value: number): void {
    const lightness = value * (1 - saturation / 2);
    this.saturation =
      lightness === 0 || lightness === 1
        ? 0
        : ((value - lightness) / Math.min(lightness, 1 - lightness)) * 100;
    this.lightness = lightness * 100;
    this.commitColor(hexFromChannels(this), false);
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
