use gpui::{
    Context, IntoElement, ParentElement as _, Styled as _, div, prelude::FluentBuilder as _, px,
    rgb,
};
use gpui_base::{Radio, RadioGroup};
use mash_gpui::{MashAdapter, MashRecipeContext, MashStyledExt};

use super::super::BaseShowcase;

impl BaseShowcase {
    pub(in super::super) fn radio_group(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let entity = cx.entity().downgrade();
        RadioGroup::new("example-radio-group")
            .w_56()
            .text_xs()
            .flex()
            .flex_col()
            .gap_2()
            .mash_node(
                &MashAdapter::embedded(),
                "ui-radio-group",
                "root",
                self.theme,
                &MashRecipeContext::new().value("value", self.radio_selected),
            )
            .child(self.radio(cx))
            .child(
                Radio::new("express-radio")
                    .checked(self.radio_selected == 1)
                    .on_change(move |next, _, _, cx| {
                        if next {
                            _ = entity.update(cx, |this, cx| {
                                this.radio_selected = 1;
                                cx.notify();
                            });
                        }
                    })
                    .flex()
                    .items_start()
                    .gap_2()
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-radio",
                        "root",
                        self.theme,
                        &MashRecipeContext::new().value("checked", self.radio_selected == 1),
                    )
                    .child(
                        div()
                            .mt(px(2.))
                            .flex()
                            .items_center()
                            .justify_center()
                            .size(px(14.))
                            .border_1()
                            .border_color(rgb(0x171717))
                            .when(self.radio_selected == 1, |this| {
                                this.child(div().size(px(6.)).bg(rgb(0x171717)))
                            }),
                    )
                    .child(
                        div().child("Express").child(
                            div()
                                .text_xs()
                                .text_color(rgb(0x737373))
                                .child("Next business day"),
                        ),
                    ),
            )
            .child(
                Radio::new("pickup-radio")
                    .disabled(true)
                    .flex()
                    .items_start()
                    .gap_2()
                    .opacity(0.45)
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-radio",
                        "root",
                        self.theme,
                        &MashRecipeContext::new().value("disabled", true),
                    )
                    .child(
                        div()
                            .mt(px(2.))
                            .size(px(14.))
                            .border_1()
                            .border_color(rgb(0x171717)),
                    )
                    .child(
                        div()
                            .child("Local pickup")
                            .child(div().text_xs().child("Currently unavailable")),
                    ),
            )
    }
}
