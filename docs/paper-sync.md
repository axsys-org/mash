# Paper → Mash synchronization

Paper is the visual authority for the Interzone foundations. Mash keeps a small,
reviewable contract at `packages/tokens/src/paper-contract.json` rather than
pretending that a design edit can silently mutate source code.

## Current supervised workflow

1. Open the Interzone file in Paper Desktop and read the current token set.
2. Compare the Paper aliases with `paper-contract.json`.
3. Update the contract and the matching DTCG source in the same change.
4. Build and validate the graph:

   ```text
   pnpm run build:catalog
   pnpm run check:paper
   pnpm run check
   ```

5. Push the change to a branch. GitHub and Vercel provide the PR checks,
   component preview, and review comment containing the deep link.

The contract check compares alias targets, not copied color literals. That keeps
Paper's semantic intent visible while preserving Mash's own reference ramp and
provenance graph.

## Changelog and automation boundary

Every synchronized Paper change is recorded in the root `CHANGELOG.md` alongside
the reviewed contract and the catalog-preview handoff. The Paper connector
currently exposes token and node reads/writes, but no continuous Git webhook or
conflict resolver. A Paper edit therefore still needs an explicit sync request
so a human can review whether it changes the shared semantic contract, a
platform-specific adapter, or only a local composition.

Event-driven branch/PR automation remains intentionally deferred until Paper can
provide a stable change event and reconciliation boundary. The checked-in
contract, changelog entry, and CI check are the guardrails for the supervised
workflow today.
