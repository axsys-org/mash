import "@mash/ui/button";
import "@mash/ui/icon";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/select";
import "@mash/ui/option";
import "@mash/ui/dialog";
import "@mash/ui/checkbox";
import "@mash/ui/kbd";
import "@mash/ui/menu";
import "@mash/ui/menu-item";
import "@mash/ui/resizable";
import type { UIDialog } from "@mash/ui/dialog";
import type { UIInput } from "@mash/ui/input";
import type { UITextarea } from "@mash/ui/textarea";
import type { UISelect } from "@mash/ui/select";
import { escape as esc, download, writeState } from "./shared.js";
import { readNotebook, subscribeNotebook, documentBlockText } from "./documents-store.js";
import { workspaceNavigation, workspaceHref } from "./workspace-navigation.js";
import { seedNotebook, blockKinds, type Notebook } from "./documents-model.js";
import {
  studyKey,
  makeDeck,
  makeNote,
  seedStudy,
  parseStudy,
  queue,
  deckIds,
  syncCards,
  sides,
  ordinals,
  midnight,
  tomorrow,
  reviewCard,
  undoReview,
  intervalLabel,
  parseDelimited,
  exportCSV,
  type StudyCollection,
  type StudyNote,
  type StudyCard,
  type StudyDeck,
  type Grade,
  type NoteKind,
} from "./study-model.js";
import "./study.css";
const icon = (name: string, slot = ""): string =>
  `<ui-icon name="${name}"${slot ? ` slot="${slot}"` : ""}></ui-icon>`;
const btn = (label: string, action: string, name = "", variant = "ghost", attrs = ""): string =>
  `<ui-button size="small" variant="${variant}" data-action="${esc(action)}" ${attrs}>${name ? icon(name, "prefix") : ""}${esc(label)}</ui-button>`;
const field = (label: string, id: string, value = "", area = false): string =>
  `<label class="study-field"><span>${label}</span>${area ? `<ui-textarea id="${id}" label="${label}" rows="4" value="${esc(value)}"></ui-textarea>` : `<ui-input id="${id}" label="${label}" value="${esc(value)}"></ui-input>`}</label>`;
const select = (label: string, id: string, value: string, options: [string, string][]): string =>
  `<label class="study-field"><span>${label}</span><ui-select id="${id}" label="${label}" value="${esc(value)}">${options.map(([v, l]) => `<ui-option value="${esc(v)}">${esc(l)}</ui-option>`).join("")}</ui-select></label>`;
const kindNames: Record<NoteKind, string> = {
  basic: "Question & answer",
  reverse: "Forward & reverse",
  cloze: "Cloze deletion",
  typed: "Type the answer",
};
const stamp = (time: number): string =>
  new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export async function mount(root: HTMLElement): Promise<() => void> {
  const controller = new AbortController(),
    { signal } = controller;
  let state: StudyCollection,
    notebook: Notebook,
    initialMessage = "Saved on this device";
  try {
    const saved = localStorage.getItem(studyKey);
    state = saved ? parseStudy(saved) : seedStudy();
  } catch {
    state = seedStudy();
    initialMessage = "Saved collection could not be read. Export this session before leaving.";
  }
  try {
    notebook = readNotebook();
  } catch {
    notebook = seedNotebook();
    initialMessage = "Notebook storage is unavailable. Source pages are temporary.";
  }
  let view = "decks",
    deckId = "",
    query = "",
    sourceQuery = "",
    sourceDocument = "",
    sourceBlockId = "",
    browserPage = 0,
    filter = "all",
    selected = new Set<string>(),
    revealed = false,
    activeCard = "",
    sessionCount = 0,
    sessionStarted = Date.now(),
    cardStarted = Date.now(),
    ahead = false,
    typed = "",
    draft: StudyNote | undefined,
    editingDeck: StudyDeck | undefined,
    documentCleanup: (() => void) | undefined,
    disposed = false,
    documentVersion = 0,
    modalMode = "";
  root.classList.add("study-app");
  root.dataset.mashCatalogue = "mash";
  root.dataset.mashSize = "small";
  root.innerHTML = `<ui-resizable class="study-layout" label="Study workspace"><ui-resizable-panel class="study-rail-panel" size="220" min="180" max="290"><aside class="study-rail">${workspaceNavigation("study")}<nav aria-label="Study navigation" id="study-nav"></nav><div class="study-rail-label"><span>Decks</span>${btn("", "new-deck", "action.add", "ghost", 'aria-label="Create deck"')}</div><nav id="study-deck-nav" aria-label="Decks"></nav><div class="study-rail-bottom">${btn("Import collection", "import", "action.upload")}<div class="study-local"><span></span>Saved on this device</div></div></aside></ui-resizable-panel><ui-resizable-handle label="Resize study navigation"></ui-resizable-handle><ui-resizable-panel class="study-content-panel" min="280"><section class="study-main"><header class="study-topbar"><ui-button data-action="sidebar" variant="ghost" size="small" aria-label="Toggle study navigation">${icon("navigation.menu")}</ui-button><span id="study-crumb">Your library</span><div class="study-spacer"></div>${btn("Browse", "browse", "action.search")}${btn("Add note", "add", "action.add", "primary")}<ui-menu label="Collection actions"><ui-button slot="trigger" variant="ghost" size="small" aria-label="Collection actions">${icon("navigation.more.horizontal")}</ui-button><ui-menu-item value="templates">Card appearance</ui-menu-item><ui-menu-item value="export">Export collection</ui-menu-item><ui-menu-item value="csv">Export notes as CSV</ui-menu-item><ui-menu-item value="import">Import collection</ui-menu-item><ui-menu-item value="shortcuts">Keyboard shortcuts</ui-menu-item></ui-menu></header><main id="study-content" tabindex="-1"></main><footer class="study-status"><span id="study-status" role="status" aria-live="polite">${esc(initialMessage)}</span><span>Cards stay connected to their sources</span></footer></section></ui-resizable-panel></ui-resizable><ui-dialog id="study-dialog" label="Study workspace" class="study-dialog"><strong slot="title" id="study-dialog-title"></strong><div id="study-dialog-body"></div><div slot="actions" id="study-dialog-actions"></div></ui-dialog><input id="study-file" type="file" accept=".json,.csv,.tsv,text/csv,application/json" hidden><input id="study-media" type="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4" hidden>`;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
    root.querySelector<T>(selector)!;
  const content = $("#study-content"),
    dialog = $<UIDialog>("#study-dialog");
  const value = (id: string): string => $<UIInput | UITextarea | UISelect>(`#${id}`).value;
  const announce = (message: string): void => {
    $("#study-status").textContent = message;
  };
  const save = (): void => {
    announce(
      writeState(studyKey, state)
        ? "Saved on this device"
        : "Storage is full or unavailable. Export your collection to keep changes.",
    );
  };
  let indexedNotes = state.notes,
    notesById = new Map(state.notes.map((note) => [note.id, note]));
  const noteFor = (card: StudyCard): StudyNote => {
    if (indexedNotes !== state.notes) {
      indexedNotes = state.notes;
      notesById = new Map(state.notes.map((note) => [note.id, note]));
    }
    return notesById.get(card.note)!;
  };
  const sourceBlock = (note: StudyNote) =>
    notebook.documents
      .find((d) => d.id === note.source?.document)
      ?.blocks.find((b) => b.id === note.source?.block);
  const effective = (note: StudyNote): StudyNote => {
    const block = sourceBlock(note);
    return block ? { ...note, back: documentBlockText(block) } : note;
  };
  const active = (): StudyCard | undefined => state.cards.find((c) => c.id === activeCard);
  const due = (id = deckId): StudyCard[] => queue(state, id, Date.now(), ahead);
  const deckName = (id: string): string =>
    state.decks.find((d) => d.id === id)?.name ?? "All decks";
  const totals = (id = "") => {
    const cards = queue(state, id);
    return {
      fresh: cards.filter((c) => c.state === "new").length,
      learn: cards.filter((c) => c.state === "learning" || c.state === "relearning").length,
      review: cards.filter((c) => c.state === "review").length,
    };
  };
  const todayReviews = () => state.reviews.filter((r) => r.at >= midnight(Date.now()));
  const renderNav = (): void => {
    $("#study-nav").innerHTML = [
      ["decks", "Library", "object.layers"],
      ["browse", "Card browser", "action.search"],
      ["sources", "Documents", "object.document"],
      ["stats", "Insights", "object.table"],
    ]
      .map(([id, label, name]) =>
        btn(
          label!,
          `nav:${id}`,
          name!,
          "ghost",
          `${view === id || (view === "documents" && id === "sources") ? 'aria-current="page"' : ""}`,
        ),
      )
      .join("");
    $("#study-deck-nav").innerHTML = state.decks
      .map(
        (d) =>
          `<ui-button variant="ghost" size="small" data-action="deck:${esc(d.id)}" ${deckId === d.id ? 'aria-current="page"' : ""}><span slot="prefix" class="study-deck-dot"></span><span class="study-truncate">${esc(d.name.split("::").pop())}</span><span slot="suffix" class="study-count">${queue(state, d.id).length}</span></ui-button>`,
      )
      .join("");
    $("#study-crumb").textContent =
      view === "review"
        ? "Study session"
        : view === "documents"
          ? "Source notebook"
          : deckId && view === "decks"
            ? deckName(deckId).replaceAll("::", " / ")
            : ({
                decks: "Your library",
                browse: "Card browser",
                sources: "Documents",
                stats: "Insights",
              }[view] ?? "Study");
  };
  const heatmap = (): string => {
    const now = midnight(Date.now());
    return `<div class="study-heatmap" aria-label="Review activity over the last 84 days">${Array.from(
      { length: 84 },
      (_, i) => {
        const at = new Date(now);
        at.setDate(at.getDate() - 83 + i);
        const start = at.getTime(),
          end = tomorrow(start),
          count = state.reviews.filter((r) => r.at >= start && r.at < end).length;
        return `<span data-level="${Math.min(4, Math.ceil(count / 4))}" title="${esc(stamp(start))}: ${count} reviews"></span>`;
      },
    ).join("")}</div>`;
  };
  function renderDecks(): void {
    const counts = totals(deckId),
      reviewed = todayReviews(),
      cards = counts.fresh + counts.learn + counts.review;
    const deck = state.decks.find((d) => d.id === deckId),
      visible = deck ? state.decks.filter((d) => deckIds(state, deckId).has(d.id)) : state.decks;
    content.innerHTML = `<div class="study-page"><div class="study-heading"><div><p class="study-eyebrow">${deck ? "DECK OVERVIEW" : new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</p><h1>${deck ? esc(deck.name.split("::").pop()) : "Your collection"}</h1><p>${esc(deck?.description ?? "Review your cards or build a new question from a document block.")}</p></div>${deck ? btn("Deck options", "deck-options", "action.settings") : btn("New deck", "new-deck", "action.add", "secondary")}</div><section class="study-hero"><div><div class="study-eyebrow">TODAY</div><h2>${cards ? `${cards} cards ready` : "All caught up"}</h2><p>${cards ? `${counts.fresh} new · ${counts.learn + counts.review} to review` : "Your progress is saved. Add a note or explore your documents."}</p></div><div class="study-hero-actions">${btn(cards ? "Start studying" : "Custom study", cards ? "start" : "custom", "action.play", "primary")}${cards ? btn("Custom study", "custom", "", "ghost") : btn("Add a note", "add", "action.add")}</div></section><div class="study-metrics"><div><span class="study-metric-dot" data-tone="new"></span><strong>${counts.fresh}</strong><span>New to explore</span></div><div><span class="study-metric-dot" data-tone="learn"></span><strong>${counts.learn}</strong><span>Still learning</span></div><div><span class="study-metric-dot" data-tone="due"></span><strong>${counts.review}</strong><span>Ready to review</span></div><div>${icon("action.confirm")}<strong>${reviewed.length}</strong><span>Reviewed today</span></div></div><div class="study-section-heading"><h2>${deck ? "In this deck" : "Your collection"}</h2><span>${state.notes.filter((n) => !deck || deckIds(state, deckId).has(n.deck)).length} notes · ${state.cards.filter((c) => !deck || deckIds(state, deckId).has(noteFor(c).deck)).length} cards</span></div><div class="study-deck-table"><div class="study-deck-table-head"><span>DECK</span><span>NEW</span><span>LEARNING</span><span>DUE</span><span></span></div>${visible
      .map((d, i) => {
        const c = totals(d.id);
        return `<div class="study-deck-row"><button class="study-deck-title" data-action="deck:${esc(d.id)}"><span class="study-deck-tile" data-tile="${i % 4}">${icon(d.name.includes("::") ? "object.document" : "object.layers")}</span><span><strong>${esc(d.name.split("::").pop())}</strong><small>${d.name.includes("::") ? esc(d.name.split("::").slice(0, -1).join(" / ")) : state.notes.filter((n) => n.deck === d.id).length + " notes"}</small></span></button><span data-tone="new">${c.fresh}</span><span data-tone="learn">${c.learn}</span><span data-tone="due">${c.review}</span>${btn("", `options:${d.id}`, "navigation.more.horizontal", "ghost", `aria-label="Options for ${esc(d.name)}"`)}</div>`;
      })
      .join(
        "",
      )}</div><section class="study-activity"><div><h3>Review activity</h3><p>${reviewed.length} reviewed today · last 12 weeks</p></div>${heatmap()}</section></div>`;
  }
  const shownCards = (): StudyCard[] =>
    state.cards.filter((c) => {
      const n = effective(noteFor(c));
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const hay = [n.front, n.back, n.tags.join(" "), deckName(n.deck), kindNames[n.kind]]
        .join(" ")
        .toLowerCase();
      return (
        (!deckId || deckIds(state, deckId).has(n.deck)) &&
        words.every((w) => hay.includes(w)) &&
        (filter === "all" ||
          (filter === "due" &&
            !c.suspended &&
            c.buried <= Date.now() &&
            c.state !== "new" &&
            c.due <= Date.now()) ||
          (filter === "new" && c.state === "new") ||
          (filter === "suspended" && c.suspended) ||
          (filter === "flagged" && c.flag) ||
          (filter === "linked" && n.source))
      );
    });
  function renderBrowserRows(): void {
    const cards = shownCards();
    browserPage = Math.min(browserPage, Math.max(0, Math.ceil(cards.length / 60) - 1));
    $("#study-pagination").innerHTML =
      `${btn("Previous", "page-back", "navigation.back", "ghost", browserPage ? "" : "disabled")}<span>Page ${browserPage + 1} of ${Math.max(1, Math.ceil(cards.length / 60))}</span>${btn("Next", "page-next", "navigation.forward", "ghost", (browserPage + 1) * 60 < cards.length ? "" : "disabled")}`;
    $("#study-browser-count").textContent = `${cards.length} cards · ${selected.size} selected`;
    $("#study-browser-rows").innerHTML = cards.length
      ? cards
          .slice(browserPage * 60, (browserPage + 1) * 60)
          .map((c) => {
            const n = effective(noteFor(c)),
              pair = sides(n, c);
            return `<tr><td><ui-checkbox aria-label="Select ${esc(pair.front)}" data-card="${esc(c.id)}" ${selected.has(c.id) ? "checked" : ""}></ui-checkbox></td><td><button class="study-card-link" data-action="edit:${esc(n.id)}"><strong>${esc(pair.front)}</strong><small>${esc(pair.back)}</small></button></td><td><span class="study-pill" data-state="${c.suspended ? "suspended" : c.state}">${c.suspended ? "Suspended" : c.buried > Date.now() ? "Buried" : c.state === "new" ? "New" : c.due <= Date.now() ? "Due" : stamp(c.due)}</span></td><td>${esc(deckName(n.deck).split("::").pop())}</td><td>${c.interval ? c.interval + "d" : "—"}</td><td>${btn(c.flag ? "★" : "☆", `flag:${c.id}`, "", "ghost", `aria-label="${c.flag ? "Unflag" : "Flag"} card"`)}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="6"><div class="study-empty">No cards match. Try another search or add a note.</div></td></tr>';
  }
  function renderBrowser(): void {
    content.innerHTML = `<div class="study-page study-browser"><div class="study-heading"><div><h1>Card browser</h1><p>Search questions, answers, tags, and linked sources.</p></div>${btn("Add note", "add", "action.add", "secondary")}</div><div class="study-browser-tools"><ui-input id="study-search" type="search" label="Search cards" placeholder="Search questions, answers, tags…" value="${esc(query)}" clean-on-escape></ui-input>${select("Deck", "study-filter-deck", deckId, [["", "All decks"], ...state.decks.map((d) => [d.id, d.name] as [string, string])])}${select(
      "Status",
      "study-filter-status",
      filter,
      [
        ["all", "All cards"],
        ["due", "Due"],
        ["new", "New"],
        ["suspended", "Suspended"],
        ["flagged", "Flagged"],
        ["linked", "Linked to a page"],
      ],
    )}</div><div class="study-bulk"><span id="study-browser-count"></span><div class="study-spacer"></div>${btn("Select all", "select-all")}${btn("Suspend / resume", "bulk-suspend")}${btn("Move", "bulk-move")}${btn("Reset schedule", "bulk-reset")}${btn("Delete", "bulk-delete")}</div><div class="study-table-scroll"><table class="study-card-table"><thead><tr><th aria-label="Selection"></th><th>QUESTION / ANSWER</th><th>STATUS</th><th>DECK</th><th>INTERVAL</th><th aria-label="Flag"></th></tr></thead><tbody id="study-browser-rows"></tbody></table></div><div id="study-pagination" class="study-pagination"></div></div>`;
    renderBrowserRows();
  }
  function templateText(
    text: string,
    pair: { front: string; back: string },
    note: StudyNote,
  ): string {
    return text.replace(
      /\{\{(Front|Back|Extra|Tags)\}\}/g,
      (_m, key: string) =>
        ({ Front: pair.front, Back: pair.back, Extra: note.extra, Tags: note.tags.join(" · ") })[
          key
        ] ?? "",
    );
  }
  function cardMarkup(note: StudyNote, card: StudyCard, answer: boolean): string {
    const pair = sides(effective(note), card);
    return `<div class="study-face" data-font="${state.template.font}" data-align="${state.template.align}"><div class="study-card-eyebrow">${esc(kindNames[note.kind])}</div><h2>${esc(templateText(state.template.front, pair, note))}</h2>${note.image ? `<img class="study-card-image" src="${esc(note.image)}" alt="Note illustration">` : ""}${answer ? `<div class="study-answer"><span>ANSWER</span><p>${esc(templateText(state.template.back, pair, note))}</p>${note.kind === "cloze" && note.back ? `<small>${esc(note.back)}</small>` : ""}${note.extra ? `<small>${esc(note.extra)}</small>` : ""}</div>` : ""}${note.audio ? `<audio controls src="${esc(note.audio)}" aria-label="Note audio"></audio>` : ""}</div>`;
  }
  function renderReview(): void {
    const card = active();
    if (!card) {
      const eligible = state.cards.filter(
        (c) =>
          (!deckId || deckIds(state, deckId).has(noteFor(c).deck)) &&
          !c.suspended &&
          c.buried <= Date.now() &&
          (c.state === "learning" || c.state === "relearning"),
      );
      const next = eligible.sort((a, b) => a.due - b.due)[0];
      content.innerHTML = `<section class="study-complete"><span class="study-complete-mark">${icon("action.confirm")}</span><p class="study-eyebrow">SESSION COMPLETE</p><h1>Session complete</h1><p>${sessionCount} cards reviewed · ${Math.max(1, Math.round((Date.now() - sessionStarted) / 60000))} min of focused practice.</p>${next ? `<p>Learning cards return ${new Date(next.due).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.</p>` : "<p>Your progress is saved. Come back when you’re ready.</p>"}<div>${btn("Back to decks", "nav:decks", "navigation.back", "secondary")}${btn("Check due cards", "resume", "action.refresh")}</div>${heatmap()}</section>`;
      return;
    }
    const note = noteFor(card),
      pair = sides(effective(note), card),
      count = due().length;
    content.innerHTML = `<section class="study-review"><div class="study-review-top">${btn("End session", "nav:decks", "navigation.back")}<span>${esc(deckName(note.deck).replaceAll("::", " / "))}</span><span class="study-pill">${sessionCount} reviewed · ${count} ready</span></div><div class="study-review-center">${cardMarkup(note, card, revealed)}${note.kind === "typed" && !revealed ? '<ui-input id="study-typed" label="Your answer" placeholder="Type what you remember…" autocomplete="off"></ui-input>' : ""}${note.kind === "typed" && revealed ? `<div class="study-typed-result">${typed.trim().toLocaleLowerCase() === pair.back.trim().toLocaleLowerCase() ? "✓ Matched" : "Compare your answer"}: <strong>${esc(typed || "No answer entered")}</strong></div>` : ""}${note.tags.length ? `<div class="study-tags">${note.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}${note.source ? btn(sourceBlock(note) ? "Linked source page" : "Source missing · using saved answer", `source:${encodeURIComponent(note.source.document)}:${encodeURIComponent(note.source.block)}`, "object.document") : ""}</div><footer class="study-review-footer"><div class="study-review-utility">${btn("Undo", "undo", "action.reset", "ghost", state.reviews.length ? "" : "disabled")}${btn("Edit note", `edit:${note.id}`, "action.edit")}${btn("Bury", "bury")}${btn("Suspend", "suspend")}</div>${revealed ? `<div class="study-grades">${([1, 2, 3, 4] as Grade[]).map((g, i) => `<ui-button data-action="grade:${g}" variant="${g === 3 ? "primary" : "secondary"}" class="study-grade" data-grade="${g}"><span><strong>${["Again", "Hard", "Good", "Easy"][i]}</strong><small>${intervalLabel(card, g)}</small></span><ui-kbd slot="suffix">${g}</ui-kbd></ui-button>`).join("")}</div>` : `<ui-button class="study-flip" variant="primary" data-action="reveal">Show answer<ui-kbd slot="suffix">Space</ui-kbd></ui-button>`}<p>${ahead ? "Custom study · answers update the regular schedule" : "Trust your recall. Choose how well you remembered."}</p></footer></section>`;
    if (note.kind === "typed" && !revealed) $<UIInput>("#study-typed").focus();
  }
  function nextCard(preferred?: string): void {
    activeCard = preferred ?? due()[0]?.id ?? "";
    revealed = false;
    typed = "";
    cardStarted = Date.now();
    renderReview();
  }
  function renderStats(): void {
    const today = todayReviews(),
      total = state.reviews.length,
      retention = total
        ? Math.round((state.reviews.filter((r) => r.grade > 1).length / total) * 100)
        : 0;
    const forecast = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i);
      return state.cards.filter(
        (c) =>
          !c.suspended &&
          c.state !== "new" &&
          c.due >= date.getTime() &&
          c.due < tomorrow(date.getTime()),
      ).length;
    });
    const max = Math.max(1, ...forecast);
    content.innerHTML = `<div class="study-page"><div class="study-heading"><div><h1>Review history</h1><p>Scheduling, retention, and activity across your collection.</p></div>${btn("Export collection", "export", "action.download")}</div><div class="study-metrics"><div><strong>${total}</strong><span>Lifetime reviews</span></div><div><strong>${retention}%</strong><span>Answers recalled</span></div><div><strong>${Math.round(today.reduce((n, r) => n + r.ms, 0) / 60000)}m</strong><span>Studied today</span></div><div><strong>${state.cards.filter((c) => c.interval >= 21).length}</strong><span>Mature cards</span></div></div><div class="study-stat-grid"><section class="study-stat-panel"><h2>Upcoming reviews</h2><p>Next 14 days · ${state.cards.filter((c) => c.state !== "new" && !c.suspended && c.due < midnight(Date.now())).length} overdue</p><div class="study-bars" role="img" aria-label="Upcoming reviews: ${forecast.join(", ")}">${forecast.map((n, i) => `<div><span>${n}</span><i style="height:${Math.max(3, (n / max) * 150)}px"></i><small>${i === 0 ? "Today" : "+" + i}</small></div>`).join("")}</div></section><section class="study-stat-panel"><h2>Collection health</h2><p>${state.notes.length} notes generate ${state.cards.length} cards.</p>${[
      "new",
      "learning",
      "review",
      "relearning",
    ]
      .map((s) => {
        const n = state.cards.filter((c) => c.state === s).length;
        return `<div class="study-health"><span>${s}</span><progress max="${Math.max(1, state.cards.length)}" value="${n}"></progress><strong>${n}</strong></div>`;
      })
      .join(
        "",
      )}<p>${state.cards.filter((c) => c.suspended).length} suspended · ${state.cards.filter((c) => c.buried > Date.now()).length} buried until tomorrow</p>${btn("Unbury all cards", "unbury")}</section></div><section class="study-stat-panel"><h2>Your practice</h2><p>The last 12 weeks. Hover over a day for its review count.</p>${heatmap()}</section><div class="study-section-heading"><h2>Recent reviews</h2><span>Latest 20</span></div><div class="study-log">${
      state.reviews
        .slice(-20)
        .sort((a, b) => b.at - a.at)
        .map(
          (r) =>
            `<div><span>${esc(state.notes.find((n) => n.id === r.previous.note)?.front ?? "Deleted note")}</span><span>${["Again", "Hard", "Good", "Easy"][r.grade - 1]}</span><small>${stamp(r.at)}</small></div>`,
        )
        .join("") ||
      '<div class="study-empty">Start a session to see your review history here.</div>'
    }</div></div>`;
  }
  function refreshNotebook(): void {
    try {
      notebook = readNotebook();
    } catch {
      announce("Could not reload source pages. Your last loaded pages remain available.");
    }
  }
  const sourceLimits = new Map<string, number>();
  const documentHref = (id: string, block?: string): string =>
    workspaceHref("documents", { document: id, ...(block ? { block } : {}) });
  function renderSourceResults(): void {
    const needle = sourceQuery.trim().toLocaleLowerCase();
    const documents = notebook.documents.filter(
      (doc) =>
        !needle ||
        doc.title.toLocaleLowerCase().includes(needle) ||
        doc.blocks.some((block) => documentBlockText(block).toLocaleLowerCase().includes(needle)),
    );
    const doc = documents.find((item) => item.id === sourceDocument) || documents[0];
    sourceDocument = doc?.id || "";
    $("#study-source-documents").innerHTML =
      documents
        .map((item) => {
          const linked = state.notes.filter((note) => note.source?.document === item.id).length;
          return `<button class="study-source-document" data-action="select-source:${esc(item.id)}" ${item.id === sourceDocument ? 'aria-current="true"' : ""}>${icon("object.document")}<span><strong>${esc(item.title || "Untitled")}</strong><small>${item.blocks.length} blocks${linked ? ` · ${linked} linked` : ""}</small></span>${item.id === sourceDocument ? icon("navigation.forward") : ""}</button>`;
        })
        .join("") || '<p class="study-empty">No matching documents.</p>';
    const detail = $("#study-source-detail");
    if (!doc) {
      detail.innerHTML =
        '<div class="study-source-empty">No documents found. Try another search.</div>';
      return;
    }
    const linked = state.notes.filter((note) => note.source?.document === doc.id).length;
    const blocks = doc.blocks.filter(
      (block) =>
        documentBlockText(block).trim() &&
        (!needle ||
          doc.title.toLocaleLowerCase().includes(needle) ||
          documentBlockText(block).toLocaleLowerCase().includes(needle)),
    );
    const limit = sourceLimits.get(doc.id) ?? 12;
    detail.innerHTML = `<section class="study-source-page"><header><div><h2>${esc(doc.title || "Untitled")}</h2><small>${doc.blocks.length} blocks · ${linked} linked notes</small></div>${btn("Edit document", `source:${encodeURIComponent(doc.id)}`, "action.edit")}<a class="study-document-link" href="${esc(documentHref(doc.id))}" aria-label="Open ${esc(doc.title)} in documents">${icon("navigation.forward")}</a></header><div class="study-source-blocks">${
      blocks
        .slice(0, limit)
        .map((block) => {
          const notes = state.notes.filter(
            (note) => note.source?.document === doc.id && note.source.block === block.id,
          );
          const kind = blockKinds.find((item) => item.kind === block.kind);
          return `<article class="study-source-block" data-source-block="${esc(block.id)}" data-kind="${block.kind}" ${sourceBlockId === block.id ? "data-highlighted" : ""}><div class="study-source-block-heading"><span>${icon(kind?.icon || "object.document")}${esc(kind?.label || block.kind)}</span><div>${btn("Edit block", `source:${encodeURIComponent(doc.id)}:${encodeURIComponent(block.id)}`, "action.edit")}${btn("Make a card", `link:${encodeURIComponent(doc.id)}:${encodeURIComponent(block.id)}`, "action.add", "secondary")}</div></div><p>${esc(documentBlockText(block))}</p>${notes.length ? `<div class="study-linked-notes">${notes.map((note) => btn(note.front, `edit:${note.id}`, "object.layers")).join("")}</div>` : ""}</article>`;
        })
        .join("") ||
      '<div class="study-source-empty">Add a text block to this document to create a linked card.</div>'
    }</div>${blocks.length > limit ? `<div class="study-source-more">${btn(`Show ${Math.min(12, blocks.length - limit)} more blocks`, `more-source:${doc.id}`, "navigation.down")}</div>` : ""}</section>`;
  }
  function renderSources(): void {
    refreshNotebook();
    content.innerHTML = `<div class="study-page study-sources"><div class="study-heading"><div><h1>Document sources</h1><p>Make a question from a block. Its answer follows the source as you edit.</p></div>${btn("Open documents", "document-editor", "object.document", "secondary")}</div><div class="study-source-workspace"><aside class="study-source-sidebar"><ui-input id="study-source-search" type="search" label="Search documents and blocks" placeholder="Find a document or block" value="${esc(sourceQuery)}">${icon("action.search", "prefix")}</ui-input><nav id="study-source-documents" aria-label="Source documents"></nav></aside><div id="study-source-detail"></div></div></div>`;
    renderSourceResults();
  }
  function render(): void {
    renderNav();
    if (view === "decks") renderDecks();
    else if (view === "browse") renderBrowser();
    else if (view === "review") renderReview();
    else if (view === "stats") renderStats();
    else if (view === "sources") renderSources();
  }
  function navigate(next: string): void {
    documentVersion++;
    documentCleanup?.();
    documentCleanup = undefined;
    view = next;
    root.classList.remove("study-mobile-nav");
    render();
    content.focus({ preventScroll: true });
  }
  async function openDocument(id?: string, block?: string): Promise<void> {
    sourceDocument = id || sourceDocument;
    sourceBlockId = block || "";
    navigate("documents");
    const version = ++documentVersion;
    content.innerHTML = `<div class="study-document-host"><div class="study-document-toolbar">${btn("Back to source pages", "nav:sources", "navigation.back")}<span>Linked cards follow your edits.</span>${id ? `<a class="study-document-link" href="${esc(documentHref(id, block))}">Open in documents ${icon("navigation.forward")}</a>` : ""}</div><div id="study-notebook" class="study-notebook"></div></div>`;
    const module = await import("./documents.js");
    if (disposed || version !== documentVersion) return;
    const cleanup = await module.mount($("#study-notebook"), {
      activeDocument: id,
      activeBlock: block,
      embedded: true,
    });
    if (disposed || version !== documentVersion) cleanup();
    else documentCleanup = cleanup;
  }
  function openModal(title: string, body: string, actions: string, mode: string): void {
    modalMode = mode;
    $("#study-dialog-title").textContent = title;
    dialog.label = title;
    $("#study-dialog-body").innerHTML = body;
    $("#study-dialog-actions").innerHTML = btn("Cancel", "cancel") + actions;
    dialog.open = true;
  }
  function collectDraft(): void {
    if (modalMode !== "note" || !draft || !$("#study-note-front")) return;
    Object.assign(draft, {
      front: value("study-note-front"),
      back: value("study-note-back"),
      extra: value("study-note-extra"),
      tags: value("study-note-tags")
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 100),
      deck: value("study-note-deck"),
      kind: value("study-note-kind") as NoteKind,
    });
  }
  function noteEditor(): void {
    if (!draft) return;
    const note = draft;
    openModal(
      state.notes.some((n) => n.id === note.id) ? "Edit note" : "New note",
      `<div class="study-form-grid">${select("Note type", "study-note-kind", note.kind, Object.entries(kindNames) as [string, string][])}${select(
        "Deck",
        "study-note-deck",
        note.deck,
        state.decks.map((d) => [d.id, d.name]),
      )}</div>${field(note.kind === "cloze" ? "Text with deletions" : "Question", "study-note-front", note.front, true)}${note.kind === "cloze" ? '<p class="study-form-help">Hide a phrase with {{c1::answer}}. Use c2 for another card. Add ::hint after the answer for a clue.</p>' : ""}${field(note.kind === "cloze" ? "Additional answer" : "Answer", "study-note-back", note.back, true)}${note.source ? `<div class="study-source-link">${icon("object.document")}Linked to ${esc(notebook.documents.find((d) => d.id === note.source?.document)?.title ?? "a missing page")}. ${sourceBlock(note) ? "Source edits update the answer." : "This source block is missing. The last saved answer is kept."} ${btn("Detach", "detach")}</div>` : ""}${field("Extra context", "study-note-extra", note.extra, true)}${field("Tags", "study-note-tags", note.tags.join(" "))}<div class="study-editor-tools">${btn("Attach image or audio", "attach", "action.upload")}${note.image || note.audio ? btn("Remove media", "remove-media") : ""}${btn("Preview cards", "preview", "action.play")}</div><div id="study-note-preview"></div><p class="study-form-error" id="study-form-error" role="alert"></p>`,
      btn("Save note", "save-note", "action.confirm", "primary"),
      "note",
    );
    if (note.source) $<UITextarea>("#study-note-back").readonly = true;
  }
  function editNote(id?: string): void {
    draft = id
      ? structuredClone(state.notes.find((n) => n.id === id)!)
      : makeNote(deckId || state.decks[0]!.id);
    if (draft.source) draft.back = effective(draft).back;
    noteEditor();
  }
  function deckEditor(id?: string): void {
    editingDeck = id ? structuredClone(state.decks.find((d) => d.id === id)!) : makeDeck("");
    const d = editingDeck;
    openModal(
      id ? "Deck options" : "Create a deck",
      `${field("Name", "study-deck-name", d.name)}<p class="study-form-help">Use Parent::Child to nest a deck.</p>${field("Description", "study-deck-description", d.description, true)}<div class="study-form-grid">${field("New cards per day", "study-new-limit", String(d.newLimit))}${field("Review cards per day", "study-review-limit", String(d.reviewLimit))}</div><ui-checkbox id="study-bury-siblings" ${d.burySiblings ? "checked" : ""}>Bury sibling cards until tomorrow</ui-checkbox><p class="study-form-help">Learning: Again returns in 1 minute, Hard in 10 minutes. Good starts at 1 day; Easy at 4 days. Later reviews grow the interval according to your recall.</p><p id="study-form-error" class="study-form-error" role="alert"></p>${id ? btn("Delete deck and its notes", "delete-deck", "action.delete") : ""}`,
      btn("Save deck", "save-deck", "action.confirm", "primary"),
      "deck",
    );
  }
  function templates(): void {
    openModal(
      "Card appearance",
      `<p class="study-form-help">Templates are plain text. Insert {{Front}}, {{Back}}, {{Extra}}, or {{Tags}}. Applies to every card in this collection.</p>${field("Question template", "study-template-front", state.template.front, true)}${field("Answer template", "study-template-back", state.template.back, true)}<div class="study-form-grid">${select(
        "Typeface",
        "study-template-font",
        state.template.font,
        [
          ["serif", "Editorial serif"],
          ["sans", "Clean sans serif"],
        ],
      )}${select("Alignment", "study-template-align", state.template.align, [
        ["center", "Centered"],
        ["left", "Left aligned"],
      ])}</div>`,
      btn("Save appearance", "save-template", "action.confirm", "primary"),
      "template",
    );
  }
  function removeNotes(ids: Set<string>): void {
    const cards = new Set(state.cards.filter((c) => ids.has(c.note)).map((c) => c.id));
    state.notes = state.notes.filter((n) => !ids.has(n.id));
    state.cards = state.cards.filter((c) => !ids.has(c.note));
    state.reviews = state.reviews.filter((r) => !cards.has(r.card));
    selected.clear();
    save();
  }
  async function action(actionName: string): Promise<void> {
    const [name, ...rest] = actionName.split(":"),
      id = rest.join(":");
    if (name === "nav") {
      if (id === "decks") deckId = "";
      navigate(id);
    } else if (name === "sidebar") root.classList.toggle("study-mobile-nav");
    else if (name === "deck") {
      deckId = id;
      navigate("decks");
    } else if (name === "browse") {
      navigate("browse");
      $<UIInput>("#study-search").focus();
    } else if (name === "add") editNote();
    else if (name === "edit") editNote(id);
    else if (name === "new-deck") deckEditor();
    else if (name === "deck-options" || name === "options") deckEditor(id || deckId);
    else if (name === "cancel") {
      dialog.open = false;
      modalMode = "";
    } else if (name === "save-note") {
      collectDraft();
      if (!draft) return;
      const error = $("#study-form-error");
      if (!draft.front.trim() || (draft.kind !== "cloze" && !draft.back.trim())) {
        error.textContent = "Add a question and an answer before saving.";
        return;
      }
      if (draft.kind === "cloze" && !ordinals(draft).length) {
        error.textContent = "Add at least one deletion, such as {{c1::a phrase}}.";
        return;
      }
      if (draft.source) draft.back = effective(draft).back;
      const next = structuredClone(state);
      const index = next.notes.findIndex((n) => n.id === draft!.id);
      if (index < 0) next.notes.push(draft);
      else next.notes[index] = draft;
      syncCards(next, draft);
      try {
        state = parseStudy(JSON.stringify(next));
      } catch (err) {
        error.textContent = err instanceof Error ? err.message : "This note cannot be saved.";
        return;
      }
      save();
      dialog.open = false;
      if (view === "review" && !active()) nextCard();
      else render();
      announce(
        `Note saved · ${ordinals(draft).length} card${ordinals(draft).length === 1 ? "" : "s"}`,
      );
      draft = undefined;
    } else if (name === "preview") {
      collectDraft();
      if (draft)
        $("#study-note-preview").innerHTML =
          ordinals(draft)
            .map((ordinal) => cardMarkup(draft!, { ordinal } as StudyCard, true))
            .join("") || "Add a cloze deletion to generate a card.";
    } else if (name === "detach") {
      collectDraft();
      if (draft) delete draft.source;
      noteEditor();
    } else if (name === "attach") $("#study-media").click();
    else if (name === "remove-media") {
      collectDraft();
      if (draft) {
        draft.image = "";
        draft.audio = "";
      }
      noteEditor();
    } else if (name === "save-deck") {
      if (!editingDeck) return;
      const title = value("study-deck-name").trim(),
        fresh = Number(value("study-new-limit")),
        review = Number(value("study-review-limit"));
      if (
        !title ||
        state.decks.some((d) => d.id !== editingDeck!.id && d.name === title) ||
        ![fresh, review].every((n) => Number.isInteger(n) && n >= 0 && n <= 9999)
      ) {
        $("#study-form-error").textContent =
          "Use a unique deck name and daily limits between 0 and 9999.";
        return;
      }
      const previous = state.decks.find((d) => d.id === editingDeck!.id),
        oldName = previous?.name;
      Object.assign(editingDeck, {
        name: title,
        description: value("study-deck-description"),
        newLimit: fresh,
        reviewLimit: review,
        burySiblings: $<HTMLElement & { checked: boolean }>("#study-bury-siblings").checked,
      });
      if (previous) {
        Object.assign(previous, editingDeck);
        for (const d of state.decks)
          if (d.id !== previous.id && d.name.startsWith(oldName + "::"))
            d.name = title + d.name.slice(oldName!.length);
      } else state.decks.push(editingDeck);
      save();
      dialog.open = false;
      render();
    } else if (name === "delete-deck")
      openModal(
        "Delete this deck?",
        "<p>The deck, its child decks, notes, cards, and review history will be removed. Export first if you want a backup.</p>",
        btn("Delete deck", "confirm-delete-deck", "action.delete", "primary"),
        "delete",
      );
    else if (name === "confirm-delete-deck") {
      if (!editingDeck) return;
      const ids = deckIds(state, editingDeck.id);
      removeNotes(new Set(state.notes.filter((n) => ids.has(n.deck)).map((n) => n.id)));
      state.decks = state.decks.filter((d) => !ids.has(d.id));
      if (!state.decks.length) state.decks.push(makeDeck("My deck"));
      deckId = "";
      dialog.open = false;
      save();
      navigate("decks");
    } else if (name === "start" || name === "resume") {
      ahead = false;
      view = "review";
      if (name === "start") {
        sessionSeen.clear();
        sessionCount = 0;
        sessionStarted = Date.now();
      }
      announce("Session ready · your progress saves after each answer.");
      renderNav();
      nextCard();
      content.focus();
    } else if (name === "custom")
      openModal(
        "Custom study",
        "<p>Review all unsuspended, unburied cards in the selected deck, including cards scheduled for later. Answers update their regular schedules.</p>",
        btn("Begin custom study", "start-custom", "action.play", "primary"),
        "custom",
      );
    else if (name === "start-custom") {
      dialog.open = false;
      ahead = true;
      sessionSeen.clear();
      sessionCount = 0;
      sessionStarted = Date.now();
      view = "review";
      announce("Session ready · your progress saves after each answer.");
      renderNav();
      nextCard();
      content.focus();
    } else if (name === "reveal" && active()) {
      typed = root.querySelector<UIInput>("#study-typed")?.value ?? "";
      revealed = true;
      renderReview();
      content.focus({ preventScroll: true });
    } else if (name === "grade" && revealed && active()) {
      reviewCard(state, active()!, Number(id) as Grade, Date.now() - cardStarted);
      sessionCount++;
      save();
      if (ahead) {
        const current = activeCard;
        nextCard(due().find((c) => c.id !== current && !sessionSeen.has(c.id))?.id ?? "");
        sessionSeen.add(current);
      } else nextCard();
      content.focus({ preventScroll: true });
      renderNav();
    } else if (name === "undo") {
      const restored = undoReview(state);
      if (restored) sessionSeen.delete(restored);
      save();
      sessionCount = Math.max(0, sessionCount - 1);
      if (view === "review") nextCard(restored);
      else render();
    } else if ((name === "bury" || name === "suspend") && active()) {
      if (name === "bury") active()!.buried = tomorrow(Date.now());
      else active()!.suspended = true;
      save();
      nextCard();
      renderNav();
    } else if (name === "flag") {
      const card = state.cards.find((c) => c.id === id);
      if (card) card.flag = !card.flag;
      save();
      renderBrowserRows();
    } else if (name === "page-next" || name === "page-back") {
      browserPage += name === "page-next" ? 1 : -1;
      renderBrowserRows();
    } else if (name === "bulk-reset") {
      if (!selected.size) {
        announce("Select cards to reset first.");
        return;
      }
      openModal(
        "Reset selected schedules?",
        "<p>Selected cards become new again. Their review logs are retained. Suspension and flags stay unchanged.</p>",
        btn("Reset schedules", "confirm-reset", "action.reset", "primary"),
        "reset",
      );
    } else if (name === "confirm-reset") {
      for (const card of state.cards)
        if (selected.has(card.id))
          Object.assign(card, {
            state: "new",
            due: 0,
            interval: 0,
            ease: 2.5,
            reps: 0,
            lapses: 0,
            buried: 0,
          });
      save();
      dialog.open = false;
      render();
    } else if (name === "select-all") {
      const cards = shownCards();
      if (cards.every((c) => selected.has(c.id))) selected.clear();
      else cards.forEach((c) => selected.add(c.id));
      renderBrowserRows();
    } else if (name === "bulk-suspend") {
      const cards = state.cards.filter((c) => selected.has(c.id)),
        suspend = cards.some((c) => !c.suspended);
      cards.forEach((c) => (c.suspended = suspend));
      save();
      renderBrowserRows();
      renderNav();
    } else if (name === "bulk-move") {
      if (!selected.size) {
        announce("Select cards to move first.");
        return;
      }
      openModal(
        "Move selected notes",
        `${select(
          "Destination deck",
          "study-move-deck",
          state.decks[0]!.id,
          state.decks.map((d) => [d.id, d.name]),
        )}<p>All cards belonging to the selected notes move together.</p>`,
        btn("Move notes", "confirm-move", "", "primary"),
        "move",
      );
    } else if (name === "confirm-move") {
      const notes = new Set(state.cards.filter((c) => selected.has(c.id)).map((c) => c.note));
      state.notes
        .filter((n) => notes.has(n.id))
        .forEach((n) => (n.deck = value("study-move-deck")));
      save();
      dialog.open = false;
      render();
    } else if (name === "bulk-delete") {
      if (!selected.size) {
        announce("Select cards to delete first.");
        return;
      }
      openModal(
        "Delete selected notes?",
        "<p>This removes the selected notes, all their cards, and their review history.</p>",
        btn("Delete notes", "confirm-delete", "action.delete", "primary"),
        "delete",
      );
    } else if (name === "confirm-delete") {
      removeNotes(new Set(state.cards.filter((c) => selected.has(c.id)).map((c) => c.note)));
      dialog.open = false;
      render();
    } else if (name === "unbury") {
      state.cards.forEach((c) => (c.buried = 0));
      save();
      render();
    } else if (name === "templates") templates();
    else if (name === "save-template") {
      state.template = {
        front: value("study-template-front"),
        back: value("study-template-back"),
        font: value("study-template-font") as "serif" | "sans",
        align: value("study-template-align") as "center" | "left",
      };
      save();
      dialog.open = false;
      render();
    } else if (name === "export") {
      download(
        "recall-collection.json",
        JSON.stringify({ ...state, notes: state.notes.map(effective) }, null, 2),
        "application/json",
      );
      announce(
        "Collection exported with notes, media, schedules, and review history. Source notebooks export separately from the notebook editor.",
      );
    } else if (name === "csv") {
      download(
        "recall-notes.csv",
        exportCSV({ ...state, notes: state.notes.map(effective) }),
        "text/csv",
      );
      announce("Notes exported as CSV. Media and schedules are included in JSON exports.");
    } else if (name === "import")
      openModal(
        "Import collection",
        `<p>Import a collection JSON backup, or add notes from CSV / TSV.</p><div class="study-import-info"><strong>Text columns</strong><p>Front, Back, Tags, Deck, Type. The first two columns are required. Types: basic, reverse, cloze, typed.</p><strong>Collection backup</strong><p>A JSON backup replaces this collection after confirmation. CSV adds notes; existing cards stay in place.</p></div><p class="study-form-help">Up to 8 MB. Archive packages are not supported.</p>`,
        btn("Choose file", "choose-file", "action.upload", "primary"),
        "import",
      );
    else if (name === "choose-file") $("#study-file").click();
    else if (name === "confirm-import" && pendingImport) {
      state = pendingImport;
      pendingImport = undefined;
      deckId = "";
      selected.clear();
      save();
      dialog.open = false;
      navigate("decks");
    } else if (name === "document-editor" || name === "source")
      await openDocument(
        rest[0] ? decodeURIComponent(rest[0]) : undefined,
        rest[1] ? decodeURIComponent(rest[1]) : undefined,
      );
    else if (name === "select-source") {
      sourceDocument = id;
      sourceBlockId = "";
      renderSourceResults();
    } else if (name === "more-source") {
      sourceLimits.set(id, (sourceLimits.get(id) ?? 12) + 12);
      renderSourceResults();
    } else if (name === "link") {
      const [documentId, blockId] = rest.map(decodeURIComponent);
      const doc = notebook.documents.find((d) => d.id === documentId),
        block = doc?.blocks.find((b) => b.id === blockId);
      if (doc && block) {
        draft = {
          ...makeNote(deckId || state.decks[0]!.id),
          front: `What should you remember about ${doc.title.toLowerCase()}?`,
          back: documentBlockText(block),
          source: { document: doc.id, block: block.id },
          tags: ["linked"],
        };
        noteEditor();
      }
    } else if (name === "shortcuts")
      openModal(
        "Keyboard shortcuts",
        '<div class="study-shortcuts"><p><ui-kbd>A</ui-kbd> Add a note</p><p><ui-kbd shortcut="Primary+K"></ui-kbd> Search cards</p><p><ui-kbd>Space</ui-kbd> Reveal answer</p><p><ui-kbd>1–4</ui-kbd> Again · Hard · Good · Easy</p><p><ui-kbd shortcut="Primary+Z"></ui-kbd> Undo last review</p><p><ui-kbd>Escape</ui-kbd> Leave review</p></div>',
        "",
        "help",
      );
  }
  const sessionSeen = new Set<string>();
  let pendingImport: StudyCollection | undefined;
  root.addEventListener(
    "click",
    (event) => {
      if ((event.target as Element).closest(".study-notebook")) return;
      const target = (event.target as Element).closest<HTMLElement>("[data-action]");
      if (target && !target.hasAttribute("disabled"))
        void action(target.dataset.action!).catch((error) =>
          announce(error instanceof Error ? error.message : "Action could not be completed."),
        );
    },
    { signal },
  );
  root.addEventListener(
    "ui-menu-select",
    (event) => {
      if ((event.target as Element).closest(".study-topbar"))
        void action((event as CustomEvent<{ value: string }>).detail.value);
    },
    { signal },
  );
  root.addEventListener(
    "input",
    (event) => {
      if ((event.target as HTMLElement).id === "study-source-search") {
        sourceQuery = value("study-source-search");
        renderSourceResults();
      } else if ((event.target as HTMLElement).id === "study-search") {
        query = value("study-search");
        browserPage = 0;
        renderBrowserRows();
      }
    },
    { signal },
  );
  root.addEventListener(
    "ui-checkbox-change",
    (event) => {
      const target = event.target as HTMLElement;
      if (target.dataset.card) {
        const checked = (target as HTMLElement & { checked: boolean }).checked;
        if (checked) selected.add(target.dataset.card);
        else selected.delete(target.dataset.card);
        $("#study-browser-count").textContent =
          `${shownCards().length} cards · ${selected.size} selected`;
      }
    },
    { signal },
  );
  root.addEventListener(
    "ui-select-change",
    (event) => {
      const target = event.target as HTMLElement;
      if (target.id === "study-filter-deck") {
        deckId = value(target.id);
        browserPage = 0;
        selected.clear();
        renderBrowserRows();
        renderNav();
      } else if (target.id === "study-filter-status") {
        filter = value(target.id);
        browserPage = 0;
        renderBrowserRows();
      } else if (target.id === "study-note-kind") {
        collectDraft();
        noteEditor();
      }
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      if (view === "documents") return;
      const input = event
        .composedPath()
        .some(
          (el) =>
            el instanceof HTMLElement &&
            (el.matches("input,textarea,select") || el.isContentEditable),
        );
      if (event.key === "Escape" && !dialog.open && view === "review") {
        event.preventDefault();
        navigate("decks");
        return;
      }
      if (
        !dialog.open &&
        input &&
        view === "review" &&
        event.key === "Enter" &&
        (event.target as HTMLElement).id === "study-typed"
      ) {
        event.preventDefault();
        void action("reveal");
        return;
      }
      if (dialog.open || input) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void action("browse");
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void action("undo");
      } else if (event.key.toLowerCase() === "a" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        editNote();
      } else if (view === "review" && event.key === " " && !revealed) {
        event.preventDefault();
        void action("reveal");
      } else if (view === "review" && revealed && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        void action(`grade:${event.key}`);
      }
    },
    { signal },
  );
  $("#study-file").addEventListener(
    "change",
    async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      input.value = "";
      if (!file) return;
      try {
        if (file.size > 8_000_000) throw new Error("File exceeds 8 MB.");
        const text = await file.text();
        if (disposed) return;
        if (file.name.toLowerCase().endsWith(".json")) {
          pendingImport = parseStudy(text);
          openModal(
            "Replace your collection?",
            `<p>This backup contains ${pendingImport.decks.length} decks, ${pendingImport.notes.length} notes, and ${pendingImport.reviews.length} reviews. The current collection will be replaced.</p><p>Export your current collection first if you want to keep a copy.</p>`,
            btn("Replace collection", "confirm-import", "", "primary"),
            "import-confirm",
          );
        } else {
          const rows = parseDelimited(text);
          if (rows[0]?.[0]?.replace(/^\uFEFF/, "").toLowerCase() === "front") rows.shift();
          if (!rows.length || rows.length > 10000)
            throw new Error("Choose a text file with 1–10,000 notes.");
          const next = structuredClone(state);
          for (const [front, back, tags, deck, kind] of rows) {
            const type = (kind || "basic") as NoteKind;
            if (!front?.trim() || (!back?.trim() && type !== "cloze") || !(type in kindNames))
              throw new Error(
                "Each row needs a front, an answer (except cloze), and a supported type.",
              );
            let target = next.decks.find((d) => d.name === deck);
            if (!target) {
              target = deck ? makeDeck(deck) : next.decks[0]!;
              if (deck) next.decks.push(target);
            }
            const note = {
              ...makeNote(target.id),
              front,
              back: back ?? "",
              tags: (tags ?? "").split(/\s+/).filter(Boolean),
              kind: type,
            };
            if (!ordinals(note).length) throw new Error("A cloze note has no valid deletion.");
            next.notes.push(note);
            syncCards(next, note);
          }
          state = parseStudy(JSON.stringify(next));
          save();
          dialog.open = false;
          navigate("browse");
          announce(`${rows.length} notes imported.`);
        }
      } catch (error) {
        announce(error instanceof Error ? error.message : "Import failed.");
        $("#study-dialog-body").insertAdjacentHTML(
          "beforeend",
          `<p class="study-form-error" role="alert">${esc(error instanceof Error ? error.message : "Import failed.")}</p>`,
        );
      }
    },
    { signal },
  );
  $("#study-media").addEventListener(
    "change",
    async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      input.value = "";
      if (!file || !draft) return;
      if (file.size > 1_500_000) {
        announce("Choose media under 1.5 MB to keep the collection lightweight.");
        return;
      }
      if (!/^(image\/(png|jpeg|webp|gif)|audio\/(mpeg|mp3|wav|ogg|webm|mp4))$/.test(file.type)) {
        announce("Choose a supported image or audio file.");
        return;
      }
      const noteId = draft.id,
        reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          if (disposed || draft?.id !== noteId) return;
          collectDraft();
          if (file.type.startsWith("image")) draft.image = String(reader.result);
          else draft.audio = String(reader.result);
          noteEditor();
          announce("Media attached. Save the note to keep it.");
        },
        { once: true },
      );
      reader.readAsDataURL(file);
    },
    { signal },
  );
  subscribeNotebook(
    (next) => {
      notebook = next;
      // Source refreshes must not replace reviews saved by another open view.
      try {
        const saved = localStorage.getItem(studyKey);
        if (saved) state = parseStudy(saved);
      } catch {
        announce("Source changed. The saved collection could not be refreshed safely.");
        return;
      }
      let changed = false;
      for (const note of state.notes) {
        const block = sourceBlock(note);
        if (block && note.back !== documentBlockText(block)) {
          note.back = documentBlockText(block);
          changed = true;
        }
      }
      if (changed) save();
      if (draft?.source && modalMode === "note") {
        const block = sourceBlock(draft);
        if (block) {
          draft.back = documentBlockText(block);
          $<UITextarea>("#study-note-back").value = documentBlockText(block);
        }
      }
      if (view === "sources") renderSourceResults();
      else if (view === "browse") renderBrowserRows();
      else if (view === "review") {
        if ($<UIInput>("#study-typed")) typed = value("study-typed");
        renderReview();
        if ($<UIInput>("#study-typed")) $<UIInput>("#study-typed").value = typed;
      } else if (view === "decks" || view === "stats") render();
    },
    { signal },
  );
  const route = new URL(location.href).searchParams;
  const requestedDocument = route.get("document"),
    requestedBlock = route.get("block");
  if (requestedDocument) {
    sourceDocument = requestedDocument;
    sourceBlockId = requestedBlock || "";
    view = "sources";
    const target = notebook.documents.find((doc) => doc.id === requestedDocument);
    if (target && requestedBlock) {
      const blockIndex = target.blocks
        .filter((block) => documentBlockText(block).trim())
        .findIndex((block) => block.id === requestedBlock);
      if (blockIndex >= 0) sourceLimits.set(target.id, Math.max(12, blockIndex + 1));
    }
  }
  render();
  if (requestedDocument && requestedBlock) {
    const target = notebook.documents
      .find((doc) => doc.id === requestedDocument)
      ?.blocks.find((block) => block.id === requestedBlock);
    if (target)
      await action(
        `link:${encodeURIComponent(requestedDocument)}:${encodeURIComponent(requestedBlock)}`,
      );
    else announce("That source block is no longer available.");
  } else if (route.get("note")) {
    const noteId = route.get("note")!;
    if (state.notes.some((note) => note.id === noteId)) editNote(noteId);
    else announce("That note is no longer available.");
  }
  return () => {
    disposed = true;
    documentVersion++;
    documentCleanup?.();
    controller.abort();
    root.replaceChildren();
    root.classList.remove("study-app", "study-mobile-nav");
  };
}
