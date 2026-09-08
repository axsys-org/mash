export const studyRatings = ["again", "hard", "good", "easy"] as const;

export type StudyRating = (typeof studyRatings)[number];
export type StudyCardState = "new" | "learning" | "review" | "relearning";

export interface StudySchedule {
  dueAt: number;
  ease: number;
  intervalDays: number;
  lapses: number;
  repetitions: number;
  state: StudyCardState;
}

export interface StudyRatingPreview {
  dueAt: number;
  intervalDays: number;
  label: string;
  rating: StudyRating;
}

const minute = 60_000;
const day = 86_400_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function dueIn(now: number, milliseconds: number): number {
  return now + milliseconds;
}

export function createStudySchedule(now = Date.now()): StudySchedule {
  return {
    dueAt: now,
    ease: 2.5,
    intervalDays: 0,
    lapses: 0,
    repetitions: 0,
    state: "new",
  };
}

export function formatStudyInterval(dueAt: number, now = Date.now()): string {
  const difference = Math.max(0, dueAt - now);
  if (difference < 90 * minute) return `${Math.max(1, Math.round(difference / minute))}m`;
  if (difference < day) return `${Math.max(1, Math.round(difference / (60 * minute)))}h`;
  const days = Math.max(1, Math.round(difference / day));
  if (days < 30) return `${days}d`;
  const months = Math.max(1, Math.round(days / 30));
  if (months < 12) return `${months}mo`;
  return `${Math.max(1, Math.round(months / 12))}y`;
}

export function scheduleStudyCard(
  schedule: StudySchedule,
  rating: StudyRating,
  now = Date.now(),
): StudySchedule {
  const ease = schedule.ease || 2.5;
  const interval = Math.max(1, schedule.intervalDays || 1);

  if (rating === "again") {
    return {
      ...schedule,
      dueAt: dueIn(now, minute),
      ease: clamp(ease - 0.2, 1.3, 3.2),
      intervalDays: 0,
      lapses: schedule.lapses + (schedule.state === "review" ? 1 : 0),
      repetitions: 0,
      state: schedule.state === "new" ? "learning" : "relearning",
    };
  }

  if (rating === "hard") {
    if (schedule.state === "new" || schedule.state === "learning") {
      return {
        ...schedule,
        dueAt: dueIn(now, 6 * minute),
        ease: clamp(ease - 0.15, 1.3, 3.2),
        state: "learning",
      };
    }
    const intervalDays = Math.max(1, Math.round(interval * 1.2));
    return {
      ...schedule,
      dueAt: dueIn(now, intervalDays * day),
      ease: clamp(ease - 0.15, 1.3, 3.2),
      intervalDays,
      repetitions: schedule.repetitions + 1,
      state: "review",
    };
  }

  if (rating === "good") {
    const intervalDays =
      schedule.state === "new" || schedule.state === "learning"
        ? schedule.repetitions === 0
          ? 1
          : 3
        : Math.max(2, Math.round(interval * ease));
    return {
      ...schedule,
      dueAt: dueIn(now, intervalDays * day),
      intervalDays,
      repetitions: schedule.repetitions + 1,
      state: "review",
    };
  }

  const intervalDays =
    schedule.state === "new" || schedule.state === "learning"
      ? 4
      : Math.max(4, Math.round(interval * ease * 1.3));
  return {
    ...schedule,
    dueAt: dueIn(now, intervalDays * day),
    ease: clamp(ease + 0.15, 1.3, 3.2),
    intervalDays,
    repetitions: schedule.repetitions + 1,
    state: "review",
  };
}

export function previewStudyRatings(
  schedule: StudySchedule,
  now = Date.now(),
): StudyRatingPreview[] {
  return studyRatings.map((rating) => {
    const next = scheduleStudyCard(schedule, rating, now);
    return {
      dueAt: next.dueAt,
      intervalDays: next.intervalDays,
      label: formatStudyInterval(next.dueAt, now),
      rating,
    };
  });
}
