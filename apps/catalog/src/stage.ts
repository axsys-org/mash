/**
 * The preview frame's own bootstrap.
 *
 * Registers every component into *this* document's registry — a custom element
 * registry is per-document, so the parent catalog's registrations do not reach
 * in here — and loads the design tokens so previews resolve real values.
 *
 * The parent drives everything else directly through `contentDocument`.
 */

import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/register";
import "@mash/shrine/register";

import "./stage.css";

// Tells the parent the frame is ready without it having to poll for the
// registry being populated.
document.documentElement.dataset.mashCatalogue = "mash";
document.documentElement.dataset.stageReady = "true";
