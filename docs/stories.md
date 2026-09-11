# Stories

Open `/stories` for application examples built with public Mash controls and semantic tokens. Navigation loads only the selected workspace; leaving it releases listeners, workers, observers, object URLs and timers. No dependency was added for these examples.

| Workspace      | Working flows                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio         | Files and folders, import/export, retained draggable document tabs, search/replace, saved-baseline diffs, commands, editor preferences, isolated JavaScript execution, and local HTML/CSS/script previews.                                |
| Command Center | Search documents, individual blocks, issues and saved cards; preview and open their sources; create documents; arithmetic, unit conversions, world clocks, snippets, quicklinks, explicit clipboard capture and collection import/export. |
| Documents      | Nested pages, text blocks and formatting, slash actions, comments, undo/redo, collections shared between table and board, images, canvas grouping/drag/resize/connections, notebook import/export and Markdown export.                    |
| Projects       | Issues and projects, search and filters, list/board views, draggable status changes, properties, comments, favorites, archive/restore, reversible bulk actions and portable exports.                                                      |
| Commons        | Channels and direct conversations, keyed drafts, send/edit/delete/reactions, threads, search, room settings, local attachments and gallery, and shared notebook entries.                                                                  |
| Recall         | Review scheduling, decks, card templates, imports and cards linked to document blocks, with source editing in the same workspace.                                                                                                         |
| Characters     | Searchable emoji and symbols, compact insertion picker, categories, recent selections and character details.                                                                                                                              |

## Connected documents

Documents, Projects, Recall and Command Center share persisted document and block identities. An issue's body is an editable document; its status, assignee and other project properties remain issue metadata. Recall cards can reference a block, so changing that source updates the card's answer. Command Center searches the same documents and blocks, includes project context and saved cards, and opens the exact document, issue or source block. The common navigation changes views without creating another copy of the work. Studio remains separate.

Quick notes captured in Command Center become documents. Existing saved notes migrate once; snippets, links and captured clipboard entries retain their collection behavior. Its collection export includes current linked document snapshots, including block kinds, formatting, comments and canvas geometry. Import validates those snapshots, reuses unchanged sources and creates separate copies when an existing document with the same identity differs. It never replaces a newer source with the exported snapshot. Older text-only collection exports remain importable. Removing a document from Saved removes its collection reference and keeps the document.

These connections are local, persistent application fixtures, not the future Shrine runtime or a Slot/Block/Plate/Scene implementation. Document changes are observed within the page and across browser tabs. Source links use `document`, `block`, `issue` and `note` URL parameters; geometry and open views do not determine document identity. Search renders up to 80 matches and loads the issue/card models without loading their application views.

Changes are stored in this browser. Export controls provide portable copies. These are local application experiences: there is no remote collaboration service, account system, operating-system integration, AI provider or background terminal. Studio runs standalone JavaScript with async support; it does not resolve a package/module graph. Its changes view compares saved text, not a Git repository. Documents uses a fixed collection schema, with no formula/relation engine or freehand drawing. Commons attachment bytes remain available during the mounted visit; persisted metadata makes the need to reattach explicit after reload.

Source lives in `apps/catalog/src/stories/`. Each module exports `mount(root)` and returns its cleanup function. Application layout stays in its lazy stylesheet, while interaction and visual contracts come from the base controls. The token checker also validates all Story styles. This prevents application-specific layout from accumulating in the base library's recipes.

Run `pnpm test:stories` after `pnpm build:preview` for production interaction, routing and layout checks. The tests use real pointer/keyboard actions, not synthetic application events. Screenshots are attached to the run outputs for visual review; load/interaction checks alone do not prove complete visual equivalence to a reference application.

## Desktop

`/stories/desktop` opens the existing applications in live panes. Five workspaces each
keep their own Dwindle, Master, or Columns layout and divider positions. Drag a title
to swap tiles, or float a window and move it freely. Resize dividers and floating
edges with a pointer or arrow keys. Windows can be maximized, minimized, or pinned
across workspaces. The launcher, dock, window menu, and overview expose the same
actions. Appearance, wallpaper, spacing, and window arrangement persist locally.

| Shortcut               | Action                     |
| ---------------------- | -------------------------- |
| Alt Space              | Open application launcher  |
| Alt 1–5                | Switch workspace           |
| Alt Shift 1–5          | Move the focused window    |
| Alt + arrow keys       | Focus a neighboring window |
| Alt Shift + arrow keys | Swap tiled windows         |
| Alt T                  | Toggle floating            |
| Alt Enter              | Maximize or restore        |
| Alt J                  | Cycle the workspace layout |
| Alt W                  | Close the focused window   |
| Alt /                  | Open shortcut help         |

The desktop uses Mash's drag controller, resize handles, command palette, dialogs,
calendar, slider, buttons, icons, keyboard caps, and motion timing. Application-specific
geometry stays in the story model. No dependencies or base component APIs were added.
This is an in-browser desktop; fullscreen affects the browser, and the app controls
do not manage operating-system processes or devices.

Only visible, opened apps acquire frames. Switching workspaces, tiling, floating,
minimizing, or resizing preserves those browsing contexts and their unsent drafts.
Closing invokes app cleanup before removing the frame. The shared document seed is
initialized before parallel app startup. Document, issue, and study source links open
the exact source in another pane; ordinary app shortcuts remain local to their frame.
An origin- and source-checked bridge carries desktop actions, focus, theme, and cleanup.
The `embedded=desktop` route removes catalogue chrome and adapts the app's existing
responsive layout. Narrow screens show the focused window with the same dock and
workspace controls. Nothing is scaled into an unreadable thumbnail.

The catalogue module loads only when a component route is opened. Desktop and app
frames do not fetch the catalogue example controller or unopened application views.
Layouts persist independently of app data. Reload restores open views; transient app
state follows each app's existing persistence contract. Four production browser
workflows exercise source continuity, unsent drafts, keyboard launching, frame
identity, tiling, resizing, pin/minimize/close, session restoration, and narrow layouts.
