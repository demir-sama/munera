# source scripts/env.sh   -- toolchain env for building/testing Munera
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
# Anchor 0.30.1 builds the IDL with `cargo +$RUSTUP_TOOLCHAIN test` (or +nightly if unset) and needs a
# 2024-era nightly (newer nightlies removed proc_macro::SourceFile / Span::source_file used by anchor-syn).
export RUSTUP_TOOLCHAIN=nightly-2024-06-01
