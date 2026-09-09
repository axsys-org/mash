# Stories

Open `/stories` for five independent application examples. Each workspace uses public Mash controls and semantic tokens. Navigation loads only the selected workspace; leaving it releases listeners, workers, observers, object URLs and timers. No dependency was added for these examples.

| Workspace      | Working flows                                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio         | Files and folders, import/export, retained draggable document tabs, search/replace, saved-baseline diffs, commands, editor preferences, isolated JavaScript execution, and local HTML/CSS/script previews.             |
| Command Center | Keyboard search, arithmetic and unit conversions, world clocks, notes, snippets, quicklinks, explicit clipboard capture, pins, recent commands, collection import/export and undo.                                     |
| Documents      | Nested pages, text blocks and formatting, slash actions, comments, undo/redo, collections shared between table and board, images, canvas grouping/drag/resize/connections, notebook import/export and Markdown export. |
| Projects       | Issues and projects, search and filters, list/board views, draggable status changes, properties, comments, favorites, archive/restore, reversible bulk actions and portable exports.                                   |
| Commons        | Channels and direct conversations, keyed drafts, send/edit/delete/reactions, threads, search, room settings, local attachments and gallery, and shared notebook entries.                                               |

Changes are stored in this browser. Export controls provide portable copies. These are local application experiences: there is no remote collaboration service, account system, operating-system integration, AI provider or background terminal. Studio runs standalone JavaScript with async support; it does not resolve a package/module graph. Its changes view compares saved text, not a Git repository. Documents uses a fixed collection schema, with no formula/relation engine or freehand drawing. Commons attachment bytes remain available during the mounted visit; persisted metadata makes the need to reattach explicit after reload.

Source lives in `apps/catalog/src/stories/`. Each module exports `mount(root)` and returns its cleanup function. Application layout stays in its lazy stylesheet, while interaction and visual contracts come from the base controls. The token checker also validates all Story styles. This prevents application-specific layout from accumulating in the base library's recipes.

Run `pnpm test:stories` after `pnpm build:preview` for production interaction, routing and layout checks. The tests use real pointer/keyboard actions, not synthetic application events. Screenshots are attached to the run outputs for visual review; load/interaction checks alone do not prove complete visual equivalence to a reference application.
