/** Normal imports make the Mash elements available and export their classes and types. */
import "@mash/ui";
import "./register.js";

export {
  shrineBlockIntegrationFor,
  shrineComponentBlockIntegration,
} from "./block/component-policy.js";
export type { ClassifiedShrineComponentTag } from "./block/component-policy.js";
export { ShrineConfirm } from "./confirm/confirm.js";
export type { ConfirmTone } from "./confirm/confirm.js";
export { ShrineTriptych } from "./triptych/triptych.js";
export { ShrineLocator } from "./locator/locator.js";
export { ShrineSidebar } from "./sidebar/sidebar.js";
export { ShrinePathRow } from "./path-row/path-row.js";
export type { ShrinePathRowToggleDetail } from "./path-row/path-row.js";
export { ShrineMyth } from "./myth/myth.js";
export type { ShrineMythVariant } from "./myth/myth.js";
export { ShrineLimb } from "./limb/limb.js";
export { ShrineSlot } from "./slot/slot.js";
export { ShrinePail } from "./pail/pail.js";
export { ShrineTree } from "./tree/tree.js";
export type { ShrineTreeVariant } from "./tree/tree.js";
