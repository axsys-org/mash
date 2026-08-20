use std::collections::{BTreeMap, BTreeSet};

use serde::Deserialize;
use serde_json::Value;

use crate::{MashTheme, contract::RuntimeContract};

#[derive(Clone, Debug, Default)]
pub struct MashRecipeContext {
    pub values: BTreeMap<String, Value>,
    pub interactions: BTreeSet<String>,
    pub environment: BTreeMap<String, String>,
    pub catalogue: BTreeMap<String, String>,
}

impl MashRecipeContext {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn value(mut self, node: impl Into<String>, value: impl Into<Value>) -> Self {
        self.values.insert(node.into(), value.into());
        self
    }

    pub fn node_value(mut self, node: &crate::MashNodeHandle<'_>, value: impl Into<Value>) -> Self {
        self.values.insert(node.node.address.clone(), value.into());
        self
    }

    pub fn interaction(mut self, state: impl Into<String>, active: bool) -> Self {
        let state = state.into();
        if active {
            self.interactions.insert(state);
        } else {
            self.interactions.remove(&state);
        }
        self
    }

    pub fn environment(mut self, feature: impl Into<String>, value: impl Into<String>) -> Self {
        self.environment.insert(feature.into(), value.into());
        self
    }

    pub fn catalogue(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.catalogue.insert(name.into(), value.into());
        self
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct ResolvedRecipe {
    pub target: String,
    pub traits: BTreeMap<String, ResolvedTrait>,
    pub layout: Value,
    pub parameters: BTreeMap<String, ResolvedParameter>,
    pub unresolved: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MashLayoutValueKind {
    Token,
    Literal,
    Expression,
    Inherited,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct MashLayoutValue {
    pub kind: MashLayoutValueKind,
    pub value: String,
    pub tokens: Vec<String>,
    pub token: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ResolvedTrait {
    pub value: String,
    pub source_property: String,
    pub kind: String,
    pub tokens: Vec<String>,
    pub token: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ResolvedParameter {
    pub value: String,
    pub tokens: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CatalogueInfo<'a> {
    pub name: &'a str,
    pub version: &'a str,
    pub layout_contract: &'a str,
    pub presentation_contract: &'a str,
    pub node_count: usize,
    pub rule_count: usize,
}

impl ResolvedRecipe {
    pub fn trait_value(&self, name: &str) -> Option<&str> {
        self.traits.get(name).map(|value| value.value.as_str())
    }

    pub fn is_portable(&self) -> bool {
        self.unresolved.is_empty()
    }

    /// Read one typed value from the renderer-neutral layout contract.
    pub fn layout_value(&self, pointer: &str) -> Option<MashLayoutValue> {
        serde_json::from_value(self.layout.pointer(pointer)?.clone()).ok()
    }

    /// Read one semantic layout intent such as orientation or distribution.
    pub fn layout_intent(&self, pointer: &str) -> Option<&str> {
        self.layout.pointer(pointer)?.as_str()
    }
}

#[derive(Debug, Deserialize)]
pub(crate) struct Catalogue {
    pub name: String,
    pub version: String,
    #[serde(rename = "layoutContract")]
    pub layout_contract: String,
    #[serde(rename = "presentationContract")]
    pub presentation_contract: String,
    pub nodes: BTreeMap<String, Value>,
    pub rules: Vec<RecipeRule>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct RecipeRule {
    pub targets: Vec<String>,
    pub conditions: Vec<Condition>,
    #[serde(default)]
    pub parameters: BTreeMap<String, RecipeValue>,
    pub presentation: BTreeMap<String, PresentationValue>,
    pub layout: Option<Value>,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct RecipeValue {
    pub value: String,
    pub tokens: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PresentationValue {
    pub source_property: String,
    pub kind: String,
    pub value: String,
    pub tokens: Vec<String>,
    pub token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub(crate) enum Condition {
    Node {
        #[serde(rename = "nodeAddress")]
        node_address: String,
        operator: String,
        value: Option<String>,
    },
    Interaction {
        state: String,
        active: bool,
    },
    Environment {
        feature: String,
        value: String,
    },
    Context {
        name: String,
        operator: String,
        value: Option<String>,
    },
    Renderer {
        renderer: String,
        selector: String,
    },
}

pub(crate) fn resolve_recipe(
    runtime: &RuntimeContract,
    component: &str,
    node: &str,
    theme: MashTheme,
    context: &MashRecipeContext,
) -> ResolvedRecipe {
    let target = if node.starts_with("mash://") {
        node.to_owned()
    } else {
        format!("mash://{component}/node/{node}")
    };
    let component_prefix = format!("mash://{component}/");
    let theme = crate::theme::ThemeView::new(&runtime.tokens, theme);
    let matching = runtime
        .catalogues
        .iter()
        .flat_map(|catalogue| catalogue.rules.iter())
        .filter(|rule| {
            rule.targets
                .iter()
                .any(|candidate| candidate.starts_with(&component_prefix))
                && rule
                    .conditions
                    .iter()
                    .all(|condition| condition.matches(context))
        })
        .collect::<Vec<_>>();

    let mut raw_parameters = BTreeMap::new();
    for rule in &matching {
        for (name, value) in &rule.parameters {
            raw_parameters.insert(name.clone(), value.clone());
        }
    }
    let parameters = raw_parameters
        .iter()
        .map(|(name, parameter)| {
            (
                name.clone(),
                ResolvedParameter {
                    value: substitute(
                        &parameter.value,
                        &raw_parameters,
                        &theme,
                        &mut BTreeSet::new(),
                    ),
                    tokens: parameter.tokens.clone(),
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    let mut traits = BTreeMap::new();
    let mut layout = Value::Object(Default::default());
    for rule in matching
        .iter()
        .filter(|rule| rule.targets.iter().any(|candidate| candidate == &target))
    {
        for (name, value) in &rule.presentation {
            traits.insert(
                name.clone(),
                ResolvedTrait {
                    value: substitute(&value.value, &raw_parameters, &theme, &mut BTreeSet::new()),
                    source_property: value.source_property.clone(),
                    kind: value.kind.clone(),
                    tokens: value.tokens.clone(),
                    token: value.token.clone(),
                },
            );
        }
        if let Some(next) = &rule.layout {
            merge_json(&mut layout, &resolve_layout(next, &raw_parameters, &theme));
        }
    }

    let unresolved = traits
        .iter()
        .filter(|(_, value)| value.value.contains("var(--"))
        .map(|(name, value)| format!("{name}: {}", value.value))
        .collect();
    ResolvedRecipe {
        target,
        traits,
        layout,
        parameters,
        unresolved,
    }
}

impl Condition {
    fn matches(&self, context: &MashRecipeContext) -> bool {
        match self {
            Self::Node {
                node_address,
                operator,
                value,
            } => {
                let id = node_address.rsplit('/').next().unwrap_or(node_address);
                let actual = context
                    .values
                    .get(node_address)
                    .or_else(|| context.values.get(id));
                compare(actual, operator, value.as_deref())
            }
            Self::Interaction { state, active } => context.interactions.contains(state) == *active,
            Self::Environment { feature, value } => context.environment.get(feature) == Some(value),
            Self::Context {
                name,
                operator,
                value,
            } => {
                let actual = context
                    .catalogue
                    .get(name)
                    .map(|value| Value::String(value.clone()));
                compare(actual.as_ref(), operator, value.as_deref())
            }
            // Renderer-only Web selectors have no native meaning and are
            // intentionally excluded instead of guessed at.
            Self::Renderer { renderer, selector } => {
                let _web_only = (renderer, selector);
                false
            }
        }
    }
}

fn compare(actual: Option<&Value>, operator: &str, expected: Option<&str>) -> bool {
    let truthy = actual.is_some_and(|value| match value {
        Value::Null => false,
        Value::Bool(value) => *value,
        Value::Number(value) => value.as_f64().is_some_and(|value| value != 0.0),
        Value::String(value) => !value.is_empty() && value != "false",
        Value::Array(value) => !value.is_empty(),
        Value::Object(value) => !value.is_empty(),
    });
    let text = actual.map(|value| match value {
        Value::String(value) => value.clone(),
        other => other.to_string(),
    });
    match operator {
        "truthy" | "present" => truthy,
        "falsy" | "absent" => !truthy,
        "equals" => text.as_deref() == expected,
        "starts-with" => text
            .as_deref()
            .zip(expected)
            .is_some_and(|(actual, expected)| actual.starts_with(expected)),
        "ends-with" => text
            .as_deref()
            .zip(expected)
            .is_some_and(|(actual, expected)| actual.ends_with(expected)),
        "contains" => text
            .as_deref()
            .zip(expected)
            .is_some_and(|(actual, expected)| actual.contains(expected)),
        _ => false,
    }
}

fn substitute(
    input: &str,
    parameters: &BTreeMap<String, RecipeValue>,
    theme: &crate::theme::ThemeView<'_>,
    seen: &mut BTreeSet<String>,
) -> String {
    let mut result = input.to_owned();
    for _ in 0..32 {
        let Some(start) = result.find("var(") else {
            break;
        };
        let Some(relative_end) = result[start + 4..].find(')') else {
            break;
        };
        let end = start + 4 + relative_end;
        let body = &result[start + 4..end];
        let variable = body.split(',').next().unwrap_or(body).trim();
        let fallback = body.split_once(',').map(|(_, fallback)| fallback.trim());
        let replacement = if let Some(parameter) = parameters.get(variable) {
            if !seen.insert(variable.to_owned()) {
                fallback.unwrap_or("").to_owned()
            } else {
                let replacement = substitute(&parameter.value, parameters, theme, seen);
                seen.remove(variable);
                replacement
            }
        } else if let Some(token) = theme.token_for_css_variable(variable) {
            theme
                .css_value(token)
                .unwrap_or_else(|| fallback.unwrap_or("").to_owned())
        } else if let Some(fallback) = fallback {
            fallback.to_owned()
        } else {
            format!("var({variable})")
        };
        result.replace_range(start..=end, &replacement);
    }
    result
}

fn merge_json(target: &mut Value, source: &Value) {
    match (target, source) {
        (Value::Object(target), Value::Object(source)) => {
            for (key, value) in source {
                merge_json(target.entry(key.clone()).or_insert(Value::Null), value);
            }
        }
        (target, source) => *target = source.clone(),
    }
}

fn resolve_layout(
    value: &Value,
    parameters: &BTreeMap<String, RecipeValue>,
    theme: &crate::theme::ThemeView<'_>,
) -> Value {
    match value {
        Value::Object(object) if object.contains_key("value") && object.contains_key("tokens") => {
            let mut resolved = object.clone();
            if let Some(Value::String(raw)) = object.get("value") {
                resolved.insert(
                    "value".to_owned(),
                    Value::String(substitute(raw, parameters, theme, &mut BTreeSet::new())),
                );
            }
            Value::Object(resolved)
        }
        Value::Object(object) => Value::Object(
            object
                .iter()
                .map(|(key, child)| (key.clone(), resolve_layout(child, parameters, theme)))
                .collect(),
        ),
        Value::Array(values) => Value::Array(
            values
                .iter()
                .map(|child| resolve_layout(child, parameters, theme))
                .collect(),
        ),
        other => other.clone(),
    }
}
