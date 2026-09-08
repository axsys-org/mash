/**
 * The package's definition entry point.
 *
 * Importing this gives you the classes and their types, and registers nothing.
 * To use the elements in markup, import a registration module instead:
 *
 *   import "@mash/shrine/confirm/register";   // one component
 *   import "@mash/shrine/register";           // the whole package
 */

export {
  shrineBlockIntegrationFor,
  shrineComponentBlockIntegration,
} from "./block/component-policy.js";
export type { ClassifiedShrineComponentTag } from "./block/component-policy.js";
export { ShrineConfirm } from "./confirm/confirm.js";
export type { ConfirmTone } from "./confirm/confirm.js";
export { ShrineTriptych } from "./triptych/triptych.js";
export { ShrineLocator } from "./locator/locator.js";
export { ShrineMyth } from "./myth/myth.js";
export type { ShrineMythVariant } from "./myth/myth.js";
export { ShrineLimb } from "./limb/limb.js";
export { ShrineSlot } from "./slot/slot.js";
export { ShrinePail } from "./pail/pail.js";
export { ShrineTree } from "./tree/tree.js";
export type { ShrineTreeVariant } from "./tree/tree.js";
