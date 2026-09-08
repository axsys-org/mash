# GPUI reference map

Inventory of all 71 entries in GPUI Kit's component navigation, observed on
2026-09-08 at [Button](https://gpui-kit.com/component/button/). These are candidate
correspondences, **not equivalence or visual approval**. Button and Message were
visually sampled; the remaining pages still need individual reference captures.
“Missing” means no dedicated base-library element, not that a new tag is already
the right solution. Layout-only entries must first be tested as reusable CSS/HTML
compositions. A Rust type need not become a custom element.

Every row starts **unverified**. Resolve the listed question and capture the
reference's relevant examples before accepting that family. The website is a
moving reference; record its theme, viewport, story settings, and capture date.
The upstream main revision observed during research was
[`48336016`](https://github.com/longbridge/gpui-kit/commit/48336016a3074fbb8af619014b18565ef747f512);
this is not a claim that the deployed gallery uses that revision.

| Reference                                                           | Mash candidate                                                    | Required decision or proof                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Accordion](https://gpui-kit.com/component/accordion/)              | ui-accordion, ui-accordion-item                                   | Header geometry, disclosure, disabled and open states                          |
| [AlertDialog](https://gpui-kit.com/component/alert-dialog/)         | ui-alert-dialog                                                   | Decision layout, actions, focus and dismissal                                  |
| [Alert](https://gpui-kit.com/component/alert/)                      | Missing; ui-card is only a composition ingredient                 | Inline status anatomy and tones; do not substitute a toast                     |
| [Attachment](https://gpui-kit.com/component/attachment/)            | Missing; file-upload/image are ingredients                        | File presentation and actions are distinct from upload behavior                |
| [Avatar](https://gpui-kit.com/component/avatar/)                    | ui-avatar                                                         | Identity scale, fallback and image geometry                                    |
| [Badge](https://gpui-kit.com/component/badge/)                      | ui-badge                                                          | Count/dot/target annotation versus text tag roles                              |
| [Bubble](https://gpui-kit.com/component/bubble/)                    | ui-bubble, ui-bubble-group                                        | Surface, alignment, reactions and group spacing                                |
| [Button](https://gpui-kit.com/component/button/)                    | ui-button, ui-toggle-group                                        | Default/primary/secondary, status variants, outline, compact, icons and groups |
| [Calendar](https://gpui-kit.com/component/calendar/)                | ui-calendar                                                       | Grid, navigation, range/selection and disabled dates                           |
| [Chart](https://gpui-kit.com/component/chart/)                      | Missing                                                           | Explicit later data-visualization scope; no placeholder parity claim           |
| [Checkbox](https://gpui-kit.com/component/checkbox/)                | ui-checkbox, ui-checkbox-group                                    | Control frame, indeterminate state and label rhythm                            |
| [Clipboard](https://gpui-kit.com/component/clipboard/)              | ui-clipboard                                                      | Copy feedback, icon and failure behavior                                       |
| [Collapsible](https://gpui-kit.com/component/collapsible/)          | ui-collapsible, ui-reveal                                         | Trigger/body geometry and interrupted transitions                              |
| [ColorPicker](https://gpui-kit.com/component/color-picker/)         | ui-color-picker, ui-color-swatch                                  | Surface, controls, format and palette states                                   |
| [Combobox](https://gpui-kit.com/component/combobox/)                | ui-combobox, ui-chip, ui-option-row                               | Single/multiple, search, empty state, grid options and popup                   |
| [Command](https://gpui-kit.com/component/command/)                  | CommandRegistry module; menus/autocomplete                        | A registry is not evidence of a command-palette UI                             |
| [DataTable](https://gpui-kit.com/component/data-table/)             | ui-data-table                                                     | Cell/header/selection/editor geometry and keyboard behavior                    |
| [DatePicker](https://gpui-kit.com/component/date-picker/)           | ui-date-picker                                                    | Trigger, calendar popup, range and clearing                                    |
| [DescriptionList](https://gpui-kit.com/component/description-list/) | Native dl; no shared recipe                                       | Stable label/value columns and responsive stacking                             |
| [Dialog](https://gpui-kit.com/component/dialog/)                    | ui-dialog                                                         | Shared surface, header/footer inset, widths and focus                          |
| [Dock](https://gpui-kit.com/component/dock/)                        | Partial: ui-resizable + ui-tabs                                   | Splits alone do not supply docking, panel lifecycle or persistence             |
| [DropdownButton](https://gpui-kit.com/component/dropdown_button/)   | ui-button + ui-menu                                               | Split-action versus menu-trigger anatomy and focus                             |
| [Editor](https://gpui-kit.com/component/editor/)                    | ui-editor                                                         | Compare actual editing scope; the catalog's BlockSuite is not the base editor  |
| [Focus Trap](https://gpui-kit.com/component/focus-trap/)            | Internal overlay engine                                           | Behavior mapping, no need for a decorative standalone element                  |
| [Form](https://gpui-kit.com/component/form/)                        | ui-form, ui-field, ui-fieldset                                    | Labels, descriptions, errors and submission layouts                            |
| [GroupBox](https://gpui-kit.com/component/group-box/)               | ui-card / ui-fieldset candidates                                  | Choose framing and semantics before aliasing either component                  |
| [HoverCard](https://gpui-kit.com/component/hover-card/)             | ui-preview-card                                                   | Shared popup surface, content sizing and hover lifecycle                       |
| [Icon](https://gpui-kit.com/component/icon/)                        | ui-icon + registry                                                | Match glyph geometry/family; semantic names alone are insufficient             |
| [Image](https://gpui-kit.com/component/image/)                      | ui-image                                                          | Fit, clipping, fallback and loading geometry                                   |
| [Input](https://gpui-kit.com/component/input/)                      | ui-input, ui-input-group                                          | Shared size, affix, border, selection and invalid-state treatment              |
| [Kbd](https://gpui-kit.com/component/kbd/)                          | ui-kbd                                                            | Keycap metrics, chord layout and icon treatment                                |
| [Label](https://gpui-kit.com/component/label/)                      | ui-label                                                          | Type roles, secondary text, masking and highlight                              |
| [List](https://gpui-kit.com/component/list/)                        | Partial: option-row/tree/virtual-list                             | Reusable row anatomy, selection, metadata and trailing lanes                   |
| [Marker](https://gpui-kit.com/component/marker/)                    | Missing; badge/icon overlap                                       | Establish intended marker semantics before reusing badge                       |
| [Menu](https://gpui-kit.com/component/menu/)                        | ui-menu, ui-menu-item, ui-menu-label, ui-context-menu, ui-menubar | Shared popup and row treatment, nested menus, density, selection and focus     |
| [MessageScroller](https://gpui-kit.com/component/message-scroller/) | Partial: ui-virtual-list / ui-scroll-area                         | Tail following, prepend anchoring, variable row sizing and unread position     |
| [Message](https://gpui-kit.com/component/message/)                  | Demo-only rows around ui-bubble                                   | Promote reusable row alignment and avatar/header/content/footer contract       |
| [Notification](https://gpui-kit.com/component/notification/)        | ui-toast, ui-toast-stack                                          | Placement, shared surface, actions and timer/presence states                   |
| [NumberInput](https://gpui-kit.com/component/number-input/)         | ui-number-field                                                   | Frame, steppers, bounds and keyboard behavior                                  |
| [OtpInput](https://gpui-kit.com/component/otp-input/)               | ui-otp-field                                                      | Cell geometry, focus, paste and invalid states                                 |
| [Pagination](https://gpui-kit.com/component/pagination/)            | ui-pagination                                                     | Page/control spacing, disabled and truncated states                            |
| [Plot](https://gpui-kit.com/component/plot/)                        | Missing                                                           | Separate visualization scope; define supported plot primitives                 |
| [Popover](https://gpui-kit.com/component/popover/)                  | ui-popover                                                        | Surface, anchor gap, arrow, bounds and dismissal                               |
| [Progress](https://gpui-kit.com/component/progress/)                | ui-progress                                                       | Linear/circular scope and determinate/indeterminate geometry                   |
| [Radio](https://gpui-kit.com/component/radio/)                      | ui-radio, ui-radio-group                                          | Indicator, labels, group navigation and disabled states                        |
| [Rating](https://gpui-kit.com/component/rating/)                    | Missing                                                           | Reusable value/interaction contract, not an icon-row mockup                    |
| [Resizable](https://gpui-kit.com/component/resizable/)              | ui-resizable and children                                         | Handle, constraints, focus, keyboard resizing and nested panes                 |
| [Root View](https://gpui-kit.com/component/root/)                   | CSS/catalogue scope + overlay runtime                             | Theme, scale and overlay ownership; avoid native window API mimicry            |
| [Scrollable](https://gpui-kit.com/component/scrollable/)            | ui-scroll-area                                                    | Viewport edge, gutter, thumb, overflow and native scrolling                    |
| [Select](https://gpui-kit.com/component/select/)                    | ui-select, ui-option, ui-option-group                             | Trigger and menu geometry, selection, groups and empty states                  |
| [Settings](https://gpui-kit.com/component/settings/)                | Form compositions only                                            | Shared sections and field alignment, not product settings state                |
| [Sheet](https://gpui-kit.com/component/sheet/)                      | ui-drawer                                                         | Edge placement, surface, header/footer and resizing bounds                     |
| [Shimmer](https://gpui-kit.com/component/shimmer/)                  | ui-shimmer                                                        | Text/surface scope, timing and reduced motion                                  |
| [Sidebar](https://gpui-kit.com/component/sidebar/)                  | ui-navigation-menu; sh-triptych is Shrine-only                    | Base row and shell recipes independent of Shrine product structure             |
| [Skeleton](https://gpui-kit.com/component/skeleton/)                | ui-skeleton                                                       | Placeholder geometry and relation to loading content                           |
| [Slider](https://gpui-kit.com/component/slider/)                    | ui-slider                                                         | Track/thumb/value labels, range and keyboard behavior                          |
| [Spinner](https://gpui-kit.com/component/spinner/)                  | ui-spinner                                                        | Stroke, dimensions, timing and icon slot sizing                                |
| [StatusBar](https://gpui-kit.com/component/status-bar/)             | No shared base recipe                                             | Compact aligned lanes and boundary ownership                                   |
| [Stepper](https://gpui-kit.com/component/stepper/)                  | Missing                                                           | Verify step-navigation scope separately from number input                      |
| [Switch](https://gpui-kit.com/component/switch/)                    | ui-switch                                                         | Track/thumb proportions and checked/disabled states                            |
| [Table](https://gpui-kit.com/component/table/)                      | ui-table and six anatomy tags                                     | Table semantics, headers, row density and overflow                             |
| [Tabs](https://gpui-kit.com/component/tabs/)                        | ui-tabs, ui-tab, ui-tab-panel                                     | Tab variants, indicator, overflow, focus and panel sizing                      |
| [Tag](https://gpui-kit.com/component/tag/)                          | ui-chip / ui-badge candidates                                     | Text classification versus removable selection token                           |
| [TextView](https://gpui-kit.com/component/text-view/)               | Partial: ui-typeset                                               | Rich-text/rendering scope versus typography alone                              |
| [Textarea](https://gpui-kit.com/component/textarea/)                | ui-textarea                                                       | Multiline frame, rows, resize, placeholder and invalid states                  |
| [Theme](https://gpui-kit.com/component/theme/)                      | @mash/tokens + catalogue scope                                    | Replace visual reference values and establish coherent inheritance             |
| [TitleBar](https://gpui-kit.com/component/title-bar/)               | No base recipe                                                    | Web shell layout; native window controls remain host concerns                  |
| [Toggle](https://gpui-kit.com/component/toggle/)                    | ui-toggle, ui-toggle-group                                        | Pressed/selected treatment and group seam geometry                             |
| [Tooltip](https://gpui-kit.com/component/tooltip/)                  | ui-tooltip                                                        | Type, inset, radius, placement and focus/hover lifecycle                       |
| [Tree](https://gpui-kit.com/component/tree/)                        | ui-tree, ui-tree-item                                             | Indent, row lanes, disclosure, selection and keyboard behavior                 |
| [VirtualList](https://gpui-kit.com/component/virtual-list/)         | ui-virtual-list, ui-virtual-item                                  | Measurement, recycled content, scrolling and row geometry                      |

Mash-only surfaces are still in the [element inventory](inventory.md): toolbar,
link, separator, meter, autocomplete, input-group, path, file-upload, motion,
reveal, stagger, draggable, gesture-binding, intl-formatter, and the Shrine
elements. They require deliberate retained/merged/separate decisions; absence
from this navigation is not a reason to delete useful Web semantics.
