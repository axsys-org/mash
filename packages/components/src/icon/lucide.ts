import { lucideIcons } from "./lucide-icons.generated.js";
import { installIconPack } from "./icon-registry.js";

export type LucideIconName = keyof typeof lucideIcons;
export const lucideIconNames = Object.freeze(Object.keys(lucideIcons) as LucideIconName[]);

/** Installs Mash's curated Lucide realization. Safe to call more than once. */
export function installLucideIcons(): void {
  installIconPack("lucide", lucideIcons);
}
