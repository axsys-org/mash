use super::*;

impl BaseShowcase {
    pub(in super::super) fn toast(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let visible = self.toast_visible;
        let entity = cx.entity().downgrade();
        div()
            .w_72()
            .h(px(158.))
            .text_xs()
            .relative()
            .flex()
            .items_center()
            .justify_center()
            .child(
                Button::new("show-toast")
                    .h_7()
                    .px_2()
                    .flex()
                    .items_center()
                    .justify_center()
                    .border_1()
                    .border_color(rgb(0x171717))
                    .bg(rgb(0xffffff))
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-button",
                        "control",
                        self.theme,
                        &MashRecipeContext::new().value("variant", "secondary"),
                    )
                    .child("Save changes")
                    .on_click({
                        let show_entity = entity.clone();
                        move |_, _, cx| {
                            _ = show_entity.update(cx, |this, cx| {
                                this.toast_visible = true;
                                cx.notify();
                            });
                        }
                    }),
            )
            .when(visible, |this| {
                this.child(
                    ToastStack::new("example-toast-stack", self.toast_stack.clone())
                        .absolute()
                        .right_0()
                        .bottom_0()
                        .mash_node(
                            &MashAdapter::embedded(),
                            "ui-toast-stack",
                            "root",
                            self.theme,
                            &MashRecipeContext::new().value("expanded", true),
                        )
                        .item(
                            "example-toast",
                            Toast::new("example-toast")
                                .transition_status(ToastTransitionStatus::Present)
                                .w_64()
                                .p_2()
                                .border_1()
                                .border_color(rgb(0x171717))
                                .bg(rgb(0xffffff))
                                .mash_node(
                                    &MashAdapter::embedded(),
                                    "ui-toast",
                                    "root",
                                    self.theme,
                                    &MashRecipeContext::new().value("open", visible),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .justify_between()
                                        .child(
                                            div()
                                                .font_weight(gpui::FontWeight::SEMIBOLD)
                                                .child("Changes saved"),
                                        )
                                        .child(
                                            Button::new("dismiss-toast")
                                                .size_6()
                                                .flex()
                                                .items_center()
                                                .justify_center()
                                                .mash_node(
                                                    &MashAdapter::embedded(),
                                                    "ui-button",
                                                    "control",
                                                    self.theme,
                                                    &MashRecipeContext::new()
                                                        .value("variant", "quiet"),
                                                )
                                                .child("×")
                                                .on_click({
                                                    let entity = entity.clone();
                                                    move |_, _, cx| {
                                                        _ = entity.update(cx, |this, cx| {
                                                            this.toast_visible = false;
                                                            cx.notify();
                                                        });
                                                    }
                                                }),
                                        ),
                                )
                                .child(
                                    div()
                                        .mt_1()
                                        .text_color(rgb(0x737373))
                                        .child("Your preferences are now up to date."),
                                ),
                        ),
                )
            })
    }
}
