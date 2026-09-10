import type { UIOption } from "../option/option.js";
import type { UIChip } from "../chip/chip.js";

export type ComboboxItem =
  string | { value: string; label: string; disabled?: boolean; [key: string]: unknown };
export type ComboboxItemRenderer = (item: ComboboxItem) => Node | string;
export const itemRecord = (item: ComboboxItem): Exclude<ComboboxItem, string> =>
  typeof item === "string" ? { value: item, label: item } : item;

/** Materialize data as the same public options/chips an application can author itself. */
export class ComboboxCollection {
  readonly sources = new WeakMap<UIOption, ComboboxItem>();
  #options: UIOption[] = [];
  #chips: HTMLElement | undefined;
  constructor(private readonly host: HTMLElement) {}

  render(items: readonly ComboboxItem[] | undefined, renderItem?: ComboboxItemRenderer): void {
    const previous = new Map(this.#options.map((option) => [option.value, option]));
    this.#options = (items ?? []).map((item) => {
      const record = itemRecord(item);
      const option =
        previous.get(record.value) ?? this.host.ownerDocument.createElement("ui-option");
      previous.delete(record.value);
      option.value = record.value;
      option.disabled = Boolean(record.disabled);
      option.setAttribute("aria-label", record.label);
      const content = renderItem?.(item) ?? record.label;
      option.replaceChildren(content);
      const check = this.host.ownerDocument.createElement("span");
      check.slot = "indicator";
      check.textContent = "✓";
      check.setAttribute("aria-hidden", "true");
      option.append(check);
      this.sources.set(option, item);
      this.host.append(option);
      return option;
    });
    previous.forEach((option) => option.remove());
  }

  chips(
    values: readonly string[],
    options: UIOption[],
    disabled: boolean,
    readonly: boolean,
  ): void {
    const authored = [...this.host.children].some(
      (child) => child.slot === "chips" && child !== this.#chips,
    );
    if (authored || !values.length) {
      this.#chips?.remove();
      this.#chips = undefined;
      return;
    }
    if (!this.#chips) {
      this.#chips = this.host.ownerDocument.createElement("span");
      this.#chips.slot = "chips";
      this.#chips.setAttribute("data-combobox-chips", "");
      this.host.append(this.#chips);
    }
    const previous = new Map(
      [...this.#chips.querySelectorAll<UIChip>("ui-chip")].map((chip) => [chip.value, chip]),
    );
    values.forEach((value) => {
      const option = options.find((candidate) => candidate.value === value);
      const label =
        option?.getAttribute("aria-label") ||
        option?.textContent?.replace(/✓$/, "").trim() ||
        value;
      let chip = previous.get(value);
      if (!chip) {
        chip = this.host.ownerDocument.createElement("ui-chip");
        chip.value = value;
        chip.append(this.host.ownerDocument.createTextNode(label));
        const remove = this.host.ownerDocument.createElement("button");
        remove.type = "button";
        remove.slot = "remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Remove ${label}`);
        chip.append(remove);
        this.#chips!.append(chip);
      }
      if (chip.firstChild?.nodeValue !== label) chip.firstChild!.nodeValue = label;
      chip
        .querySelector<HTMLButtonElement>("button")!
        .setAttribute("aria-label", `Remove ${label}`);
      previous.delete(value);
      chip.disabled = disabled || Boolean(option?.disabled);
      chip.readonly = readonly;
      chip.querySelector<HTMLButtonElement>("button")!.disabled = chip.disabled || readonly;
    });
    previous.forEach((chip) => chip.remove());
  }
}
