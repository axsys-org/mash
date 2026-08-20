use super::*;

impl BaseShowcase {
    pub(in super::super) fn tabs(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected_tab;
        div()
            .w_72()
            .text_xs()
            .border_1()
            .border_color(rgb(0xd4d4d4))
            .child(
                Tabs::new("example-tabs")
                    .flex()
                    .px_2()
                    .pt_1()
                    .border_b_1()
                    .border_color(rgb(0xd4d4d4))
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-tabs",
                        "root",
                        self.theme,
                        &MashRecipeContext::new().value("value", selected),
                    )
                    .children(
                        ["Overview", "Activity", "Settings"]
                            .into_iter()
                            .enumerate()
                            .map(|(index, label)| {
                                let entity = cx.entity().downgrade();
                                Tab::new(index)
                                    .selected(self.selected_tab == index)
                                    .px_2()
                                    .h_7()
                                    .flex()
                                    .items_center()
                                    .border_b_2()
                                    .border_color(if self.selected_tab == index {
                                        rgb(0x171717)
                                    } else {
                                        rgb(0xffffff)
                                    })
                                    .when(self.selected_tab == index, |this| {
                                        this.font_weight(gpui::FontWeight::SEMIBOLD)
                                    })
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-tab",
                                        "control",
                                        self.theme,
                                        &MashRecipeContext::new()
                                            .value("selected", self.selected_tab == index)
                                            .value("value", index),
                                    )
                                    .on_click(move |_, _, cx| {
                                        _ = entity.update(cx, |this, cx| {
                                            this.selected_tab = index;
                                            cx.notify();
                                        });
                                    })
                                    .child(label)
                            }),
                    ),
            )
            .child(
                div()
                    .min_h_20()
                    .p_3()
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-tab-panel",
                        "root",
                        self.theme,
                        &MashRecipeContext::new()
                            .value("value", selected)
                            .value("selected", true),
                    )
                    .child(match selected {
                        0 => div().child("Workspace overview").child(
                            div()
                                .mt_1()
                                .text_color(rgb(0x737373))
                                .child("12 components · 4 contributors · updated today"),
                        ),
                        1 => div().child("Recent activity").child(
                            div()
                                .mt_1()
                                .text_color(rgb(0x737373))
                                .child("Button example was updated 8 minutes ago."),
                        ),
                        _ => div().child("Project settings").child(
                            div()
                                .mt_1()
                                .text_color(rgb(0x737373))
                                .child("Manage notifications and member access."),
                        ),
                    }),
            )
    }
}
