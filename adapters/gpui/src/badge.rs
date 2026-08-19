//! Native Mash badge primitive.

use gpui::{IntoElement, ParentElement as _, SharedString, Styled as _, div, px};

use crate::{MashColor, MashTheme, SemanticColors};

const ROOT_FONT_SIZE: f32 = 16.0;

/// The semantic meaning carried by a compact Mash badge.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashBadgeTone {
    #[default]
    Accent,
    Neutral,
    Positive,
    Warning,
    Critical,
}

/// The physical scale of a Mash badge.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashBadgeSize {
    Small,
    #[default]
    Medium,
}

/// A compact native label for category, count, or stable workflow state.
///
/// This is the GPUI implementation of the `ui-badge` contract. It is not an
/// action control; use [`crate::MashButton`] for activation.
pub struct MashBadge {
    label: SharedString,
    tone: MashBadgeTone,
    size: MashBadgeSize,
}

impl MashBadge {
    pub fn new(label: impl Into<SharedString>) -> Self {
        Self {
            label: label.into(),
            tone: MashBadgeTone::Accent,
            size: MashBadgeSize::Medium,
        }
    }

    pub fn tone(mut self, tone: MashBadgeTone) -> Self {
        self.tone = tone;
        self
    }

    pub fn size(mut self, size: MashBadgeSize) -> Self {
        self.size = size;
        self
    }

    pub fn element(self, theme: MashTheme) -> impl IntoElement {
        let colors = badge_colors(self.tone, theme.colors());
        let padding_inline = match self.size {
            MashBadgeSize::Small => dimension(&theme, "space.controlBlockSmall"),
            MashBadgeSize::Medium => dimension(&theme, "space.controlInlineSmall"),
        };
        let padding_block = match self.size {
            MashBadgeSize::Small => dimension(&theme, "border.hairline"),
            MashBadgeSize::Medium => dimension(&theme, "space.controlBlockSmall"),
        };
        let font_size = dimension(&theme, "type.labelSmall.fontSize");
        let radius = dimension(&theme, "radius.pill");

        div()
            .flex()
            .flex_shrink_0()
            .items_center()
            .px(px(padding_inline))
            .py(px(padding_block))
            .rounded(px(radius))
            .bg(colors.background.gpui())
            .text_color(colors.foreground.gpui())
            .text_size(px(font_size))
            .child(self.label)
    }
}

#[derive(Clone, Copy)]
struct BadgeColors {
    background: MashColor,
    foreground: MashColor,
}

fn badge_colors(tone: MashBadgeTone, colors: SemanticColors) -> BadgeColors {
    match tone {
        MashBadgeTone::Accent => BadgeColors {
            background: colors.action,
            foreground: colors.on_action,
        },
        MashBadgeTone::Neutral => BadgeColors {
            background: colors.neutral,
            foreground: colors.on_neutral,
        },
        MashBadgeTone::Positive => BadgeColors {
            background: colors.positive,
            foreground: colors.on_positive,
        },
        MashBadgeTone::Warning => BadgeColors {
            background: colors.warning,
            foreground: colors.on_warning,
        },
        MashBadgeTone::Critical => BadgeColors {
            background: colors.critical,
            foreground: colors.on_critical,
        },
    }
}

fn dimension(theme: &MashTheme, id: &str) -> f32 {
    theme
        .dimension(id)
        .unwrap_or_else(|| panic!("Mash token graph must include {id}"))
        .to_px(ROOT_FONT_SIZE)
}
