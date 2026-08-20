use gpui::{
    InteractiveElement as _, IntoElement, ParentElement as _, Styled as _, div, relative, rgb,
};
use gpui_base::{Button, Popover};
use mash_gpui::{MashAdapter, MashRecipeContext, MashStyledExt};

use super::super::BaseShowcase;

impl BaseShowcase {
    pub(in super::super) fn popover(&self) -> impl IntoElement {
        let theme = self.theme;
        div()
            .mash_node(
                &MashAdapter::embedded(),
                "ui-popover",
                "root",
                theme,
                &MashRecipeContext::new(),
            )
            .child(
                Popover::new("example-popover")
                    .trigger(
                        Button::new("popover-trigger")
                            .h_7()
                            .line_height(relative(1.))
                            .px_3()
                            .flex()
                            .items_center()
                            .justify_center()
                            .bg(gpui::black())
                            .text_color(gpui::white())
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-button",
                                "control",
                                theme,
                                &MashRecipeContext::new().value("variant", "primary"),
                            )
                            .child("Open Popover"),
                    )
                    .content(move |_, _, cx| {
                        let state = cx.entity().downgrade();
                        div()
                            .id("popover-content")
                            .w_64()
                            .p_2()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .text_xs()
                            .bg(rgb(0xffffff))
                            .border_1()
                            .border_color(rgb(0xd4d4d4))
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-popover",
                                "popup",
                                theme,
                                &MashRecipeContext::new().value("open", true),
                            )
                            .child("Workspace access")
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgb(0x737373))
                                    .child("Anyone with the link can view."),
                            )
                            .child(
                                div().mt_1().flex().justify_end().child(
                                    Button::new("popover-done")
                                        .h_7()
                                        .line_height(relative(1.))
                                        .px_3()
                                        .flex()
                                        .items_center()
                                        .justify_center()
                                        .bg(gpui::black())
                                        .text_color(gpui::white())
                                        .mash_node(
                                            &MashAdapter::embedded(),
                                            "ui-button",
                                            "control",
                                            theme,
                                            &MashRecipeContext::new().value("variant", "primary"),
                                        )
                                        .on_click(move |_, window, cx| {
                                            _ = state
                                                .update(cx, |state, cx| state.dismiss(window, cx));
                                        })
                                        .child("Done"),
                                ),
                            )
                    }),
            )
    }
}
