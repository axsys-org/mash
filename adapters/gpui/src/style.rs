use gpui::{CursorStyle, FontWeight, Length, Overflow, Styled, px, relative};

use crate::{MashAdapter, MashRecipeContext, MashTheme, ResolvedRecipe};

/// Portable traits the generic GPUI `Styled` realization consumes directly.
/// Traits outside this list belong to specialized native nodes such as SVG,
/// generated content, motion, or focus ownership.
pub const GPUI_STYLED_TRAITS: &[&str] = &[
    "content.ink",
    "content.opacity",
    "edge.all",
    "edge.blockEnd",
    "edge.blockEndColor",
    "edge.blockStart",
    "edge.blockStartColor",
    "edge.color",
    "edge.inline",
    "edge.inlineEnd",
    "edge.inlineStart",
    "edge.inlineStartColor",
    "edge.radius",
    "edge.width",
    "interaction.cursor",
    "layout.alignContent",
    "layout.alignItems",
    "layout.alignSelf",
    "layout.aspectRatio",
    "layout.blockSize",
    "layout.display",
    "layout.flex",
    "layout.flexBasis",
    "layout.flexDirection",
    "layout.flexWrap",
    "layout.gap",
    "layout.gridColumn",
    "layout.gridRow",
    "layout.gridTemplateColumns",
    "layout.gridTemplateRows",
    "layout.inlineSize",
    "layout.inset",
    "layout.insetBlock",
    "layout.insetBlockEnd",
    "layout.insetBlockStart",
    "layout.insetInline",
    "layout.insetInlineEnd",
    "layout.insetInlineStart",
    "layout.justifyContent",
    "layout.margin",
    "layout.marginInlineEnd",
    "layout.marginInlineStart",
    "layout.maxBlockSize",
    "layout.maxInlineSize",
    "layout.minBlockSize",
    "layout.minInlineSize",
    "layout.overflow",
    "layout.overflowX",
    "layout.overflowY",
    "layout.padding",
    "layout.paddingBlockStart",
    "layout.paddingInline",
    "layout.paddingInlineStart",
    "layout.placeItems",
    "layout.position",
    "surface.fill",
    "surface.fill-color",
    "type.align",
    "type.family",
    "type.line-height",
    "type.overflow",
    "type.shorthand",
    "type.size",
    "type.weight",
    "type.white-space",
];

/// Applies a resolved Mash semantic-node recipe to any native GPUI element
/// implementing [`Styled`], including every styled `gpui-base` primitive.
pub trait MashStyledExt: Styled + Sized {
    fn mash_node(
        self,
        adapter: &MashAdapter,
        component: &str,
        node: &str,
        theme: MashTheme,
        context: &MashRecipeContext,
    ) -> Self {
        self.mash_recipe(&adapter.recipe(component, node, theme, context))
    }

    fn mash_recipe(mut self, recipe: &ResolvedRecipe) -> Self {
        self = apply_display(self, recipe);
        self = apply_flex(self, recipe);
        self = apply_alignment(self, recipe);
        self = apply_dimensions(self, recipe);
        self = apply_box_model(self, recipe);
        self = apply_position(self, recipe);
        self = apply_type(self, recipe);
        self = apply_edges(self, recipe);

        if let Some(color) = recipe
            .trait_value("surface.fill")
            .or_else(|| recipe.trait_value("surface.fill-color"))
            .and_then(crate::theme::parse_color)
        {
            self = self.bg(color.gpui());
        }
        if let Some(color) = recipe
            .trait_value("content.ink")
            .and_then(crate::theme::parse_color)
        {
            self = self.text_color(color.gpui());
        }
        if let Some(opacity) = recipe
            .trait_value("content.opacity")
            .and_then(|value| value.parse::<f32>().ok())
        {
            self = self.opacity(opacity);
        }
        if let Some(ratio) = recipe
            .trait_value("layout.aspectRatio")
            .and_then(|value| value.parse::<f32>().ok())
        {
            self = self.aspect_ratio(ratio);
        }
        if let Some(cursor) = recipe.trait_value("interaction.cursor") {
            self = match cursor {
                "pointer" => self.cursor(CursorStyle::PointingHand),
                "not-allowed" => self.cursor(CursorStyle::OperationNotAllowed),
                "col-resize" => self.cursor(CursorStyle::ResizeColumn),
                "row-resize" => self.cursor(CursorStyle::ResizeRow),
                _ => self,
            };
        }
        self
    }
}

impl<T: Styled + Sized> MashStyledExt for T {}

fn apply_display<T: Styled + Sized>(element: T, recipe: &ResolvedRecipe) -> T {
    match recipe.trait_value("layout.display") {
        Some("none") => element.hidden(),
        Some(value) if value.contains("grid") || value == "overlay" => element.grid(),
        Some(value) if value.contains("flex") || value == "flow" => element.flex(),
        Some("block" | "inline-block" | "contents") => element.block(),
        _ => element,
    }
}

fn apply_flex<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    let direction = recipe.trait_value("layout.flexDirection").or_else(|| {
        (recipe
            .layout
            .pointer("/group/orientation")
            .and_then(|value| value.as_str())
            == Some("block"))
        .then_some("column")
    });
    element = match direction {
        Some("column" | "block") => element.flex_col(),
        Some("column-reverse" | "block-reverse") => element.flex_col_reverse(),
        Some("row" | "inline") => element.flex_row(),
        Some("row-reverse" | "inline-reverse") => element.flex_row_reverse(),
        _ => element,
    };
    element = match recipe.trait_value("layout.flexWrap") {
        Some("wrap" | "forward") => element.flex_wrap(),
        Some("wrap-reverse" | "reverse") => element.flex_wrap_reverse(),
        Some("nowrap" | "none") => element.flex_nowrap(),
        _ => element,
    };
    element = match recipe.trait_value("layout.flex") {
        Some("none") => element.flex_none(),
        Some("auto" | "1 1 auto") => element.flex_auto(),
        Some("initial") => element.flex_initial(),
        Some("1" | "1 1 0" | "1 1 0px") => element.flex_1(),
        Some(value) => {
            let factors = split_css_values(value);
            if let (Some(grow), Some(shrink)) = (
                factors.first().and_then(|value| value.parse::<f32>().ok()),
                factors.get(1).and_then(|value| value.parse::<f32>().ok()),
            ) {
                element = element.flex_grow(grow).flex_shrink(shrink);
            }
            element
        }
        None => element,
    };
    if let Some(length) = recipe
        .trait_value("layout.flexBasis")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.flex_basis(Length::Auto),
            MashLength::Pixels(value) => element.flex_basis(px(value)),
            MashLength::Relative(value) => element.flex_basis(relative(value)),
        };
    }
    element
}

fn apply_alignment<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    element = match recipe.trait_value("layout.alignItems") {
        Some("center") => element.items_center(),
        Some("start" | "flex-start" | "leading") => element.items_start(),
        Some("end" | "flex-end" | "trailing") => element.items_end(),
        Some("baseline") => element.items_baseline(),
        Some("stretch") => element.items_stretch(),
        _ => element,
    };
    element = match recipe.trait_value("layout.alignSelf") {
        Some("center") => element.self_center(),
        Some("start" | "flex-start" | "leading") => element.self_start(),
        Some("end" | "flex-end" | "trailing") => element.self_end(),
        Some("baseline") => element.self_baseline(),
        Some("stretch") => element.self_stretch(),
        _ => element,
    };
    element = match recipe.trait_value("layout.justifyContent") {
        Some("center") => element.justify_center(),
        Some("start" | "flex-start" | "leading") => element.justify_start(),
        Some("end" | "flex-end" | "trailing") => element.justify_end(),
        Some("space-between" | "between") => element.justify_between(),
        Some("space-around" | "around") => element.justify_around(),
        Some("space-evenly" | "evenly") => element.justify_evenly(),
        _ => element,
    };
    element = match recipe.trait_value("layout.alignContent") {
        Some("center") => element.content_center(),
        Some("start" | "flex-start" | "leading") => element.content_start(),
        Some("end" | "flex-end" | "trailing") => element.content_end(),
        Some("space-between" | "between") => element.content_between(),
        Some("space-around" | "around") => element.content_around(),
        Some("space-evenly" | "evenly") => element.content_evenly(),
        Some("stretch") => element.content_stretch(),
        _ => element,
    };
    if recipe.trait_value("layout.placeItems") == Some("center") {
        element = element.items_center().justify_center();
    }
    if let Some(value) = recipe
        .trait_value("layout.gap")
        .and_then(crate::theme::parse_dimension)
    {
        element = element.gap(px(value));
    }
    element
}

fn apply_dimensions<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    if let Some(length) = recipe
        .trait_value("layout.inlineSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.w_auto(),
            MashLength::Pixels(value) => element.w(px(value)),
            MashLength::Relative(value) => element.w(relative(value)),
        };
    }
    if let Some(length) = recipe
        .trait_value("layout.blockSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.h_auto(),
            MashLength::Pixels(value) => element.h(px(value)),
            MashLength::Relative(value) => element.h(relative(value)),
        };
    }
    if let Some(length) = recipe
        .trait_value("layout.minInlineSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.min_w_auto(),
            MashLength::Pixels(value) => element.min_w(px(value)),
            MashLength::Relative(value) => element.min_w(relative(value)),
        };
    }
    if let Some(length) = recipe
        .trait_value("layout.minBlockSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.min_h_auto(),
            MashLength::Pixels(value) => element.min_h(px(value)),
            MashLength::Relative(value) => element.min_h(relative(value)),
        };
    }
    if let Some(length) = recipe
        .trait_value("layout.maxInlineSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.max_w_auto(),
            MashLength::Pixels(value) => element.max_w(px(value)),
            MashLength::Relative(value) => element.max_w(relative(value)),
        };
    }
    if let Some(length) = recipe
        .trait_value("layout.maxBlockSize")
        .and_then(parse_length)
    {
        element = match length {
            MashLength::Auto => element.max_h_auto(),
            MashLength::Pixels(value) => element.max_h(px(value)),
            MashLength::Relative(value) => element.max_h(relative(value)),
        };
    }
    if let Some(columns) = recipe
        .trait_value("layout.gridTemplateColumns")
        .and_then(grid_track_count)
    {
        element = element.grid_cols(columns);
    }
    if let Some(rows) = recipe
        .trait_value("layout.gridTemplateRows")
        .and_then(grid_track_count)
    {
        element = element.grid_rows(rows);
    }
    if let Some(value) = recipe.trait_value("layout.gridColumn") {
        element = apply_grid_column(element, value);
    }
    if let Some(value) = recipe.trait_value("layout.gridRow") {
        element = apply_grid_row(element, value);
    }
    element
}

fn apply_box_model<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    if let Some(value) = recipe.trait_value("layout.padding") {
        element = apply_padding(element, value);
    }
    if let Some(value) = recipe
        .trait_value("layout.paddingInline")
        .and_then(parse_pixel_length)
    {
        element = element.px(px(value));
    }
    if let Some(value) = recipe
        .trait_value("layout.paddingInlineStart")
        .and_then(parse_pixel_length)
    {
        element = element.pl(px(value));
    }
    if let Some(value) = recipe
        .trait_value("layout.paddingBlockStart")
        .and_then(parse_pixel_length)
    {
        element = element.pt(px(value));
    }
    if let Some(value) = recipe.trait_value("layout.margin") {
        element = apply_margin(element, value);
    }
    if let Some(value) = recipe.trait_value("layout.marginInlineStart") {
        element = if value == "auto" {
            element.ml_auto()
        } else if let Some(value) = parse_pixel_length(value) {
            element.ml(px(value))
        } else {
            element
        };
    }
    if let Some(value) = recipe.trait_value("layout.marginInlineEnd") {
        element = if value == "auto" {
            element.mr_auto()
        } else if let Some(value) = parse_pixel_length(value) {
            element.mr(px(value))
        } else {
            element
        };
    }
    element = apply_overflow(element, recipe.trait_value("layout.overflow"), None);
    element = apply_overflow(element, recipe.trait_value("layout.overflowX"), Some(true));
    apply_overflow(element, recipe.trait_value("layout.overflowY"), Some(false))
}

fn apply_position<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    element = match recipe.trait_value("layout.position") {
        Some("relative") => element.relative(),
        Some("absolute" | "fixed") => element.absolute(),
        _ => element,
    };
    if let Some(value) = recipe.trait_value("layout.inset") {
        let values = split_css_values(value);
        if values.len() == 1 {
            if let Some(value) = parse_pixel_length(values[0]) {
                element = element
                    .top(px(value))
                    .right(px(value))
                    .bottom(px(value))
                    .left(px(value));
            }
        }
    }
    if let Some(value) = recipe.trait_value("layout.insetBlock") {
        let values = split_css_values(value);
        if let Some(start) = values.first().and_then(|value| parse_pixel_length(value)) {
            element = element.top(px(start));
        }
        if let Some(end) = values
            .get(1)
            .or(values.first())
            .and_then(|value| parse_pixel_length(value))
        {
            element = element.bottom(px(end));
        }
    }
    if let Some(value) = recipe.trait_value("layout.insetInline") {
        let values = split_css_values(value);
        if let Some(start) = values.first().and_then(|value| parse_pixel_length(value)) {
            element = element.left(px(start));
        }
        if let Some(end) = values
            .get(1)
            .or(values.first())
            .and_then(|value| parse_pixel_length(value))
        {
            element = element.right(px(end));
        }
    }
    for (trait_name, side) in [
        ("layout.insetBlockStart", 0),
        ("layout.insetInlineEnd", 1),
        ("layout.insetBlockEnd", 2),
        ("layout.insetInlineStart", 3),
    ] {
        if let Some(value) = recipe.trait_value(trait_name).and_then(parse_pixel_length) {
            element = match side {
                0 => element.top(px(value)),
                1 => element.right(px(value)),
                2 => element.bottom(px(value)),
                _ => element.left(px(value)),
            };
        }
    }
    element
}

fn apply_type<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    if let Some(value) = recipe.trait_value("type.shorthand") {
        element = apply_font_shorthand(element, value);
    }
    if let Some(value) = recipe.trait_value("type.size").and_then(parse_pixel_length) {
        element = element.text_size(px(value));
    }
    if let Some(value) = recipe
        .trait_value("type.weight")
        .and_then(|value| value.parse::<f32>().ok())
    {
        element = element.font_weight(FontWeight(value));
    }
    if let Some(value) = recipe.trait_value("type.family").and_then(font_family) {
        element = element.font_family(value);
    }
    if let Some(value) = recipe.trait_value("type.line-height") {
        let pixels = parse_pixel_length(value).or_else(|| {
            value.parse::<f32>().ok().and_then(|factor| {
                recipe
                    .trait_value("type.size")
                    .and_then(parse_pixel_length)
                    .map(|size| size * factor)
            })
        });
        if let Some(value) = pixels {
            element = element.line_height(px(value));
        }
    }
    element = match recipe.trait_value("type.align") {
        Some("center") => element.text_center(),
        Some("end" | "right") => element.text_right(),
        Some("start" | "left") => element.text_left(),
        _ => element,
    };
    element = match recipe.trait_value("type.white-space") {
        Some("nowrap") => element.whitespace_nowrap(),
        Some("normal") => element.whitespace_normal(),
        _ => element,
    };
    if recipe.trait_value("type.overflow") == Some("ellipsis") {
        element = element.text_ellipsis();
    }
    element
}

fn apply_edges<T: Styled + Sized>(mut element: T, recipe: &ResolvedRecipe) -> T {
    if let Some(value) = recipe.trait_value("edge.radius").and_then(parse_radius) {
        element = element.rounded(px(value));
    }
    if let Some(border) = recipe.trait_value("edge.all") {
        element = apply_border(element, border, BorderSide::All);
    }
    for (name, side) in [
        ("edge.blockStart", BorderSide::Top),
        ("edge.inlineEnd", BorderSide::Right),
        ("edge.blockEnd", BorderSide::Bottom),
        ("edge.inlineStart", BorderSide::Left),
        ("edge.inline", BorderSide::Inline),
    ] {
        if let Some(border) = recipe.trait_value(name) {
            element = apply_border(element, border, side);
        }
    }
    if let Some(width) = recipe
        .trait_value("edge.width")
        .and_then(parse_pixel_length)
    {
        element = element.border(px(width));
    }
    if let Some(color) = recipe
        .trait_value("edge.color")
        .and_then(crate::theme::parse_color)
    {
        element = element.border_color(color.gpui());
    }
    for name in [
        "edge.blockStartColor",
        "edge.blockEndColor",
        "edge.inlineStartColor",
    ] {
        if let Some(color) = recipe.trait_value(name).and_then(crate::theme::parse_color) {
            element = element.border_color(color.gpui());
        }
    }
    element
}

fn apply_padding<T: Styled + Sized>(mut element: T, value: &str) -> T {
    let values = split_css_values(value)
        .into_iter()
        .filter_map(parse_pixel_length)
        .collect::<Vec<_>>();
    match values.as_slice() {
        [all] => element = element.p(px(*all)),
        [block, inline] => element = element.py(px(*block)).px(px(*inline)),
        [top, inline, bottom] => element = element.pt(px(*top)).px(px(*inline)).pb(px(*bottom)),
        [top, right, bottom, left] => {
            element = element
                .pt(px(*top))
                .pr(px(*right))
                .pb(px(*bottom))
                .pl(px(*left));
        }
        _ => {}
    }
    element
}

fn apply_margin<T: Styled + Sized>(mut element: T, value: &str) -> T {
    let values = split_css_values(value);
    let length = |value: &&str| parse_pixel_length(value);
    match values.as_slice() {
        [all] if *all == "auto" => element = element.m_auto(),
        [all] => {
            if let Some(all) = length(all) {
                element = element.m(px(all));
            }
        }
        [block, inline] => {
            if let Some(block) = length(block) {
                element = element.my(px(block));
            }
            element = if *inline == "auto" {
                element.mx_auto()
            } else if let Some(inline) = length(inline) {
                element.mx(px(inline))
            } else {
                element
            };
        }
        [top, right, bottom, left] => {
            if let Some(value) = length(top) {
                element = element.mt(px(value));
            }
            if let Some(value) = length(right) {
                element = element.mr(px(value));
            }
            if let Some(value) = length(bottom) {
                element = element.mb(px(value));
            }
            if let Some(value) = length(left) {
                element = element.ml(px(value));
            }
        }
        _ => {}
    }
    element
}

fn apply_overflow<T: Styled + Sized>(mut element: T, value: Option<&str>, axis: Option<bool>) -> T {
    let overflow = match value {
        Some("hidden") => Some(Overflow::Hidden),
        Some("auto" | "scroll") => Some(Overflow::Scroll),
        Some("visible") => None,
        _ => return element,
    };
    match axis {
        Some(true) => element.style().overflow.x = overflow,
        Some(false) => element.style().overflow.y = overflow,
        None => {
            element.style().overflow.x = overflow;
            element.style().overflow.y = overflow;
        }
    }
    element
}

#[derive(Clone, Copy)]
enum BorderSide {
    All,
    Top,
    Right,
    Bottom,
    Left,
    Inline,
}

fn apply_border<T: Styled + Sized>(mut element: T, value: &str, side: BorderSide) -> T {
    if value == "none" || value.trim_start().starts_with('0') {
        return match side {
            BorderSide::All => element.border_0(),
            BorderSide::Top => element.border_t_0(),
            BorderSide::Right => element.border_r_0(),
            BorderSide::Bottom => element.border_b_0(),
            BorderSide::Left => element.border_l_0(),
            BorderSide::Inline => element.border_x_0(),
        };
    }
    if let Some(width) = split_css_values(value)
        .into_iter()
        .find_map(parse_pixel_length)
    {
        element = match side {
            BorderSide::All => element.border(px(width)),
            BorderSide::Top => element.border_t(px(width)),
            BorderSide::Right => element.border_r(px(width)),
            BorderSide::Bottom => element.border_b(px(width)),
            BorderSide::Left => element.border_l(px(width)),
            BorderSide::Inline => element.border_x(px(width)),
        };
    }
    if let Some(color) = color_inside(value) {
        element = element.border_color(color.gpui());
    }
    element
}

fn apply_font_shorthand<T: Styled + Sized>(mut element: T, value: &str) -> T {
    if value == "inherit" {
        return element;
    }
    let normalized = value.replace('/', " / ");
    let values = split_css_values(&normalized);
    if let Some(weight) = values.first().and_then(|value| value.parse::<f32>().ok()) {
        element = element.font_weight(FontWeight(weight));
    }
    if let Some((index, size)) = values
        .iter()
        .enumerate()
        .find_map(|(index, value)| parse_pixel_length(value).map(|value| (index, value)))
    {
        element = element.text_size(px(size));
        if values.get(index + 1) == Some(&"/") {
            if let Some(height) = values
                .get(index + 2)
                .and_then(|value| parse_pixel_length(value))
            {
                element = element.line_height(px(height));
            }
        }
        let family_index = index
            + if values.get(index + 1) == Some(&"/") {
                3
            } else {
                1
            };
        if let Some(family) = values
            .get(family_index..)
            .and_then(|values| font_family(&values.join(" ")))
        {
            element = element.font_family(family);
        }
    }
    element
}

fn font_family(value: &str) -> Option<String> {
    let family = value.split(',').next()?.trim().trim_matches(['\'', '"']);
    (!family.is_empty()).then(|| family.to_owned())
}

fn apply_grid_column<T: Styled + Sized>(element: T, value: &str) -> T {
    if value.trim() == "1 / -1" {
        return element.col_span_full();
    }
    match value.trim().parse::<i16>() {
        Ok(line) => element.col_start(line),
        Err(_) => element,
    }
}

fn apply_grid_row<T: Styled + Sized>(element: T, value: &str) -> T {
    match value.trim().parse::<i16>() {
        Ok(line) => element.row_start(line),
        Err(_) => element,
    }
}

fn grid_track_count(value: &str) -> Option<u16> {
    if let Some(body) = value.trim().strip_prefix("repeat(") {
        return body.split(',').next()?.trim().parse().ok();
    }
    let tracks = split_css_values(value);
    (!tracks.is_empty() && tracks.iter().all(|track| !track.contains("auto-fit")))
        .then_some(tracks.len() as u16)
}

#[derive(Clone, Copy)]
enum MashLength {
    Auto,
    Pixels(f32),
    Relative(f32),
}

fn parse_length(value: &str) -> Option<MashLength> {
    let value = value.trim();
    if value == "auto" || value == "none" {
        return Some(MashLength::Auto);
    }
    if let Some(value) = value.strip_suffix('%') {
        return value
            .trim()
            .parse::<f32>()
            .ok()
            .map(|value| MashLength::Relative(value / 100.0));
    }
    crate::theme::parse_dimension(value).map(MashLength::Pixels)
}

fn parse_pixel_length(value: &str) -> Option<f32> {
    crate::theme::parse_dimension(value)
}

fn parse_radius(value: &str) -> Option<f32> {
    if value.trim().ends_with('%') {
        return Some(9999.0);
    }
    parse_pixel_length(value)
}

fn split_css_values(value: &str) -> Vec<&str> {
    let mut values = Vec::new();
    let mut start = 0;
    let mut depth = 0;
    for (index, character) in value.char_indices() {
        match character {
            '(' => depth += 1,
            ')' => depth -= 1,
            character if character.is_whitespace() && depth == 0 => {
                if start < index {
                    values.push(value[start..index].trim());
                }
                start = index + character.len_utf8();
            }
            _ => {}
        }
    }
    if start < value.len() {
        values.push(value[start..].trim());
    }
    values
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect()
}

fn color_inside(value: &str) -> Option<crate::MashColor> {
    if value.contains("transparent") {
        return crate::theme::parse_color("transparent");
    }
    let start = value.rfind("oklch(")?;
    let end = value[start..].find(')')? + start;
    crate::theme::parse_color(&value[start..=end])
}
