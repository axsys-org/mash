# Message input and conversations

The message input is an application-owned composition of `ui-textarea`, `ui-button`, `ui-select`, `ui-attachment`, `ui-draggable`, and the `.mash-composer` recipe. It extends the existing composer pattern rather than adding another textarea or chat-specific component family. The typed `bindMessageComposer` controller is a public import. Author the form markup from the catalogue example, bind it once, and connect the delivery events to your application.

Find the composer examples under **Textarea** and the complete conversation under **Message → Message input and conversation**. Import the ordinary Mash controls and `@mash/ui/catalogue/mash.css`. A `data-mash-size="default"` or `"compact"` ancestor supplies the size context. No dependency installation is needed.

## State and delivery

`bindMessageComposer(form, options?)` returns the controller below. It does not attach an expando to the form; the catalogue stores the returned value as `form.composer` for its example scripts. Rebinding a live form returns the same instance.

| Member                    | Contract                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`                   | Read or replace the text draft. User edits emit `composer-change` with `{ value }`.                                                                    |
| `files`                   | Read a copy or replace local attachments. Picker, drop, and removal emit `composer-files-change` with `{ files }`.                                     |
| `status`                  | `"idle"` or `"streaming"`; owned by the application.                                                                                                   |
| `queue`                   | Read or replace `{ id, text, files, mode? }[]`. Interaction and dispatch emit `composer-queue-change` with `{ queue }`. IDs must be unique and stable. |
| `history`                 | Sent text, oldest first. May be seeded by the application.                                                                                             |
| `suggestions`             | Replace the suggested prompt strings. They appear while the draft is empty.                                                                            |
| `disabled`                | Disable editing, sending, attachments, suggestions, and queue actions together.                                                                        |
| `openFilePicker(accept?)` | Open the native picker, optionally narrowing types for an image-only action.                                                                           |
| `send()` / `stop()`       | Invoke the same operations as the visible controls.                                                                                                    |
| `destroy()`               | Release listeners, resize observation, preview URLs, and pending delivery when unmounting.                                                             |

```js
import { bindMessageComposer } from "@mash/ui/message-composer";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";

const lifecycle = new AbortController();
const composer = bindMessageComposer(form, { signal: lifecycle.signal });
form.addEventListener("composer-send", async ({ detail: { text, files, mode } }) => {
  composer.status = "streaming";
  try {
    await sendToApplication({ text, files, mode });
  } finally {
    composer.status = "idle";
  }
});
form.addEventListener("composer-stop", () => {
  abortApplicationResponse();
  composer.status = "idle";
});
```

`composer-send` contains the trimmed text, the actual `File` objects, an ID, and the optional response mode. Empty text with attachments is valid. Empty text without attachments is not sent. The event is local; the pattern does not upload files or choose a service.

While streaming, an empty draft presents **Stop response**; text or attachments present **Queue message**. Changing streaming to idle dispatches exactly one queued message, preserving any draft being written. Set streaming synchronously in the send handler before starting asynchronous work. Applications own response cancellation. For asynchronous message delivery, pass `onSend(message, signal)` to the binder. Its promise enables the Sending/Stop state; rejection restores the draft and attachments for retry, and Stop aborts the supplied signal and restores the draft. `composer-send` fires after successful delivery. The catalogue’s timer and intentional error are example code, never library behavior.

Queue rows use Mash's drag controller through `ui-draggable`, with sibling motion timed by the existing motion tokens. Enter or F2 edits a queued row; Delete removes it; Alt+↑/↓ reorders it. Editing swaps an unfinished draft into the queue instead of losing it. Disabled queue controls cannot mutate state.

## Editing and attachments

Enter sends; Shift+Enter inserts a line. IME composition and modified Enter keep their native behavior. The textarea grows with wrapped content, capped by `data-max-rows` (eight by default). `data-min-rows` sets the initial height. Expand/collapse preserves text, selection, attachments, and response mode.

`data-placeholder-suggestion` offers a prompt that Tab fills without sending. Shift+Tab still navigates backward. Arrow keys explore the suggestion buttons, with a live announcement; Enter fills the highlighted prompt. All suggestion buttons are also reachable by ordinary Tab navigation. ↑ on the first line recalls history, and ↓ on the last line returns toward the in-progress draft. Existing selections are never replaced by history navigation.

The hidden file input's `accept` policy applies to both drops and picker selections. `data-max-files` limits attachments; duplicates are identified by name, size, and modification time. `data-no-attachments` disables picker/drop behavior. Each image has a local preview URL that is released on removal or unmount. Documents show filename and size through `ui-attachment`; PDF rasterization is deliberately absent to keep this composition dependency-free. A host application can supply a document preview in the attachment's `media` slot.

Author left/right toolbar content in `[data-actions]` containers. Use `openFilePicker()` from a custom attach action. The controller makes those regions inert when disabled; it does not interpret their application-specific controls.

## Message presentation

`ui-message` continues to own sender alignment and avatar/header/content/footer slots. The conversation pattern uses a trailing user bubble and leading unframed assistant content, composed from `ui-bubble`. Attachment-only messages omit the empty text bubble. `ui-motion` supplies entrance motion, and `ui-message-scroller` owns scroll following.

The `.mash-chat-message` recipe reserves footer height before showing metadata and actions on hover or keyboard focus, so the transcript does not jump. Touch devices show actions continuously. Copy, edit, and regenerate are application actions with `ui-tooltip` descriptions. The catalogue's sample stream is explicitly local and makes no network requests.

Use public textarea, button, attachment, message, and bubble parts to change presentation. Keep text as text nodes and retain native focus targets. Call `destroy()` when removing a composer without unloading its document.

## Binding and cleanup

The controller registers the controls it uses through ordinary component imports. It adds no transport or state-store dependency. The form supplies `ui-textarea`, `[data-send]` (with a `ui-icon`), `[data-stop]`, an `input[type=file]`, `.mash-composer-context`, `.mash-composer-queue`, `.mash-composer-suggestions`, and `.mash-composer-status` (with an `output` and `[data-retry]`). Attach, expand, and mode controls are optional. The catalogue exposes complete markup, including accessible names.

Abort the supplied `signal` or call `destroy()` on unmount. Both release listeners, resize observation, pending delivery, animation-frame work, and image URLs. A disposed form may be rebound. `ComposerMessage`, `ComposerStatus`, `MessageComposer`, `MessageComposerOptions`, and `MessageComposerEvents` are exported types.
