# Menu scrolling and declaration contract

`ui-menu` and `ui-context-menu` own a `ui-scroll-area` in their shadow anatomy.
Commands stay authored in the default slot. Header and footer stay outside the
scroll viewport. No application wrapper, MutationObserver or wheel handler is
needed to enable Mash scrolling.

- `sizing="content"` fits short menus. Catalogue viewport bounds limit overflow.
- The composed scroller declares `orientation="vertical" mode="scrolling"
size="medium"`; it spends no desktop scrollbar gutter.
- `viewport-role="presentation" viewport-tabindex="-1"` leaves menu semantics
  and roving focus with the menu. Standalone scroll areas remain labelled,
  keyboard-focusable regions by default.
- Public `viewport`, `block-scrollbar`, `block-track`, and `block-thumb` parts
  remain styleable. `scroll-area` exposes the controller's activity states;
  `scroll-root` is its layout boundary. A viewport is no longer a direct child
  in the menu shadow root—consumers must not depend on that private DOM path.
- Mash's `composed-scroll.css` recipe renders a medium quiet indicator that
  appears on activity and fades after the controller's idle delay. Touch and
  forced colors retain native scrolling indicators.
- A handled scrollbar key stays with the scrollbar. Menu arrows, typeahead,
  Home/End, submenus, dismissal and focus return remain menu-owned.

Other vertical compositions can use `mash-scroll-composition` with the same
exported parts. This recipe is presentation, not namespace transport, a second
scroll controller, or an application-installed enhancement.
