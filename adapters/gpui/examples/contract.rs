use gpui::{ParentElement as _, div};
use mash_gpui::{MashAdapter, MashRecipeContext, MashStyledExt, MashTheme, base::Button};

fn main() {
    let mash = MashAdapter::embedded();
    let context = MashRecipeContext::new()
        .value("tone", "critical")
        .value("variant", "secondary");

    // gpui-base supplies native activation/focus/accessibility behavior. Mash
    // applies the `ui-button/control` semantic recipe and authored content.
    let _button = Button::new("delete")
        .mash_node(&mash, "ui-button", "control", MashTheme::Dark, &context)
        .child(div().child("Delete project"));
}
