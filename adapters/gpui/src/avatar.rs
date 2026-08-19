//! Native Mash avatar primitive.

use gpui::{
    AnyElement, IntoElement, ObjectFit, ParentElement as _, SharedString, Styled as _,
    StyledImage as _, div, img, px,
};

use crate::MashTheme;

const ROOT_FONT_SIZE: f32 = 16.0;

/// The physical scale of an avatar.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashAvatarSize {
    Small,
    #[default]
    Medium,
    Large,
}

/// A native person, team, or agent identity with image fallback.
///
/// The fallback is always supplied by the caller. When an image source cannot
/// load, GPUI's image fallback returns to that same content rather than
/// exposing a broken-image surface.
pub struct MashAvatar {
    fallback: SharedString,
    source: Option<SharedString>,
    size: MashAvatarSize,
}

impl MashAvatar {
    pub fn new(fallback: impl Into<SharedString>) -> Self {
        Self {
            fallback: fallback.into(),
            source: None,
            size: MashAvatarSize::Medium,
        }
    }

    pub fn source(mut self, source: impl Into<SharedString>) -> Self {
        self.source = Some(source.into());
        self
    }

    pub fn size(mut self, size: MashAvatarSize) -> Self {
        self.size = size;
        self
    }

    pub fn element(self, theme: MashTheme) -> impl IntoElement {
        let colors = theme.colors();
        let size = match self.size {
            MashAvatarSize::Small => dimension(&theme, "space.containerInline"),
            MashAvatarSize::Medium => {
                dimension(&theme, "space.containerInline")
                    + dimension(&theme, "space.controlInline")
            }
            MashAvatarSize::Large => dimension(&theme, "space.containerInline") * 2.0,
        };
        let font_size = match self.size {
            MashAvatarSize::Small => dimension(&theme, "type.labelSmall.fontSize"),
            MashAvatarSize::Medium | MashAvatarSize::Large => {
                dimension(&theme, "type.label.fontSize")
            }
        };
        let fallback = self.fallback;
        let content: AnyElement = match self.source {
            Some(source) => img(source)
                .absolute()
                .inset_0()
                .w_full()
                .h_full()
                .object_fit(ObjectFit::Cover)
                .with_fallback(move || {
                    div()
                        .size_full()
                        .flex()
                        .items_center()
                        .justify_center()
                        .child(fallback.clone())
                        .into_any_element()
                })
                .into_any_element(),
            None => div()
                .size_full()
                .flex()
                .items_center()
                .justify_center()
                .child(fallback)
                .into_any_element(),
        };

        div()
            .relative()
            .flex_shrink_0()
            .size(px(size))
            .overflow_hidden()
            .rounded_full()
            .border_1()
            .border_color(colors.border.gpui())
            .bg(colors.surface_sunken.gpui())
            .text_color(colors.text.gpui())
            .text_size(px(font_size))
            .child(content)
    }
}

fn dimension(theme: &MashTheme, id: &str) -> f32 {
    theme
        .dimension(id)
        .unwrap_or_else(|| panic!("Mash token graph must include {id}"))
        .to_px(ROOT_FONT_SIZE)
}
