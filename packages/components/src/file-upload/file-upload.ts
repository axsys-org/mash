import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type FileUploadSource = "drop" | "imperative" | "picker";
export type FileUploadRejectionReason = "accept" | "max-files" | "max-size";

export interface FileUploadRejection {
  readonly file: File;
  readonly reason: FileUploadRejectionReason;
}

export interface FileUploadChangeDetail {
  /** Complete accepted selection after this interaction. */
  readonly files: readonly File[];
  /** Files accepted from this interaction. */
  readonly accepted: readonly File[];
  /** Files rejected from this interaction and the policy each failed. */
  readonly rejected: readonly FileUploadRejection[];
  readonly source: FileUploadSource;
}

function matchesAccept(file: File, accept: string): boolean {
  const filters = accept
    .split(",")
    .map((entry) => entry.trim().toLocaleLowerCase())
    .filter(Boolean);
  if (filters.length === 0) return true;
  const name = file.name.toLocaleLowerCase();
  const type = file.type.toLocaleLowerCase();
  return filters.some((filter) => {
    if (filter.startsWith(".")) return name.endsWith(filter);
    if (filter.endsWith("/*")) return type.startsWith(filter.slice(0, -1));
    return Boolean(type) && type === filter;
  });
}

/**
 * A headless native file picker and drop target.
 *
 * The component owns local file selection, accept/size/count policy, form
 * participation, drag state, and accessible activation. It does not upload,
 * persist, preview, or transform files. Those product concerns compose through
 * the selection event and authored slots, keeping local previews and remote
 * storage adapters replaceable.
 *
 * @tag ui-file-upload
 * @summary Selects local files through one accessible picker and drop contract.
 *
 * @example Project attachments
 * <ui-file-upload name="attachments" accept="image/*,video/*" multiple label="Add project media">
 *   <span slot="prefix">+</span>
 *   Add files
 *   <span slot="description">Images or video up to 20 MB</span>
 *   <output slot="selection">No files selected</output>
 * </ui-file-upload>
 *
 * @slot - The visible trigger label.
 * @slot prefix - Content before the trigger label.
 * @slot suffix - Content after the trigger label.
 * @slot description - Persistent selection guidance.
 * @slot selection - Parent-authored summary of the current selection.
 *
 * @csspart root - The complete picker and drop boundary.
 * @csspart input - The native file input stretched over the visual trigger.
 * @csspart trigger - The visual picker boundary around the native input.
 * @csspart prefix - The authored leading trigger content.
 * @csspart label - The authored trigger label.
 * @csspart suffix - The authored trailing trigger content.
 * @csspart description - The authored guidance binding.
 * @csspart selection - The authored current-selection binding.
 *
 * @cssstate empty - Matches while no files are selected.
 * @cssstate selected - Matches while one or more files are selected.
 * @cssstate dragover - Matches while a file drag is inside the drop boundary.
 * @cssstate disabled - Matches while selection is unavailable.
 * @cssstate required - Matches while the field requires a file.
 * @cssstate rejected - Matches after the latest interaction rejects any files.
 *
 * @fires {CustomEvent<FileUploadChangeDetail>} ui-file-upload-change - Reports accepted files, rejections, and the interaction source.
 *
 * @mashnode root file-upload
 * @mashnode input control trigger
 * @mashnode trigger trigger root
 * @mashnode prefix prefix trigger
 * @mashnode label label trigger
 * @mashnode suffix suffix trigger
 * @mashnode description description root
 * @mashnode selection selection root
 * @mashnode files files input
 * @mashnode accept accept input
 * @mashnode capture capture input
 * @mashnode multiple multiple input
 * @mashnode max-files max-files input
 * @mashnode max-size max-size input
 * @mashnode name name input
 * @mashnode disabled disabled input
 * @mashnode required required input
 * @mashnode empty empty root
 * @mashnode selected selected root
 * @mashnode dragover dragover root
 * @mashnode rejected rejected root
 * @mashnode change change files
 * @mashrole part root file-upload root
 * @mashrole part input control input
 * @mashrole part trigger trigger trigger
 * @mashrole slot prefix prefix prefix
 * @mashrole part prefix prefix prefix
 * @mashrole slot default label label
 * @mashrole part label label label
 * @mashrole slot suffix suffix suffix
 * @mashrole part suffix suffix suffix
 * @mashrole slot description description description
 * @mashrole part description description description
 * @mashrole slot selection selection selection
 * @mashrole part selection selection selection
 * @mashrole attribute accept accept accept
 * @mashrole attribute capture capture capture
 * @mashrole attribute multiple multiple multiple
 * @mashrole attribute max-files max-files max-files
 * @mashrole attribute max-size max-size max-size
 * @mashrole attribute name name name
 * @mashrole attribute disabled disabled disabled
 * @mashrole attribute required required required
 * @mashrole state empty empty empty
 * @mashrole state selected selected selected
 * @mashrole state dragover dragover dragover
 * @mashrole state rejected rejected rejected
 * @mashrole event ui-file-upload-change change change
 */
export class UIFileUpload extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    accept: { type: String, reflect: true },
    capture: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String, reflect: true },
    maxFiles: { type: Number, attribute: "max-files", reflect: true },
    maxSize: { type: Number, attribute: "max-size", reflect: true },
    multiple: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    _files: { state: true },
    _dragover: { type: Boolean, state: true },
    _rejected: { type: Boolean, state: true },
  };

  /** Native comma-separated extension or MIME accept filter. */
  declare accept: string;
  /** Native capture hint, commonly `user` or `environment`. */
  declare capture: string;
  /** Prevents picker activation and file drops. */
  declare disabled: boolean;
  /** Accessible name for the native picker trigger. */
  declare label: string;
  /** Maximum accepted file count; zero leaves the count unrestricted. */
  declare maxFiles: number;
  /** Maximum bytes per accepted file; zero leaves file size unrestricted. */
  declare maxSize: number;
  /** Allows more than one selected file. */
  declare multiple: boolean;
  /** Form field name used for accepted files. */
  declare name: string;
  /** Requires at least one accepted file for form validity. */
  declare required: boolean;

  declare private _files: readonly File[];
  declare private _dragover: boolean;
  declare private _rejected: boolean;

  readonly #internals: ElementInternals;
  #dragDepth = 0;

  constructor() {
    super();
    this.accept = "";
    this.capture = "";
    this.disabled = false;
    this.label = "Choose files";
    this.maxFiles = 0;
    this.maxSize = 0;
    this.multiple = false;
    this.name = "";
    this.required = false;
    this._files = Object.freeze([]);
    this._dragover = false;
    this._rejected = false;
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
      }

      [part="root"] {
        display: grid;
      }

      [part="trigger"] {
        position: relative;
        box-sizing: border-box;
        color: inherit;
        font: inherit;
      }

      [part="input"] {
        position: absolute;
        z-index: 1;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }

      [part="input"]:disabled {
        cursor: not-allowed;
      }

      [part="trigger"]:has([part="input"]:focus-visible) {
        outline: var(--border-focus-ring) solid var(--color-focus-ring);
        outline-offset: var(--border-focus-ring-offset);
      }

      [part="prefix"],
      [part="label"],
      [part="suffix"] {
        pointer-events: none;
      }
    `,
  ];

  /** Immutable accepted files currently represented by the field. */
  get files(): readonly File[] {
    return this._files;
  }

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  get validity(): ValidityState {
    return this.#internals.validity;
  }

  get validationMessage(): string {
    return this.#internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.#internals.willValidate;
  }

  get control(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>("[part='input']");
  }

  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  /** Opens the native picker. Browsers still require a user activation. */
  showPicker(): void {
    if (this.disabled) return;
    const input = this.control;
    if (!input) return;
    input.value = "";
    input.click();
  }

  /** Clears accepted files without inventing a remote deletion policy. */
  clear(): void {
    this._files = Object.freeze([]);
    this._rejected = false;
    if (this.control) this.control.value = "";
    this.#syncInternals();
  }

  /** Applies files supplied by a paste, capture, or another host adapter. */
  select(files: Iterable<File>, source: FileUploadSource = "imperative"): FileUploadChangeDetail {
    if (this.disabled) {
      return Object.freeze({
        files: this._files,
        accepted: Object.freeze([]),
        rejected: Object.freeze([]),
        source,
      });
    }
    const accepted: File[] = [];
    const rejected: FileUploadRejection[] = [];
    const limit = this.multiple ? Math.max(0, Math.trunc(this.maxFiles)) : 1;
    for (const file of files) {
      let reason: FileUploadRejectionReason | null = null;
      if (!matchesAccept(file, this.accept)) reason = "accept";
      else if (this.maxSize > 0 && file.size > this.maxSize) reason = "max-size";
      else if (limit > 0 && accepted.length >= limit) reason = "max-files";
      if (reason) rejected.push(Object.freeze({ file, reason }));
      else accepted.push(file);
    }
    if (accepted.length > 0) this._files = Object.freeze(accepted);
    this._rejected = rejected.length > 0;
    this.#syncInternals();
    const detail = Object.freeze({
      files: this._files,
      accepted: Object.freeze([...accepted]),
      rejected: Object.freeze([...rejected]),
      source,
    });
    this.dispatchEvent(
      new CustomEvent<FileUploadChangeDetail>("ui-file-upload-change", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    return detail;
  }

  #hasFiles(event: DragEvent): boolean {
    return [...(event.dataTransfer?.types ?? [])].includes("Files");
  }

  #onDragEnter = (event: DragEvent): void => {
    if (this.disabled || !this.#hasFiles(event)) return;
    event.preventDefault();
    this.#dragDepth += 1;
    this._dragover = true;
    this.#syncInternals();
  };

  #onDragOver = (event: DragEvent): void => {
    if (this.disabled || !this.#hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  #onDragLeave = (event: DragEvent): void => {
    if (!this._dragover) return;
    event.preventDefault();
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);
    if (this.#dragDepth === 0) {
      this._dragover = false;
      this.#syncInternals();
    }
  };

  #onDrop = (event: DragEvent): void => {
    if (this.disabled || !this.#hasFiles(event)) return;
    event.preventDefault();
    this.#dragDepth = 0;
    this._dragover = false;
    this.select(event.dataTransfer?.files ?? [], "drop");
  };

  #onChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.select(input.files ?? [], "picker");
    input.value = "";
  };

  #syncInternals(): void {
    const hasSelection = this._files.length > 0;
    for (const [state, active] of [
      ["empty", !hasSelection],
      ["selected", hasSelection],
      ["dragover", this._dragover],
      ["disabled", this.disabled],
      ["required", this.required],
      ["rejected", this._rejected],
    ] as const) {
      if (active) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }

    const control = this.control;
    if (!this.disabled && this.required && !hasSelection) {
      this.#internals.setValidity(
        { valueMissing: true },
        "Select at least one file.",
        control ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }

    if (this.disabled || !this.name || !hasSelection) {
      this.#internals.setFormValue(null);
    } else if (this.multiple) {
      const data = new FormData();
      for (const file of this._files) data.append(this.name, file, file.name);
      this.#internals.setFormValue(data);
    } else {
      this.#internals.setFormValue(this._files[0]!);
    }
  }

  protected override firstUpdated(): void {
    this.#syncInternals();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("disabled") ||
      changed.has("multiple") ||
      changed.has("name") ||
      changed.has("required")
    ) {
      this.#syncInternals();
    }
  }

  formResetCallback(): void {
    this.clear();
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        @dragenter=${this.#onDragEnter}
        @dragover=${this.#onDragOver}
        @dragleave=${this.#onDragLeave}
        @drop=${this.#onDrop}
      >
        <label part="trigger">
          <input
            part="input"
            type="file"
            aria-label=${this.label || nothing}
            accept=${this.accept || nothing}
            capture=${this.capture || nothing}
            ?disabled=${this.disabled}
            ?multiple=${this.multiple}
            @change=${this.#onChange}
          />
          <span part="prefix"><slot name="prefix"></slot></span>
          <span part="label"><slot>Choose files</slot></span>
          <span part="suffix"><slot name="suffix"></slot></span>
        </label>
        <span part="description"><slot name="description"></slot></span>
        <span part="selection"><slot name="selection"></slot></span>
      </div>
    `;
  }
}
