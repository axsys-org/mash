#[path = "catalogue/mod.rs"]
mod catalogue;

fn main() {
    let component = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "overview".to_owned());
    catalogue::run_native(&component);
}
