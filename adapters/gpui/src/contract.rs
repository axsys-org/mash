use std::{collections::BTreeMap, sync::OnceLock};

use serde::Deserialize;
use serde_json::Value;

use crate::{
    CatalogueInfo, MashRecipeContext, MashRecipePatch, MashTheme, ResolvedRecipe,
    recipe::{apply_recipe_patch, resolve_recipe},
};

const EMBEDDED_RUNTIME: &str = include_str!("../contracts/mash-runtime.json");

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MashNode {
    pub id: String,
    pub address: String,
    pub role: String,
    pub family: String,
    pub ownership: String,
    pub parent: Option<String>,
    pub values: Vec<Value>,
    pub defaults: Vec<Value>,
    pub fallbacks: Vec<Value>,
    pub channels: Vec<String>,
    pub availability: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EventRelation {
    pub kind: String,
    pub path: Vec<String>,
    pub node_address: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EventFixture {
    pub node_address: String,
    pub role: String,
    pub intent: String,
    pub relations: Vec<EventRelation>,
    pub value: Value,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct ComponentFixture {
    pub tag: String,
    pub package: String,
    pub address: String,
    pub root: String,
    pub nodes: Vec<MashNode>,
    pub events: Vec<EventFixture>,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct BehaviorFixture {
    pub id: String,
    pub component: String,
    #[serde(default)]
    pub authored: BTreeMap<String, Value>,
    #[serde(default)]
    pub initial: BTreeMap<String, Value>,
    pub steps: Vec<Value>,
    pub expects: Vec<Value>,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct GpuiBasePrimitive {
    pub slug: String,
    pub components: Vec<String>,
    pub behaviors: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct PresentationSupport {
    pub styled: Vec<String>,
    pub specialized: BTreeMap<String, Vec<String>>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RendererNodeSnapshot {
    pub address: String,
    pub parent: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RendererEventSnapshot {
    pub node_address: String,
    pub intent: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RendererSnapshot {
    pub component: String,
    pub nodes: Vec<RendererNodeSnapshot>,
    pub events: Vec<RendererEventSnapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GpuiBaseContract {
    pub repository: String,
    pub revision: String,
    pub primitives: Vec<GpuiBasePrimitive>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RuntimeContract {
    pub version: String,
    pub component_contract: String,
    pub gpui_base: GpuiBaseContract,
    pub components: Vec<ComponentFixture>,
    pub behaviors: Vec<BehaviorFixture>,
    pub tokens: crate::theme::TokenGraph,
    pub presentation_support: PresentationSupport,
    pub catalogues: Vec<crate::recipe::Catalogue>,
}

/// The embedded, renderer-neutral Mash contract plus the GPUI Base coverage
/// registry and portable catalogue recipes.
#[derive(Clone, Copy, Debug, Default)]
pub struct MashAdapter;

#[derive(Clone, Copy, Debug)]
pub struct MashNodeHandle<'a> {
    pub component: &'a ComponentFixture,
    pub node: &'a MashNode,
}

#[derive(Clone, Copy, Debug)]
pub struct MashEventHandle<'a> {
    pub component: &'a ComponentFixture,
    pub event: &'a EventFixture,
}

impl MashNodeHandle<'_> {
    pub fn accepts_value(&self, value: &Value) -> bool {
        self.node
            .values
            .iter()
            .any(|schema| value_matches(schema, value))
    }

    pub fn default_value(&self) -> Option<&Value> {
        self.node
            .defaults
            .iter()
            .find(|default| default.get("kind").and_then(Value::as_str) == Some("value"))
            .and_then(|default| default.get("value"))
    }
}

impl MashEventHandle<'_> {
    pub fn accepts_detail(&self, detail: &Value) -> bool {
        self.event
            .value
            .get("detail")
            .is_some_and(|schema| value_matches(schema, detail))
    }

    pub fn requests(&self) -> bool {
        self.event.intent == "request"
    }

    pub fn reports(&self) -> bool {
        self.event.intent == "report"
    }
}

impl MashAdapter {
    pub fn embedded() -> Self {
        Self
    }

    pub(crate) fn runtime(&self) -> &'static RuntimeContract {
        static CONTRACT: OnceLock<RuntimeContract> = OnceLock::new();
        CONTRACT.get_or_init(|| {
            serde_json::from_str(EMBEDDED_RUNTIME)
                .expect("the checked-in Mash GPUI runtime contract must be valid")
        })
    }

    pub fn version(&self) -> &str {
        &self.runtime().version
    }

    pub fn component_contract_version(&self) -> &str {
        &self.runtime().component_contract
    }

    pub fn components(&self) -> &[ComponentFixture] {
        &self.runtime().components
    }

    pub fn component(&self, tag: &str) -> Option<&ComponentFixture> {
        self.components()
            .iter()
            .find(|component| component.tag == tag)
    }

    pub fn node<'a>(&'a self, component: &str, id: &str) -> Option<MashNodeHandle<'a>> {
        let component = self.component(component)?;
        let node = component
            .nodes
            .iter()
            .find(|node| node.id == id || node.address == id)?;
        Some(MashNodeHandle { component, node })
    }

    pub fn event<'a>(&'a self, component: &str, id: &str) -> Option<MashEventHandle<'a>> {
        let component = self.component(component)?;
        let event = component.events.iter().find(|event| {
            event.node_address == id || event.node_address.rsplit('/').next() == Some(id)
        })?;
        Some(MashEventHandle { component, event })
    }

    pub fn behaviors(&self) -> &[BehaviorFixture] {
        &self.runtime().behaviors
    }

    pub fn gpui_base_revision(&self) -> &str {
        &self.runtime().gpui_base.revision
    }

    pub fn gpui_base_repository(&self) -> &str {
        &self.runtime().gpui_base.repository
    }

    pub fn gpui_base_primitives(&self) -> &[GpuiBasePrimitive] {
        &self.runtime().gpui_base.primitives
    }

    pub fn catalogues(&self) -> Vec<CatalogueInfo<'_>> {
        self.runtime()
            .catalogues
            .iter()
            .map(|catalogue| CatalogueInfo {
                name: &catalogue.name,
                version: &catalogue.version,
                layout_contract: &catalogue.layout_contract,
                presentation_contract: &catalogue.presentation_contract,
                node_count: catalogue.nodes.len(),
                rule_count: catalogue.rules.len(),
            })
            .collect()
    }

    pub fn themes(&self) -> &[String] {
        &self.runtime().tokens.themes
    }

    pub fn presentation_support(&self) -> &PresentationSupport {
        &self.runtime().presentation_support
    }

    /// Compare an authored GPUI realization with the same shared SurfaceTree
    /// fixture used by the Web runner. Native mechanics stay native; only
    /// semantic topology and event intent are compared.
    pub fn compare_renderer_snapshot(&self, snapshot: &RendererSnapshot) -> Vec<String> {
        let Some(fixture) = self.component(&snapshot.component) else {
            return vec![format!("unknown component {}", snapshot.component)];
        };
        let nodes = snapshot
            .nodes
            .iter()
            .map(|node| (node.address.as_str(), node))
            .collect::<BTreeMap<_, _>>();
        let events = snapshot
            .events
            .iter()
            .map(|event| (event.node_address.as_str(), event))
            .collect::<BTreeMap<_, _>>();
        let mut problems = Vec::new();
        for expected in &fixture.nodes {
            match nodes.get(expected.address.as_str()) {
                None => problems.push(format!("missing node {}", expected.address)),
                Some(actual) if actual.parent != expected.parent => {
                    problems.push(format!("parent mismatch for {}", expected.address));
                }
                _ => {}
            }
        }
        for expected in &fixture.events {
            match events.get(expected.node_address.as_str()) {
                None => problems.push(format!("missing event {}", expected.node_address)),
                Some(actual) if actual.intent != expected.intent => {
                    problems.push(format!("intent mismatch for {}", expected.node_address));
                }
                _ => {}
            }
        }
        problems
    }

    pub fn theme(&self, theme: MashTheme) -> crate::theme::ThemeView<'_> {
        crate::theme::ThemeView::new(&self.runtime().tokens, theme)
    }

    pub fn recipe(
        &self,
        component: &str,
        node: &str,
        theme: MashTheme,
        context: &MashRecipeContext,
    ) -> ResolvedRecipe {
        resolve_recipe(self.runtime(), component, node, theme, context)
    }

    pub fn recipe_with_patch(
        &self,
        component: &str,
        node: &str,
        theme: MashTheme,
        context: &MashRecipeContext,
        patch: &MashRecipePatch,
    ) -> Result<ResolvedRecipe, String> {
        let mut recipe = resolve_recipe(self.runtime(), component, node, theme, context);
        apply_recipe_patch(self.runtime(), theme, context, &mut recipe, patch)?;
        Ok(recipe)
    }
}

fn value_matches(schema: &Value, value: &Value) -> bool {
    match schema.get("kind").and_then(Value::as_str) {
        Some("void") => value.is_null(),
        Some("boolean") => value.is_boolean(),
        Some("number") => value.is_number(),
        Some("string") | Some("form-data") | Some("reference") => value.is_string(),
        Some("enum") => schema
            .get("choices")
            .and_then(Value::as_array)
            .is_some_and(|choices| choices.contains(value)),
        Some("nullable") => {
            value.is_null()
                || schema
                    .get("value")
                    .is_some_and(|schema| value_matches(schema, value))
        }
        Some("array") => value.as_array().is_some_and(|values| {
            schema
                .get("items")
                .is_some_and(|schema| values.iter().all(|value| value_matches(schema, value)))
        }),
        Some("record") => value.as_object().is_some_and(|record| {
            schema
                .get("fields")
                .and_then(Value::as_object)
                .is_some_and(|fields| {
                    fields.iter().all(|(name, schema)| {
                        record
                            .get(name)
                            .is_some_and(|value| value_matches(schema, value))
                    })
                })
        }),
        Some("event") => schema
            .get("detail")
            .is_some_and(|schema| value_matches(schema, value)),
        _ => false,
    }
}
