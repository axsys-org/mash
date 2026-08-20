use gpui::Styled;

use crate::{
    GpuiBasePrimitive, MashAdapter, MashNodeHandle, MashRecipeContext, MashStyledExt, MashTheme,
    ResolvedRecipe,
};

/// A native GPUI component-family binding backed by one pinned `gpui-base`
/// primitive and the renderer-neutral Mash contract.
#[derive(Clone, Debug)]
pub struct NativeBinding<'a> {
    adapter: &'a MashAdapter,
    primitive: &'a GpuiBasePrimitive,
    theme: MashTheme,
    context: MashRecipeContext,
}

/// One semantic Mash node selected through a native component-family binding.
/// The handle retains renderer-neutral identity while its recipe is realized
/// through GPUI's native `Styled` API.
#[derive(Clone, Debug)]
pub struct NativeNodeBinding<'a> {
    adapter: &'a MashAdapter,
    primitive: &'a GpuiBasePrimitive,
    handle: MashNodeHandle<'a>,
    theme: MashTheme,
    context: &'a MashRecipeContext,
}

impl MashAdapter {
    /// Look up a primitive in the pinned GPUI Base parity registry.
    pub fn gpui_base_primitive(&self, slug: &str) -> Option<&GpuiBasePrimitive> {
        self.gpui_base_primitives()
            .iter()
            .find(|primitive| primitive.slug == slug)
    }

    /// Begin a native binding for one GPUI Base component family.
    pub fn native_binding(&self, slug: &str, theme: MashTheme) -> Option<NativeBinding<'_>> {
        Some(NativeBinding {
            adapter: self,
            primitive: self.gpui_base_primitive(slug)?,
            theme,
            context: MashRecipeContext::new(),
        })
    }
}

impl<'a> NativeBinding<'a> {
    pub fn primitive(&self) -> &'a GpuiBasePrimitive {
        self.primitive
    }

    pub fn theme(&self) -> MashTheme {
        self.theme
    }

    pub fn value(mut self, node: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        self.context = self.context.value(node, value);
        self
    }

    pub fn interaction(mut self, state: impl Into<String>, active: bool) -> Self {
        self.context = self.context.interaction(state, active);
        self
    }

    pub fn environment(mut self, feature: impl Into<String>, value: impl Into<String>) -> Self {
        self.context = self.context.environment(feature, value);
        self
    }

    pub fn catalogue(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.context = self.context.catalogue(name, value);
        self
    }

    pub fn supports(&self, component: &str) -> bool {
        self.primitive
            .components
            .iter()
            .any(|candidate| candidate == component)
    }

    /// Select a semantic node belonging to this native family. Components
    /// outside the registry mapping are rejected instead of being styled by
    /// accident.
    pub fn node(&'a self, component: &str, node: &str) -> Option<NativeNodeBinding<'a>> {
        if !self.supports(component) {
            return None;
        }
        Some(NativeNodeBinding {
            adapter: self.adapter,
            primitive: self.primitive,
            handle: self.adapter.node(component, node)?,
            theme: self.theme,
            context: &self.context,
        })
    }
}

impl NativeNodeBinding<'_> {
    pub fn primitive(&self) -> &GpuiBasePrimitive {
        self.primitive
    }

    pub fn handle(&self) -> MashNodeHandle<'_> {
        self.handle
    }

    pub fn recipe(&self) -> ResolvedRecipe {
        self.adapter.recipe(
            &self.handle.component.tag,
            &self.handle.node.address,
            self.theme,
            self.context,
        )
    }

    pub fn apply<T: Styled + Sized>(&self, element: T) -> T {
        element.mash_recipe(&self.recipe())
    }
}
