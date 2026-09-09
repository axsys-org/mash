import { LitElement, css, html, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";

/**
 * A conversation viewport that follows new content only while the reader is at the end.
 * Stable message elements preserve the reading position when older history is prepended.
 * @tag ui-message-scroller
 * @summary Keeps a conversation readable as messages arrive or change height.
 * @example Conversation
 * <ui-message-scroller label="Conversation"><ui-message><ui-bubble variant="secondary">Hello.</ui-bubble></ui-message></ui-message-scroller>
 * @slot - Stable message rows in chronological order.
 * @slot empty - Content shown when no messages are present.
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
    _atEnd: { state: true },
    _empty: { state: true },
  };
  /** Accessible conversation name. */
  declare label: string;
  /** Start at the newest message and follow appends while at the end. */
  declare follow: boolean;
  protected _atEnd = true;
  protected _empty = true;
  #anchor?: { element: Element; offset: number };
  #contentResize = new ResizeObserver(() => this.#restore());
  #mutations = new MutationObserver(() => this.#restore());
  constructor() {
    super();
    this.label = "Conversation";
    this.follow = true;
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
  };
  #restore(): void {
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
    if (this.#viewport) this.#viewport.scrollTop = this.#viewport.scrollHeight;
    this.#remember();
  };
  /** Reveal an authored row by its DOM id. Returns false if the row is absent. */
  scrollToMessage(id: string): boolean {
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
          <slot @slotchange=${() => this.#restore()}></slot>
          <div part="empty" ?hidden=${!this._empty}><slot name="empty">No messages yet.</slot></div>
        </div>
      </div>
      <button
        part="latest"
        type="button"
        ?hidden=${this._atEnd || this._empty}
        @click=${this.scrollToLatest}
      >
        ↓ Latest
      </button>
    </div>`;
  }
}
