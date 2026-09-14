import { expect, test } from "@playwright/test";
import {
  seedStudy,
  makeNote,
  syncCards,
  sides,
  queue,
  scheduled,
  reviewCard,
  undoReview,
  parseStudy,
  parseDelimited,
  exportCSV,
  day,
  tomorrow,
} from "../../../apps/catalog/src/stories/study-model.js";

test("generated cards keep schedules through edits and cloze ordinals remain independent", () => {
  const state = seedStudy(),
    note: import("../../../apps/catalog/src/stories/study-model.js").StudyNote = {
      ...makeNote(state.decks[0]!.id),
      kind: "cloze" as const,
      front: "A {{c2::circle::shape}} has {{c7::no corners}}. {{c2::Round}}.",
    };
  state.notes.push(note);
  syncCards(state, note);
  const cards = state.cards.filter((c) => c.note === note.id);
  expect(cards.map((c) => c.ordinal)).toEqual([2, 7]);
  expect(sides(note, cards[0]!).front).toBe("A [shape] has no corners. […].");
  expect(sides(note, cards[1]!).back).toBe("A circle has no corners. Round.");
  Object.assign(cards[0]!, { state: "review", due: 123, interval: 5 });
  note.front = "A {{c2::circle}} is round.";
  syncCards(state, note);
  expect(state.cards.filter((c) => c.note === note.id)).toEqual([cards[0]]);
  expect(cards[0]!.interval).toBe(5);
  note.kind = "reverse";
  note.front = "Bonjour";
  note.back = "Hello";
  syncCards(state, note);
  expect(state.cards.filter((c) => c.note === note.id).map((c) => sides(note, c))).toEqual([
    { front: "Bonjour", back: "Hello" },
    { front: "Hello", back: "Bonjour" },
  ]);
});

test("review, learning, sibling burying and undo respect time and daily limits", () => {
  const state = seedStudy(),
    now = Date.now(),
    note = state.notes.find((n) => n.kind === "reverse")!,
    card = state.cards.find((c) => c.note === note.id)!,
    sibling = state.cards.find((c) => c.note === note.id && c.id !== card.id)!;
  const before = structuredClone(card);
  reviewCard(state, card, 1, 4000, now);
  expect(card.state).toBe(before.state === "review" ? "relearning" : "learning");
  expect(card.due).toBe(now + 60000);
  expect(sibling.buried).toBe(tomorrow(now));
  expect(queue(state, "", now).some((c) => c.id === card.id || c.id === sibling.id)).toBe(false);
  expect(queue(state, "", now + 60001).some((c) => c.id === card.id)).toBe(true);
  expect(undoReview(state)).toBe(card.id);
  expect(card).toEqual(before);
  expect(sibling.buried).toBe(0);
  expect(state.reviews).toHaveLength(0);
  const learning = { ...card, state: "new" as const };
  expect(scheduled(learning, 3, now).due).toBe(now + day);
  expect(scheduled(learning, 4, now).interval).toBe(4);
  const deck = state.decks.find((d) => d.id === note.deck)!;
  deck.newLimit = 0;
  deck.reviewLimit = 0;
  expect(queue(state, deck.id, now)).toHaveLength(0);
  expect(queue(state, deck.id, now, true).length).toBeGreaterThan(0);
  card.suspended = true;
  expect(queue(state, deck.id, now, true).some((c) => c.id === card.id)).toBe(false);
});

test("collection and delimited imports preserve data and reject malformed references or unsafe media", () => {
  const state = seedStudy();
  reviewCard(state, state.cards[0]!, 3, 3000);
  expect(parseStudy(JSON.stringify(state))).toEqual(state);
  const broken = structuredClone(state);
  broken.cards[0]!.note = "missing";
  expect(() => parseStudy(JSON.stringify(broken))).toThrow();
  const media = structuredClone(state);
  media.notes[0]!.image = "javascript:alert(1)";
  expect(() => parseStudy(JSON.stringify(media))).toThrow();
  const duplicates = structuredClone(state);
  duplicates.cards.push({ ...duplicates.cards[0]!, id: "different-id" });
  expect(() => parseStudy(JSON.stringify(duplicates))).toThrow();
  const review = structuredClone(state);
  (review.reviews[0] as unknown as { grade: string }).grade = "3";
  expect(() => parseStudy(JSON.stringify(review))).toThrow();
  state.notes[0]!.front = 'A "quote", a comma\nand a line';
  const rows = parseDelimited(exportCSV(state));
  expect(rows[1]![0]).toBe(state.notes[0]!.front);
  expect(parseDelimited('Front\tBack\n"hello\nworld"\tanswer')).toEqual([
    ["Front", "Back"],
    ["hello\nworld", "answer"],
  ]);
  expect(() => parseDelimited('"unclosed')).toThrow(/quote/);
});
