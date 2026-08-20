/** Attribute converter for renderer-neutral collections of string values. */
export const stringArrayConverter = {
  fromAttribute(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      // A comma-separated form keeps hand-authored markup pleasant.
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  },

  toAttribute(value: string[] | null | undefined): string | null {
    return value && value.length > 0 ? JSON.stringify(value) : null;
  },
};
