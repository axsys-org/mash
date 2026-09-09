export type GestureModifier = "Alt" | "Control" | "Meta" | "Shift" | "Primary";

const modifierAliases = new Map<string, GestureModifier>([
  ["alt", "Alt"],
  ["option", "Alt"],
  ["⌥", "Alt"],
  ["control", "Control"],
  ["ctrl", "Control"],
  ["⌃", "Control"],
  ["meta", "Meta"],
  ["command", "Meta"],
  ["cmd", "Meta"],
  ["⌘", "Meta"],
  ["shift", "Shift"],
  ["⇧", "Shift"],
  ["primary", "Primary"],
  ["mod", "Primary"],
]);

const keyAliases = new Map<string, string>([
  ["esc", "Escape"],
  ["escape", "Escape"],
  ["return", "Enter"],
  ["enter", "Enter"],
  ["space", " "],
  ["spacebar", " "],
  ["left", "ArrowLeft"],
  ["right", "ArrowRight"],
  ["up", "ArrowUp"],
  ["down", "ArrowDown"],
]);

export function normalizeGestureKey(value: string): string {
  const alias = keyAliases.get(value.toLowerCase());
  if (alias !== undefined) return alias;
  return value.length === 1 ? value.toLowerCase() : value;
}

export function parseGestureModifiers(value: string): GestureModifier[] {
  const result: GestureModifier[] = [];
  for (const token of value.split(/[+,\s]+/).filter(Boolean)) {
    const modifier = modifierAliases.get(token.toLowerCase());
    if (modifier && !result.includes(modifier)) result.push(modifier);
  }
  return result;
}

export function parseGestureShortcut(value: string): {
  code?: string;
  key?: string;
  modifiers?: readonly GestureModifier[];
} {
  const tokens = value
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);
  const modifiers: GestureModifier[] = [];
  let key: string | undefined = value.trim().endsWith("+") ? "+" : undefined;
  let code: string | undefined;
  for (const token of tokens) {
    const modifier = modifierAliases.get(token.toLowerCase());
    if (modifier) {
      if (!modifiers.includes(modifier)) modifiers.push(modifier);
      continue;
    }
    if (token.toLowerCase().startsWith("code:")) code = token.slice("code:".length);
    else key = normalizeGestureKey(token);
  }
  return { key, code, modifiers };
}
