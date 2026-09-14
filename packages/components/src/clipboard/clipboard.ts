import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import type { ButtonSize, ButtonTone, ButtonVariant } from "../button/button.js";
import { baseStyles } from "../internal/base-styles.js";
import type { IconName } from "../icon/icon.js";
import { iconSource } from "../icon/icon-registry.js";

/** Where a clipboard value was resolved from for a given activation. */
export type ClipboardValueSource = "value" | "source" | "event";

/** Fired before the clipboard write so applications can provide a lazy value. */
export interface ClipboardCopyRequestDetail {
  /** The currently resolved value. */
  value: string;
  /** Where the current value came from. */
  source: ClipboardValueSource;
  /** Replaces the value that will be written to the clipboard. */
  setValue(value: string): void;
}

/** Fired after a value was written successfully. */
export interface ClipboardCopiedDetail {
  value: string;
  source: ClipboardValueSource;
}

/** Fired when the platform clipboard write fails. */
export interface ClipboardErrorDetail {
  value: string;
  source: ClipboardValueSource;
  error: unknown;
}

/**
 * Copies text to the platform clipboard.
 *
 * `value` covers static strings. `source` points at a live element and reads it
 * at click time so inputs, rendered code, and generated commands can share one
 * copy model. For fully computed values, listen to `ui-clipboard-copy` and call
 * `event.detail.setValue(nextValue)` before the component writes.
 *
 * @tag ui-clipboard
 * @summary Copies text with button-like feedback and late-bound values.
 *
 * @example Static copy
 * <ui-clipboard value="https://example.com/project/billing" size="small">Copy URL</ui-clipboard>
 *
 * @example Copy from source
 * <pre><code id="copy-snippet">npm install @mash/ui</code></pre>
 * <ui-clipboard source="#copy-snippet" size="xs" variant="ghost">Copy</ui-clipboard>
 *
 * @slot - The idle button label. Falls back to `label`.
 * @slot icon - Replaces the idle glyph.
 * @slot copied-icon - Replaces the success glyph.
 * @slot error-icon - Replaces the error glyph.
 *
 * @csspart control - The native `<button>` that owns focus and activation.
 * @csspart icon - The current icon lane.
 * @csspart copy-icon - The idle copy glyph.
 * @csspart copied-icon - The success glyph.
 * @csspart error-icon - The error glyph.
 * @csspart label - The visible status label.
 *
 * @cssstate copied - Matches after a successful write until `reset-after` elapses.
 * @cssstate copying - Matches while the platform write is pending.
 * @cssstate error - Matches after a failed write until the next attempt succeeds.
 * @cssstate disabled - Matches while activation is unavailable.
 *
 * @fires {CustomEvent<ClipboardCopyRequestDetail>} ui-clipboard-copy - Requests the text to copy.
 * @fires {CustomEvent<ClipboardCopiedDetail>} ui-clipboard-copied - Reports a successful write.
 * @fires {CustomEvent<ClipboardErrorDetail>} ui-clipboard-error - Reports a failed write.
 *
 * @mashnode control control
 * @mashnode icon icon control
 * @mashnode label label control
 * @mashnode value value control
 * @mashnode source source control
 * @mashnode variant variant control
 * @mashnode size size control
 * @mashaxis size control-size
 * @mashnode tone tone control
 * @mashnode copied copied control
 * @mashnode copying copying control
 * @mashnode error error control
 * @mashnode disabled disabled control
 * @mashnode copy copy control
 * @mashrole slot default label label
 * @mashrole attribute value value value
 * @mashrole event ui-clipboard-copied copy copied
 */
export class UIClipboard extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String },
    source: { type: String, reflect: true },
    label: { type: String, reflect: true },
    copiedLabel: { type: String, attribute: "copied-label", reflect: true },
    errorLabel: { type: String, attribute: "error-label", reflect: true },
    icon: { type: String, reflect: true },
    copiedIcon: { type: String, attribute: "copied-icon", reflect: true },
    errorIcon: { type: String, attribute: "error-icon", reflect: true },
    resetAfter: { type: Number, attribute: "reset-after", reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    compact: { type: Boolean, reflect: true },
    outline: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _copied: { type: Boolean, state: true },
    _copying: { type: Boolean, state: true },
    _error: { type: Boolean, state: true },
  };

  /** Static text copied when no event listener replaces it. */
  declare value: string;
  /** Selector for a live element whose value or text is copied at activation time. */
  declare source: string;
  /** Idle visible label and accessible fallback. */
  declare label: string;
  /** Success label shown after copy. */
  declare copiedLabel: string;
  /** Error label shown after a failed write. */
  declare errorLabel: string;
  /** Semantic glyph used before copy succeeds. */
  declare icon: IconName;
  /** Semantic glyph used after copy succeeds. */
  declare copiedIcon: IconName;
  /** Semantic glyph used after copy fails. */
  declare errorIcon: IconName;
  /** Milliseconds before success/error feedback returns to idle. */
  declare resetAfter: number;
  /** Visual emphasis, matched to `ui-button` variants. */
  declare variant: ButtonVariant;
  /** Physical scale shared with button controls, including short aliases. */
  declare size: ButtonSize;
  /** Semantic meaning, matched to `ui-button` tones. */
  declare tone: ButtonTone;
  /** Reduces inline padding while preserving the current size tier. */
  declare compact: boolean;
  /** Draws an outlined treatment that can combine with any tone. */
  declare outline: boolean;
  /** Prevents activation. */
  declare disabled: boolean;
  declare private _copied: boolean;
  declare private _copying: boolean;
  declare private _error: boolean;

  readonly #internals: ElementInternals;
  #resetTimer: number | undefined;

  constructor() {
    super();
    this.value = "";
    this.source = "";
    this.label = "Copy";
    this.copiedLabel = "Copied";
    this.errorLabel = "Copy failed";
    this.icon = "object.document";
    this.copiedIcon = "action.confirm";
    this.errorIcon = "status.error";
    this.resetAfter = 1500;
    this.variant = "secondary";
    this.size = "small";
    this.tone = "neutral";
    this.compact = false;
    this.outline = false;
    this.disabled = false;
    this._copied = false;
    this._copying = false;
    this._error = false;
    this.#internals = this.attachInternals();

    this.addEventListener("click", this.#onHostClick, { capture: true });
  }

  static override styles = baseStyles;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearResetTimer();
  }

  override focus(options?: FocusOptions): void {
    this.#control?.focus(options);
  }

  override blur(): void {
    this.#control?.blur();
  }

  get #control(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>("[part='control']");
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.disabled || this._copying) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    void this.copy().catch(() => {
      // Programmatic `copy()` callers get the rejection; click activation reports
      // failure through `ui-clipboard-error` and leaves the page console quiet.
    });
  };

  /** Resolves and writes the current value to the platform clipboard. */
  async copy(): Promise<string> {
    if (this.disabled || this._copying) return this.#resolveValue().value;

    const requested = this.#requestValue();
    this._copying = true;
    this._error = false;
    await this.updateComplete;

    try {
      await writeClipboardText(requested.value);
      this._copied = true;
      this.dispatchEvent(
        new CustomEvent<ClipboardCopiedDetail>("ui-clipboard-copied", {
          bubbles: true,
          composed: true,
          detail: requested,
        }),
      );
      this.#scheduleReset();
      return requested.value;
    } catch (error) {
      this._error = true;
      this._copied = false;
      this.dispatchEvent(
        new CustomEvent<ClipboardErrorDetail>("ui-clipboard-error", {
          bubbles: true,
          composed: true,
          detail: { ...requested, error },
        }),
      );
      this.#scheduleReset();
      throw error;
    } finally {
      this._copying = false;
    }
  }

  #requestValue(): ClipboardCopiedDetail {
    let requested = this.#resolveValue();
    const detail: ClipboardCopyRequestDetail = {
      value: requested.value,
      source: requested.source,
      setValue(value: string) {
        requested = { value, source: "event" };
        detail.value = value;
        detail.source = "event";
      },
    };

    this.dispatchEvent(
      new CustomEvent<ClipboardCopyRequestDetail>("ui-clipboard-copy", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );

    return requested;
  }

  #resolveValue(): ClipboardCopiedDetail {
    if (this.source.trim()) {
      const target = this.#findSourceElement(this.source.trim());
      if (target) return { value: textFromSourceElement(target), source: "source" };
    }
    return { value: this.value, source: "value" };
  }

  #findSourceElement(selector: string): Element | null {
    const root = this.getRootNode() as Document | ShadowRoot;
    if (!("querySelector" in root)) return null;

    try {
      return root.querySelector(selector);
    } catch {
      return null;
    }
  }

  #clearResetTimer(): void {
    if (this.#resetTimer === undefined) return;
    window.clearTimeout(this.#resetTimer);
    this.#resetTimer = undefined;
  }

  #scheduleReset(): void {
    this.#clearResetTimer();
    const delay = Number.isFinite(this.resetAfter) ? Math.max(0, this.resetAfter) : 1500;
    this.#resetTimer = window.setTimeout(() => {
      this._copied = false;
      this._error = false;
      this.#resetTimer = undefined;
    }, delay);
  }

  protected override updated(changed: PropertyValues<this>): void {
    const changedKeys = changed as Map<PropertyKey, unknown>;
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
    if (changedKeys.has("_copied")) {
      if (this._copied) this.#internals.states.add("copied");
      else this.#internals.states.delete("copied");
    }
    if (changedKeys.has("_copying")) {
      if (this._copying) this.#internals.states.add("copying");
      else this.#internals.states.delete("copying");
    }
    if (changedKeys.has("_error")) {
      if (this._error) this.#internals.states.add("error");
      else this.#internals.states.delete("error");
    }
  }

  protected override render(): TemplateResult {
    const state = this._error ? "error" : this._copied ? "copied" : "copy";
    const label =
      state === "error" ? this.errorLabel : state === "copied" ? this.copiedLabel : this.label;
    const iconName =
      state === "error" ? this.errorIcon : state === "copied" ? this.copiedIcon : this.icon;
    const source = iconSource(iconName, "small");

    return html`
      <button
        part="control"
        type="button"
        ?disabled=${this.disabled || this._copying}
        aria-busy=${this._copying ? "true" : "false"}
        aria-label=${label || nothing}
      >
        <span part="icon ${state}-icon" aria-hidden="true">
          <slot
            name="${state === "copied" ? "copied-icon" : state === "error" ? "error-icon" : "icon"}"
          >
            ${source ? unsafeSVG(source) : nothing}
          </slot>
        </span>
        <span part="label"><slot>${label}</slot></span>
      </button>
    `;
  }
}

function textFromSourceElement(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  const value = (element as { value?: unknown }).value;
  if (typeof value === "string") return value;

  const clipboardValue = (element as HTMLElement).dataset?.clipboardValue;
  if (clipboardValue !== undefined) return clipboardValue;

  return element.textContent ?? "";
}

async function writeClipboardText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.insetBlockStart = "0";
  textarea.style.insetInlineStart = "0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Copy command was rejected.");
  } finally {
    textarea.remove();
  }
}
