import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type ImageDecoding = "async" | "auto" | "sync";
export type ImageFetchPriority = "auto" | "high" | "low";
export type ImageLoading = "eager" | "lazy";

export interface ImageLoadDetail {
  currentSrc: string;
  fallback: boolean;
  naturalHeight: number;
  naturalWidth: number;
  src: string;
}

export interface ImageErrorDetail {
  fallback: boolean;
  recoverable: boolean;
  src: string;
}

type ImageStatus = "empty" | "error" | "loaded" | "loading";

interface AuthoredSource {
  media: string;
  sizes: string;
  srcset: string;
  type: string;
}

/**
 * A headless responsive image with explicit loading and recovery anatomy.
 *
 * Native `img` and `picture` behavior remains intact. Mash only coordinates a
 * fallback source, exposes lifecycle states, and gives authored sources,
 * placeholders, and errors stable slots. A catalogue owns aspect ratio,
 * object fitting, transitions, and every visible dimension.
 *
 * @tag ui-image
 * @summary Loads a responsive image with authored placeholder and error fallbacks.
 *
 * @example Responsive project cover
 * <ui-image src="/project-cover.webp" alt="Billing migration dashboard" width="1280" height="720">
 *   <source slot="source" media="(min-width: 48rem)" srcset="/project-cover-wide.webp">
 *   <span slot="placeholder">Loading project cover…</span>
 *   <span slot="error">Project cover unavailable</span>
 * </ui-image>
 *
 * @slot source - Optional authored `source` elements used by the native picture.
 * @slot placeholder - Content exposed while an image request is pending.
 * @slot error - Content exposed after the primary and fallback sources fail.
 *
 * @csspart root - The complete image realization.
 * @csspart picture - The native responsive picture boundary.
 * @csspart source - The authored responsive source slot.
 * @csspart sources - The authored responsive source collection.
 * @csspart image - The native image element.
 * @csspart placeholder - The authored pending-state content.
 * @csspart error - The authored terminal error content.
 *
 * @cssstate loading - Matches `:state(loading)` while a source is pending.
 * @cssstate loaded - Matches `:state(loaded)` after the active source loads.
 * @cssstate error - Matches `:state(error)` after every available source fails.
 * @cssstate fallback - Matches `:state(fallback)` while the fallback source is active.
 *
 * @fires {CustomEvent<ImageLoadDetail>} ui-image-load - Reports the source and intrinsic dimensions after loading.
 * @fires {CustomEvent<ImageErrorDetail>} ui-image-error - Reports a failed source and whether fallback recovery will continue.
 * @mashnode root image
 * @mashnode picture picture root
 * @mashnode sources sources picture
 * @mashnode source source sources
 * @mashnode image image picture
 * @mashnode placeholder placeholder root
 * @mashnode error error root
 * @mashnode loading loading root
 * @mashnode loaded loaded root
 * @mashnode fallback fallback root
 * @mashnode load load root
 * @mashnode fail error root
 * @mashrole slot source source source
 * @mashrole slot placeholder placeholder placeholder
 * @mashrole slot error error error
 * @mashrole part root image root
 * @mashrole part picture picture picture
 * @mashrole part sources sources sources
 * @mashrole part source source source
 * @mashrole part image image image
 * @mashrole part placeholder placeholder placeholder
 * @mashrole part error error error
 * @mashrole state loading loading loading
 * @mashrole state loaded loaded loaded
 * @mashrole state fallback fallback fallback
 * @mashrole event ui-image-load load load
 * @mashrole event ui-image-error error fail
 *
 */
export class UIImage extends LitElement {
  static override properties = {
    src: { type: String, reflect: true },
    alt: { type: String, reflect: true },
    srcset: { type: String, reflect: true },
    sizes: { type: String, reflect: true },
    width: { type: Number, reflect: true },
    height: { type: Number, reflect: true },
    loading: { type: String, reflect: true },
    decoding: { type: String, reflect: true },
    fetchPriority: { type: String, attribute: "fetchpriority", reflect: true },
    fallbackSrc: { type: String, attribute: "fallback-src", reflect: true },
    _activeSrc: { type: String, state: true },
    _status: { type: String, state: true },
    _usingFallback: { type: Boolean, state: true },
    _sources: { state: true },
  };

  /** Primary image source URL. */
  declare src: string;
  /** Alternative text forwarded to the native image. */
  declare alt: string;
  /** Native responsive source candidates for the fallback `img`. */
  declare srcset: string;
  /** Native responsive source-size hints. */
  declare sizes: string;
  /** Intrinsic image width used by the browser to reserve space. */
  declare width: number | undefined;
  /** Intrinsic image height used by the browser to reserve space. */
  declare height: number | undefined;
  /** Native eager or lazy loading policy. */
  declare loading: ImageLoading;
  /** Native image decoding preference. */
  declare decoding: ImageDecoding;
  /** Native network fetch priority hint. */
  declare fetchPriority: ImageFetchPriority;
  /** Optional source attempted after the primary source fails. */
  declare fallbackSrc: string;

  declare private _activeSrc: string;
  declare private _status: ImageStatus;
  declare private _usingFallback: boolean;
  declare private _sources: AuthoredSource[];

  readonly #internals: ElementInternals;
  readonly #sourceObserver = new MutationObserver((records) => {
    if (
      records.some(
        (record) => record.target instanceof HTMLSourceElement && record.target.slot === "source",
      )
    )
      this.#syncSources();
  });

  constructor() {
    super();
    this.src = "";
    this.alt = "";
    this.srcset = "";
    this.sizes = "";
    this.width = undefined;
    this.height = undefined;
    this.loading = "lazy";
    this.decoding = "async";
    this.fetchPriority = "auto";
    this.fallbackSrc = "";
    this._activeSrc = "";
    this._status = "empty";
    this._usingFallback = false;
    this._sources = [];
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      /* Visibility is lifecycle behavior. Keep catalogue part recipes from
         accidentally overriding the native hidden state. */
      [hidden] {
        display: none !important;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.#sourceObserver.observe(this, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    this.#syncSources();
  }

  override disconnectedCallback(): void {
    this.#sourceObserver.disconnect();
    super.disconnectedCallback();
  }

  #syncSources = (): void => {
    this._sources = [
      ...this.querySelectorAll<HTMLSourceElement>(":scope > source[slot='source']"),
    ].map((source) => ({
      media: source.media,
      sizes: source.sizes,
      srcset: source.srcset,
      type: source.type,
    }));
  };

  #reusedLoadedSource = false;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("src")) {
      this.#reusedLoadedSource =
        this._status === "loaded" &&
        this._activeSrc === this.src &&
        !this.srcset &&
        this._sources.length === 0;
      this._activeSrc = this.src;
      this._usingFallback = false;
      this._status = this.#reusedLoadedSource ? "loaded" : this.src ? "loading" : "empty";
      return;
    }
    if (!changed.has("fallbackSrc")) return;
    // A new recovery source must initiate its own request after a terminal
    // failure. Reassigning the unchanged failed primary URL emits no event.
    if (this._usingFallback || (this._status === "error" && this.fallbackSrc)) {
      this._usingFallback = Boolean(this.fallbackSrc);
      this._activeSrc = this.fallbackSrc || this.src;
      this._status = this._activeSrc ? "loading" : "empty";
    }
  }

  protected override updated(): void {
    for (const state of ["loading", "loaded", "error"] as const) {
      if (this._status === state) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (this._usingFallback) this.#internals.states.add("fallback");
    else this.#internals.states.delete("fallback");
    if (this.#reusedLoadedSource) {
      this.#reusedLoadedSource = false;
      const image = this.renderRoot.querySelector<HTMLImageElement>("img");
      if (image) this.#reportLoad(image);
    }
  }

  #onLoad = (event: Event): void => {
    if (this._status === "error") return;
    this.#reportLoad(event.currentTarget as HTMLImageElement);
  };

  #reportLoad(image: HTMLImageElement): void {
    this._status = "loaded";
    this.dispatchEvent(
      new CustomEvent<ImageLoadDetail>("ui-image-load", {
        bubbles: true,
        composed: true,
        detail: {
          src: this._activeSrc,
          currentSrc: image.currentSrc || this._activeSrc,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          fallback: this._usingFallback,
        },
      }),
    );
  }

  #onError = (): void => {
    const failedSrc = this._activeSrc;
    const recoverable = !this._usingFallback && Boolean(this.fallbackSrc);
    this.dispatchEvent(
      new CustomEvent<ImageErrorDetail>("ui-image-error", {
        bubbles: true,
        composed: true,
        detail: { src: failedSrc, fallback: this._usingFallback, recoverable },
      }),
    );
    if (recoverable) {
      this._usingFallback = true;
      this._activeSrc = this.fallbackSrc;
      this._status = "loading";
    } else {
      this._status = "error";
    }
  };

  protected override render(): TemplateResult {
    const pending = this._status === "loading";
    const failed = this._status === "error";
    const hasSource = Boolean(this._activeSrc);
    return html`
      <span part="root">
        <slot name="source" part="source sources" @slotchange=${this.#syncSources}></slot>
        <picture part="picture" ?hidden=${!hasSource || failed}>
          ${
            this._usingFallback
              ? nothing
              : this._sources.map(
                  (source) => html`
                    <source
                      media=${source.media || nothing}
                      sizes=${source.sizes || nothing}
                      srcset=${source.srcset}
                      type=${source.type || nothing}
                    />
                  `,
                )
          }
          <img
            part="image"
            src=${hasSource ? this._activeSrc : nothing}
            srcset=${!this._usingFallback && this.srcset ? this.srcset : nothing}
            sizes=${!this._usingFallback && this.sizes ? this.sizes : nothing}
            alt=${this.alt}
            width=${this.width ?? nothing}
            height=${this.height ?? nothing}
            loading=${this.loading}
            decoding=${this.decoding}
            fetchpriority=${this.fetchPriority}
            @load=${this.#onLoad}
            @error=${this.#onError}
          />
        </picture>
        <span part="placeholder" ?hidden=${!pending}><slot name="placeholder"></slot></span>
        <span part="error" ?hidden=${!failed}><slot name="error"></slot></span>
      </span>
    `;
  }
}
