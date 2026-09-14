import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The physical scale of an avatar. */
export type AvatarSize = "small" | "medium" | "large";

/**
 * Identifies a person, team or agent with an image or text fallback.
 *
 * The default slot is deliberately the fallback rather than an optional
 * decoration: it remains visible when an image is unavailable, so consumers
 * can provide initials or a meaningful symbol without a second component.
 *
 * @tag ui-avatar
 * @summary Identifies a person, team or agent with an image or text fallback.
 *
 * @example Image and fallback
 * <div class="demo button-showcase-row">
 *   <ui-avatar size="small">M</ui-avatar>
 *   <ui-avatar>AX</ui-avatar>
 *   <ui-avatar size="large">✦</ui-avatar>
 * </div>
 *
 * @slot - Fallback content, usually initials.
 *
 * @csspart root - The circular avatar surface.
 * @csspart image - The image, when `src` is available.
 * @csspart fallback - The text fallback behind the image.
 * @csspart status - Optional availability indicator.
 * @mashnode status status root
 *
 * @cssstate loading - Matches `:state(loading)` while an authored image is pending.
 * @cssstate loaded - Matches `:state(loaded)` after the authored image loads.
 * @cssstate error - Matches `:state(error)` after the authored image fails.
 *
 * @fires {CustomEvent<{ src: string }>} ui-avatar-load - Reports a successfully loaded avatar source.
 * @fires {CustomEvent<{ src: string }>} ui-avatar-error - Reports a failed avatar source before fallback is exposed.
 *
 * @mashnode root root
 * @mashnode image image root
 * @mashnode fallback fallback root
 * @mashnode size size root
 * @mashaxis size identity-size
 * @mashrole slot default fallback fallback
 */
export class UIAvatar extends LitElement {
  static override properties = {
    src: { type: String, reflect: true },
    alt: { type: String, reflect: true },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    status: { type: String, reflect: true },
    _imageFailed: { type: Boolean, state: true },
    _imageLoaded: { type: Boolean, state: true },
  };

  /** Image location. Omit it to show the slotted fallback. */
  declare src: string;
  /** Alternative text for the image. */
  declare alt: string;
  /** Physical scale. */
  declare size: AvatarSize;
  /** Circular identity or a rounded square for a team. */
  declare shape: "circle" | "square";
  /** Optional availability, announced with the identity label. */
  declare status: "" | "online" | "away" | "busy" | "offline";

  declare private _imageFailed: boolean;
  declare private _imageLoaded: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.src = "";
    this.alt = "";
    this.size = "medium";
    this.shape = "circle";
    this.status = "";
    this._imageFailed = false;
    this._imageLoaded = false;
    this.#internals = this.attachInternals();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("src")) {
      this._imageFailed = false;
      this._imageLoaded = false;
    }
    const loading = Boolean(this.src) && !this._imageLoaded && !this._imageFailed;
    for (const [state, active] of [
      ["loading", loading],
      ["loaded", this._imageLoaded],
      ["error", this._imageFailed],
    ] as const) {
      if (active) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  static override styles = baseStyles;

  #onImageError = (): void => {
    this._imageFailed = true;
    this._imageLoaded = false;
    this.dispatchEvent(
      new CustomEvent<{ src: string }>("ui-avatar-error", {
        bubbles: true,
        composed: true,
        detail: { src: this.src },
      }),
    );
  };

  #onImageLoad = (): void => {
    this._imageLoaded = true;
    this._imageFailed = false;
    this.dispatchEvent(
      new CustomEvent<{ src: string }>("ui-avatar-load", {
        bubbles: true,
        composed: true,
        detail: { src: this.src },
      }),
    );
  };

  protected override render(): TemplateResult {
    const showImage = Boolean(this.src) && !this._imageFailed;
    return html`
      <span
        part="root"
        class="avatar"
        role="img"
        aria-label=${(this.alt || this.textContent?.trim() || "Avatar") + (this.status ? `, ${this.status}` : "")}
      >
        <span part="fallback" ?hidden=${showImage}
          ><slot
            >${
              this.alt
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0] ?? "")
                .join("")
                .toUpperCase() || "?"
            }</slot
          ></span
        >
        <img
          part="image"
          class="image"
          src=${this.src}
          alt=${this.alt}
          ?hidden=${!showImage}
          @load=${this.#onImageLoad}
          @error=${this.#onImageError}
        />
        ${this.status ? html`<span part="status" aria-hidden="true"></span>` : ""}
      </span>
    `;
  }
}
