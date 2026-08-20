/**
 * The package's definition entry point.
 *
 * Importing this gives you the classes and their types, and registers nothing.
 * To use the elements in markup, import a registration module instead:
 *
 *   import "@mash/shrine/confirm/register";   // one component
 *   import "@mash/shrine/register";           // the whole package
 */

export { ShrineConfirm } from "./confirm/confirm.js";
export type { ConfirmTone } from "./confirm/confirm.js";
export { ShrineTriptych } from "./triptych/triptych.js";
export { ShrineLocator } from "./locator/locator.js";
