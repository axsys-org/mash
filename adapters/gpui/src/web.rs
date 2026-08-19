//! The browser host for Mash's GPUI foundations proof.
//!
//! `gpui-component::Root` owns window-level mechanics such as focus and
//! overlays. The nested `Foundations` view remains a Mash-owned primitive
//! surface and resolves every visual value through Mash tokens.

use std::cell::RefCell;

use gpui::{App, AppContext as _, ApplicationHandle, WindowOptions};
use wasm_bindgen::prelude::*;

use crate::Foundations;

thread_local! {
    static APPLICATION: RefCell<Option<ApplicationHandle>> = const { RefCell::new(None) };
}

/// Start Mash's GPUI foundations proof inside the browser canvas.
///
/// The application handle is retained for the life of the page; otherwise it
/// would be dropped as soon as this WebAssembly export returns.
#[wasm_bindgen]
pub fn run(prefers_dark: bool) -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    let _ = console_log::init_with_level(log::Level::Info);
    tracing_wasm::set_as_global_default();

    gpui_platform::web_init();
    let app = gpui_platform::single_threaded_web();
    let launch = move |cx: &mut App| {
        gpui_component::init(cx);
        cx.open_window(WindowOptions::default(), |window, cx| {
            let mode = prefers_dark
                .then_some(crate::MashThemeMode::Dark)
                .unwrap_or_default();
            let foundations = cx.new(|_| Foundations::with_mode(mode));
            cx.new(|cx| gpui_component::Root::new(foundations, window, cx).bordered(false))
        })
        .expect("open Mash foundations window");
        cx.activate(true);
    };

    APPLICATION.with(|application| {
        *application.borrow_mut() = Some(app.run_embedded(launch));
    });
    Ok(())
}
