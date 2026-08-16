import { afterEach } from "vitest";

import { cleanupFixtures } from "./fixture.js";

/**
 * Load the real design tokens into the test page.
 *
 * Without this the components would render with every custom property
 * unresolved, and any assertion about colour, spacing or theming would be
 * meaningless. Importing the built CSS is also a genuine integration check:
 * if the token build stops emitting what the components reference, these tests
 * fail rather than silently rendering unstyled.
 */
import "@mash/tokens/tokens.css";

afterEach(cleanupFixtures);
