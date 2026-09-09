export type CollectionItem = {
  id: string;
  kind: "note" | "link" | "snippet" | "clipboard";
  title: string;
  content: string;
  pinned: boolean;
  updated: number;
};
export type LauncherState = {
  version: 1;
  items: CollectionItem[];
  recent: string[];
  compact: boolean;
};
export function initialLauncherState(): LauncherState {
  return {
    version: 1,
    compact: false,
    recent: [],
    items: [
      {
        id: "note-welcome",
        kind: "note",
        title: "Today's focus",
        content:
          "Three things worth making time for:\n\n• Review the latest designs\n• Write down the decisions\n• Make the next step small and clear",
        pinned: true,
        updated: 1,
      },
      {
        id: "snippet-followup",
        kind: "snippet",
        title: "A quick follow-up",
        content:
          "Thanks for the conversation. Here are the next steps we agreed on.\n\nSent on {date}",
        pinned: true,
        updated: 2,
      },
      {
        id: "link-components",
        kind: "link",
        title: "Component catalogue",
        content: "/components/ui-button",
        pinned: true,
        updated: 3,
      },
      {
        id: "link-documents",
        kind: "link",
        title: "Documents workspace",
        content: "/stories/documents",
        pinned: false,
        updated: 4,
      },
    ],
  };
}
export function isLauncherState(value: unknown): value is LauncherState {
  const state = value as LauncherState | null;
  return (
    !!state &&
    state.version === 1 &&
    typeof state.compact === "boolean" &&
    Array.isArray(state.recent) &&
    state.recent.every((item) => typeof item === "string") &&
    Array.isArray(state.items) &&
    state.items.every(
      (item) =>
        !!item &&
        Number.isFinite(item.updated) &&
        typeof item.id === "string" &&
        ["note", "link", "snippet", "clipboard"].includes(item.kind) &&
        typeof item.title === "string" &&
        typeof item.content === "string" &&
        typeof item.pinned === "boolean",
    ) &&
    new Set(state.items.map((item) => item.id)).size === state.items.length
  );
}

/** Small arithmetic grammar; no code evaluation or access to browser globals. */
export function arithmetic(source: string): number | null {
  const input = source.trim().replaceAll("×", "*").replaceAll("÷", "/");
  if (!input || !/^[\d\s.+\-*/%^()]+$/.test(input) || input.length > 200) return null;
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%^]/g) ?? [];
  let index = 0;
  const peek = () => tokens[index];
  function atom(): number {
    if (peek() === "(") {
      index++;
      const value = add();
      if (tokens[index++] !== ")") throw Error();
      return value;
    }
    const token = tokens[index++];
    if (token === undefined || !/^\d|^\.\d/.test(token)) throw Error();
    return Number(token);
  }
  function power(): number {
    let value = atom();
    if (peek() === "%") {
      index++;
      value /= 100;
    }
    if (peek() === "^") {
      index++;
      value **= unary();
    }
    return value;
  }
  function unary(): number {
    if (peek() === "+") {
      index++;
      return unary();
    }
    if (peek() === "-") {
      index++;
      return -unary();
    }
    return power();
  }
  function multiply(): number {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const op = tokens[index++];
      const next = unary();
      value = op === "*" ? value * next : value / next;
    }
    return value;
  }
  function add(): number {
    let value = multiply();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[index++];
      const next = multiply();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }
  try {
    const value = add();
    return index === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function quickAnswer(
  query: string,
): { title: string; result: string; detail: string } | null {
  const number = arithmetic(query);
  if (number !== null)
    return {
      title: query,
      result: new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(number),
      detail: "Calculator · Enter to copy",
    };
  const units: Record<string, { scale: number; group: string; label: string }> = {
    mm: { scale: 0.001, group: "length", label: "mm" },
    cm: { scale: 0.01, group: "length", label: "cm" },
    m: { scale: 1, group: "length", label: "m" },
    km: { scale: 1000, group: "length", label: "km" },
    in: { scale: 0.0254, group: "length", label: "in" },
    ft: { scale: 0.3048, group: "length", label: "ft" },
    mi: { scale: 1609.344, group: "length", label: "mi" },
    g: { scale: 0.001, group: "mass", label: "g" },
    kg: { scale: 1, group: "mass", label: "kg" },
    lb: { scale: 0.45359237, group: "mass", label: "lb" },
    oz: { scale: 0.028349523125, group: "mass", label: "oz" },
    ms: { scale: 0.001, group: "time", label: "ms" },
    s: { scale: 1, group: "time", label: "s" },
    min: { scale: 60, group: "time", label: "min" },
    h: { scale: 3600, group: "time", label: "h" },
  };
  const match = query
    .toLowerCase()
    .match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))\s*([a-z]+)\s+(?:to|in)\s+([a-z]+)$/);
  if (match) {
    const [, amount, from, to] = match;
    const a = units[from!],
      b = units[to!];
    if (a && b && a.group === b.group)
      return {
        title: query,
        result: Number(((Number(amount) * a.scale) / b.scale).toPrecision(10)) + " " + b.label,
        detail: "Unit conversion · Enter to copy",
      };
    if ((from === "c" && to === "f") || (from === "f" && to === "c")) {
      const value = from === "c" ? (Number(amount) * 9) / 5 + 32 : ((Number(amount) - 32) * 5) / 9;
      return {
        title: query,
        result: Number(value.toFixed(3)) + " °" + to!.toUpperCase(),
        detail: "Temperature · Enter to copy",
      };
    }
  }
  const zones: Record<string, string> = {
    tokyo: "Asia/Tokyo",
    london: "Europe/London",
    paris: "Europe/Paris",
    "new york": "America/New_York",
    "san francisco": "America/Los_Angeles",
    sydney: "Australia/Sydney",
    utc: "UTC",
  };
  const city = query.toLowerCase().replace(/^time\s+(?:in\s+)?/, "");
  if (query.toLowerCase().startsWith("time ") && zones[city])
    return {
      title: city.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      result: new Intl.DateTimeFormat(undefined, {
        timeZone: zones[city],
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      detail: "World clock · " + zones[city],
    };
  return null;
}
