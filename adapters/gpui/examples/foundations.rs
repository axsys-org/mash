//! Run with `cargo run --manifest-path adapters/gpui/Cargo.toml --example foundations`.
//!
//! This is deliberately a small visual proof: swapping the mode updates the
//! canvas, text, surfaces, and every semantic MashButton state from the same
//! generated token graph that drives the web CSS.

use gpui::{
    App, Bounds, Context, IntoElement, Render, Window, WindowBounds, WindowOptions, div,
    prelude::*, px, size,
};
use gpui_platform::application;
use mash_gpui::{MashButton, MashButtonSize, MashButtonVariant, MashTheme, MashThemeMode};

struct Foundations {
    mode: MashThemeMode,
}

impl Foundations {
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

fn main() {
    application().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(760.0), px(420.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                ..Default::default()
            },
            |_, cx| {
                cx.new(|_| Foundations {
                    mode: MashThemeMode::Light,
                })
            },
        )
        .expect("open Mash foundations window");
        cx.activate(true);
    });
}
