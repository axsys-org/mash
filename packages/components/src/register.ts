/**
 * Registers every component in the system.
 *
 * Convenient for applications and for the catalog; not what you want in a
 * size-sensitive bundle, where importing the individual registration modules
 * lets the bundler include only what is used.
 */

import "./button/register.js";
import "./card/register.js";
