/**
 * Registers every component in this package, along with the `@mash/ui`
 * elements they compose.
 *
 * Convenient for applications and for the catalog; not what you want in a
 * size-sensitive bundle, where importing the individual registration modules
 * lets the bundler include only what is used.
 */

import "./confirm/register.js";
import "./triptych/register.js";
import "./locator/register.js";
import "./myth/register.js";
import "./tree/register.js";
