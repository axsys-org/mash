//! The shared Mash foundations surface used by both the native example and the
//! WebAssembly entrypoint.
//!
//! Keeping this view in the library makes the browser build a runtime target,
//! not a second implementation or a browser-only approximation.

use gpui::{Context, IntoElement, Render, Window, div, prelude::*, px};

use crate::{MashButton, MashButtonSize, MashButtonVariant, MashTheme, MashThemeMode};

/// A small interactive proof that the generated Mash token graph works in a
/// GPUI renderer. Products compose their own views from the same primitives.
pub struct Foundations {
    mode: MashThemeMode,
}

impl Foundations {
    pub fn new() -> Self {
        Self::with_mode(MashThemeMode::Light)
    }

    pub fn with_mode(mode: MashThemeMode) -> Self {
        Self { mode }
    }

    fn theme(&self) -> MashTheme {
        MashTheme::for_mode(self.mode)
    }

    fn toggle_mode(&mut self, _: &mut Window, cx: &mut Context<Self>) {
        self.mode = match self.mode {
            MashThemeMode::Light => MashThemeMode::Dark,
            MashThemeMode::Dark => MashThemeMode::Light,
        };
        cx.notify();
    }
}

impl Default for Foundations {
    fn default() -> Self {
        Self::new()
    }
}

impl Render for Foundations {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.theme();
        let colors = theme.colors();
        let inset = theme
            .dimension("space.containerInline")
            .expect("Mash tokens include container inline spacing")
            .to_px(16.0);
        let gap = theme
            .dimension("space.controlGap")
            .expect("Mash tokens include control gaps")
            .to_px(16.0);
        let heading = theme
            .dimension("type.heading.fontSize")
            .expect("Mash tokens include heading font size")
            .to_px(16.0);

        div()
            .id("mash-foundations")
            .size_full()
            .flex()
            .flex_col()
            .gap(px(gap))
            .p(px(inset))
            .bg(colors.canvas.gpui())
            .text_color(colors.text.gpui())
            .child(
                div()
                    .flex()
                    .items_center()
                    .justify_between()
                    .child(div().text_size(px(heading)).child("Mash × GPUI"))
                    .child(
                        MashButton::new("toggle-theme", format!("Use {:?}", self.mode))
                            .variant(MashButtonVariant::Secondary)
                            .size(MashButtonSize::Small)
                            .on_click(
                                cx.listener(|this, _, window, cx| this.toggle_mode(window, cx)),
                            )
                            .element(theme),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap(px(gap))
                    .p(px(inset))
                    .rounded(px(theme
                        .dimension("radius.container")
                        .expect("Mash tokens include container radius")
                        .to_px(16.0)))
                    .bg(colors.surface.gpui())
                    .border_1()
                    .border_color(colors.border.gpui())
                    .child(
                        div()
                            .text_color(colors.text_muted.gpui())
                            .child("Semantic buttons"),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_wrap()
                            .gap(px(gap))
                            .child(MashButton::new("primary", "Primary").element(theme))
                            .child(
                                MashButton::new("secondary", "Secondary")
                                    .variant(MashButtonVariant::Secondary)
                                    .element(theme),
                            )
                            .child(
                                MashButton::new("quiet", "Quiet")
                                    .variant(MashButtonVariant::Quiet)
                                    .element(theme),
                            )
                            .child(
                                MashButton::new("positive", "Positive")
                                    .variant(MashButtonVariant::Positive)
                                    .element(theme),
                            )
                            .child(
                                MashButton::new("warning", "Warning")
                                    .variant(MashButtonVariant::Warning)
                                    .element(theme),
                            )
                            .child(
                                MashButton::new("critical", "Critical")
                                    .variant(MashButtonVariant::Critical)
                                    .element(theme),
                            )
                            .child(
                                MashButton::new("disabled", "Disabled")
                                    .disabled(true)
                                    .element(theme),
                            ),
                    ),
            )
    }
}
