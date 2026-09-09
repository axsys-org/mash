import { applyStageUtilityRecipes } from "./application-recipes.js";
import {
  createStudySchedule,
  previewStudyRatings,
  scheduleStudyCard,
  type StudyCardState,
  type StudyRating,
  type StudySchedule,
} from "./study-scheduler.js";

interface StudyCardRecord {
  back: string;
  deck: string;
  front: string;
  id: string;
  mediaName?: string;
  note: string;
  schedule: StudySchedule;
  suspended: boolean;
  tags: string[];
  type: "basic" | "cloze";
}

interface StudyHistoryEntry {
  card: StudyCardRecord;
  reviewedAt: number;
  sessionAgain: number;
  sessionDurations: number[];
  sessionReviewed: number;
}

interface StudyFileUploadChangeDetail {
  files: File[];
}

type ValueElement = HTMLElement & {
  disabled?: boolean;
  open?: boolean;
  value: string;
};

const storageKey = "mash.study-workspace.v1";
const allDecks = "all";

function stateSchedule(
  state: StudyCardState,
  dueOffsetDays: number,
  intervalDays: number,
  repetitions: number,
  ease = 2.5,
): StudySchedule {
  return {
    dueAt: Date.now() + dueOffsetDays * 86_400_000,
    ease,
    intervalDays,
    lapses: 0,
    repetitions,
    state,
  };
}

function seedCards(): StudyCardRecord[] {
  return [
    {
      id: "study-custom-properties",
      deck: "Design systems",
      type: "basic",
      front: "Why are CSS custom properties useful across Shadow DOM boundaries?",
      back: "They participate in the cascade, so a host can supply semantic values that descendants consume without reaching into private shadow anatomy.",
      note: "Keep the public value contract on the host; reserve parts for structural styling.",
      tags: ["css", "tokens"],
      suspended: false,
      schedule: stateSchedule("review", -1, 8, 4),
    },
    {
      id: "study-composition",
      deck: "Design systems",
      type: "cloze",
      front:
        "A durable component owns {{behavior and semantics}}, while its host owns {{placement and product workflow}}.",
      back: "Behavior and semantics belong to the component. Placement and product workflow belong to the host composition.",
      note: "This boundary keeps fragments portable across document and canvas projections.",
      tags: ["architecture", "components"],
      suspended: false,
      schedule: stateSchedule("learning", 0, 0, 1),
    },
    {
      id: "study-selection-focus",
      deck: "Design systems",
      type: "basic",
      front: "What is the difference between selection and focus in an editor?",
      back: "Selection is application state describing the active content range or objects. Focus identifies the element currently receiving keyboard input.",
      note: "They may coincide, but collapsing them produces noisy focus rings and brittle keyboard behavior.",
      tags: ["accessibility", "editing"],
      suspended: false,
      schedule: stateSchedule("new", 0, 0, 0),
    },
    {
      id: "study-mitochondria",
      deck: "Biology",
      type: "basic",
      front: "Which membrane houses the electron transport chain in mitochondria?",
      back: "The inner mitochondrial membrane.",
      note: "Its folds, called cristae, increase the available surface area.",
      tags: ["cell-biology"],
      suspended: false,
      schedule: stateSchedule("review", -2, 14, 5, 2.65),
    },
    {
      id: "study-action-potential",
      deck: "Biology",
      type: "cloze",
      front:
        "During depolarization, voltage-gated {{sodium channels}} open and Na⁺ moves into the neuron.",
      back: "Voltage-gated sodium channels open during depolarization.",
      note: "Potassium channels dominate repolarization.",
      tags: ["neuroscience"],
      suspended: false,
      schedule: stateSchedule("new", 0, 0, 0),
    },
    {
      id: "study-french-venir",
      deck: "French",
      type: "basic",
      front: "Conjugate venir for nous in the present tense.",
      back: "Nous venons.",
      note: "The stem changes, but the first-person plural keeps the -ons ending.",
      tags: ["verbs", "present"],
      suspended: false,
      schedule: stateSchedule("review", 0, 5, 3, 2.35),
    },
    {
      id: "study-french-depuis",
      deck: "French",
      type: "basic",
      front:
        "Which word expresses an action that began in the past and still continues: pendant or depuis?",
      back: "Depuis.",
      note: "Use pendant for a completed duration.",
      tags: ["grammar"],
      suspended: false,
      schedule: stateSchedule("review", 3, 12, 4),
    },
  ];
}

function cloneCard(card: StudyCardRecord): StudyCardRecord {
  return {
    ...card,
    schedule: { ...card.schedule },
    tags: [...card.tags],
  };
}

function pathElement(event: Event, selector: string): HTMLElement | null {
  return (
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(selector)) ??
    null
  );
}

function setText(root: ParentNode, selector: string, text: string): void {
  const target = root.querySelector<HTMLElement>(selector);
  if (target) target.textContent = text;
}

function setValue(root: ParentNode, selector: string, value: string): void {
  const target = root.querySelector<ValueElement>(selector);
  if (target) target.value = value;
}

function stateLabel(state: StudyCardState): string {
  if (state === "relearning") return "Relearning";
  return `${state.charAt(0).toUpperCase()}${state.slice(1)}`;
}

class StudyWorkspace {
  readonly #root: HTMLElement;
  readonly #history: StudyHistoryEntry[] = [];
  #cards: StudyCardRecord[];
  #selectedDeck = allDecks;
  #currentCardId: string | null = null;
  #editingCardId: string | null = null;
  #answerVisible = false;
  #mode: "browse" | "review" = "review";
  #sessionReviewed = 0;
  #sessionAgain = 0;
  #sessionDurations: number[] = [];
  #shownAt = Date.now();
  #browserQuery = "";

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#cards = this.#loadCards();
    this.#currentCardId = this.#queue()[0]?.id ?? null;
    root.addEventListener("click", this.#onClick);
    root.addEventListener("input", this.#onInput);
    root.addEventListener("submit", this.#onSubmit);
    root.addEventListener("keydown", this.#onKeydown);
    root.addEventListener("ui-toggle-group-change", this.#onModeChange);
    root.addEventListener("ui-file-upload-change", this.#onFileUploadChange);
    this.#sync();
  }

  destroy(): void {
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("input", this.#onInput);
    this.#root.removeEventListener("submit", this.#onSubmit);
    this.#root.removeEventListener("keydown", this.#onKeydown);
    this.#root.removeEventListener("ui-toggle-group-change", this.#onModeChange);
    this.#root.removeEventListener("ui-file-upload-change", this.#onFileUploadChange);
  }

  #loadCards(): StudyCardRecord[] {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return seedCards();
      const value: unknown = JSON.parse(stored);
      if (!Array.isArray(value) || value.length === 0) return seedCards();
      return value.filter(
        (card): card is StudyCardRecord =>
          typeof card === "object" &&
          card !== null &&
          typeof (card as StudyCardRecord).id === "string" &&
          typeof (card as StudyCardRecord).front === "string" &&
          typeof (card as StudyCardRecord).back === "string",
      );
    } catch {
      return seedCards();
    }
  }

  #persist(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.#cards));
    } catch {
      this.#status("Changes are available for this session only.");
    }
  }

  #matchesDeck(card: StudyCardRecord): boolean {
    return this.#selectedDeck === allDecks || card.deck === this.#selectedDeck;
  }

  #queue(): StudyCardRecord[] {
    const now = Date.now();
    return this.#cards
      .filter((card) => !card.suspended && this.#matchesDeck(card) && card.schedule.dueAt <= now)
      .sort((left, right) => left.schedule.dueAt - right.schedule.dueAt);
  }

  #currentCard(): StudyCardRecord | null {
    return this.#cards.find((card) => card.id === this.#currentCardId) ?? null;
  }

  #status(message: string): void {
    const output = this.#root.querySelector<HTMLOutputElement>("[data-study-status]");
    if (output) output.value = message;
  }

  #setMode(mode: "browse" | "review"): void {
    this.#mode = mode;
    const group = this.#root.querySelector<ValueElement>("[data-study-mode]");
    if (group) group.value = mode;
    for (const view of this.#root.querySelectorAll<HTMLElement>("[data-study-view]")) {
      view.hidden = view.dataset.studyView !== mode;
    }
    if (mode === "browse" && !this.#editingCardId) {
      this.#editingCardId = this.#currentCardId ?? this.#filteredCards()[0]?.id ?? null;
      this.#populateEditor();
    }
    this.#status(mode === "review" ? "Review mode." : "Browse and edit mode.");
  }

  #filteredCards(): StudyCardRecord[] {
    const query = this.#browserQuery.trim().toLocaleLowerCase();
    return this.#cards.filter((card) => {
      if (!this.#matchesDeck(card)) return false;
      if (!query) return true;
      return [card.front, card.back, card.deck, card.note, ...card.tags].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    });
  }

  #renderDecks(): void {
    const container = this.#root.querySelector<HTMLElement>("[data-study-decks]");
    if (!container) return;
    const decks = [allDecks, ...new Set(this.#cards.map((card) => card.deck))];
    container.replaceChildren();
    for (const deck of decks) {
      const due = this.#cards.filter(
        (card) =>
          !card.suspended &&
          (deck === allDecks || card.deck === deck) &&
          card.schedule.dueAt <= Date.now(),
      ).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "example-study-deck";
      button.dataset.studyDeck = deck;
      button.setAttribute("aria-current", this.#selectedDeck === deck ? "page" : "false");
      const icon = document.createElement("ui-icon");
      icon.setAttribute("name", deck === allDecks ? "object.layers" : "object.folder");
      icon.setAttribute("label", "");
      const label = document.createElement("span");
      label.textContent = deck === allDecks ? "All decks" : deck;
      const count = document.createElement("span");
      count.className = "example-study-deck-count";
      count.textContent = String(due);
      button.append(icon, label, count);
      container.append(button);
    }
    applyStageUtilityRecipes(container);
  }

  #renderCloze(target: HTMLElement, text: string, revealed: boolean): void {
    target.replaceChildren();
    const pattern = /\{\{([^}]+)\}\}/g;
    let index = 0;
    for (const match of text.matchAll(pattern)) {
      target.append(document.createTextNode(text.slice(index, match.index)));
      const cloze = document.createElement("mark");
      cloze.className = "example-study-cloze";
      cloze.textContent = revealed ? (match[1] ?? "") : "…";
      target.append(cloze);
      index = (match.index ?? 0) + match[0].length;
    }
    target.append(document.createTextNode(text.slice(index)));
    applyStageUtilityRecipes(target);
  }

  #syncReviewCard(): void {
    const queue = this.#queue();
    if (!this.#currentCardId || !queue.some((card) => card.id === this.#currentCardId)) {
      this.#currentCardId = queue[0]?.id ?? null;
      this.#answerVisible = false;
      this.#shownAt = Date.now();
    }
    const card = this.#currentCard();
    const cardSurface = this.#root.querySelector<HTMLElement>("[data-study-card]");
    const controls = this.#root.querySelector<HTMLElement>(".example-study-review-controls");
    const complete = this.#root.querySelector<HTMLElement>("[data-study-complete]");
    if (cardSurface) cardSurface.hidden = !card;
    if (controls) controls.hidden = !card;
    if (complete) complete.hidden = Boolean(card);
    if (!card) return;

    setText(this.#root, "[data-study-card-state]", stateLabel(card.schedule.state));
    setText(this.#root, "[data-study-card-deck]", card.deck);
    const front = this.#root.querySelector<HTMLElement>("[data-study-front]");
    const back = this.#root.querySelector<HTMLElement>("[data-study-back]");
    if (front) {
      if (card.type === "cloze") this.#renderCloze(front, card.front, false);
      else front.textContent = card.front;
    }
    if (back) {
      if (card.type === "cloze") this.#renderCloze(back, card.front, true);
      else back.textContent = card.back;
    }
    setText(this.#root, "[data-study-note]", card.note);
    const tags = this.#root.querySelector<HTMLElement>("[data-study-tags]");
    if (tags) {
      tags.replaceChildren(
        ...card.tags.map((tag) => {
          const badge = document.createElement("ui-badge");
          badge.setAttribute("size", "small");
          badge.textContent = tag;
          return badge;
        }),
      );
    }
    const reveal = this.#root.querySelector<ValueElement>("[data-study-answer-reveal]");
    if (reveal) reveal.open = this.#answerVisible;
    const revealButton = this.#root.querySelector<HTMLElement>("[data-study-action='reveal']");
    const ratings = this.#root.querySelector<HTMLElement>("[data-study-ratings]");
    if (revealButton) revealButton.hidden = this.#answerVisible;
    if (ratings) {
      ratings.hidden = !this.#answerVisible;
      if (this.#answerVisible) {
        if (matchMedia("(max-width: 40rem)").matches) {
          reveal?.addEventListener(
            "mash-reveal-end",
            () => cardSurface?.scrollTo({ top: cardSurface.scrollHeight }),
            { once: true },
          );
        } else requestAnimationFrame(() => ratings.scrollIntoView({ block: "nearest" }));
      }
    }
    for (const preview of previewStudyRatings(card.schedule)) {
      setText(this.#root, `[data-study-rating-interval='${preview.rating}']`, preview.label);
    }
  }

  #renderCardList(): void {
    const container = this.#root.querySelector<HTMLElement>("[data-study-card-list]");
    if (!container) return;
    const cards = this.#filteredCards();
    setText(this.#root, "[data-study-browser-count]", `${cards.length} cards`);
    container.replaceChildren();
    for (const card of cards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "example-study-card-row";
      button.dataset.studyCardRow = card.id;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(this.#editingCardId === card.id));
      const body = document.createElement("span");
      body.className = "example-study-card-row-body";
      const front = document.createElement("strong");
      front.textContent = card.front.replaceAll(/\{\{|\}\}/g, "");
      const meta = document.createElement("small");
      meta.textContent = `${card.deck} · ${card.tags.join(" · ") || "untagged"}`;
      body.append(front, meta);
      const state = document.createElement("span");
      state.className = "example-study-card-row-state";
      state.textContent = card.suspended ? "Suspended" : stateLabel(card.schedule.state);
      button.append(body, state);
      container.append(button);
    }
    if (cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "example-study-empty";
      empty.textContent = "No cards match this view.";
      container.append(empty);
    }
    applyStageUtilityRecipes(container);
  }

  #populateEditor(): void {
    const card = this.#cards.find((candidate) => candidate.id === this.#editingCardId);
    const isNew = this.#editingCardId === "new";
    const draft = card ?? {
      deck: this.#selectedDeck === allDecks ? "Design systems" : this.#selectedDeck,
      type: "basic" as const,
      front: "",
      back: "",
      tags: [],
    };
    setText(this.#root, "[data-study-editor-title]", isNew ? "New card" : "Edit card");
    setText(
      this.#root,
      "[data-study-editor-state]",
      isNew ? "Unsaved" : stateLabel(card?.schedule.state ?? "new"),
    );
    setValue(this.#root, "[data-study-field='type']", draft.type);
    setValue(this.#root, "[data-study-field='front']", draft.front);
    setValue(this.#root, "[data-study-field='back']", draft.back);
    setValue(this.#root, "[data-study-field='deck']", draft.deck);
    setValue(this.#root, "[data-study-field='tags']", draft.tags.join(", "));
  }

  #syncStats(): void {
    const queue = this.#queue();
    const stateCounts = new Map<StudyCardState, number>();
    for (const card of queue) {
      stateCounts.set(card.schedule.state, (stateCounts.get(card.schedule.state) ?? 0) + 1);
    }
    setText(this.#root, "[data-study-count='new']", String(stateCounts.get("new") ?? 0));
    setText(
      this.#root,
      "[data-study-count='learning']",
      String((stateCounts.get("learning") ?? 0) + (stateCounts.get("relearning") ?? 0)),
    );
    setText(this.#root, "[data-study-count='review']", String(stateCounts.get("review") ?? 0));
    setText(this.#root, "[data-study-reviewed]", String(this.#sessionReviewed));
    setText(this.#root, "[data-study-again]", String(this.#sessionAgain));
    const average = this.#sessionDurations.length
      ? Math.max(
          1,
          Math.round(
            this.#sessionDurations.reduce((sum, duration) => sum + duration, 0) /
              this.#sessionDurations.length /
              1000,
          ),
        )
      : 0;
    setText(this.#root, "[data-study-average]", `${average}s`);
    const retention = this.#sessionReviewed
      ? Math.round(((this.#sessionReviewed - this.#sessionAgain) / this.#sessionReviewed) * 100)
      : 91;
    setText(this.#root, "[data-study-retention]", `${retention}%`);
    const meter = this.#root.querySelector<ValueElement>("ui-meter");
    if (meter) meter.value = String(retention);
    const progress = this.#root.querySelector<ValueElement>("[data-study-progress]");
    const total = queue.length + this.#sessionReviewed;
    if (progress) {
      progress.setAttribute("max", String(Math.max(1, total)));
      progress.value = String(this.#sessionReviewed);
    }
    setText(
      this.#root,
      "[data-study-position]",
      queue.length ? `Card ${this.#sessionReviewed + 1} of ${total}` : "Session complete",
    );
    setText(
      this.#root,
      "[data-study-session-copy]",
      `${this.#sessionReviewed} reviewed this session`,
    );
    setText(this.#root, "[data-study-due-summary]", `${queue.length} due now`);
    const undo = this.#root.querySelector<ValueElement>("[data-study-action='undo']");
    if (undo) undo.disabled = this.#history.length === 0;
  }

  #sync(): void {
    const title = this.#selectedDeck === allDecks ? "Today" : this.#selectedDeck;
    setText(this.#root, "[data-study-deck-title]", title);
    setText(
      this.#root,
      "[data-study-deck-path]",
      this.#selectedDeck === allDecks ? "All decks" : "Deck",
    );
    this.#renderDecks();
    this.#syncReviewCard();
    this.#renderCardList();
    this.#syncStats();
  }

  #revealAnswer(): void {
    if (!this.#currentCard() || this.#answerVisible) return;
    this.#answerVisible = true;
    this.#syncReviewCard();
    this.#status("Answer revealed. Choose a rating from Again to Easy.");
    requestAnimationFrame(() =>
      this.#root.querySelector<HTMLElement>("[data-study-rating='again']")?.focus(),
    );
  }

  #rate(rating: StudyRating): void {
    const card = this.#currentCard();
    if (!card || !this.#answerVisible) return;
    this.#history.push({
      card: cloneCard(card),
      reviewedAt: Date.now(),
      sessionAgain: this.#sessionAgain,
      sessionDurations: [...this.#sessionDurations],
      sessionReviewed: this.#sessionReviewed,
    });
    if (this.#history.length > 30) this.#history.shift();
    card.schedule = scheduleStudyCard(card.schedule, rating);
    this.#sessionReviewed += 1;
    if (rating === "again") this.#sessionAgain += 1;
    this.#sessionDurations.push(Date.now() - this.#shownAt);
    this.#currentCardId = null;
    this.#answerVisible = false;
    this.#shownAt = Date.now();
    this.#persist();
    this.#sync();
    this.#status(`${rating.charAt(0).toUpperCase()}${rating.slice(1)} recorded.`);
    this.#root.focus();
  }

  #undo(): void {
    const entry = this.#history.pop();
    if (!entry) return;
    const index = this.#cards.findIndex((card) => card.id === entry.card.id);
    if (index >= 0) this.#cards[index] = cloneCard(entry.card);
    this.#sessionAgain = entry.sessionAgain;
    this.#sessionDurations = [...entry.sessionDurations];
    this.#sessionReviewed = entry.sessionReviewed;
    this.#currentCardId = entry.card.id;
    this.#answerVisible = false;
    this.#shownAt = Date.now();
    this.#persist();
    this.#sync();
    this.#status("Last review restored.");
    this.#root.focus();
  }

  #beginEdit(cardId: string | null): void {
    this.#editingCardId = cardId ?? "new";
    this.#setMode("browse");
    this.#populateEditor();
    this.#renderCardList();
    this.#root.querySelector<ValueElement>("[data-study-field='front']")?.focus();
  }

  #saveEditor(): void {
    const front = this.#root
      .querySelector<ValueElement>("[data-study-field='front']")
      ?.value.trim();
    const back = this.#root.querySelector<ValueElement>("[data-study-field='back']")?.value.trim();
    if (!front || !back) {
      this.#status("Front and back are required.");
      this.#root.querySelector<ValueElement>("[data-study-field='front']")?.focus();
      return;
    }
    const type = this.#root.querySelector<ValueElement>("[data-study-field='type']")?.value;
    const deck = this.#root.querySelector<ValueElement>("[data-study-field='deck']")?.value;
    const tags = this.#root.querySelector<ValueElement>("[data-study-field='tags']")?.value ?? "";
    const existing = this.#cards.find((card) => card.id === this.#editingCardId);
    if (existing) {
      existing.front = front;
      existing.back = back;
      existing.type = type === "cloze" ? "cloze" : "basic";
      existing.deck = deck || existing.deck;
      existing.tags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      this.#status("Card saved.");
    } else {
      const card: StudyCardRecord = {
        id: `study-${Date.now().toString(36)}`,
        deck: deck || "Design systems",
        type: type === "cloze" ? "cloze" : "basic",
        front,
        back,
        note: "",
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        suspended: false,
        schedule: createStudySchedule(),
      };
      this.#cards.unshift(card);
      this.#editingCardId = card.id;
      this.#currentCardId ??= card.id;
      this.#status("Card created and added to today’s queue.");
    }
    this.#persist();
    this.#sync();
    this.#populateEditor();
  }

  #suspendCurrent(): void {
    const card = this.#currentCard();
    if (!card) return;
    card.suspended = true;
    this.#currentCardId = null;
    this.#answerVisible = false;
    this.#persist();
    this.#sync();
    this.#status("Card suspended.");
    this.#root.focus();
  }

  #deleteEditingCard(): void {
    if (!this.#editingCardId || this.#editingCardId === "new") return;
    const index = this.#cards.findIndex((card) => card.id === this.#editingCardId);
    if (index < 0) return;
    this.#cards.splice(index, 1);
    this.#editingCardId = this.#filteredCards()[0]?.id ?? null;
    this.#currentCardId = this.#queue()[0]?.id ?? null;
    this.#persist();
    this.#sync();
    this.#populateEditor();
    this.#status("Card deleted.");
  }

  #onClick = (event: Event): void => {
    const modeToggle = pathElement(event, "[data-study-mode] ui-toggle");
    const mode = modeToggle?.getAttribute("value");
    if (mode === "review" || mode === "browse") {
      this.#setMode(mode);
      return;
    }
    const deck = pathElement(event, "[data-study-deck]")?.dataset.studyDeck;
    if (deck) {
      this.#selectedDeck = deck;
      this.#currentCardId = this.#queue()[0]?.id ?? null;
      this.#editingCardId = null;
      this.#answerVisible = false;
      this.#shownAt = Date.now();
      this.#sync();
      this.#status(deck === allDecks ? "Showing all decks." : `${deck} selected.`);
      return;
    }
    const row = pathElement(event, "[data-study-card-row]")?.dataset.studyCardRow;
    if (row) {
      this.#editingCardId = row;
      this.#populateEditor();
      this.#renderCardList();
      return;
    }
    const rating = pathElement(event, "[data-study-rating]")?.dataset.studyRating as
      StudyRating | undefined;
    if (rating) {
      this.#rate(rating);
      return;
    }
    const action = pathElement(event, "[data-study-action]")?.dataset.studyAction;
    if (!action) return;
    if (action === "reveal") this.#revealAnswer();
    else if (action === "undo") this.#undo();
    else if (action === "new-card") this.#beginEdit(null);
    else if (action === "edit-current") this.#beginEdit(this.#currentCardId);
    else if (action === "suspend-current") this.#suspendCurrent();
    else if (action === "delete-card") this.#deleteEditingCard();
    else if (action === "cancel-edit") this.#populateEditor();
    else if (action === "browse") this.#setMode("browse");
    else if (action === "reset") {
      this.#cards = seedCards();
      this.#history.length = 0;
      this.#sessionAgain = 0;
      this.#sessionDurations = [];
      this.#sessionReviewed = 0;
      this.#selectedDeck = allDecks;
      this.#currentCardId = this.#queue()[0]?.id ?? null;
      this.#persist();
      this.#sync();
      this.#status("Study data reset.");
    }
  };

  #onInput = (event: Event): void => {
    const target = pathElement(
      event,
      "[data-study-search], [data-study-browser-search]",
    ) as ValueElement | null;
    if (!target) return;
    const query = target.value;
    const sidebarSearch = target.matches("[data-study-search]");
    if (sidebarSearch) {
      this.#browserQuery = query;
      if (query) this.#setMode("browse");
      const browserSearch = this.#root.querySelector<ValueElement>("[data-study-browser-search]");
      if (browserSearch) browserSearch.value = query;
    } else {
      this.#browserQuery = query;
    }
    this.#renderCardList();
  };

  #onSubmit = (event: Event): void => {
    if (!pathElement(event, "[data-study-editor]")) return;
    event.preventDefault();
    this.#saveEditor();
  };

  #onModeChange = (event: Event): void => {
    const group = pathElement(event, "[data-study-mode]");
    if (!group) return;
    const values = (event as CustomEvent<{ values: string[] }>).detail.values;
    const mode = values[0];
    if (mode === "review" || mode === "browse") this.#setMode(mode);
  };

  #onFileUploadChange = (event: Event): void => {
    if (!pathElement(event, "[data-study-media-upload]")) return;
    const detail = (event as CustomEvent<StudyFileUploadChangeDetail>).detail;
    const file = detail.files[0];
    if (!file) return;
    const card = this.#cards.find((candidate) => candidate.id === this.#editingCardId);
    if (card) {
      card.mediaName = file.name;
      this.#persist();
    }
    this.#status(`${file.name} attached to this card.`);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const editable = event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          (node.matches(
            "input, textarea, select, [contenteditable='true'], ui-input, ui-textarea, ui-select",
          ) ||
            node.closest("ui-input, ui-textarea, ui-select")),
      );
    if (editable) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "z") {
      event.preventDefault();
      this.#undo();
      return;
    }
    if (this.#mode !== "review") return;
    if ((event.key === " " || event.key === "Enter") && !this.#answerVisible) {
      event.preventDefault();
      this.#revealAnswer();
      return;
    }
    const rating = ({ "1": "again", "2": "hard", "3": "good", "4": "easy" } as const)[
      event.key as "1" | "2" | "3" | "4"
    ];
    if (rating && this.#answerVisible) {
      event.preventDefault();
      this.#rate(rating);
    } else if (event.key.toLocaleLowerCase() === "e") {
      event.preventDefault();
      this.#beginEdit(this.#currentCardId);
    } else if (event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      this.#suspendCurrent();
    }
  };
}

const studyWorkspaces = new Map<HTMLElement, StudyWorkspace>();

function reconcileStudyWorkspaces(): void {
  for (const [root, workspace] of studyWorkspaces) {
    if (!root.isConnected) {
      workspace.destroy();
      studyWorkspaces.delete(root);
    }
  }
  for (const root of document.querySelectorAll<HTMLElement>("[data-catalog-study-workspace]")) {
    if (!studyWorkspaces.has(root)) studyWorkspaces.set(root, new StudyWorkspace(root));
  }
}

const studyWorkspaceObserver = new MutationObserver(reconcileStudyWorkspaces);

function observeStudyWorkspaces(): void {
  studyWorkspaceObserver.observe(document.documentElement, { childList: true, subtree: true });
  reconcileStudyWorkspaces();
}

if (document.documentElement) observeStudyWorkspaces();
else document.addEventListener("DOMContentLoaded", observeStudyWorkspaces, { once: true });

const studyWorkspaceHot = (
  import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }
).hot;
studyWorkspaceHot?.dispose(() => {
  studyWorkspaceObserver.disconnect();
  for (const workspace of studyWorkspaces.values()) workspace.destroy();
  studyWorkspaces.clear();
});
