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

## Frontend (`app/`)
Next.js 14 (App Router) + TypeScript + Tailwind, light theme matching `assets/logo.png`. No backend or database: every page
reads straight from the program's onchain accounts (`bounty`, `submission`, vault token accounts) via `@coral-xyz/anchor`.

Routes: `/` bounty board · `/create` sponsor form · `/bounty/[address]` details, submit, approve/reject, reclaim · `/payments` payout ledger
(Approved submissions + payout tx found with `getSignaturesForAddress` on the Submission PDA; `?bounty=<address>` filters).

### Setup
    cd app
    pnpm install               # Node 20
    cp .env.example .env.local # then edit
    pnpm dev                   # http://localhost:3000
    pnpm build && pnpm start   # production build (also runs lint + type-check)

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` | RPC endpoint |
| `NEXT_PUBLIC_PROGRAM_ID` | `48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W` | Deployed Munera program |
| `NEXT_PUBLIC_USDC_MINT` | _(unset)_ | Test USDC mint from `yarn create-mint`. Required to create bounties; the Create page shows a notice when unset |
| `NEXT_PUBLIC_CLUSTER` | `devnet` | Only affects Explorer links (`devnet`, `mainnet-beta`, or `localnet` for a custom-URL cluster) |

Wallets: Phantom and Solflare (any wallet-standard wallet is also detected). Code map: `src/lib/program.ts` (Program builder,
read-only provider when disconnected), `src/lib/pda.ts` (seeds from `lib.rs`), `src/lib/data.ts` (account reads), `src/lib/errors.ts`
(IDL error code -> friendly text), `src/components/Logo.tsx` (single place to swap the logo).

### Getting test USDC into a wallet
    source scripts/env.sh
    yarn create-mint                       # prints the mint; put it in app/.env.local as NEXT_PUBLIC_USDC_MINT
    yarn mint-to <WALLET_ADDRESS> 1000     # run with the mint authority keypair (~/.config/solana/id.json)

### Local end-to-end testing (no devnet needed)
    source scripts/env.sh
    solana-test-validator --reset --ledger /tmp/munera-ledger \
      --bpf-program 48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W target/deploy/munera.so &
    cd app
    pnpm seed:local     # creates a test mint + sample bounties/submissions/payouts, writes /tmp/munera-seed.json
    pnpm verify:data    # runs the frontend's data helpers against the validator and asserts invariants
    NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899 NEXT_PUBLIC_CLUSTER=localnet NEXT_PUBLIC_USDC_MINT=<mint> pnpm build
    NEXT_PUBLIC_RPC_URL=... pnpm exec next start -p 3100 &
    pnpm e2e            # headless Chrome + injected fake Phantom: create -> submit -> approve -> reclaim; writes ../screenshots/*.png
`e2e` needs Google Chrome at `/usr/bin/google-chrome` (edit `scripts/e2e.ts` otherwise).

### Deploy to Vercel
1. Import the repo, set **Root Directory** to `app` (framework preset: Next.js, install command `pnpm install`).
2. Add the env vars above (at minimum `NEXT_PUBLIC_USDC_MINT`; use a private RPC such as Helius/QuickNode for `NEXT_PUBLIC_RPC_URL`
   because the public devnet RPC rate-limits `getProgramAccounts`).
3. Deploy. All routes are client-rendered against the chain, so no server env is needed.

### Devnet deployment status
Program ID `48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W` is **not yet deployed to devnet**: the public faucet rejected every airdrop for
`6GuibzaZ2tazm3BnkxsAyaCC95xN5Y8mJoM8TBZniQok` (HTTP 429 "airdrop limit reached or faucet has run dry", 30+ attempts on
`--url devnet` and `https://api.devnet.solana.com`, 2 SOL and 1 SOL). To finish:
    # get ~3 SOL on the wallet from https://faucet.solana.com (or retry `solana airdrop 2 --url devnet`)
    source scripts/env.sh
    anchor deploy --provider.cluster devnet     # program keypair: target/deploy/munera-keypair.json
    yarn create-mint                            # note the mint address
    echo "NEXT_PUBLIC_USDC_MINT=<mint>" >> app/.env.local
    yarn mint-to <your-wallet> 1000
Addresses once deployed: program `48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W`, test USDC mint `TBD`.
