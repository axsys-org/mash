use gpui::{IntoElement, ParentElement as _, Styled as _, div, px, rgb};
use gpui_base::{h_resizable, resizable_panel};
use mash_gpui::{MashAdapter, MashRecipeContext, MashStyledExt};

use super::super::BaseShowcase;

impl BaseShowcase {
    pub(in super::super) fn resizable(&self) -> impl IntoElement {
        div()
            .w_72()
            .h_40()
            .text_xs()
            .border_1()
            .border_color(rgb(0x171717))
            .mash_node(
                &MashAdapter::embedded(),
                "ui-resizable",
                "root",
                self.theme,
                &MashRecipeContext::new().value("orientation", "horizontal"),
            )
            .child(
                h_resizable("example-resizable")
                    .child(
                        resizable_panel()
                            .size(px(124.))
                            .size_range(px(116.)..px(210.))
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-resizable-panel",
                                "root",
                                self.theme,
                                &MashRecipeContext::new(),
                            )
                            .child(
                                div()
                                    .size_full()
                                    .relative()
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .border_r_1()
                                    .border_color(rgb(0x171717))
                                    .p_2()
                                    .items_start()
                                    .justify_start()
                                    .flex_col()
                                    .gap_1()
                                    .child(
                                        div()
                                            .absolute()
                                            .right_0()
                                            .top_0()
                                            .h_full()
                                            .w(px(1.))
                                            .mash_node(
                                                &MashAdapter::embedded(),
                                                "ui-resizable-handle",
                                                "control",
                                                self.theme,
                                                &MashRecipeContext::new()
                                                    .value("orientation", "horizontal"),
                                            ),
                                    )
                                    .child(
                                        div().text_xs().text_color(rgb(0x737373)).child("PROJECT"),
                                    )
                                    .children(["Overview", "Components", "Settings"].map(
                                        |label| {
                                            div()
                                                .w_full()
                                                .h(px(26.))
                                                .px_2()
                                                .flex()
                                                .items_center()
                                                .whitespace_nowrap()
                                                .child(label)
                                        },
                                    )),
                            ),
                    )
                    .child(
                        resizable_panel()
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-resizable-panel",
                                "root",
                                self.theme,
                                &MashRecipeContext::new(),
                            )
                            .child(
                                div()
                                    .size_full()
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .bg(rgb(0xffffff))
                                    .p_2()
                                    .items_start()
                                    .justify_start()
                                    .flex_col()
                                    .gap_2()
                                    .child(div().child("Workspace"))
                                    .child(
                                        div()
                                            .text_color(rgb(0x737373))
                                            .child("Drag the divider to resize navigation."),
                                    ),
                            ),
                    ),
            )
    }
}
