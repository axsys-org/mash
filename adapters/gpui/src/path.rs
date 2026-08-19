//! Native Mash path primitive.

use gpui::{
    IntoElement, ParentElement as _, SharedString, Styled as _, div, prelude::FluentBuilder as _,
    px,
};

use crate::MashTheme;

const ROOT_FONT_SIZE: f32 = 16.0;

/// The physical context where a path preview appears.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashPathSize {
    Small,
    #[default]
    Medium,
}

/// A native Shrine path locator or tree-item label.
///
/// Mirrors `ui-path`: `title` supplies a human-readable label while `path`
/// remains the canonical identity, and `current`/`selected` are parent-owned
/// state inputs rather than navigation policy.
pub struct MashPath {
    path: SharedString,
    title: Option<SharedString>,
    icon: Option<SharedString>,
    size: MashPathSize,
    current: bool,
    selected: bool,
}

impl MashPath {
    pub fn new(path: impl Into<SharedString>) -> Self {
        Self {
            path: path.into(),
            title: None,
            icon: None,
            size: MashPathSize::Medium,
            current: false,
            selected: false,
        }
    }

    pub fn title(mut self, title: impl Into<SharedString>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn icon(mut self, icon: impl Into<SharedString>) -> Self {
        self.icon = Some(icon.into());
        self
    }

    pub fn size(mut self, size: MashPathSize) -> Self {
        self.size = size;
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

    pub fn element(self, theme: MashTheme) -> impl IntoElement {
        let colors = theme.colors();
        let compact = self.size == MashPathSize::Small;
        let active = self.current || self.selected;
        let padding_inline = if compact {
            dimension(&theme, "space.controlInlineSmall")
        } else {
            dimension(&theme, "space.controlInline")
        };
        let padding_block = if compact {
            dimension(&theme, "space.controlBlockSmall")
        } else {
            dimension(&theme, "space.controlBlock")
        };
        let font_size = if compact {
            dimension(&theme, "type.labelSmall.fontSize")
        } else {
            dimension(&theme, "type.label.fontSize")
        };
        let radius = dimension(&theme, "radius.control");
        let gap = dimension(&theme, "space.controlGap");
        let label = self.title.unwrap_or(self.path);

        div()
            .flex()
            .items_center()
            .gap(px(gap))
            .px(px(padding_inline))
            .py(px(padding_block))
            .rounded(px(radius))
            .when(!compact, |path| {
                path.border_1().border_color(if active {
                    colors.border_strong.gpui()
                } else {
                    colors.border.gpui()
                })
            })
            .when(active, |path| path.bg(colors.surface_sunken.gpui()))
            .when(!compact && !active, |path| path.bg(colors.surface.gpui()))
            .text_color(colors.text.gpui())
            .text_size(px(font_size))
            .when_some(self.icon, |path, icon| {
                path.child(
                    div()
                        .flex_shrink_0()
                        .text_color(colors.text_muted.gpui())
                        .child(icon),
                )
            })
            .child(label)
    }
}

fn dimension(theme: &MashTheme, id: &str) -> f32 {
    theme
        .dimension(id)
        .unwrap_or_else(|| panic!("Mash token graph must include {id}"))
        .to_px(ROOT_FONT_SIZE)
}
