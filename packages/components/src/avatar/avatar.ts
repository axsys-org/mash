import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

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
 */
export class UIAvatar extends LitElement {
  static override properties = {
    src: { type: String, reflect: true },
    alt: { type: String, reflect: true },
    size: { type: String, reflect: true },
    _imageFailed: { type: Boolean, state: true },
  };

  /** Image location. Omit it to show the slotted fallback. */
  declare src: string;
  /** Alternative text for the image. */
  declare alt: string;
  /** Physical scale. */
  declare size: AvatarSize;

  declare private _imageFailed: boolean;

  constructor() {
    super();
    this.src = "";
    this.alt = "";
    this.size = "medium";
    this._imageFailed = false;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("src")) this._imageFailed = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;

        --_size: calc(var(--space-container-inline) + var(--space-control-inline));
        --_font-size: var(--type-label-font-size);
      }

      :host([size="small"]) {
        --_size: var(--space-container-inline);
        --_font-size: var(--type-label-small-font-size);
      }

      :host([size="large"]) {
        --_size: calc(var(--space-container-inline) + var(--space-container-inline));
        --_font-size: var(--type-label-large-font-size);
      }

      .avatar {
        position: relative;
        display: grid;
        inline-size: var(--_size);
        block-size: var(--_size);
        overflow: hidden;
        place-items: center;
        border: var(--border-hairline) solid var(--color-border);
        border-radius: var(--radius-pill);
        background: var(--color-surface-sunken);
        color: var(--color-text);
        font-family: var(--type-label-font-family);
        font-size: var(--_font-size);
        font-weight: var(--type-label-font-weight);
        line-height: var(--type-label-line-height);
      }

      .image {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        object-fit: cover;
      }

      .image[hidden] {
        display: none;
      }
    `,
  ];

  #onImageError = (): void => {
    this._imageFailed = true;
  };

  protected override render(): TemplateResult {
    const showImage = Boolean(this.src) && !this._imageFailed;
    return html`
      <span part="root" class="avatar">
        <span part="fallback" ?aria-hidden=${showImage}><slot></slot></span>
        <img
          part="image"
          class="image"
          src=${this.src}
          alt=${this.alt}
          ?hidden=${!showImage}
          @error=${this.#onImageError}
        />
      </span>
    `;
  }
}
