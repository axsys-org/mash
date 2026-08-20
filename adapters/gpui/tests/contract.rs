use gpui::ParentElement as _;
use std::collections::BTreeSet;

use mash_gpui::{
    GPUI_STYLED_TRAITS, MashAdapter, MashRecipeContext, MashStyledExt, MashTheme,
    RendererEventSnapshot, RendererNodeSnapshot, RendererSnapshot, base::Button,
};

#[test]
fn embeds_every_surface_tree_and_gpui_base_mapping() {
    let mash = MashAdapter::embedded();
    assert_eq!(mash.version(), "1.0.0");
    assert_eq!(mash.component_contract_version(), "1.0.0");
    assert_eq!(mash.components().len(), 82);
    assert_eq!(mash.gpui_base_primitives().len(), 38);
    for primitive in mash.gpui_base_primitives() {
        assert!(
            !primitive.behaviors.is_empty(),
            "{} has no behavior contract",
            primitive.slug
        );
        for component in &primitive.components {
            assert!(mash.component(component).is_some(), "missing {component}");
        }
    }
}

#[test]
fn portable_recipe_resolves_private_parameters_and_theme_tokens() {
    let mash = MashAdapter::embedded();
    let context = MashRecipeContext::new()
        .value("tone", "critical")
        .value("variant", "secondary");
    let recipe = mash.recipe("ui-button", "control", MashTheme::Dark, &context);

    assert!(recipe.is_portable(), "{:?}", recipe.unresolved);
    assert_eq!(recipe.trait_value("surface.fill"), Some("transparent"));
    assert!(
        recipe
            .trait_value("content.ink")
            .is_some_and(|value| value.starts_with("oklch("))
    );
    assert!(recipe.parameters.keys().all(|name| name.starts_with("--_")));
    assert!(
        recipe
            .traits
            .values()
            .all(|value| !value.source_property.is_empty())
    );
}

#[test]
fn every_shared_behavior_points_to_published_semantic_events() {
    let mash = MashAdapter::embedded();
    for behavior in mash.behaviors() {
        let component = mash
            .component(&behavior.component)
            .expect("fixture component");
        for expected in &behavior.expects {
            let event = expected
                .get("event")
                .and_then(|value| value.as_str())
                .expect("expected event node");
            assert!(
                component
                    .events
                    .iter()
                    .any(|candidate| { candidate.node_address.rsplit('/').next() == Some(event) })
            );
        }
    }
}

#[test]
fn semantic_handles_validate_event_payloads_without_web_types() {
    let mash = MashAdapter::embedded();
    let checked = mash.node("ui-checkbox", "checked").expect("checked node");
    let change = mash.event("ui-checkbox", "change").expect("change event");
    assert!(change.reports());
    assert!(!change.requests());
    assert!(checked.accepts_value(&serde_json::json!(true)));
    assert!(!checked.accepts_value(&serde_json::json!("true")));
    assert_eq!(checked.default_value(), Some(&serde_json::json!(false)));
    assert_eq!(checked.node.channels, ["input", "state"]);
    assert!(change.accepts_detail(&serde_json::json!({
        "checked": true,
        "indeterminate": false
    })));
    assert!(!change.accepts_detail(&serde_json::json!({ "checked": "yes" })));

    let recipe = mash.recipe(
        "ui-checkbox",
        "control",
        MashTheme::Light,
        &MashRecipeContext::new().node_value(&checked, true),
    );
    assert!(recipe.target.ends_with("/node/control"));
}

#[test]
fn gpui_base_elements_accept_mash_node_recipes_directly() {
    let mash = MashAdapter::embedded();
    let _button = Button::new("save")
        .mash_node(
            &mash,
            "ui-button",
            "control",
            MashTheme::Light,
            &MashRecipeContext::new(),
        )
        .child("Save");
}

#[test]
fn every_catalogue_trait_has_one_native_realization_owner() {
    let mash = MashAdapter::embedded();
    let support = mash.presentation_support();
    let published = support
        .styled
        .iter()
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    let implemented = GPUI_STYLED_TRAITS.iter().copied().collect::<BTreeSet<_>>();
    assert_eq!(published, implemented);

    let specialized = support
        .specialized
        .values()
        .flatten()
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    assert!(published.is_disjoint(&specialized));
    assert_eq!(published.len() + specialized.len(), 100);
}

#[test]
fn native_realizations_run_against_the_shared_surface_tree_fixture() {
    let mash = MashAdapter::embedded();
    let fixture = mash.component("ui-checkbox").expect("checkbox fixture");
    let snapshot = RendererSnapshot {
        component: fixture.tag.clone(),
        nodes: fixture
            .nodes
            .iter()
            .map(|node| RendererNodeSnapshot {
                address: node.address.clone(),
                parent: node.parent.clone(),
            })
            .collect(),
        events: fixture
            .events
            .iter()
            .map(|event| RendererEventSnapshot {
                node_address: event.node_address.clone(),
                intent: event.intent.clone(),
            })
            .collect(),
    };
    assert_eq!(
        mash.compare_renderer_snapshot(&snapshot),
        Vec::<String>::new()
    );

    let mut incomplete = snapshot;
    incomplete
        .nodes
        .retain(|node| !node.address.ends_with("/node/checked"));
    assert_eq!(
        mash.compare_renderer_snapshot(&incomplete),
        ["missing node mash://ui-checkbox/node/checked"]
    );
}
