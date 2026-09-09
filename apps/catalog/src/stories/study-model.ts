export const studyKey = "mash-study-v1";
export const day = 86_400_000;
export type NoteKind = "basic" | "reverse" | "cloze" | "typed";
export type Grade = 1 | 2 | 3 | 4;
export interface StudyDeck {
  id: string;
  name: string;
  description: string;
  newLimit: number;
  reviewLimit: number;
  burySiblings: boolean;
}
export interface StudyNote {
  id: string;
  deck: string;
  kind: NoteKind;
  front: string;
  back: string;
  extra: string;
  tags: string[];
  source?: { document: string; block: string };
  image: string;
  audio: string;
  created: number;
}
export interface StudyCard {
  id: string;
  note: string;
  ordinal: number;
  state: "new" | "learning" | "review" | "relearning";
  due: number;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  suspended: boolean;
  buried: number;
  flag: boolean;
}
export interface Review {
  card: string;
  at: number;
  grade: Grade;
  ms: number;
  previous: StudyCard;
  siblings: Array<{ id: string; buried: number }>;
}
export interface StudyCollection {
  version: 1;
  decks: StudyDeck[];
  notes: StudyNote[];
  cards: StudyCard[];
  reviews: Review[];
  template: { front: string; back: string; font: "sans" | "serif"; align: "center" | "left" };
}
export const uid = (): string => crypto.randomUUID();
export function makeDeck(name: string): StudyDeck {
  return {
    id: uid(),
    name,
    description: "A little practice, a lasting understanding.",
    newLimit: 20,
    reviewLimit: 200,
    burySiblings: true,
  };
}
export function makeNote(deck: string): StudyNote {
  return {
    id: uid(),
    deck,
    kind: "basic",
    front: "",
    back: "",
    extra: "",
    tags: [],
    image: "",
    audio: "",
    created: Date.now(),
  };
}
export function ordinals(note: StudyNote): number[] {
  if (note.kind === "cloze")
    return [
      ...new Set([...note.front.matchAll(/\{\{c(\d+)::([^{}]+?)\}\}/g)].map((m) => Number(m[1]))),
    ]
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
  return note.kind === "reverse" ? [0, 1] : [0];
}
export function syncCards(state: StudyCollection, note: StudyNote): void {
  const keys = ordinals(note);
  state.cards = state.cards.filter((card) => card.note !== note.id || keys.includes(card.ordinal));
  for (const ordinal of keys)
    if (!state.cards.some((c) => c.note === note.id && c.ordinal === ordinal))
      state.cards.push({
        id: uid(),
        note: note.id,
        ordinal,
        state: "new",
        due: 0,
        interval: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        suspended: false,
        buried: 0,
        flag: false,
      });
}
export function sides(
  note: StudyNote,
  card: Pick<StudyCard, "ordinal">,
): { front: string; back: string } {
  if (note.kind === "cloze")
    return {
      front: note.front.replace(/\{\{c(\d+)::([^{}]+?)\}\}/g, (_s, n: string, body: string) =>
        Number(n) === card.ordinal ? `[${body.split("::")[1] || "…"}]` : body.split("::")[0]!,
      ),
      back: note.front.replace(
        /\{\{c\d+::([^{}]+?)\}\}/g,
        (_s, body: string) => body.split("::")[0]!,
      ),
    };
  return note.kind === "reverse" && card.ordinal === 1
    ? { front: note.back, back: note.front }
    : { front: note.front, back: note.back };
}
export function midnight(now: number): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
export function tomorrow(now: number): number {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}
export function deckIds(state: StudyCollection, id: string): Set<string> {
  const name = state.decks.find((d) => d.id === id)?.name;
  return new Set(
    state.decks
      .filter((d) => !id || d.id === id || (name && d.name.startsWith(name + "::")))
      .map((d) => d.id),
  );
}
export function queue(
  state: StudyCollection,
  id = "",
  now = Date.now(),
  ahead = false,
): StudyCard[] {
  const decks = deckIds(state, id),
    today = midnight(now);
  const notes = new Map(state.notes.map((note) => [note.id, note]));
  const byDeck = new Map(state.decks.map((deck) => [deck.id, deck]));
  const counts = new Map(
    state.decks.map((deck) => [deck.id, { fresh: new Set<string>(), review: new Set<string>() }]),
  );
  for (const log of state.reviews) {
    if (log.at < today) continue;
    const deck = notes.get(log.previous.note)?.deck,
      count = deck ? counts.get(deck) : undefined;
    if (log.previous.state === "new") count?.fresh.add(log.card);
    if (log.previous.state === "review") count?.review.add(log.card);
  }
  const remaining = new Map(
    state.decks.map((deck) => [
      deck.id,
      {
        fresh: deck.newLimit - counts.get(deck.id)!.fresh.size,
        review: deck.reviewLimit - counts.get(deck.id)!.review.size,
      },
    ]),
  );
  return state.cards
    .filter((card) => {
      const note = notes.get(card.note);
      return (
        note &&
        decks.has(note.deck) &&
        !card.suspended &&
        card.buried <= now &&
        (ahead || card.state === "new" || card.due <= now)
      );
    })
    .sort((a, b) => Number(a.state === "new") - Number(b.state === "new") || a.due - b.due)
    .filter((card) => {
      if (ahead || card.state === "learning" || card.state === "relearning") return true;
      const deck = byDeck.get(notes.get(card.note)!.deck)!,
        count = remaining.get(deck.id)!;
      return card.state === "new" ? count.fresh-- > 0 : count.review-- > 0;
    });
}
/** A small, explicit interval scheduler. Learning steps are 1 and 10 minutes; review intervals are days. */
export function scheduled(card: StudyCard, grade: Grade, now: number): StudyCard {
  const next = { ...card, reps: card.reps + 1 };
  if (grade === 1) {
    next.state = card.state === "new" || card.state === "learning" ? "learning" : "relearning";
    next.due = now + 60_000;
    next.interval = 0;
    next.ease = Math.max(1.3, card.ease - 0.2);
    if (card.state === "review") next.lapses++;
  } else if (card.state !== "review" && grade === 2) {
    next.state = card.state === "relearning" ? "relearning" : "learning";
    next.due = now + 600_000;
    next.interval = 0;
  } else {
    next.state = "review";
    next.interval =
      card.state !== "review"
        ? grade === 4
          ? 4
          : 1
        : Math.max(
            card.interval + 1,
            Math.round(
              card.interval * (grade === 2 ? 1.2 : grade === 3 ? card.ease : card.ease * 1.3),
            ),
          );
    next.ease = Math.max(1.3, card.ease + (grade === 2 ? -0.15 : grade === 4 ? 0.15 : 0));
    next.due = now + next.interval * day;
  }
  return next;
}
export function reviewCard(
  state: StudyCollection,
  card: StudyCard,
  grade: Grade,
  ms: number,
  now = Date.now(),
): void {
  const note = state.notes.find((n) => n.id === card.note)!,
    deck = state.decks.find((d) => d.id === note.deck)!;
  const siblings = deck.burySiblings
    ? state.cards
        .filter((c) => c.note === card.note && c.id !== card.id && !c.suspended)
        .map((c) => ({ id: c.id, buried: c.buried }))
    : [];
  state.reviews.push({
    card: card.id,
    at: now,
    grade,
    ms: Math.min(3_600_000, Math.max(0, ms)),
    previous: { ...card },
    siblings,
  });
  Object.assign(card, scheduled(card, grade, now));
  for (const sibling of siblings)
    state.cards.find((c) => c.id === sibling.id)!.buried = tomorrow(now);
}
export function undoReview(state: StudyCollection): string | undefined {
  const log = state.reviews.pop();
  if (!log) return;
  const card = state.cards.find((c) => c.id === log.card);
  if (card) Object.assign(card, log.previous);
  for (const sibling of log.siblings) {
    const item = state.cards.find((c) => c.id === sibling.id);
    if (item) item.buried = sibling.buried;
  }
  return card?.id;
}
export function intervalLabel(card: StudyCard, grade: Grade, now = Date.now()): string {
  const next = scheduled(card, grade, now);
  return next.interval ? `${next.interval}d` : `${Math.round((next.due - now) / 60_000)}m`;
}
export function seedStudy(): StudyCollection {
  const decks = [
    makeDeck("Design foundations"),
    makeDeck("Design foundations::Typography"),
    makeDeck("Everyday French"),
    makeDeck("Natural world"),
  ];
  const state: StudyCollection = {
    version: 1,
    decks,
    notes: [],
    cards: [],
    reviews: [],
    template: { front: "{{Front}}", back: "{{Back}}", font: "serif", align: "center" },
  };
  const examples: [number, string, string, string, NoteKind][] = [
    [
      0,
      "What makes an interface feel calm?",
      "A clear hierarchy, generous negative space, and a small number of meaningful choices.",
      "visual-hierarchy",
      "basic",
    ],
    [0, "Recognition is easier than {{c1::recall}}.", "", "cognition", "cloze"],
    [
      0,
      "What is progressive disclosure?",
      "Showing the essentials first, then revealing detail when someone needs it.",
      "interaction",
      "basic",
    ],
    [
      0,
      "What does a signifier communicate?",
      "Where an action is possible and how to perform it.",
      "interaction",
      "basic",
    ],
    [
      0,
      "A design system gives a team a shared {{c1::language}} and reusable {{c2::decisions}}.",
      "",
      "systems",
      "cloze",
    ],
    [
      1,
      "What is the difference between tracking and kerning?",
      "Tracking adjusts spacing across a run of letters. Kerning adjusts space between a specific pair.",
      "type",
      "basic",
    ],
    [1, "The height of a lowercase x is called the…", "x-height", "type", "typed"],
    [
      1,
      "What is a comfortable line length for body text?",
      "Roughly 45–75 characters, depending on the typeface and context.",
      "type",
      "basic",
    ],
    [2, "Bonjour", "Hello / good morning", "greetings", "reverse"],
    [2, "Merci beaucoup", "Thank you very much", "greetings", "reverse"],
    [2, "À bientôt", "See you soon", "greetings", "reverse"],
    [
      3,
      "What drives the water cycle?",
      "Energy from the sun and the force of gravity.",
      "earth",
      "basic",
    ],
    [
      3,
      "Plants convert light into chemical energy through {{c1::photosynthesis}}.",
      "",
      "biology",
      "cloze",
    ],
    [
      3,
      "What is an ecosystem?",
      "A community of organisms interacting with one another and their physical environment.",
      "ecology",
      "basic",
    ],
  ];
  examples.forEach(([d, front, back, tag, kind]) => {
    const note = { ...makeNote(decks[d]!.id), front, back, kind, tags: [tag] };
    state.notes.push(note);
    syncCards(state, note);
  });
  state.cards.forEach((card, i) => {
    if (i % 3 === 0)
      Object.assign(card, { state: "review", due: Date.now() - day, interval: 3, reps: 2 });
  });
  return state;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 100_000): v is string => typeof v === "string" && v.length <= max;
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const media = (v: unknown, kind: "image" | "audio"): v is string =>
  text(v, 3_000_000) &&
  (!v ||
    (kind === "image"
      ? /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/
      : /^data:audio\/(mpeg|mp3|wav|ogg|webm|mp4);base64,[A-Za-z0-9+/=]+$/
    ).test(v));
export function parseStudy(json: string): StudyCollection {
  if (json.length > 8_000_000) throw new Error("The collection exceeds the 8 MB limit.");
  const value: unknown = JSON.parse(json);
  const fail = (): never => {
    throw new Error("Choose a valid study collection export.");
  };
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.decks) ||
    !value.decks.length ||
    value.decks.length > 200 ||
    !Array.isArray(value.notes) ||
    value.notes.length > 10000 ||
    !Array.isArray(value.cards) ||
    value.cards.length > 30000 ||
    !Array.isArray(value.reviews) ||
    value.reviews.length > 100000 ||
    !object(value.template)
  )
    return fail();
  const unique = (list: unknown[]): boolean =>
    list.every((v) => object(v) && text(v.id, 200) && v.id.length > 0) &&
    new Set(list.map((v) => (v as { id: string }).id)).size === list.length;
  if (![value.decks, value.notes, value.cards].every(unique)) return fail();
  if (
    !value.decks.every(
      (d) =>
        object(d) &&
        text(d.name, 200) &&
        d.name.trim() &&
        text(d.description, 1000) &&
        number(d.newLimit) &&
        d.newLimit <= 9999 &&
        Number.isInteger(d.newLimit) &&
        number(d.reviewLimit) &&
        d.reviewLimit <= 9999 &&
        Number.isInteger(d.reviewLimit) &&
        typeof d.burySiblings === "boolean",
    )
  )
    return fail();
  const deckSet = new Set(value.decks.map((d) => d.id));
  if (
    !value.notes.every(
      (n) =>
        object(n) &&
        deckSet.has(n.deck) &&
        ["basic", "reverse", "cloze", "typed"].includes(String(n.kind)) &&
        text(n.front) &&
        text(n.back) &&
        text(n.extra) &&
        Array.isArray(n.tags) &&
        n.tags.length <= 100 &&
        n.tags.every((t) => text(t, 100)) &&
        number(n.created) &&
        media(n.image, "image") &&
        media(n.audio, "audio") &&
        (!n.source ||
          (object(n.source) && text(n.source.document, 200) && text(n.source.block, 200))),
    )
  )
    return fail();
  const noteSet = new Set(value.notes.map((n) => n.id));
  const validCard = (c: unknown): boolean =>
    object(c) &&
    text(c.id, 200) &&
    noteSet.has(c.note) &&
    ["new", "learning", "review", "relearning"].includes(String(c.state)) &&
    [c.ordinal, c.due, c.interval, c.ease, c.reps, c.lapses, c.buried].every(number) &&
    Number.isInteger(c.ordinal) &&
    Number.isInteger(c.reps) &&
    Number.isInteger(c.lapses) &&
    typeof c.suspended === "boolean" &&
    typeof c.flag === "boolean";
  if (
    !value.cards.every(validCard) ||
    new Set(value.cards.map((c) => `${c.note}/${c.ordinal}`)).size !== value.cards.length
  )
    return fail();
  if (
    !value.reviews.every(
      (r) =>
        object(r) &&
        text(r.card, 200) &&
        number(r.at) &&
        number(r.ms) &&
        [1, 2, 3, 4].includes(r.grade as number) &&
        validCard(r.previous) &&
        object(r.previous) &&
        r.previous.id === r.card &&
        Array.isArray(r.siblings) &&
        r.siblings.every((s) => object(s) && text(s.id, 200) && number(s.buried)),
    )
  )
    return fail();
  if (
    !text(value.template.front, 10000) ||
    !text(value.template.back, 10000) ||
    !["sans", "serif"].includes(String(value.template.font)) ||
    !["center", "left"].includes(String(value.template.align))
  )
    return fail();
  const result = value as unknown as StudyCollection;
  if (
    !result.cards.every((c) =>
      ordinals(result.notes.find((n) => n.id === c.note)!).includes(c.ordinal),
    )
  )
    return fail();
  return result;
}
/** RFC-style quoted text fields, also accepting tab-delimited exports. */
export function parseDelimited(input: string): string[][] {
  if (input.length > 8_000_000) throw new Error("File exceeds 8 MB.");
  const delimiter = input.split(/\r?\n/)[0]?.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!field || quoted) quoted = !quoted;
      else field += c;
    } else if (!quoted && (c === delimiter || c === "\n")) {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (c === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else field += c;
  }
  if (quoted) throw new Error("An imported field has an unclosed quote.");
  row.push(field.replace(/\r$/, ""));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function exportCSV(state: StudyCollection): string {
  return [
    ["Front", "Back", "Tags", "Deck", "Type"],
    ...state.notes.map((n) => [
      n.front,
      n.back,
      n.tags.join(" "),
      state.decks.find((d) => d.id === n.deck)!.name,
      n.kind,
    ]),
  ]
    .map((row) => row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","))
    .join("\r\n");
}
