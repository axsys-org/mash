import { carbonIcons } from "./carbon-icons.generated.js";
import { installIconPack } from "./icon-registry.js";

export type CarbonIconName = keyof typeof carbonIcons;
export const carbonIconNames = Object.freeze(Object.keys(carbonIcons) as CarbonIconName[]);

/** Installs Mash's curated Carbon realization. Safe to call more than once. */
export function installCarbonIcons(): void {
  installIconPack("carbon", carbonIcons);
}
