use gpui::{IntoElement, ParentElement as _, Styled as _, div, px, rgb};
use gpui_base::{Progress, ProgressIndicator, ProgressTrack};
use mash_gpui::{MashAdapter, MashRecipeContext, MashStyledExt};

use super::super::BaseShowcase;

impl BaseShowcase {
    pub(in super::super) fn progress(&self) -> impl IntoElement {
        div()
            .w_64()
            .flex()
            .flex_col()
            .gap_2()
            .text_xs()
            .child(
                div()
                    .flex()
                    .justify_between()
                    .child("Uploading assets")
                    .child("68%"),
            )
            .child(
                Progress::new("example-progress")
                    .value(68.)
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-progress",
                        "root",
                        self.theme,
                        &MashRecipeContext::new().value("value", 68),
                    )
                    .child(
                        ProgressTrack::new()
                            .w_full()
                            .h(px(7.))
                            .border_1()
                            .border_color(rgb(0x171717))
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-progress",
                                "track",
                                self.theme,
                                &MashRecipeContext::new(),
                            )
                            .child(
                                ProgressIndicator::new()
                                    .w(px(177.))
                                    .h_full()
                                    .bg(rgb(0x171717))
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-progress",
                                        "indicator",
                                        self.theme,
                                        &MashRecipeContext::new().value("value", 68),
                                    ),
                            ),
                    ),
            )
            .child(
                div()
                    .flex()
                    .justify_between()
                    .text_sm()
                    .text_color(rgb(0x737373))
                    .child("Optimizing bundle")
                    .child("32%"),
            )
            .child(
                Progress::new("example-progress-secondary")
                    .value(32.)
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-progress",
                        "root",
                        self.theme,
                        &MashRecipeContext::new()
                            .value("value", 32)
                            .value("tone", "neutral"),
                    )
                    .child(
                        ProgressTrack::new()
                            .w_full()
                            .h(px(6.))
                            .border_1()
                            .border_color(rgb(0xa3a3a3))
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-progress",
                                "track",
                                self.theme,
                                &MashRecipeContext::new(),
                            )
                            .child(
                                ProgressIndicator::new()
                                    .w(px(83.))
                                    .h_full()
                                    .bg(rgb(0x737373))
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-progress",
                                        "indicator",
                                        self.theme,
                                        &MashRecipeContext::new()
                                            .value("value", 32)
                                            .value("tone", "neutral"),
                                    ),
                            ),
                    ),
            )
    }
}
