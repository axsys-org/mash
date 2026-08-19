//! Native Mash tree primitives.

use std::rc::Rc;

use gpui::{
    AnyElement, App, ClickEvent, ElementId, InteractiveElement as _, IntoElement,
    ParentElement as _, SharedString, StatefulInteractiveElement as _, Styled as _, Window, div,
    prelude::FluentBuilder as _, px,
};

use crate::{MashPath, MashPathSize, MashTheme};

const ROOT_FONT_SIZE: f32 = 16.0;

/// The physical scale of a tree item row.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashTreeItemSize {
    Small,
    #[default]
    Medium,
}

/// A parent-owned event emitted from a native tree item.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MashTreeItemAction {
    Select,
    Toggle { expanded: bool },
}

type TreeItemHandler = Rc<dyn Fn(MashTreeItemAction, &ClickEvent, &mut Window, &mut App)>;

/// A native semantic tree container.
///
/// `MashTree` owns only the collection surface and accessible label. Tree item
/// selection and expansion are explicit inputs so application state remains
/// the authority, just as it does for `ui-tree` and `ui-tree-item`.
pub struct MashTree {
    label: SharedString,
    items: Vec<MashTreeItem>,
}

impl MashTree {
    pub fn new(label: impl Into<SharedString>) -> Self {
        Self {
            label: label.into(),
            items: Vec::new(),
        }
    }

    pub fn item(mut self, item: MashTreeItem) -> Self {
        self.items.push(item);
        self
    }

    pub fn items(mut self, items: impl IntoIterator<Item = MashTreeItem>) -> Self {
        self.items.extend(items);
        self
    }

    pub fn element(self, theme: MashTheme) -> impl IntoElement {
        let colors = theme.colors();
        let padding = dimension(&theme, "space.controlBlock");
        let radius = dimension(&theme, "radius.container");
        let gap = dimension(&theme, "space.controlGap");

        div()
            .id(self.label.clone())
            .flex()
            .flex_col()
            .gap(px(gap))
            .p(px(padding))
            .rounded(px(radius))
            .border_1()
            .border_color(colors.border.gpui())
            .bg(colors.surface.gpui())
            .text_color(colors.text.gpui())
            .children(self.items.into_iter().map(move |item| item.element(theme)))
    }
}

/// One native Mash tree row, optionally with nested children.
///
/// Path/title fields mirror the `ui-tree-item` path presentation. The caller
/// passes `expanded`, `selected`, and `current` back on every render; action
/// callbacks ask the parent to update that state rather than mutating it here.
pub struct MashTreeItem {
    id: ElementId,
    label: SharedString,
    path: Option<SharedString>,
    title: Option<SharedString>,
    icon: Option<SharedString>,
    size: MashTreeItemSize,
    expanded: bool,
    current: bool,
    selected: bool,
    disabled: bool,
    children: Vec<MashTreeItem>,
    on_select: Option<TreeItemHandler>,
    on_toggle: Option<TreeItemHandler>,
}

impl MashTreeItem {
    pub fn new(id: impl Into<ElementId>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            path: None,
            title: None,
            icon: None,
            size: MashTreeItemSize::Medium,
            expanded: false,
            current: false,
            selected: false,
            disabled: false,
            children: Vec::new(),
            on_select: None,
            on_toggle: None,
        }
    }

    pub fn path(mut self, path: impl Into<SharedString>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn title(mut self, title: impl Into<SharedString>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn icon(mut self, icon: impl Into<SharedString>) -> Self {
        self.icon = Some(icon.into());
        self
    }

    pub fn size(mut self, size: MashTreeItemSize) -> Self {
        self.size = size;
        self
    }

    pub fn expanded(mut self, expanded: bool) -> Self {
        self.expanded = expanded;
        self
    }

    pub fn current(mut self, current: bool) -> Self {
        self.current = current;
        self
    }

    pub fn selected(mut self, selected: bool) -> Self {
        self.selected = selected;
        self
    }

    pub fn disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn child(mut self, child: MashTreeItem) -> Self {
        self.children.push(child);
        self
    }

    pub fn children(mut self, children: impl IntoIterator<Item = MashTreeItem>) -> Self {
        self.children.extend(children);
        self
    }

    pub fn on_select(
        mut self,
        callback: impl Fn(MashTreeItemAction, &ClickEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_select = Some(Rc::new(callback));
        self
    }

    pub fn on_toggle(
        mut self,
        callback: impl Fn(MashTreeItemAction, &ClickEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_toggle = Some(Rc::new(callback));
        self
    }

    pub fn element(self, theme: MashTheme) -> AnyElement {
        let colors = theme.colors();
        let has_children = !self.children.is_empty();
        let active = self.current || self.selected;
        let padding_inline = match self.size {
            MashTreeItemSize::Small => dimension(&theme, "space.controlBlockSmall"),
            MashTreeItemSize::Medium => dimension(&theme, "space.controlInlineSmall"),
        };
        let padding_block = match self.size {
            MashTreeItemSize::Small => dimension(&theme, "border.hairline"),
            MashTreeItemSize::Medium => dimension(&theme, "space.controlBlockSmall"),
        };
        let font_size = match self.size {
            MashTreeItemSize::Small => dimension(&theme, "type.labelSmall.fontSize"),
            MashTreeItemSize::Medium => dimension(&theme, "type.label.fontSize"),
        };
        let gap = dimension(&theme, "space.controlGap");
        let radius = dimension(&theme, "radius.control");
        let indent = dimension(&theme, "space.containerInline");
        let path = self.path;
        let title = self.title;
        let icon = self.icon;
        let label = self.label;
        let label_element = match path {
            Some(path) => {
                let mut locator = MashPath::new(path)
                    .size(MashPathSize::Small)
                    .current(self.current)
                    .selected(self.selected);
                if let Some(title) = title {
                    locator = locator.title(title);
                }
                if let Some(icon) = icon {
                    locator = locator.icon(icon);
                }
                locator.element(theme).into_any_element()
            }
            None => div().flex_1().min_w_0().child(label).into_any_element(),
        };
        let select = self.on_select;
        let toggle = if has_children { self.on_toggle } else { None };
        let is_interactive = !self.disabled && (select.is_some() || toggle.is_some());
        let next_expanded = !self.expanded;
        let children = self.children;

        div()
            .flex()
            .flex_col()
            .child(
                div()
                    .id(self.id)
                    .flex()
                    .items_center()
                    .gap(px(gap))
                    .px(px(padding_inline))
                    .py(px(padding_block))
                    .rounded(px(radius))
                    .bg(if active {
                        colors.surface_sunken.gpui()
                    } else {
                        colors.surface.gpui()
                    })
                    .text_color(if self.disabled {
                        colors.text_disabled.gpui()
                    } else if active {
                        colors.action.gpui()
                    } else {
                        colors.text.gpui()
                    })
                    .text_size(px(font_size))
                    .child(
                        div()
                            .flex_shrink_0()
                            .text_color(colors.text_muted.gpui())
                            .child(if has_children { "›" } else { " " }),
                    )
                    .child(label_element)
                    .when(is_interactive, move |row| {
                        let select = select.clone();
                        let toggle = toggle.clone();
                        row.cursor_pointer()
                            .hover(move |row| row.bg(colors.surface_raised.gpui()))
                            .on_click(move |event, window, cx| {
                                if let Some(toggle) = &toggle {
                                    toggle(
                                        MashTreeItemAction::Toggle {
                                            expanded: next_expanded,
                                        },
                                        event,
                                        window,
                                        cx,
                                    );
                                }
                                if let Some(select) = &select {
                                    select(MashTreeItemAction::Select, event, window, cx);
                                }
                            })
                    }),
            )
            .when(has_children && self.expanded, move |tree| {
                tree.child(
                    div()
                        .flex()
                        .flex_col()
                        .gap(px(gap))
                        .ml(px(indent))
                        .pl(px(gap))
                        .border_l_1()
                        .border_color(colors.border.gpui())
                        .children(children.into_iter().map(move |child| child.element(theme))),
                )
            })
            .into_any_element()
    }
}

fn dimension(theme: &MashTheme, id: &str) -> f32 {
    theme
        .dimension(id)
        .unwrap_or_else(|| panic!("Mash token graph must include {id}"))
        .to_px(ROOT_FONT_SIZE)
}
