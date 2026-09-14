import { LitElement, css, html, type TemplateResult, type PropertyValues } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import { VirtualHistory, type MessageRecord, type MessageRenderer } from "./virtual-history.js";
export type { MessageRecord, MessageRenderer } from "./virtual-history.js";

/**
 * A conversation viewport that follows new content only while the reader is at the end.
 * Stable message elements preserve the reading position when older history is prepended.
 * @tag ui-message-scroller
 * @summary Keeps a conversation readable as messages arrive or change height.
 * @example Conversation
 * <ui-message-scroller label="Conversation"><ui-message><ui-bubble variant="secondary">Hello.</ui-bubble></ui-message></ui-message-scroller>
 * @slot - Stable message rows in chronological order.
 * @slot empty - Content shown when no messages are present.
 * @slot latest - Label for the jump-to-latest button.
 * @csspart history - Virtualized history extent.
 * @slot history - Virtual history projection, managed by the items property.
 * @mashnode history list content
 * @mashnode row row history
 * @csspart root - The viewport boundary.
 * @csspart viewport - Native scrolling region.
 * @csspart content - The message stack.
 * @csspart latest - Button returning to the newest message.
 * @csspart empty - The empty state.
 * @mashnode root conversation
 * @mashnode viewport viewport root
 * @mashnode content content viewport
 * @mashnode latest control root
 * @mashnode empty empty viewport
 * @fires {CustomEvent<{ atEnd: boolean }>} ui-message-scroll - The reader enters or leaves the end of the conversation.
 */
export class UIMessageScroller extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    follow: { type: Boolean, reflect: true },
    hideLatest: { type: Boolean, attribute: "hide-latest", reflect: true },
    items: { attribute: false },
    renderMessage: { attribute: false },
    estimatedSize: { type: Number, attribute: "estimated-size" },
    overscan: { type: Number },
    _atEnd: { state: true },
    _empty: { state: true },
  };
  /** Accessible conversation name. */
  declare label: string;
  /** Start at the newest message and follow appends while at the end. */
  declare follow: boolean;
  /** Suppress the built-in latest button when the owner provides navigation. */
  declare hideLatest: boolean;
  /** Optional immutable records with stable IDs. Null uses authored slotted rows. */
  declare items: readonly MessageRecord[] | null;
  /** Creates a virtual row's content. Called only for rows entering the window or changing identity. */
  declare renderMessage: MessageRenderer | undefined;
  /** Estimated pixel height until a virtual row is measured. */
  declare estimatedSize: number;
  /** Extra virtual rows retained around the visible range. */
  declare overscan: number;
  #history?: VirtualHistory;
  #historyContent?: HTMLElement;
  protected _atEnd = true;
  protected _empty = true;
  #anchor?: { element: Element; offset: number };
  #contentResize = new ResizeObserver(() => this.#restore());
  #mutations = new MutationObserver(() => this.#restore());
  constructor() {
    super();
    this.label = "Conversation";
    this.follow = true;
    this.hideLatest = false;
    this.items = null;
    this.estimatedSize = 80;
    this.overscan = 3;
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }
      [part="root"] {
        position: relative;
      }
      [part="viewport"] {
        block-size: 24rem;
        overflow: auto;
        overscroll-behavior: contain;
        overflow-anchor: none;
      }
      [part="content"] {
        display: flex;
        flex-direction: column;
        min-block-size: 100%;
      }
      [part="latest"] {
        position: absolute;
        inset-block-end: 1rem;
        inset-inline-start: 50%;
        transform: translateX(-50%);
      }
    `,
  ];
  get #viewport(): HTMLElement | null {
    return this.renderRoot.querySelector('[part="viewport"]');
  }
  get #rows(): Element[] {
    return [...this.children].filter((node) => !node.hasAttribute("slot"));
  }
  /** Whether the reader is currently at the newest content. */
  get atEnd(): boolean {
    return this._atEnd;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (!this.isConnected) return;
      this._atEnd = this.follow;
      const content = this.renderRoot.querySelector('[part="content"]');
      if (content) this.#contentResize.observe(content);
      this.#mutations.observe(this, { childList: true, subtree: true, characterData: true });
      this.#restore();
    });
  }
  override disconnectedCallback(): void {
    this.#contentResize.disconnect();
    this.#mutations.disconnect();
    this.#history?.disconnect();
    this.#history = undefined;
    this.#historyContent?.remove();
    this.#historyContent = undefined;
    super.disconnectedCallback();
  }
  #remember = (): void => {
    const viewport = this.#viewport;
    if (!viewport) return;
    const atEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 24;
    if (atEnd !== this._atEnd) {
      this._atEnd = atEnd;
      this.dispatchEvent(
        new CustomEvent("ui-message-scroll", { bubbles: true, composed: true, detail: { atEnd } }),
      );
    }
    const top = viewport.getBoundingClientRect().top;
    const element = this.#rows.find((row) => row.getBoundingClientRect().bottom > top);
    this.#anchor = element
      ? { element, offset: element.getBoundingClientRect().top - top }
      : undefined;
    this.#history?.scroll(this.follow && atEnd);
  };
  protected override updated(changed: PropertyValues<this>): void {
    if (this.items !== null && this.#viewport) {
      const fresh = !this.#history;
      if (!this.#history) {
        this.#historyContent = document.createElement("div");
        this.#historyContent.slot = "history";
        this.append(this.#historyContent);
        this.#history = new VirtualHistory(this.#viewport, this.#historyContent);
      }
      if (
        fresh ||
        changed.has("items") ||
        changed.has("renderMessage") ||
        changed.has("estimatedSize") ||
        changed.has("overscan") ||
        changed.has("follow")
      ) {
        this.#history.update(
          this.items,
          this.renderMessage,
          this.follow && this._atEnd,
          this.estimatedSize,
          this.overscan,
        );
        this._empty = this.items.length === 0;
      }
    } else if (this.#history) {
      this.#history.disconnect();
      this.#history = undefined;
      this.#historyContent?.remove();
      this.#historyContent = undefined;
    }
  }
  #restore(): void {
    if (this.#history) return;
    const viewport = this.#viewport;
    if (!viewport) return;
    this._empty = this.#rows.length === 0;
    if (this.follow && this._atEnd) viewport.scrollTop = viewport.scrollHeight;
    else if (this.#anchor?.element.isConnected) {
      viewport.scrollTop +=
        this.#anchor.element.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        this.#anchor.offset;
    }
    this.#remember();
  }
  /** Resume following at the newest message. */
  scrollToLatest = (): void => {
    this.#history?.latest();
    if (this.#viewport) this.#viewport.scrollTop = this.#viewport.scrollHeight;
    this.#remember();
  };
  /** Reveal an authored row by its DOM id. Returns false if the row is absent. */
  scrollToMessage(id: string): boolean {
    if (this.#history) {
      const found = this.#history.reveal(id);
      this.#remember();
      return found;
    }
    const row = this.#rows.find((candidate) => candidate.id === id);
    const viewport = this.#viewport;
    if (!row || !viewport) return false;
    viewport.scrollTop += row.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
    this.#remember();
    return true;
  }
  protected override render(): TemplateResult {
    return html`<div part="root">
      <div
        part="viewport"
        role="log"
        aria-label=${this.label}
        tabindex="0"
        @scroll=${this.#remember}
      >
        <div part="content">
          <slot ?hidden=${this.items !== null} @slotchange=${() => this.#restore()}></slot>
          <div part="history" ?hidden=${this.items === null}><slot name="history"></slot></div>
          <div part="empty" ?hidden=${!this._empty}><slot name="empty">No messages yet.</slot></div>
        </div>
      </div>
      <button
        part="latest"
        type="button"
        ?hidden=${this.hideLatest || this._atEnd || this._empty}
        @click=${this.scrollToLatest}
      >
        <slot name="latest">↓ Latest</slot>
      </button>
    </div>`;
  }
}
