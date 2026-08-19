/**
 * Registers every component in the system.
 *
 * Convenient for applications and for the catalog; not what you want in a
 * size-sensitive bundle, where importing the individual registration modules
 * lets the bundler include only what is used.
 */

import "./avatar/register.js";
import "./badge/register.js";
import "./button/register.js";
import "./card/register.js";
import "./kbd/register.js";
import "./path/register.js";
import "./progress/register.js";
import "./separator/register.js";
import "./spinner/register.js";
import "./tree/register.js";
import "./tree-item/register.js";
