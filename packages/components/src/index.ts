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

export { UIAvatar } from "./avatar/avatar.js";
export type { AvatarSize } from "./avatar/avatar.js";
export { UIBadge } from "./badge/badge.js";
export type { BadgeSize, BadgeTone } from "./badge/badge.js";
export { UICard } from "./card/card.js";
export type { CardElevation } from "./card/card.js";
export { UIInput } from "./input/input.js";
export type { InputSize, InputType } from "./input/input.js";
export { UIKbd } from "./kbd/kbd.js";
export { UIPath } from "./path/path.js";
export { UIProgress } from "./progress/progress.js";
export type { ProgressTone } from "./progress/progress.js";
export { UISeparator } from "./separator/separator.js";
export type { SeparatorOrientation } from "./separator/separator.js";
export { UISpinner } from "./spinner/spinner.js";
export type { SpinnerSize } from "./spinner/spinner.js";
export { UITree } from "./tree/tree.js";
export { UITreeItem } from "./tree-item/tree-item.js";
export type { TreeItemSize } from "./tree-item/tree-item.js";
