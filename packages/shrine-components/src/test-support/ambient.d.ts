/**
 * Ambient declarations for the test environment.
 *
 * The test setup imports the built token stylesheet so components render with
 * real values. TypeScript has no notion of a CSS module, and Vite resolves the
 * import at runtime, so it just needs to be told the specifier is valid.
 *
 * This file lives under test-support, which tsconfig.build.json excludes, so
 * the declaration never reaches the published package.
 */
declare module "*.css";
