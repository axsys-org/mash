let descriptionId = 0;

/** Keep ID-based descriptions in each native control's own tree scope. */
export class TooltipDescription {
  #text: HTMLSpanElement;
  #targets = new Map<HTMLElement, HTMLSpanElement>();
  #roots = new Map<Node, HTMLSpanElement>();
  #observer = new MutationObserver(() => this.sync());
  #titles = new Map<HTMLElement, string | null>();
  #titleObserver = new MutationObserver(() => this.sync());

  constructor(private readonly host: HTMLElement & { anchorElement?: HTMLElement | null }) {
    this.#text = this.createText();
  }

  private createText(): HTMLSpanElement {
    const text = this.host.ownerDocument.createElement("span");
    text.id = `mash-tooltip-description-${++descriptionId}`;
    text.hidden = true;
    return text;
  }

  connect(): void {
    this.#observer.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    queueMicrotask(() => this.sync());
  }

  sync(): void {
    if (!this.host.isConnected) return;
    const text =
      [...this.host.childNodes]
        .filter(
          (node) =>
            node !== this.#text &&
            !(
              node instanceof Element &&
              (node.getAttribute("slot") || node.matches("style, script"))
            ),
        )
        .map((node) => node.textContent ?? "")
        .join(" ")
        .trim() ||
      this.host.getAttribute("label") ||
      "";
    if (this.#text.textContent !== text) this.#text.textContent = text;
    if (this.#text.parentElement !== this.host) this.host.append(this.#text);
    const targets = new Map<HTMLElement, HTMLSpanElement>();
    const visit = (node: HTMLElement): void => {
      const root = node.getRootNode();
      let description = this.#text;
      if (root !== this.host.getRootNode()) {
        description = this.#roots.get(root) ?? this.createText();
        this.#roots.set(root, description);
        if (description.textContent !== text) description.textContent = text;
        if (description.parentNode !== root) root.appendChild(description);
      }
      targets.set(node, description);
    };
    const focusable = "button, input, select, textarea, a[href], summary, [tabindex]";
    const anchor = this.host.anchorElement;
    const triggers = anchor
      ? anchor.isConnected && anchor.ownerDocument === this.host.ownerDocument
        ? [anchor]
        : []
      : [...this.host.querySelectorAll<HTMLElement>(':scope > [slot="trigger"]')];
    triggers.forEach((trigger) => {
      visit(trigger);
      trigger.querySelectorAll<HTMLElement>(focusable).forEach(visit);
      trigger.shadowRoot?.querySelectorAll<HTMLElement>(focusable).forEach(visit);
    });
    // A tooltip owns its trigger's browser hint for the whole binding, not
    // just while open. Empty titles also block inherited ancestor titles.
    // Semantic title properties (tree-item, myth, etc.) are never mutated.
    const titleTargets = new Set<HTMLElement>();
    for (const target of targets.keys()) {
      if (!target.localName.includes("-") || target.matches("ui-button, ui-link"))
        titleTargets.add(target);
      const root = target.getRootNode();
      if (root instanceof ShadowRoot && root.host.matches("ui-button, ui-link"))
        titleTargets.add(root.host as HTMLElement);
    }
    this.#titleObserver.disconnect();
    for (const [target, title] of this.#titles) {
      if (titleTargets.has(target)) continue;
      this.restoreTitle(target, title);
      this.#titles.delete(target);
    }
    for (const target of titleTargets) {
      if (!this.#titles.has(target) || target.getAttribute("title") !== "")
        this.#titles.set(target, target.getAttribute("title"));
      if (target.getAttribute("title") !== "") target.setAttribute("title", "");
      this.#titleObserver.observe(target, { attributes: true, attributeFilter: ["title"] });
    }
    for (const [old, description] of this.#targets) {
      if (!targets.has(old)) this.remove(old, description.id);
    }
    for (const [target, description] of targets) {
      const ids = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      if (!ids.includes(description.id))
        target.setAttribute("aria-describedby", [...ids, description.id].join(" "));
    }
    for (const [root, description] of this.#roots) {
      if (![...targets.values()].includes(description)) {
        description.remove();
        this.#roots.delete(root);
      }
    }
    this.#targets = targets;
  }

  private remove(target: HTMLElement, id: string): void {
    const ids = (target.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter((value) => value && value !== id);
    if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
    else target.removeAttribute("aria-describedby");
  }

  private restoreTitle(target: HTMLElement, title: string | null): void {
    if (target.getAttribute("title") !== "") return;
    if (title === null) target.removeAttribute("title");
    else target.setAttribute("title", title);
  }

  disconnect(): void {
    this.#observer.disconnect();
    this.#titleObserver.disconnect();
    this.#titles.forEach((title, target) => this.restoreTitle(target, title));
    this.#titles.clear();
    this.#targets.forEach((description, target) => this.remove(target, description.id));
    this.#targets.clear();
    this.#roots.forEach((description) => description.remove());
    this.#roots.clear();
    this.#text.remove();
  }
}
