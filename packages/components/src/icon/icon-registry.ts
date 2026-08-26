export type IconSize = "small" | "medium" | "large";
export type IconSource = string | Readonly<Partial<Record<16 | 20 | 24, string>>>;
export type IconPack = Readonly<Record<string, IconSource>>;

const applicationIcons = new Map<string, IconSource>();
const packs = new Map<string, IconPack>();
const packNames: string[] = [];
const sizeInPixels: Record<IconSize, 16 | 20 | 24> = { small: 16, medium: 20, large: 24 };

/** Live, read-only list of names supplied by explicitly installed icon packs. */
export const iconNames: readonly string[] = packNames;

/** Registers trusted SVG markup behind a semantic name. User-authored strings must never be passed here. */
export function registerIcon(name: string, source: IconSource): void {
  applicationIcons.set(name, source);
}

/** Removes an application-provided icon without affecting installed packs. */
export function unregisterIcon(name: string): boolean {
  return applicationIcons.delete(name);
}

/** Installs a trusted realization pack without coupling the core element to it. */
export function installIconPack(id: string, pack: IconPack): void {
  if (packs.get(id) === pack) return;
  packs.set(id, pack);
  const names = new Set<string>();
  for (const installed of packs.values()) {
    for (const name of Object.keys(installed)) names.add(name);
  }
  packNames.splice(0, packNames.length, ...[...names].sort());
}

/** Reports whether a semantic name can currently be realized. */
export function hasIcon(name: string): boolean {
  if (applicationIcons.has(name)) return true;
  for (const pack of packs.values()) if (name in pack) return true;
  return false;
}

export function iconSource(name: string, size: IconSize): string | undefined {
  let source = applicationIcons.get(name);
  if (!source) {
    for (const pack of packs.values()) {
      source = pack[name];
      if (source) break;
    }
  }
  if (typeof source === "string") return source;
  if (!source) return undefined;
  const pixels = sizeInPixels[size];
  return source[pixels] ?? source[20] ?? source[16] ?? source[24];
}
