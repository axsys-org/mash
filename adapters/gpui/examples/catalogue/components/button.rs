use gpui::relative;

use super::*;

impl BaseShowcase {
    pub(in super::super) fn button(&self) -> impl IntoElement {
        let mash = MashAdapter::embedded();
        let primary = mash
            .native_binding("button", self.theme)
            .expect("button is a pinned GPUI Base family")
            .value("variant", "primary");
        let secondary = mash
            .native_binding("button", self.theme)
            .expect("button is a pinned GPUI Base family")
            .value("variant", "secondary");
        div()
            .flex()
            .items_center()
            .gap_2()
            .child(
                primary
                    .node("ui-button", "control")
                    .expect("button control is a published Mash node")
                    .apply(
                        Button::new("primary-button")
                            .px_3()
                            .h_7()
                            .line_height(relative(1.))
                            .flex()
                            .items_center()
                            .text_xs()
                            .border_1()
                            .border_color(rgb(0x171717))
                            .bg(rgb(0x171717))
                            .text_color(rgb(0xffffff))
                            .hover(|style| style.bg(rgb(0x404040))),
                    )
                    .child("Save changes"),
            )
            .child(
                secondary
                    .node("ui-button", "control")
                    .expect("button control is a published Mash node")
                    .apply(
                        Button::new("secondary-button")
                            .px_3()
                            .h_7()
                            .line_height(relative(1.))
                            .flex()
                            .items_center()
                            .text_xs()
                            .border_1()
                            .border_color(rgb(0xd4d4d4))
                            .bg(rgb(0xffffff))
                            .hover(|style| style.bg(rgb(0xf5f5f5))),
                    )
                    .child("Cancel"),
            )
    }
}
