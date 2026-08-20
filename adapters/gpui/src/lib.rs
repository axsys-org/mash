//! First-class Mash support for GPUI.
//!
//! [`gpui_base`] owns native behavior, focus, keyboard interaction, overlays,
//! scrolling, and accessibility. Mash owns semantic node identity, the DTCG
//! token graph, catalogue conditions, and visual recipes. This crate is the
//! adapter between them; it is not another component namespace.

mod contract;
mod native;
mod recipe;
mod style;
mod theme;

pub use contract::{
    BehaviorFixture, ComponentFixture, EventFixture, GpuiBasePrimitive, MashAdapter,
    MashEventHandle, MashNode, MashNodeHandle, PresentationSupport, RendererEventSnapshot,
    RendererNodeSnapshot, RendererSnapshot,
};
pub use gpui_base as base;
pub use native::{NativeBinding, NativeNodeBinding};
pub use recipe::{
    CatalogueInfo, MashLayoutValue, MashLayoutValueKind, MashRecipeContext, ResolvedParameter,
    ResolvedRecipe, ResolvedTrait,
};
pub use style::{GPUI_STYLED_TRAITS, MashStyledExt};
pub use theme::{MashColor, MashTheme, MashToken, MashTokenValue};
