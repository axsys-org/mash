use super::*;

impl BaseShowcase {
    pub(in super::super) fn table(&self) -> impl IntoElement {
        Table::new("example-table")
            .w_72()
            .text_xs()
            .border_1()
            .border_color(rgb(0xe5e7eb))
            .overflow_hidden()
            .mash_node(
                &MashAdapter::embedded(),
                "ui-table",
                "root",
                self.theme,
                &MashRecipeContext::new()
                    .value("row-count", 4)
                    .value("column-count", 3),
            )
            .child(
                TableCaption::new("catalogue-caption")
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-table-caption",
                        "root",
                        self.theme,
                        &MashRecipeContext::new(),
                    )
                    .child("Native package status"),
            )
            .child(
                TableHeader::new("header")
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-table-header",
                        "root",
                        self.theme,
                        &MashRecipeContext::new(),
                    )
                    .child(
                        TableRow::new("header-row", 1)
                            .flex()
                            .bg(rgb(0xf5f5f5))
                            .mash_node(
                                &MashAdapter::embedded(),
                                "ui-table-row",
                                "root",
                                self.theme,
                                &MashRecipeContext::new().value("row-index", 0),
                            )
                            .child(
                                TableHead::new("name-head", 1)
                                    .w(px(124.))
                                    .px_2()
                                    .py_1()
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-table-head",
                                        "root",
                                        self.theme,
                                        &MashRecipeContext::new().value("column-index", 0),
                                    )
                                    .child("Component"),
                            )
                            .child(
                                TableHead::new("status-head", 2)
                                    .w(px(84.))
                                    .px_2()
                                    .py_1()
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-table-head",
                                        "root",
                                        self.theme,
                                        &MashRecipeContext::new().value("column-index", 1),
                                    )
                                    .child("Status"),
                            )
                            .child(
                                TableHead::new("version-head", 3)
                                    .w(px(92.))
                                    .px_2()
                                    .py_1()
                                    .mash_node(
                                        &MashAdapter::embedded(),
                                        "ui-table-head",
                                        "root",
                                        self.theme,
                                        &MashRecipeContext::new().value("column-index", 2),
                                    )
                                    .child("Version"),
                            ),
                    ),
            )
            .child(
                TableBody::new("body")
                    .mash_node(
                        &MashAdapter::embedded(),
                        "ui-table-body",
                        "root",
                        self.theme,
                        &MashRecipeContext::new(),
                    )
                    .children(
                        [
                            ("gpui-base", "Stable", "0.4.1"),
                            ("gpui-component", "Active", "0.4.1"),
                            ("story-web", "Preview", "0.2.8"),
                            ("gpui-web", "Beta", "0.1.0"),
                        ]
                        .into_iter()
                        .enumerate()
                        .map(|(ix, (name, status, version))| {
                            TableRow::new(("body-row", ix), ix)
                                .flex()
                                .border_t_1()
                                .border_color(rgb(0xe5e7eb))
                                .mash_node(
                                    &MashAdapter::embedded(),
                                    "ui-table-row",
                                    "root",
                                    self.theme,
                                    &MashRecipeContext::new().value("row-index", ix),
                                )
                                .child(
                                    TableCell::new("name", 1)
                                        .w(px(124.))
                                        .px_2()
                                        .py_1()
                                        .mash_node(
                                            &MashAdapter::embedded(),
                                            "ui-table-cell",
                                            "root",
                                            self.theme,
                                            &MashRecipeContext::new().value("column-index", 0),
                                        )
                                        .child(name),
                                )
                                .child(
                                    TableCell::new(("status", ix), 2)
                                        .w(px(84.))
                                        .px_2()
                                        .py_1()
                                        .mash_node(
                                            &MashAdapter::embedded(),
                                            "ui-table-cell",
                                            "root",
                                            self.theme,
                                            &MashRecipeContext::new().value("column-index", 1),
                                        )
                                        .child(
                                            div()
                                                .px_1()
                                                .border_1()
                                                .border_color(rgb(0xd4d4d4))
                                                .child(status),
                                        ),
                                )
                                .child(
                                    TableCell::new(("version", ix), 3)
                                        .w(px(92.))
                                        .px_2()
                                        .py_1()
                                        .text_color(rgb(0x737373))
                                        .mash_node(
                                            &MashAdapter::embedded(),
                                            "ui-table-cell",
                                            "root",
                                            self.theme,
                                            &MashRecipeContext::new().value("column-index", 2),
                                        )
                                        .child(version),
                                )
                        }),
                    ),
            )
    }
}
