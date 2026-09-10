/** Normalizes supported three-, four-, six-, and eight-digit hex colors. */
export function normalizeHexColor(value: string): string | null {
  const match = value.trim().match(/^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (!match?.[1]) return null;
  const raw = match[1];
  const expanded =
    raw.length <= 4
      ? raw
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : raw;
  return `#${expanded.toUpperCase()}`;
}

export interface ColorChannels {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

export function channelsFromHex(value: string): ColorChannels | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  const red = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const green = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(raw.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  if (delta > 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100,
    alpha: raw.length === 8 ? (Number.parseInt(raw.slice(6, 8), 16) / 255) * 100 : 100,
  };
}

export function hexFromChannels(channels: ColorChannels): string {
  const hue = ((channels.hue % 360) + 360) % 360;
  const saturation = clamp(channels.saturation, 0, 100) / 100;
  const lightness = clamp(channels.lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, intermediate, 0]
      : segment < 2
        ? [intermediate, chroma, 0]
        : segment < 3
          ? [0, chroma, intermediate]
          : segment < 4
            ? [0, intermediate, chroma]
            : segment < 5
              ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate];
  const match = lightness - chroma / 2;
  const byte = (channel: number): string =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  const alpha = Math.round((clamp(channels.alpha, 0, 100) / 100) * 255);
  return `#${byte(red)}${byte(green)}${byte(blue)}${alpha < 255 ? alpha.toString(16).padStart(2, "0").toUpperCase() : ""}`;
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";
export interface ParsedColor {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
  /** Display-referred sRGB channels, 0–255; alpha is 0–1. */
  channels: { red: number; green: number; blue: number; alpha: number };
}

const number = (value: string): number =>
  /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ? Number(value) : NaN;
const percent = (value: string, scale: number): number =>
  value.endsWith("%") ? (number(value.slice(0, -1)) * scale) / 100 : number(value);
const angle = (value: string): number => {
  const match = value.match(/^(.*?)(deg|rad|grad|turn)?$/);
  return (
    number(match?.[1] ?? "") *
    ({ deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 }[match?.[2] ?? "deg"] ?? 1)
  );
};
const round = (n: number, digits = 2): number => Number(n.toFixed(digits));
const byteHex = (n: number): string =>
  Math.round(clamp(n, 0, 255))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
const encode = (n: number): number =>
  255 * (n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055);
const decode = (n: number): number => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);

/** Parses the four editor formats into a stable sRGB color; out-of-gamut channels clip to sRGB. */
export function parseColor(input: string): ParsedColor | null {
  let hex = normalizeHexColor(input);
  if (!hex) {
    const match = input.trim().match(/^(rgba?|hsla?|oklch)\(([^()]*)\)$/i);
    if (!match) return null;
    const format = match[1]!.toLowerCase();
    const tokens = match[2]!.trim().split(/[\s,/]+/);
    if (tokens.length < 3 || tokens.length > 4) return null;
    const alpha = tokens[3] === undefined ? 1 : percent(tokens[3], 1);
    let rgb: number[];
    if (format.startsWith("rgb")) rgb = tokens.slice(0, 3).map((value) => percent(value, 255));
    else if (format.startsWith("hsl")) {
      const [h, s, l] = [angle(tokens[0]!), percent(tokens[1]!, 100), percent(tokens[2]!, 100)];
      if (![h, s, l, alpha].every(Number.isFinite)) return null;
      hex = hexFromChannels({
        hue: h!,
        saturation: s!,
        lightness: l!,
        alpha: clamp(alpha, 0, 1) * 100,
      });
      rgb = [0, 2, 4].map((offset) => Number.parseInt(hex!.slice(offset + 1, offset + 3), 16));
    } else {
      const L = percent(tokens[0]!, 1),
        C = percent(tokens[1]!, 0.4),
        H = angle(tokens[2]!);
      if (![L, C, H].every(Number.isFinite)) return null;
      const a = Math.max(0, C) * Math.cos((H * Math.PI) / 180);
      const b = Math.max(0, C) * Math.sin((H * Math.PI) / 180);
      const light = clamp(L, 0, 1);
      const l = (light + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (light - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (light - 0.0894841775 * a - 1.291485548 * b) ** 3;
      rgb = [
        encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      ];
    }
    if (![...rgb, alpha].every(Number.isFinite)) return null;
    hex = `#${rgb.map(byteHex).join("")}${alpha < 1 ? byteHex(clamp(alpha, 0, 1) * 255) : ""}`;
  }
  const [red, green, blue] = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  ) as [number, number, number];
  const alpha = hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1;
  const hsl = channelsFromHex(hex)!;
  const [r, g, b] = [red, green, blue].map((n) => decode(n / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, labB);
  const H = C < 0.00001 ? 0 : ((Math.atan2(labB, a) * 180) / Math.PI + 360) % 360;
  const suffix = alpha < 1 ? ` / ${round(alpha, 4)}` : "";
  return {
    hex,
    rgb: `rgb(${red} ${green} ${blue}${suffix})`,
    hsl: `hsl(${round(hsl.hue)} ${round(hsl.saturation)}% ${round(hsl.lightness)}%${suffix})`,
    oklch: `oklch(${round(L * 100, 3)}% ${round(C, 5)} ${round(H, 3)}${suffix})`,
    channels: { red, green, blue, alpha },
  };
}
