import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export interface EditorSelectionDetail {
  start: number;
  end: number;
  direction: "forward" | "backward" | "none";
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export type EditorCommand =
  | "accept-completion"
  | "dismiss-overlays"
  | "find"
  | "find-next"
  | "find-previous"
  | "go-to-definition"
  | "indent"
  | "outdent"
  | "toggle-code-actions";

export interface EditorCommandDetail {
  command: EditorCommand;
}

export interface EditorSearchDetail {
  query: string;
  count: number;
  index: number;
  start: number | null;
  end: number | null;
}

/**
 * An unstyled source-code editing primitive.
 *
 * The native textarea owns text input, selection, IME, clipboard, undo, and
 * accessibility. Mash adds source-editor state—line-number anatomy, tab
 * insertion, language identity, soft wrapping, selection reports, and slots
 * for diagnostics, completions, overlays, and status—without shipping a
 * syntax theme or prescribing an editor layout.
 *
 * @tag ui-editor
 * @summary Edits source text with semantic code-editor anatomy.
 *
 * @example Mash declaration
 * <ui-editor
 *   language="html"
 *   label="Component source"
 *   value="&lt;ui-card&gt;&#10;  &lt;strong slot=&quot;title&quot;&gt;Billing migration&lt;/strong&gt;&#10;  &lt;ui-badge slot=&quot;value&quot; tone=&quot;positive&quot;&gt;Active&lt;/ui-badge&gt;&#10;&lt;/ui-card&gt;"
 * >
 *   <span slot="status">HTML · 4 lines</span>
 * </ui-editor>
 *
 * @slot gutter - Replaces generated line numbers.
 * @slot overlay - Contextual content positioned over the editor.
 * @slot completion - An inline or popup completion realization.
 * @slot diagnostics - Diagnostics associated with the current document.
 * @slot decorations - Authored range decorations supplied by a renderer or language provider.
 * @slot document-colors - Authored color swatches associated with source ranges.
 * @slot fold-controls - Authored folding controls for the visible source range.
 * @slot indent-guides - Authored indentation guides for the visible source range.
 * @slot hover - Hover or definition information supplied by a language provider.
 * @slot code-actions - Available source actions supplied by a language provider.
 * @slot search - Search and replace controls bound to the editor search methods.
 * @slot status - Document or language status content.
 *
 * @csspart root - The editor root.
 * @csspart gutter - The line-number or authored gutter binding.
 * @csspart line-number - One generated line number.
 * @csspart scroller - The editing viewport owner.
 * @csspart control - The native textarea editing surface.
 * @csspart overlay - The contextual overlay binding.
 * @csspart completion - The completion binding.
 * @csspart diagnostics - The diagnostics binding.
 * @csspart decorations - The authored range-decoration binding.
 * @csspart document-colors - The authored document-color binding.
 * @csspart fold-controls - The authored folding-control binding.
 * @csspart indent-guides - The authored indentation-guide binding.
 * @csspart hover - The authored hover-information binding.
 * @csspart code-actions - The authored code-action binding.
 * @csspart search - The authored search/replace binding.
 * @csspart status - The status binding.
 *
 * @cssstate disabled - Matches `:state(disabled)` while editing is unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while edits are unavailable.
 * @cssstate focused - Matches `:state(focused)` while the editing surface owns focus.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 * @cssstate search-open - Matches while the parent-controlled search surface is visible.
 * @cssstate completion-open - Matches while a provider completion surface is visible.
 *
 * @fires {InputEvent} input - Reports an in-progress document edit.
 * @fires {Event} change - Reports a committed document edit.
 * @fires {CustomEvent<EditorSelectionDetail>} ui-editor-selection-change - Reports the native selection range.
 * @fires {CustomEvent<EditorCommandDetail>} ui-editor-command - Requests a renderer-neutral editor or provider command.
 * @fires {CustomEvent<EditorSearchDetail>} ui-editor-search-change - Reports the current literal search result set.
 * @fires {CustomEvent<{inline: number, block: number}>} ui-editor-scroll - Reports logical editor scroll offsets.
 *
 * @mashnode root editor
 * @mashnode gutter gutter root
 * @mashnode line-number line-number gutter
 * @mashnode scroller viewport root
 * @mashnode control control scroller
 * @mashnode overlay overlay root
 * @mashnode completion completion overlay
 * @mashnode diagnostics diagnostics overlay
 * @mashnode decorations decorations overlay
 * @mashnode document-colors document-colors overlay
 * @mashnode fold-controls fold-controls gutter
 * @mashnode indent-guides indent-guides scroller
 * @mashnode hover hover overlay
 * @mashnode code-actions code-actions overlay
 * @mashnode search search root
 * @mashnode status status root
 * @mashnode value value control
 * @mashnode name name control
 * @mashnode language language control
 * @mashnode placeholder placeholder control
 * @mashnode label label control
 * @mashnode disabled disabled control
 * @mashnode readonly readonly control
 * @mashnode line-numbers line-numbers gutter
 * @mashnode soft-wrap soft-wrap control
 * @mashnode tab-size tab-size control
 * @mashnode focused focused control
 * @mashnode invalid invalid control
 * @mashnode search-query search-query search
 * @mashnode case-sensitive case-sensitive search
 * @mashnode search-open search-open search
 * @mashnode completion-open completion-open completion
 * @mashnode input input control
 * @mashnode change change control
 * @mashnode selection-change select control
 * @mashnode command command root
 * @mashnode search-change change search
 * @mashnode scroll scroll scroller
 * @mashrole part root editor root
 * @mashrole slot gutter gutter gutter
 * @mashrole part line-number line-number line-number
 * @mashrole part scroller viewport scroller
 * @mashrole slot overlay overlay overlay
 * @mashrole slot completion completion completion
 * @mashrole part completion completion completion
 * @mashrole slot diagnostics diagnostics diagnostics
 * @mashrole part diagnostics diagnostics diagnostics
 * @mashrole slot decorations decorations decorations
 * @mashrole part decorations decorations decorations
 * @mashrole slot document-colors document-colors document-colors
 * @mashrole part document-colors document-colors document-colors
 * @mashrole slot fold-controls fold-controls fold-controls
 * @mashrole part fold-controls fold-controls fold-controls
 * @mashrole slot indent-guides indent-guides indent-guides
 * @mashrole part indent-guides indent-guides indent-guides
 * @mashrole slot hover hover hover
 * @mashrole part hover hover hover
 * @mashrole slot code-actions code-actions code-actions
 * @mashrole part code-actions code-actions code-actions
 * @mashrole slot search search search
 * @mashrole part search search search
 * @mashrole slot status status status
 * @mashrole state focused focused focused
 * @mashrole event ui-editor-selection-change select selection-change
 * @mashrole event ui-editor-command command command
 * @mashrole event ui-editor-search-change change search-change
 * @mashrole event ui-editor-scroll scroll scroll
 */
export class UIEditor extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String },
    name: { type: String, reflect: true },
    language: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    lineNumbers: { type: Boolean, attribute: "line-numbers", reflect: true },
    softWrap: { type: Boolean, attribute: "soft-wrap", reflect: true },
    tabSize: { type: Number, attribute: "tab-size", reflect: true },
    searchQuery: { type: String, attribute: "search-query", reflect: true },
    caseSensitive: { type: Boolean, attribute: "case-sensitive", reflect: true },
    searchOpen: { type: Boolean, attribute: "search-open", reflect: true },
    completionOpen: { type: Boolean, attribute: "completion-open", reflect: true },
    _filledSlots: { state: true },
  };

  /** Current source document. */
  declare value: string;
  /** Form field name when the editor participates in submission. */
  declare name: string;
  /** Application-defined source language identifier. */
  declare language: string;
  /** Hint shown while the source document is empty. */
  declare placeholder: string;
  /** Accessible name for the editor control. */
  declare label: string;
  /** Prevents focus and editing. */
  declare disabled: boolean;
  /** Allows focus and selection but prevents edits. */
  declare readonly: boolean;
  /** Generates a semantic line-number gutter. */
  declare lineNumbers: boolean;
  /** Allows long lines to wrap within the editing viewport. */
  declare softWrap: boolean;
  /** Spaces inserted for the Tab key and native tab rendering width. */
  declare tabSize: number;
  /** Literal query used by the portable search methods. */
  declare searchQuery: string;
  /** Whether literal source search distinguishes letter case. */
  declare caseSensitive: boolean;
  /** Parent-controlled visibility state for an authored search surface. */
  declare searchOpen: boolean;
  /** Provider-controlled visibility state for authored completion content. */
  declare completionOpen: boolean;

  declare private _filledSlots: ReadonlySet<string>;

  readonly #internals: ElementInternals;
  #gutterScroll = 0;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.language = "plain-text";
    this.placeholder = "";
    this.label = "Source editor";
    this.disabled = false;
    this.readonly = false;
    this.lineNumbers = true;
    this.softWrap = false;
    this.tabSize = 2;
    this.searchQuery = "";
    this.caseSensitive = false;
    this.searchOpen = false;
    this.completionOpen = false;
    this._filledSlots = new Set();
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      [part="indent-guides"],
      [part="decorations"],
      [part="document-colors"],
      [part="hover"],
      [part="code-actions"],
      [part="fold-controls"],
      [part="search"] {
        display: contents;
      }

      [part][hidden] {
        display: none !important;
      }
    `,
  ];

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (slot.assignedNodes({ flatten: true }).length > 0) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  #hasSlot(name: string): boolean {
    return this._filledSlots.has(name);
  }

  get #lineCount(): number {
    return Math.max(1, this.value.split("\n").length);
  }

  get control(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector<HTMLTextAreaElement>("[part='control']");
  }

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLTextAreaElement).value;
    if (this.searchQuery) queueMicrotask(() => this.#reportSearch());
  };

  #onScroll = (event: Event): void => {
    this.#gutterScroll = (event.currentTarget as HTMLTextAreaElement).scrollTop;
    const gutter = this.renderRoot.querySelector<HTMLElement>("[part='gutter']");
    if (gutter) gutter.style.translate = `0 ${-this.#gutterScroll}px`;
    const control = event.currentTarget as HTMLTextAreaElement;
    this.dispatchEvent(
      new CustomEvent<{ inline: number; block: number }>("ui-editor-scroll", {
        bubbles: true,
        composed: true,
        detail: { inline: Math.abs(control.scrollLeft), block: control.scrollTop },
      }),
    );
  };

  #lineColumn(offset: number): { line: number; column: number } {
    const before = this.value.slice(0, Math.max(0, Math.min(this.value.length, offset)));
    const lines = before.split("\n");
    return { line: lines.length, column: lines.at(-1)?.length ?? 0 };
  }

  #reportSelection = (): void => {
    const control = this.control;
    if (!control) return;
    const start = this.#lineColumn(control.selectionStart);
    const end = this.#lineColumn(control.selectionEnd);
    this.dispatchEvent(
      new CustomEvent<EditorSelectionDetail>("ui-editor-selection-change", {
        detail: {
          start: control.selectionStart,
          end: control.selectionEnd,
          direction: control.selectionDirection,
          startLine: start.line,
          startColumn: start.column,
          endLine: end.line,
          endColumn: end.column,
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const commandModifier = event.metaKey || event.ctrlKey;
    if (commandModifier && event.key.toLocaleLowerCase() === "f") {
      event.preventDefault();
      this.searchOpen = true;
      this.#requestCommand("find");
      return;
    }
    if (commandModifier && event.key.toLocaleLowerCase() === "g") {
      event.preventDefault();
      this.#requestCommand(event.shiftKey ? "find-previous" : "find-next");
      if (event.shiftKey) this.findPrevious();
      else this.findNext();
      return;
    }
    if (event.key === "F12") {
      event.preventDefault();
      this.#requestCommand("go-to-definition");
      return;
    }
    if (commandModifier && event.key === ".") {
      event.preventDefault();
      this.#requestCommand("toggle-code-actions");
      return;
    }
    if (event.key === "Escape" && (this.searchOpen || this.completionOpen)) {
      event.preventDefault();
      this.searchOpen = false;
      this.completionOpen = false;
      this.#requestCommand("dismiss-overlays");
      return;
    }
    if (event.key === "Tab" && this.completionOpen && !event.shiftKey) {
      event.preventDefault();
      this.#requestCommand("accept-completion");
      return;
    }
    if (event.key !== "Tab" || this.disabled || this.readonly) return;
    const control = event.currentTarget as HTMLTextAreaElement;
    event.preventDefault();
    const size = Math.max(1, Math.trunc(this.tabSize) || 2);
    const selectionStart = control.selectionStart;
    const selectionEnd = control.selectionEnd;
    const lineStart = control.value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = control.value.indexOf("\n", selectionEnd);
    const blockEnd = lineEnd === -1 ? control.value.length : lineEnd;
    const selectedLines = control.value.slice(lineStart, blockEnd).split("\n");

    if (event.shiftKey) {
      const removed = selectedLines.map((line) =>
        Math.min(line.match(/^ */)?.[0].length ?? 0, size),
      );
      const replacement = selectedLines.map((line, index) => line.slice(removed[index])).join("\n");
      control.setRangeText(replacement, lineStart, blockEnd, "select");
      control.setSelectionRange(
        Math.max(lineStart, selectionStart - removed[0]!),
        Math.max(lineStart, selectionEnd - removed.reduce((sum, count) => sum + count, 0)),
      );
      this.#commitNativeEdit(control, null, "deleteContentBackward");
      this.#requestCommand("outdent");
      return;
    }

    if (selectionStart !== selectionEnd) {
      const prefix = " ".repeat(size);
      const replacement = selectedLines.map((line) => prefix + line).join("\n");
      control.setRangeText(replacement, lineStart, blockEnd, "select");
      control.setSelectionRange(selectionStart + size, selectionEnd + size * selectedLines.length);
      this.#commitNativeEdit(control, prefix, "insertText");
      this.#requestCommand("indent");
      return;
    }

    const column = selectionStart - lineStart;
    const text = " ".repeat(size - (column % size));
    control.setRangeText(text, selectionStart, selectionEnd, "end");
    this.#commitNativeEdit(control, text, "insertText");
    this.#requestCommand("indent");
  };

  #commitNativeEdit(control: HTMLTextAreaElement, data: string | null, inputType: string): void {
    control.dispatchEvent(
      new InputEvent("input", { data, inputType, bubbles: true, composed: true }),
    );
    this.#reportSelection();
  }

  #requestCommand(command: EditorCommand): void {
    this.dispatchEvent(
      new CustomEvent<EditorCommandDetail>("ui-editor-command", {
        bubbles: true,
        composed: true,
        detail: { command },
      }),
    );
  }

  #matches(): Array<{ start: number; end: number }> {
    if (!this.searchQuery) return [];
    const haystack = this.caseSensitive ? this.value : this.value.toLocaleLowerCase();
    const needle = this.caseSensitive ? this.searchQuery : this.searchQuery.toLocaleLowerCase();
    const matches: Array<{ start: number; end: number }> = [];
    let offset = 0;
    while (offset <= haystack.length - needle.length) {
      const start = haystack.indexOf(needle, offset);
      if (start < 0) break;
      matches.push({ start, end: start + needle.length });
      offset = start + Math.max(1, needle.length);
    }
    return matches;
  }

  #reportSearch(current?: { start: number; end: number }): void {
    const matches = this.#matches();
    const index = current
      ? matches.findIndex((match) => match.start === current.start && match.end === current.end)
      : -1;
    this.dispatchEvent(
      new CustomEvent<EditorSearchDetail>("ui-editor-search-change", {
        bubbles: true,
        composed: true,
        detail: {
          query: this.searchQuery,
          count: matches.length,
          index,
          start: current?.start ?? null,
          end: current?.end ?? null,
        },
      }),
    );
  }

  #find(direction: 1 | -1): { start: number; end: number } | null {
    const control = this.control;
    const matches = this.#matches();
    if (!control || matches.length === 0) {
      this.#reportSearch();
      return null;
    }
    const current =
      direction === 1
        ? (matches.find((match) => match.start >= control.selectionEnd) ?? matches[0]!)
        : (matches.filter((match) => match.end <= control.selectionStart).at(-1) ??
          matches.at(-1)!);
    control.setSelectionRange(current.start, current.end);
    control.focus();
    this.#reportSelection();
    this.#reportSearch(current);
    return current;
  }

  /** Selects the next literal search match, wrapping at the document edge. */
  findNext(): { start: number; end: number } | null {
    return this.#find(1);
  }

  /** Selects the previous literal search match, wrapping at the document edge. */
  findPrevious(): { start: number; end: number } | null {
    return this.#find(-1);
  }

  /** Replaces the native selection and emits the same input contract as typing. */
  replaceSelection(text: string): void {
    const control = this.control;
    if (!control || this.disabled || this.readonly) return;
    control.setRangeText(text, control.selectionStart, control.selectionEnd, "end");
    this.#commitNativeEdit(control, text, "insertReplacementText");
  }

  /** Replaces every literal search match and returns the committed replacement count. */
  replaceAllMatches(replacement: string): number {
    if (this.disabled || this.readonly) return 0;
    const matches = this.#matches();
    if (matches.length === 0) return 0;
    let next = this.value;
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const match = matches[index]!;
      next = next.slice(0, match.start) + replacement + next.slice(match.end);
    }
    const control = this.control;
    if (control) {
      control.value = next;
      control.setSelectionRange(0, 0);
      this.#commitNativeEdit(control, replacement, "insertReplacementText");
    } else {
      this.value = next;
    }
    queueMicrotask(() => this.#reportSearch());
    return matches.length;
  }

  #onFocus = (): void => {
    this.#internals.states.add("focused");
  };

  #onBlur = (): void => {
    this.#internals.states.delete("focused");
  };

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    this.requestUpdate();
  }

  /** Moves the native source selection and reports it through the semantic event. */
  setSelectionRange(start: number, end: number, direction?: SelectionDirection): void {
    this.control?.setSelectionRange(start, end, direction);
    this.#reportSelection();
  }

  formResetCallback(): void {
    this.value = this.getAttribute("value") ?? "";
  }

  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? "";
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value") || changed.has("name") || changed.has("disabled")) {
      this.#internals.setFormValue(this.disabled || !this.name ? null : this.value);
    }
    for (const state of ["disabled", "readonly"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    for (const [property, state] of [
      ["searchOpen", "search-open"],
      ["completionOpen", "completion-open"],
    ] as const) {
      if (this[property]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (this.#fieldInvalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        ${
          this.lineNumbers
            ? html`<div part="gutter" aria-hidden="true">
                <slot name="gutter">
                  ${Array.from(
                    { length: this.#lineCount },
                    (_, index) => html`<span part="line-number">${index + 1}</span>`,
                  )}
                </slot>
              </div>`
            : nothing
        }
        <div part="scroller">
          <div part="indent-guides" ?hidden=${!this.#hasSlot("indent-guides")}>
            <slot name="indent-guides" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <textarea
            part="control"
            .value=${this.value}
            name=${this.name || nothing}
            placeholder=${this.placeholder}
            aria-label=${this.label || nothing}
            aria-description=${this.#fieldDescription || nothing}
            aria-invalid=${this.#fieldInvalid ? "true" : nothing}
            data-language=${this.language}
            wrap=${this.softWrap ? "soft" : "off"}
            spellcheck="false"
            style=${`tab-size:${Math.max(1, Math.trunc(this.tabSize) || 2)}`}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            @input=${this.#onInput}
            @scroll=${this.#onScroll}
            @select=${this.#reportSelection}
            @click=${this.#reportSelection}
            @keyup=${this.#reportSelection}
            @keydown=${this.#onKeyDown}
            @focus=${this.#onFocus}
            @blur=${this.#onBlur}
          ></textarea>
          <div part="overlay" ?hidden=${!this.#hasSlot("overlay")}>
            <slot name="overlay" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="decorations" ?hidden=${!this.#hasSlot("decorations")}>
            <slot name="decorations" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="document-colors" ?hidden=${!this.#hasSlot("document-colors")}>
            <slot name="document-colors" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="hover" ?hidden=${!this.#hasSlot("hover")}>
            <slot name="hover" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="code-actions" ?hidden=${!this.#hasSlot("code-actions")}>
            <slot name="code-actions" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="completion" ?hidden=${!this.#hasSlot("completion") || !this.completionOpen}>
            <slot name="completion" @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div part="diagnostics" ?hidden=${!this.#hasSlot("diagnostics")}>
            <slot name="diagnostics" @slotchange=${this.#onSlotChange}></slot>
          </div>
        </div>
        <div part="fold-controls" ?hidden=${!this.#hasSlot("fold-controls")}>
          <slot name="fold-controls" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="search" ?hidden=${!this.#hasSlot("search") || !this.searchOpen}>
          <slot name="search" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="status" aria-live="polite" ?hidden=${!this.#hasSlot("status")}>
          <slot name="status" @slotchange=${this.#onSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
