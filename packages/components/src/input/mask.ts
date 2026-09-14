export interface MaskedInputValue {
  /** Unformatted characters, suitable for form data. */
  value: string;
  displayValue: string;
  /** Display offsets of editable characters, for caret mapping. */
  positions: readonly number[];
}

/** # is a digit, A a Latin letter, * an alphanumeric; backslash escapes a literal. */
function applyMask(input: string, mask: string, display: boolean): MaskedInputValue {
  let value = "",
    displayValue = "",
    cursor = 0,
    pending = "";
  const positions: number[] = [];
  for (let index = 0; index < mask.length; index++) {
    const token = mask[index]!;
    if (token === "\\") {
      pending += mask[++index] ?? "\\";
      continue;
    }
    const pattern =
      token === "#" ? /[0-9]/ : token === "A" ? /[a-z]/i : token === "*" ? /[a-z0-9]/i : null;
    if (!pattern) {
      pending += token;
      continue;
    }
    // Consume authored literals when parsing display text; raw values omit them.
    if (display && pending && input.startsWith(pending, cursor)) cursor += pending.length;
    while (cursor < input.length && !pattern.test(input[cursor]!)) cursor++;
    if (cursor >= input.length) break;
    displayValue += pending;
    pending = "";
    positions.push(displayValue.length);
    const character = input[cursor++]!;
    value += character;
    displayValue += character;
  }
  return { value, displayValue, positions };
}

/** Formats a raw value; literal characters never consume raw input. */
export function formatInputMask(value: string, mask: string): MaskedInputValue {
  return applyMask(value, mask, false);
}

/** Parses a display value while retaining editable offsets. */
export function parseInputMask(value: string, mask: string): MaskedInputValue {
  return applyMask(value, mask, true);
}
