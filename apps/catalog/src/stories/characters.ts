import "@mash/ui/button";
import "@mash/ui/icon";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/kbd";
import "@mash/ui/resizable";
import "@mash/ui/separator";
import type { UIResizablePanel } from "@mash/ui/resizable";
import type { UIInput } from "@mash/ui/input";
import type { UITextarea } from "@mash/ui/textarea";
import { categories, characters, codePoints, type Character } from "./characters-data.js";
import { escape, readState, writeState } from "./shared.js";
import "./characters.css";

const storageKey = "mash.story.characters.v1";
const glyphs = new Set(characters.map((item) => item.glyph));
type Saved = { favorites: string[]; recent: string[] };
const validSaved = (value: unknown): value is Saved => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<Saved>;
  return [state.favorites, state.recent].every(
    (list) =>
      Array.isArray(list) &&
      list.length <= 400 &&
      list.every((glyph) => typeof glyph === "string" && glyphs.has(glyph)),
  );
};
const tones = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];
const toneNames = ["Default", "Light", "Medium light", "Medium", "Medium dark", "Dark"];
const toneable = new Set(["👍", "👎", "👌", "✌️", "👏", "🙌", "👋", "🙏", "💪", "🫶"]);
const fonts = ["System", "Serif", "Monospace"];
const icon = (name: string, slot = "") =>
  `<ui-icon name="${name}"${slot ? ` slot="${slot}"` : ""}></ui-icon>`;

export async function mount(root: HTMLElement): Promise<() => void> {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const saved = readState(storageKey, () => ({ favorites: [], recent: [] }), validSaved);
  let expanded = false;
  let category = "emoji";
  let selected = characters[0]!;
  let tone = 0;
  let font = "System";
  let selection = { start: 0, end: 0 };
  let visible: Character[] = [];
  let query = "";
  root.classList.add("characters-app");
  root.innerHTML = `<div class="characters-desktop"><header class="characters-intro"><span>CHARACTERS</span><h1>A little more expression.</h1><p>Emoji, symbols, and the details between words.</p></header><div class="characters-workbench"><section class="characters-window" aria-label="Character picker"><header class="characters-titlebar"><ui-button variant="ghost" size="small" data-action="close" aria-label="Close character picker">${icon("action.dismiss")}</ui-button><strong>Characters</strong><ui-button variant="ghost" size="small" data-action="expand" aria-label="Expand character picker" aria-expanded="false">${icon("action.fit")}</ui-button></header><div class="characters-search"><span aria-hidden="true">${icon("action.search")}</span><ui-input type="search" label="Search characters" placeholder="Search" clean-on-escape></ui-input><ui-button variant="ghost" size="small" data-action="clear" aria-label="Clear character search" hidden>${icon("action.dismiss")}</ui-button></div><ui-resizable class="characters-panels" label="Character browser"><ui-resizable-panel class="characters-nav-panel" size="198" min="160" max="260" hidden><nav class="characters-nav" aria-label="Character categories"></nav></ui-resizable-panel><ui-resizable-handle class="characters-nav-handle" label="Resize categories" hidden></ui-resizable-handle><ui-resizable-panel class="characters-grid-panel" min="200"><section class="characters-results"><header><strong data-category-title>Emoji</strong><span data-result-count></span></header><div class="characters-grid" role="group" aria-label="Characters"></div><div class="characters-empty" hidden></div></section></ui-resizable-panel><ui-resizable-handle class="characters-detail-handle" label="Resize character details" hidden></ui-resizable-handle><ui-resizable-panel class="characters-detail-panel" size="224" min="190" max="280" hidden><aside class="characters-detail" aria-label="Character details"></aside></ui-resizable-panel></ui-resizable><nav class="characters-category-strip" aria-label="Character categories"></nav><footer class="characters-footer"><span data-status role="status" aria-live="polite">Choose a character to insert it.</span><ui-kbd>↑ ↓ ← →</ui-kbd></footer></section><section class="characters-draft"><header><strong>Try it in a sentence</strong><ui-button variant="ghost" size="small" data-action="reopen">${icon("object.keyboard", "prefix")}Open picker</ui-button></header><ui-textarea label="Your text" placeholder="A note, a name, a little something…" rows="3"></ui-textarea><footer><span>Characters insert at your cursor.</span><ui-button variant="ghost" size="small" data-action="copy-text">Copy text</ui-button></footer></section></div></div>`;
  const find = <T extends HTMLElement = HTMLElement>(selector: string) =>
    root.querySelector<T>(selector)!;
  const window = find(".characters-window");
  const sidePanels = [
    find<UIResizablePanel>(".characters-nav-panel"),
    find<UIResizablePanel>(".characters-detail-panel"),
  ];
  for (const panel of sidePanels) panel.visible = false;
  const search = find<UIInput>("ui-input");
  const draft = find<UITextarea>("ui-textarea");
  const grid = find(".characters-grid");
  const details = find(".characters-detail");
  const status = find("[data-status]");
  const save = () => writeState(storageKey, saved);
  const selectedGlyph = () => {
    if (!toneable.has(selected.glyph) || !tone) return selected.glyph;
    const [first, ...rest] = Array.from(selected.glyph.replaceAll("\uFE0F", ""));
    return first + tones[tone]! + rest.join("");
  };
  const buttons = () => [...grid.querySelectorAll<HTMLButtonElement>("button")];
  function renderDetails(): void {
    const glyph = selectedGlyph();
    const favorite = saved.favorites.includes(selected.glyph);
    details.innerHTML = `<div class="characters-specimen" data-font="${font}" aria-hidden="true"><span>${escape(glyph)}</span></div><h2>${escape(selected.name)}</h2><code>${codePoints(glyph)}</code><div class="characters-detail-actions"><ui-button variant="ghost" size="small" data-action="favorite" aria-pressed="${favorite}">${favorite ? "♥ Favorited" : "♡ Add to favorites"}</ui-button><ui-button variant="primary" data-action="insert">Insert character</ui-button><ui-button variant="ghost" size="small" data-action="copy">Copy character</ui-button></div><ui-separator></ui-separator>${toneable.has(selected.glyph) ? `<h3>Skin tone</h3><div class="characters-tones">${tones.map((modifier, index) => `<button type="button" data-tone="${index}" aria-label="${toneNames[index]} skin tone" aria-pressed="${tone === index}">${escape(index ? "👋" + modifier : "👋")}</button>`).join("")}</div>` : !["emoji", "nature", "food", "activities", "travel", "objects"].includes(selected.category) ? `<h3>Font preview</h3><div class="characters-fonts">${fonts.map((name) => `<button type="button" data-font-choice="${name}" aria-label="${name}" aria-pressed="${name === font}"><span data-font="${name}">${escape(glyph)}</span><small>${name}</small></button>`).join("")}</div>` : `<p class="characters-detail-note">Emoji appearance follows your device’s font.</p>`}`;
  }
  function renderCategories(): void {
    const markup = categories
      .map(
        (item) =>
          `<ui-button variant="ghost" size="small" data-category="${item.id}" aria-label="${escape(item.label)}" aria-pressed="${category === item.id}" ${category === item.id ? "selected" : ""}><span class="characters-category-icon" aria-hidden="true">${item.icon}</span><span class="characters-category-name">${escape(item.label)}</span></ui-button>`,
      )
      .join("");
    find(".characters-nav").innerHTML = markup;
    find(".characters-category-strip").innerHTML = markup;
  }
  function renderGrid(): void {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const pool =
      category === "recent" || category === "favorites"
        ? saved[category]
            .map((glyph) => characters.find((item) => item.glyph === glyph)!)
            .filter(Boolean)
        : characters.filter((item) => query || item.category === category);
    visible = pool.filter((item) =>
      words.every((word) =>
        `${item.glyph} ${item.name} ${item.keywords} ${codePoints(item.glyph)}`
          .toLocaleLowerCase()
          .includes(word),
      ),
    );
    if (!visible.includes(selected) && visible.length) selected = visible[0]!;
    grid.innerHTML = visible
      .map(
        (item) =>
          `<button type="button" data-glyph="${escape(item.glyph)}" title="${escape(item.name)}" aria-label="${escape(item.name)}" aria-pressed="${item === selected}" tabindex="${item === selected ? 0 : -1}">${escape(item.glyph)}</button>`,
      )
      .join("");
    find("[data-category-title]").textContent = query
      ? "Search results"
      : categories.find((item) => item.id === category)!.label;
    find("[data-result-count]").textContent = String(visible.length);
    find("[data-action=clear]").hidden = !query;
    const empty = find(".characters-empty");
    empty.hidden = !!visible.length;
    empty.textContent = query
      ? "No characters found. Try a name, symbol, or code point."
      : category === "recent"
        ? "The characters you insert will appear here."
        : "Expand the picker and add a character to your favorites.";
    grid.scrollTop = 0;
    renderDetails();
  }
  function choose(item: Character, focus = false): void {
    selected = item;
    for (const button of buttons()) {
      const active = button.dataset.glyph === item.glyph;
      button.tabIndex = active ? 0 : -1;
      button.setAttribute("aria-pressed", String(active));
      if (active && focus) {
        button.focus({ preventScroll: true });
        button.scrollIntoView({ block: "nearest" });
      }
    }
    renderDetails();
  }
  async function insert(): Promise<void> {
    const glyph = selectedGlyph();
    const value = draft.value;
    draft.value = value.slice(0, selection.start) + glyph + value.slice(selection.end);
    selection = { start: selection.start + glyph.length, end: selection.start + glyph.length };
    saved.recent = [
      selected.glyph,
      ...saved.recent.filter((item) => item !== selected.glyph),
    ].slice(0, 36);
    save();
    status.textContent = `Inserted ${selected.name.toLocaleLowerCase()}.`;
    await draft.updateComplete;
    if (signal.aborted) return;
    draft.shadowRoot?.querySelector("textarea")?.setSelectionRange(selection.start, selection.end);
    if (category === "recent") renderGrid();
  }
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      if (!signal.aborted) status.textContent = "Copied to clipboard.";
    } catch {
      if (!signal.aborted)
        status.textContent = "Clipboard unavailable. Select and copy from the text field.";
    }
  }
  function setExpanded(): void {
    expanded = !expanded;
    window.toggleAttribute("data-expanded", expanded);
    for (const panel of sidePanels) panel.visible = expanded;
    const button = find("[data-action=expand]");
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute(
      "aria-label",
      expanded ? "Collapse character picker" : "Expand character picker",
    );
    status.textContent = expanded
      ? "Select to inspect. Double-click or press Enter to insert."
      : "Choose a character to insert it.";
  }
  root.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element;
      const cell = target.closest<HTMLElement>("[data-glyph]");
      if (cell) {
        choose(characters.find((item) => item.glyph === cell.dataset.glyph)!);
        if (!expanded) void insert();
        return;
      }
      const categoryButton = target.closest<HTMLElement>("[data-category]");
      if (categoryButton) {
        category = categoryButton.dataset.category!;
        query = search.value = "";
        renderCategories();
        renderGrid();
        return;
      }
      const toneButton = target.closest<HTMLElement>("[data-tone]");
      if (toneButton) {
        tone = Number(toneButton.dataset.tone);
        renderDetails();
        details.querySelector<HTMLButtonElement>(`[data-tone="${tone}"]`)?.focus();
        return;
      }
      const fontButton = target.closest<HTMLElement>("[data-font-choice]");
      if (fontButton) {
        font = fontButton.dataset.fontChoice!;
        renderDetails();
        details.querySelector<HTMLButtonElement>(`[data-font-choice="${font}"]`)?.focus();
        return;
      }
      const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action === "expand") setExpanded();
      if (action === "close") {
        window.hidden = true;
        draft.focus();
      }
      if (action === "reopen") {
        window.hidden = false;
        search.focus();
      }
      if (action === "clear") {
        query = search.value = "";
        renderGrid();
        search.focus();
      }
      if (action === "insert") void insert();
      if (action === "copy") void copy(selectedGlyph());
      if (action === "copy-text") void copy(draft.value);
      if (action === "favorite") {
        saved.favorites = saved.favorites.includes(selected.glyph)
          ? saved.favorites.filter((glyph) => glyph !== selected.glyph)
          : [...saved.favorites, selected.glyph];
        save();
        if (category === "favorites") renderGrid();
        else renderDetails();
        details.querySelector<HTMLElement>("[data-action=favorite]")?.focus();
      }
    },
    { signal },
  );
  grid.addEventListener(
    "dblclick",
    () => {
      if (expanded) void insert();
    },
    { signal },
  );
  grid.addEventListener(
    "keydown",
    (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter"];
      if (!keys.includes(event.key) || !visible.length) return;
      event.preventDefault();
      if (event.key === "Enter") {
        void insert();
        return;
      }
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const index = visible.indexOf(selected);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? visible.length - 1
            : index +
              ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key] ??
                0);
      choose(visible[Math.min(visible.length - 1, Math.max(0, next))]!, true);
    },
    { signal },
  );
  search.addEventListener(
    "input",
    () => {
      query = search.value;
      renderGrid();
    },
    { signal },
  );
  search.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "ArrowDown" && visible.length) {
        event.preventDefault();
        choose(visible[0]!, true);
      }
    },
    { signal },
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        if (query) {
          query = search.value = "";
          renderGrid();
          search.focus();
        } else {
          window.hidden = true;
          draft.focus();
        }
      }
    },
    { signal },
  );
  await draft.updateComplete;
  if (signal.aborted) return () => {};
  const input = draft.shadowRoot!.querySelector("textarea")!;
  const rememberSelection = () => {
    selection = { start: input.selectionStart, end: input.selectionEnd };
  };
  for (const event of ["input", "select", "keyup", "click", "blur"])
    input.addEventListener(event, rememberSelection, { signal });
  renderCategories();
  renderGrid();
  return () => {
    lifetime.abort();
    root.classList.remove("characters-app");
  };
}
