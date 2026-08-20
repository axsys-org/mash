import type { ComplexAttributeConverter } from "lit";

/** JSON attribute converter for renderer-neutral numeric tuples and arrays. */
export const numberArrayConverter: ComplexAttributeConverter<number[]> = {
  fromAttribute(value): number[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (entry): entry is number => typeof entry === "number" && Number.isFinite(entry),
          )
        : [];
    } catch {
      return [];
    }
  },
  toAttribute(value): string | null {
    return value.length > 0 ? JSON.stringify(value) : null;
  },
};
