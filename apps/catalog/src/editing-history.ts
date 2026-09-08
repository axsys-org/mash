export class MarkupHistory {
  readonly #surface: HTMLElement;
  readonly #onChange: (restored: boolean) => void;
  #entries: string[];
  #index = 0;
  #timer = 0;
  #queuedInput = false;

  constructor(surface: HTMLElement, onChange: (restored: boolean) => void) {
    this.#surface = surface;
    this.#onChange = onChange;
    this.#entries = [this.#serialize()];
  }

  get canUndo(): boolean {
    return this.#queuedInput || this.#index > 0;
  }

  get canRedo(): boolean {
    return !this.#queuedInput && this.#index < this.#entries.length - 1;
  }

  get index(): number {
    return this.#index;
  }

  queue(): void {
    window.clearTimeout(this.#timer);
    this.#queuedInput = true;
    this.#timer = window.setTimeout(() => this.commit(), 280);
  }

  commit(): void {
    window.clearTimeout(this.#timer);
    this.#timer = 0;
    this.#queuedInput = false;
    const markup = this.#serialize();
    if (this.#entries[this.#index] === markup) return;
    this.#entries.splice(this.#index + 1);
    this.#entries.push(markup);
    this.#index = this.#entries.length - 1;
    this.#onChange(false);
  }

  commitFrom(index: number): void {
    window.clearTimeout(this.#timer);
    this.#timer = 0;
    this.#queuedInput = false;
    const checkpoint = Math.max(0, Math.min(this.#index, Math.floor(index)));
    const markup = this.#serialize();
    this.#entries.splice(checkpoint + 1);
    if (this.#entries[checkpoint] !== markup) this.#entries.push(markup);
    this.#index = this.#entries.length - 1;
    this.#onChange(false);
  }

  undo(): boolean {
    if (this.#queuedInput) this.commit();
    if (!this.canUndo) return false;
    this.#surface.innerHTML = this.#entries[--this.#index]!;
    this.#onChange(true);
    return true;
  }

  redo(): boolean {
    if (this.#queuedInput) {
      this.commit();
      return false;
    }
    if (!this.canRedo) return false;
    this.#surface.innerHTML = this.#entries[++this.#index]!;
    this.#onChange(true);
    return true;
  }

  destroy(): void {
    window.clearTimeout(this.#timer);
  }

  #serialize(): string {
    const clone = this.#surface.cloneNode(true) as HTMLElement;
    for (const block of clone.querySelectorAll<HTMLElement>("[data-editing-block]")) {
      block.removeAttribute("aria-selected");
      block.removeAttribute("data-editing-active");
      block.removeAttribute("data-editing-dragging");
      block.removeAttribute("data-editing-drop-before");
      block.removeAttribute("data-editing-drop-after");
    }
    return clone.innerHTML;
  }
}
