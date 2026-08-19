//! Mash for GPUI: the Mash token graph compiled into native values, followed by
//! small composable primitives that consume semantic roles only.
//!
//! This crate is intentionally a rendering adapter, not a second design
//! system. The generated `ThemeTokens` table contains every Mash token in both
//! themes; primitives use `MashTheme` and never author colour literals.

mod avatar;
mod badge;
mod button;
mod foundations;
mod myth;
mod path;
mod theme;
mod tree;
#[cfg(target_family = "wasm")]
mod web;

pub use avatar::{MashAvatar, MashAvatarSize};
pub use badge::{MashBadge, MashBadgeSize, MashBadgeTone};
pub use button::{MashButton, MashButtonSize, MashButtonVariant};
pub use foundations::Foundations;
pub use myth::{MashLimb, MashMyth, MashPail, MashSlot};
pub use path::{MashPath, MashPathSize};
pub use theme::{
    Dimension, DimensionUnit, Duration, DurationUnit, MashColor, MashTheme, MashThemeMode,
    SemanticColors, ThemeTokens, Token, TokenValue,
};
pub use tree::{MashTree, MashTreeItem, MashTreeItemAction, MashTreeItemSize};
#[cfg(target_family = "wasm")]
pub use web::run;
