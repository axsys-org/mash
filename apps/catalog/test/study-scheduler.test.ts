import assert from "node:assert/strict";
import test from "node:test";

import {
  createStudySchedule,
  formatStudyInterval,
  previewStudyRatings,
  scheduleStudyCard,
} from "../src/study-scheduler.ts";

const now = Date.UTC(2026, 8, 8, 12);

test("new cards expose progressively longer rating previews", () => {
  const previews = previewStudyRatings(createStudySchedule(now), now);
  assert.deepEqual(
    previews.map((preview) => preview.label),
    ["1m", "6m", "1d", "4d"],
  );
});

test("again moves a reviewed card into relearning and records a lapse", () => {
  const next = scheduleStudyCard(
    {
      dueAt: now,
      ease: 2.5,
      intervalDays: 12,
      lapses: 1,
      repetitions: 4,
      state: "review",
    },
    "again",
    now,
  );
  assert.equal(next.state, "relearning");
  assert.equal(next.lapses, 2);
  assert.equal(next.repetitions, 0);
  assert.equal(formatStudyInterval(next.dueAt, now), "1m");
});

test("successful reviews preserve a bounded ease and grow the interval", () => {
  const schedule = {
    dueAt: now,
    ease: 2.5,
    intervalDays: 12,
    lapses: 0,
    repetitions: 4,
    state: "review" as const,
  };
  const good = scheduleStudyCard(schedule, "good", now);
  const easy = scheduleStudyCard(schedule, "easy", now);
  assert.equal(good.intervalDays, 30);
  assert.equal(easy.intervalDays, 39);
  assert.ok(easy.ease > good.ease);
});
