//! Native Shrine Myth record primitives.

use gpui::{
    AnyElement, IntoElement as _, ParentElement as _, SharedString, Styled as _, div,
    prelude::FluentBuilder as _, px,
};

use crate::{MashBadge, MashTheme};

const ROOT_FONT_SIZE: f32 = 16.0;

/// The named label of one native Shrine record field.
pub struct MashSlot {
    title: SharedString,
}

impl MashSlot {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
        }
    }

    pub fn element(self, theme: MashTheme) -> impl gpui::IntoElement {
        div()
            .min_w_0()
            .text_color(theme.colors().text_muted.gpui())
            .text_size(px(dimension(&theme, "type.code.fontSize")))
            .child(self.title)
    }
}

/// The readable value held by one native Shrine record field.
pub struct MashPail {
    text: SharedString,
}

impl MashPail {
    pub fn new(text: impl Into<SharedString>) -> Self {
        Self { text: text.into() }
    }

    pub fn element(self, theme: MashTheme) -> impl gpui::IntoElement {
        div()
            .min_w_0()
            .text_color(theme.colors().text.gpui())
            .text_size(px(dimension(&theme, "type.body.fontSize")))
            .child(self.text)
    }
}

/// A labelled native Shrine record field.
pub struct MashLimb {
    slot: MashSlot,
    pail: MashPail,
}

impl MashLimb {
    pub fn new(slot: MashSlot, pail: MashPail) -> Self {
        Self { slot, pail }
    }

    pub fn field(label: impl Into<SharedString>, value: impl Into<SharedString>) -> Self {
        Self::new(MashSlot::new(label), MashPail::new(value))
    }

    pub fn element(self, theme: MashTheme) -> AnyElement {
        let gap = dimension(&theme, "space.inline");

        div()
            .flex()
            .items_baseline()
            .gap(px(gap))
            .child(self.slot.element(theme))
            .child(self.pail.element(theme))
            .into_any_element()
    }
}

/// A native Shrine record identity with composed field limbs.
///
/// This is the GPUI implementation of `sh-myth`. The web component's named
/// slots become the typed [`MashLimb`] builder, retaining structured values
/// without giving native callers a DOM-shaped API.
pub struct MashMyth {
    kind: Option<SharedString>,
    title: SharedString,
    path: Option<SharedString>,
    limbs: Vec<MashLimb>,
}

impl MashMyth {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            kind: None,
            title: title.into(),
            path: None,
            limbs: Vec::new(),
        }
    }

    pub fn kind(mut self, kind: impl Into<SharedString>) -> Self {
        self.kind = Some(kind.into());
        self
    }

    pub fn path(mut self, path: impl Into<SharedString>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn limb(mut self, limb: MashLimb) -> Self {
        self.limbs.push(limb);
        self
    }

    pub fn field(self, label: impl Into<SharedString>, value: impl Into<SharedString>) -> Self {
        self.limb(MashLimb::field(label, value))
    }

    pub fn element(self, theme: MashTheme) -> impl gpui::IntoElement {
        let colors = theme.colors();
        let inset = dimension(&theme, "space.containerInline");
        let header_gap = dimension(&theme, "space.containerGap");
        let control_gap = dimension(&theme, "space.controlGap");
        let stack = dimension(&theme, "space.stack");
        let radius = dimension(&theme, "radius.container");
        let heading = dimension(&theme, "type.heading.fontSize");
        let path_size = dimension(&theme, "type.code.fontSize");

        div()
            .flex()
            .flex_col()
            .gap(px(control_gap))
            .p(px(inset))
            .rounded(px(radius))
            .border_1()
            .border_color(colors.border.gpui())
            .bg(colors.surface.gpui())
            .child(
                div()
                    .flex()
                    .items_start()
                    .justify_between()
                    .gap(px(header_gap))
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(control_gap))
                            .min_w_0()
                            .text_color(colors.text.gpui())
                            .text_size(px(heading))
                            .child(self.title)
                            .when_some(self.path, |identity, path| {
                                identity.child(
                                    div()
                                        .text_color(colors.text_muted.gpui())
                                        .text_size(px(path_size))
                                        .child(path),
                                )
                            }),
                    )
                    .when_some(self.kind, |header, kind| {
                        header.child(MashBadge::new(kind).element(theme))
                    }),
            )
            .when(!self.limbs.is_empty(), |myth| {
                myth.child(
                    div()
                        .flex()
                        .flex_col()
                        .gap(px(control_gap))
                        .mt(px(stack))
                        .children(self.limbs.into_iter().map(move |limb| limb.element(theme))),
                )
            })
    }
}

fn dimension(theme: &MashTheme, id: &str) -> f32 {
    theme
        .dimension(id)
        .unwrap_or_else(|| panic!("Mash token graph must include {id}"))
        .to_px(ROOT_FONT_SIZE)
}
