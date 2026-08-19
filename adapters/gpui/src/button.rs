//! A first token-driven GPUI primitive.
//!
//! `MashButton` deliberately owns presentation (Mash semantic tokens) while
//! keeping product action handling as a caller-supplied callback. That lets it
//! compose with an application's GPUI state and, later, gpui-component's higher
//! level interactions without either library becoming Mash's token authority.

use std::rc::Rc;

use gpui::{
    App, ClickEvent, ElementId, InteractiveElement as _, IntoElement, ParentElement as _,
    SharedString, StatefulInteractiveElement as _, Styled as _, Window, div,
    prelude::FluentBuilder as _, px,
};

use crate::{MashColor, MashTheme, SemanticColors};

const ROOT_FONT_SIZE: f32 = 16.0;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashButtonVariant {
    #[default]
    Primary,
    Secondary,
    Quiet,
    Positive,
    Warning,
    Critical,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashButtonSize {
    Small,
    #[default]
    Medium,
    Large,
}

#[derive(Clone, Copy)]
struct ButtonColors {
    background: MashColor,
    hover: MashColor,
    pressed: MashColor,
    foreground: MashColor,
    border: MashColor,
}

type ClickHandler = Rc<dyn Fn(&ClickEvent, &mut Window, &mut App)>;

/// A platform-native button whose visual states resolve exclusively through
/// Mash semantic roles.
pub struct MashButton {
    id: ElementId,
    label: SharedString,
    variant: MashButtonVariant,
    size: MashButtonSize,
    disabled: bool,
    on_click: Option<ClickHandler>,
}

impl MashButton {
    pub fn new(id: impl Into<ElementId>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            variant: MashButtonVariant::Primary,
            size: MashButtonSize::Medium,
            disabled: false,
            on_click: None,
        }
    }

    pub fn variant(mut self, variant: MashButtonVariant) -> Self {
        self.variant = variant;
        self
    }

    pub fn size(mut self, size: MashButtonSize) -> Self {
        self.size = size;
        self
    }

    pub fn disabled(mut self, disabled: bool) -> Self {
        self.disabled = disabled;
        self
    }

    pub fn on_click(
        mut self,
        callback: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_click = Some(Rc::new(callback));
        self
    }

    /// Render the button with the caller's selected Mash theme.
    pub fn element(self, theme: MashTheme) -> impl IntoElement {
        let colors = button_colors(self.variant, theme.colors());
        let (padding_inline, padding_block, font_size) = match self.size {
            MashButtonSize::Small => (
                theme.dimension("space.controlInlineSmall"),
                theme.dimension("space.controlBlockSmall"),
                theme.dimension("type.labelSmall.fontSize"),
            ),
            MashButtonSize::Medium => (
                theme.dimension("space.controlInline"),
                theme.dimension("space.controlBlock"),
                theme.dimension("type.label.fontSize"),
            ),
            MashButtonSize::Large => (
                theme.dimension("space.controlInlineLarge"),
                theme.dimension("space.controlBlockLarge"),
                theme.dimension("type.labelLarge.fontSize"),
            ),
        };
        let radius = theme
            .dimension("radius.control")
            .expect("Mash token graph must include radius.control");
        let padding_inline = padding_inline
            .expect("Mash token graph must include control inline spacing")
            .to_px(ROOT_FONT_SIZE);
        let padding_block = padding_block
            .expect("Mash token graph must include control block spacing")
            .to_px(ROOT_FONT_SIZE);
        let font_size = font_size
            .expect("Mash token graph must include label font sizes")
            .to_px(ROOT_FONT_SIZE);

        div()
            .id(self.id)
            .flex()
            .flex_shrink_0()
            .items_center()
            .justify_center()
            .px(px(padding_inline))
            .py(px(padding_block))
            .rounded(px(radius.to_px(ROOT_FONT_SIZE)))
            .border_1()
            .bg(colors.background.gpui())
            .border_color(colors.border.gpui())
            .text_color(colors.foreground.gpui())
            .text_size(px(font_size))
            .when(!self.disabled, |button| {
                button
                    .cursor_pointer()
                    .hover(move |button| button.bg(colors.hover.gpui()))
                    .active(move |button| button.bg(colors.pressed.gpui()))
                    .when_some(self.on_click, |button, callback| {
                        button.on_click(move |event, window, cx| callback(event, window, cx))
                    })
            })
            .when(self.disabled, |button| button.opacity(0.5))
            .child(self.label)
    }
}

fn button_colors(variant: MashButtonVariant, colors: SemanticColors) -> ButtonColors {
    match variant {
        MashButtonVariant::Primary => ButtonColors {
            background: colors.action,
            hover: colors.action_hover,
            pressed: colors.action_pressed,
            foreground: colors.on_action,
            border: colors.action,
        },
        MashButtonVariant::Secondary => ButtonColors {
            background: colors.surface,
            hover: colors.surface_raised,
            pressed: colors.surface_sunken,
            foreground: colors.text,
            border: colors.border,
        },
        MashButtonVariant::Quiet => ButtonColors {
            background: colors.surface_sunken,
            hover: colors.surface,
            pressed: colors.surface_raised,
            foreground: colors.text,
            border: colors.surface_sunken,
        },
        MashButtonVariant::Positive => ButtonColors {
            background: colors.positive,
            hover: colors.positive_hover,
            pressed: colors.positive_pressed,
            foreground: colors.on_positive,
            border: colors.positive,
        },
        MashButtonVariant::Warning => ButtonColors {
            background: colors.warning,
            hover: colors.warning_hover,
            pressed: colors.warning_pressed,
            foreground: colors.on_warning,
            border: colors.warning,
        },
        MashButtonVariant::Critical => ButtonColors {
            background: colors.critical,
            hover: colors.critical_hover,
            pressed: colors.critical_pressed,
            foreground: colors.on_critical,
            border: colors.critical,
        },
    }
}
