//! Mash for GPUI: the Mash token graph compiled into native values, followed by
//! small composable primitives that consume semantic roles only.
//!
//! This crate is intentionally a rendering adapter, not a second design
//! system. The generated `ThemeTokens` table contains every Mash token in both
//! themes; primitives use `MashTheme` and never author colour literals.

mod button;
mod theme;

pub use button::{MashButton, MashButtonSize, MashButtonVariant};
pub use theme::{
    Dimension, DimensionUnit, Duration, DurationUnit, MashColor, MashTheme, MashThemeMode,
    SemanticColors, ThemeTokens, Token, TokenValue,
};
