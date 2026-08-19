//! Typed Mash token values for native GPUI applications.
//!
//! The generated table intentionally contains every Mash token, not just the
//! roles consumed by the first primitive. `SemanticColors` is the ergonomic
//! surface for components; `ThemeTokens::token` is the escape hatch for a new
//! platform primitive that needs another token type.

use gpui::{Hsla, rgba};

/// A display sRGB colour, produced from the DTCG source without CSS parsing.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MashColor {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
    pub alpha: f32,
}

impl MashColor {
    pub const fn new(red: f32, green: f32, blue: f32, alpha: f32) -> Self {
        Self {
            red,
            green,
            blue,
            alpha,
        }
    }

    /// Convert this design token into GPUI's render colour.
    pub fn gpui(self) -> Hsla {
        rgba(self.rgba_u32()).into()
    }

    pub fn rgba_u32(self) -> u32 {
        let channel = |value: f32| (value.clamp(0.0, 1.0) * 255.0).round() as u32;
        (channel(self.red) << 24)
            | (channel(self.green) << 16)
            | (channel(self.blue) << 8)
            | channel(self.alpha)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DimensionUnit {
    Px,
    Rem,
}

/// A DTCG dimension. Convert rems with the root font size chosen by the host.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Dimension {
    pub value: f32,
    pub unit: DimensionUnit,
}

impl Dimension {
    pub const fn new(value: f32, unit: DimensionUnit) -> Self {
        Self { value, unit }
    }

    pub fn to_px(self, root_font_size: f32) -> f32 {
        match self.unit {
            DimensionUnit::Px => self.value,
            DimensionUnit::Rem => self.value * root_font_size,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DurationUnit {
    Milliseconds,
    Seconds,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Duration {
    pub value: f32,
    pub unit: DurationUnit,
}

impl Duration {
    pub const fn new(value: f32, unit: DurationUnit) -> Self {
        Self { value, unit }
    }

    pub fn milliseconds(self) -> f32 {
        match self.unit {
            DurationUnit::Milliseconds => self.value,
            DurationUnit::Seconds => self.value * 1_000.0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TokenValue {
    Color(MashColor),
    Dimension(Dimension),
    Number(f32),
    FontFamily(&'static [&'static str]),
    FontWeight(f32),
    Duration(Duration),
    CubicBezier([f32; 4]),
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Token {
    pub id: &'static str,
    pub value: TokenValue,
}

impl Token {
    pub const fn new(id: &'static str, value: TokenValue) -> Self {
        Self { id, value }
    }
}

/// Theme-dependent semantic colours, named for component use.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SemanticColors {
    pub action: MashColor,
    pub action_hover: MashColor,
    pub action_pressed: MashColor,
    pub border: MashColor,
    pub border_strong: MashColor,
    pub canvas: MashColor,
    pub critical: MashColor,
    pub critical_hover: MashColor,
    pub critical_pressed: MashColor,
    pub focus_ring: MashColor,
    pub neutral: MashColor,
    pub neutral_hover: MashColor,
    pub neutral_pressed: MashColor,
    pub on_action: MashColor,
    pub on_critical: MashColor,
    pub on_neutral: MashColor,
    pub on_positive: MashColor,
    pub on_warning: MashColor,
    pub positive: MashColor,
    pub positive_hover: MashColor,
    pub positive_pressed: MashColor,
    pub shadow: MashColor,
    pub surface: MashColor,
    pub surface_raised: MashColor,
    pub surface_sunken: MashColor,
    pub text: MashColor,
    pub text_disabled: MashColor,
    pub text_muted: MashColor,
    pub warning: MashColor,
    pub warning_hover: MashColor,
    pub warning_pressed: MashColor,
}

/// All token values and the convenient semantic colour roles for one theme.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ThemeTokens {
    pub name: &'static str,
    pub tokens: &'static [Token],
    pub colors: SemanticColors,
}

impl ThemeTokens {
    pub const fn new(name: &'static str, tokens: &'static [Token], colors: SemanticColors) -> Self {
        Self {
            name,
            tokens,
            colors,
        }
    }

    pub fn token(&self, id: &str) -> Option<&Token> {
        self.tokens.iter().find(|token| token.id == id)
    }

    pub fn color(&self, id: &str) -> Option<MashColor> {
        match self.token(id)?.value {
            TokenValue::Color(value) => Some(value),
            _ => None,
        }
    }

    pub fn dimension(&self, id: &str) -> Option<Dimension> {
        match self.token(id)?.value {
            TokenValue::Dimension(value) => Some(value),
            _ => None,
        }
    }
}

/// The two modes Mash currently publishes. More modes are additive in the
/// token contract and map here without changing component APIs.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MashThemeMode {
    #[default]
    Light,
    Dark,
}

/// A selected Mash theme for a GPUI surface.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MashTheme {
    tokens: &'static ThemeTokens,
}

impl MashTheme {
    pub const fn light() -> Self {
        Self { tokens: &LIGHT }
    }

    pub const fn dark() -> Self {
        Self { tokens: &DARK }
    }

    pub const fn for_mode(mode: MashThemeMode) -> Self {
        match mode {
            MashThemeMode::Light => Self::light(),
            MashThemeMode::Dark => Self::dark(),
        }
    }

    pub const fn tokens(self) -> &'static ThemeTokens {
        self.tokens
    }

    pub const fn colors(self) -> SemanticColors {
        self.tokens.colors
    }

    pub fn dimension(self, id: &str) -> Option<Dimension> {
        self.tokens.dimension(id)
    }
}

include!("generated_tokens.rs");
