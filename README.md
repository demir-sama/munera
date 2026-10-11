# Munera — Enter the arena. Earn your reward.

Solana (Anchor 0.30.1) escrow for content bounties. Sponsors lock USDC in a vault PDA, creators submit links,
the sponsor approves (paying from the vault in the same tx) or rejects, and can reclaim unspent funds after the deadline.

## Toolchain (pinned, known-good)
- Solana/Agave CLI 1.18.26 (platform-tools v1.41), Anchor CLI 0.30.1, Node 20, yarn 1.22.22
- Rust: `nightly-2024-06-01` is used for the IDL build (set via `RUSTUP_TOOLCHAIN`, see `scripts/env.sh`)
- `Cargo.lock` is committed (v3, seeded from the Anchor v0.30.1 lock) — do NOT regenerate it with a modern cargo.

## Build & test
    source scripts/env.sh
    yarn install
    anchor build
    anchor test

## Scripts (devnet by default; override with RPC_URL / KEYPAIR_PATH)
    yarn create-mint
    yarn mint-to <WALLET> <AMOUNT> [MINT]
