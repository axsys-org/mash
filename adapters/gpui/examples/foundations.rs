//! Run with `cargo run --manifest-path adapters/gpui/Cargo.toml --example foundations`.
//!
//! This is deliberately a small visual proof: swapping the mode updates the
//! canvas, text, surfaces, and every semantic MashButton state from the same
//! generated token graph that drives the web CSS.

use gpui::{App, AppContext as _, Bounds, WindowBounds, WindowOptions, px, size};
use gpui_platform::application;
use mash_gpui::Foundations;

fn main() {
    application().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(760.0), px(420.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                ..Default::default()
            },
            |_, cx| cx.new(|_| Foundations::new()),
        )
        .expect("open Mash foundations window");
        cx.activate(true);
    });
}
