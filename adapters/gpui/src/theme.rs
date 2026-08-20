use std::collections::BTreeMap;

use gpui::{Hsla, rgba};
use serde::Deserialize;
use serde_json::Value;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashTheme {
    #[default]
    Light,
    Dark,
}

impl MashTheme {
    pub const fn name(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Dark => "dark",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MashColor {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
    pub alpha: f32,
}

impl MashColor {
    pub fn gpui(self) -> Hsla {
        let channel = |value: f32| (value.clamp(0.0, 1.0) * 255.0).round() as u32;
        rgba(
            (channel(self.red) << 24)
                | (channel(self.green) << 16)
                | (channel(self.blue) << 8)
                | channel(self.alpha),
        )
        .into()
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum MashTokenValue {
    Color(MashColor),
    Dimension(f32),
    Number(f32),
    DurationMilliseconds(f32),
    Text(String),
}

#[derive(Clone, Debug, PartialEq)]
pub struct MashToken {
    pub id: String,
    pub css_variable: String,
    pub value: MashTokenValue,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TokenEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub css_var: String,
    pub value: Option<Value>,
    pub values: Option<BTreeMap<String, Value>>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TokenGraph {
    pub themes: Vec<String>,
    pub tokens: BTreeMap<String, TokenEntry>,
}

pub struct ThemeView<'a> {
    graph: &'a TokenGraph,
    theme: MashTheme,
}

impl<'a> ThemeView<'a> {
    pub(crate) fn new(graph: &'a TokenGraph, theme: MashTheme) -> Self {
        Self { graph, theme }
    }

    pub fn token(&self, id: &str) -> Option<MashToken> {
        let entry = self.graph.tokens.get(id)?;
        let raw = entry
            .values
            .as_ref()
            .and_then(|values| values.get(self.theme.name()))
            .or(entry.value.as_ref())?;
        let raw = value_text(raw);
        Some(MashToken {
            id: entry.id.clone(),
            css_variable: entry.css_var.clone(),
            value: parse_token_value(&entry.kind, &raw),
        })
    }

    pub fn css_value(&self, id: &str) -> Option<String> {
        let entry = self.graph.tokens.get(id)?;
        entry
            .values
            .as_ref()
            .and_then(|values| values.get(self.theme.name()))
            .or(entry.value.as_ref())
            .map(value_text)
    }

    pub fn token_for_css_variable(&self, variable: &str) -> Option<&str> {
        self.graph
            .tokens
            .values()
            .find(|entry| entry.css_var == variable)
            .map(|entry| entry.id.as_str())
    }

    pub fn len(&self) -> usize {
        self.graph.tokens.len()
    }

    pub fn is_empty(&self) -> bool {
        self.graph.tokens.is_empty()
    }
}

fn value_text(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        other => other.to_string(),
    }
}

fn parse_token_value(kind: &str, raw: &str) -> MashTokenValue {
    match kind {
        "color" => parse_color(raw)
            .map(MashTokenValue::Color)
            .unwrap_or_else(|| MashTokenValue::Text(raw.to_owned())),
        "dimension" => parse_dimension(raw)
            .map(MashTokenValue::Dimension)
            .unwrap_or_else(|| MashTokenValue::Text(raw.to_owned())),
        "number" | "fontWeight" => raw
            .parse()
            .map(MashTokenValue::Number)
            .unwrap_or_else(|_| MashTokenValue::Text(raw.to_owned())),
        "duration" => parse_duration(raw)
            .map(MashTokenValue::DurationMilliseconds)
            .unwrap_or_else(|| MashTokenValue::Text(raw.to_owned())),
        _ => MashTokenValue::Text(raw.to_owned()),
    }
}

pub(crate) fn parse_dimension(raw: &str) -> Option<f32> {
    let raw = raw.trim();
    if let Some(expression) = raw
        .strip_prefix("calc(")
        .and_then(|value| value.strip_suffix(')'))
    {
        return DimensionExpression::new(expression).parse();
    }
    if let Some(value) = raw.strip_suffix("rem") {
        return value.trim().parse::<f32>().ok().map(|value| value * 16.0);
    }
    if let Some(value) = raw.strip_suffix("px") {
        return value.trim().parse().ok();
    }
    if raw == "0" {
        return Some(0.0);
    }
    None
}

#[derive(Clone, Copy)]
struct DimensionTerm {
    value: f32,
    dimensional: bool,
}

struct DimensionExpression<'a> {
    input: &'a [u8],
    cursor: usize,
}

impl<'a> DimensionExpression<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            input: input.as_bytes(),
            cursor: 0,
        }
    }

    fn parse(mut self) -> Option<f32> {
        let result = self.sum()?;
        self.whitespace();
        (self.cursor == self.input.len() && (result.dimensional || result.value == 0.0))
            .then_some(result.value)
    }

    fn sum(&mut self) -> Option<DimensionTerm> {
        let mut left = self.product()?;
        loop {
            self.whitespace();
            let Some(operator) = self.peek() else {
                break;
            };
            if operator != b'+' && operator != b'-' {
                break;
            }
            self.cursor += 1;
            let right = self.product()?;
            if left.dimensional != right.dimensional {
                return None;
            }
            left.value = if operator == b'+' {
                left.value + right.value
            } else {
                left.value - right.value
            };
        }
        Some(left)
    }

    fn product(&mut self) -> Option<DimensionTerm> {
        let mut left = self.atom()?;
        loop {
            self.whitespace();
            let Some(operator) = self.peek() else {
                break;
            };
            if operator != b'*' && operator != b'/' {
                break;
            }
            self.cursor += 1;
            let right = self.atom()?;
            left = match operator {
                b'*' if !left.dimensional => DimensionTerm {
                    value: left.value * right.value,
                    dimensional: right.dimensional,
                },
                b'*' if !right.dimensional => DimensionTerm {
                    value: left.value * right.value,
                    dimensional: left.dimensional,
                },
                b'/' if !right.dimensional && right.value != 0.0 => DimensionTerm {
                    value: left.value / right.value,
                    dimensional: left.dimensional,
                },
                _ => return None,
            };
        }
        Some(left)
    }

    fn atom(&mut self) -> Option<DimensionTerm> {
        self.whitespace();
        let sign = match self.peek() {
            Some(b'-') => {
                self.cursor += 1;
                -1.0
            }
            Some(b'+') => {
                self.cursor += 1;
                1.0
            }
            _ => 1.0,
        };
        self.whitespace();
        if self.peek() == Some(b'(') {
            self.cursor += 1;
            let mut value = self.sum()?;
            self.whitespace();
            (self.peek() == Some(b')')).then_some(())?;
            self.cursor += 1;
            value.value *= sign;
            return Some(value);
        }

        let start = self.cursor;
        while self
            .peek()
            .is_some_and(|byte| byte.is_ascii_digit() || byte == b'.')
        {
            self.cursor += 1;
        }
        (self.cursor > start).then_some(())?;
        let number = std::str::from_utf8(&self.input[start..self.cursor])
            .ok()?
            .parse::<f32>()
            .ok()?
            * sign;
        if self.remaining().starts_with(b"rem") {
            self.cursor += 3;
            Some(DimensionTerm {
                value: number * 16.0,
                dimensional: true,
            })
        } else if self.remaining().starts_with(b"px") {
            self.cursor += 2;
            Some(DimensionTerm {
                value: number,
                dimensional: true,
            })
        } else {
            Some(DimensionTerm {
                value: number,
                dimensional: false,
            })
        }
    }

    fn whitespace(&mut self) {
        while self.peek().is_some_and(|byte| byte.is_ascii_whitespace()) {
            self.cursor += 1;
        }
    }

    fn peek(&self) -> Option<u8> {
        self.input.get(self.cursor).copied()
    }

    fn remaining(&self) -> &[u8] {
        &self.input[self.cursor..]
    }
}

fn parse_duration(raw: &str) -> Option<f32> {
    let raw = raw.trim();
    if let Some(value) = raw.strip_suffix("ms") {
        return value.trim().parse().ok();
    }
    raw.strip_suffix('s')
        .and_then(|value| value.trim().parse::<f32>().ok())
        .map(|value| value * 1000.0)
}

pub(crate) fn parse_color(raw: &str) -> Option<MashColor> {
    if raw.trim() == "transparent" {
        return Some(MashColor {
            red: 0.0,
            green: 0.0,
            blue: 0.0,
            alpha: 0.0,
        });
    }
    let body = raw.trim().strip_prefix("oklch(")?.strip_suffix(')')?;
    let mut slash = body.split('/');
    let channels = slash.next()?.split_whitespace().collect::<Vec<_>>();
    if channels.len() != 3 {
        return None;
    }
    let lightness = channels[0].trim_end_matches('%').parse::<f32>().ok()?
        / if channels[0].ends_with('%') {
            100.0
        } else {
            1.0
        };
    let chroma = channels[1].parse::<f32>().ok()?;
    let hue = channels[2].parse::<f32>().ok()?.to_radians();
    let alpha = slash
        .next()
        .and_then(|value| value.trim().trim_end_matches('%').parse::<f32>().ok())
        .map(|value| if value > 1.0 { value / 100.0 } else { value })
        .unwrap_or(1.0);
    let a = chroma * hue.cos();
    let b = chroma * hue.sin();
    let l = (lightness + 0.396_337_78 * a + 0.215_803_76 * b).powi(3);
    let m = (lightness - 0.105_561_346 * a - 0.063_854_17 * b).powi(3);
    let s = (lightness - 0.089_484_18 * a - 1.291_485_5 * b).powi(3);
    let encode = |channel: f32| {
        let encoded = if channel <= 0.003_130_8 {
            12.92 * channel
        } else {
            1.055 * channel.powf(1.0 / 2.4) - 0.055
        };
        encoded.clamp(0.0, 1.0)
    };
    Some(MashColor {
        red: encode(4.076_741_7 * l - 3.307_711_6 * m + 0.230_969_94 * s),
        green: encode(-1.268_438 * l + 2.609_757_4 * m - 0.341_319_38 * s),
        blue: encode(-0.004_196_086_3 * l - 0.703_418_6 * m + 1.707_614_7 * s),
        alpha,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_dimension;

    #[test]
    fn resolves_portable_dimension_expressions() {
        assert_eq!(parse_dimension("calc(1rem + 8px)"), Some(24.0));
        assert_eq!(parse_dimension("calc((2rem - 4px) / 2)"), Some(14.0));
        assert_eq!(parse_dimension("calc(3 * 0.5rem)"), Some(24.0));
        assert_eq!(parse_dimension("calc(100dvh - 1rem)"), None);
    }
}
