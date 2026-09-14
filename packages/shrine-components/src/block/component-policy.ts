import type { ComponentBlockIntegration } from "@mash/ui/block";

/** How each Shrine composition participates in a block renderer. */
export const shrineComponentBlockIntegration = Object.freeze({
  "sh-limb": "container",
  "sh-locator": "container",
  "sh-myth": "container",
  "sh-pail": "content",
  "sh-slot": "inline",
  "sh-tree": "container",
  "sh-triptych": "container",
  "shrine-confirm": "overlay",
} as const satisfies Readonly<Record<string, ComponentBlockIntegration>>);

export type ClassifiedShrineComponentTag = keyof typeof shrineComponentBlockIntegration;

export function shrineBlockIntegrationFor(tagName: string): ComponentBlockIntegration | undefined {
  return shrineComponentBlockIntegration[tagName as ClassifiedShrineComponentTag];
}
