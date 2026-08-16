/**
 * The package's definition entry point.
 *
 * Importing this gives you the classes and their types. It deliberately
 * registers nothing: no custom element is defined as a side effect of importing
 * a definition, which is what lets a bundler drop the components an application
 * never uses.
 *
 * To actually get `<ui-button>` working in markup, import a registration
 * module instead:
 *
 *   import "@mash/ui/button/register";   // one component
 *   import "@mash/ui/register";          // the whole system
 */

export { UIButton } from "./button/button.js";
export type { ButtonSize, ButtonTone, ButtonType, ButtonVariant } from "./button/button.js";

export { UICard } from "./card/card.js";
export type { CardElevation } from "./card/card.js";
