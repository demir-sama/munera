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
| `NEXT_PUBLIC_USDC_MINT` | _(unset; devnet value in `.env.example`)_ | Test USDC mint from `yarn create-mint`. Required to create bounties; the Create page shows a notice when unset |
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

### Live deployment
Source: https://github.com/demir-sama/munera (branch `main`).
Production URL: **https://munera-opal.vercel.app** (Vercel project `munera`, team `sama-5806`, deployment protection off, devnet env vars set).
The deployment was created from local files (no Git remote is linked), so redeploys are manual until a GitHub repo is connected.

### Devnet deployment
| Item | Value |
|---|---|
| Program ID | [`48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W`](https://explorer.solana.com/address/48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W?cluster=devnet) (upgrade authority `6GuibzaZ2tazm3BnkxsAyaCC95xN5Y8mJoM8TBZniQok`) |
| Test USDC mint (6 decimals) | [`E6ibRcFx5Q3pPu2Fy27eGRkJpCNq6kWhXX1sbg3U9EZ2`](https://explorer.solana.com/address/E6ibRcFx5Q3pPu2Fy27eGRkJpCNq6kWhXX1sbg3U9EZ2?cluster=devnet) (mint authority = CLI wallet) |
| Example bounty | [`BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU`](https://explorer.solana.com/address/BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU?cluster=devnet) "Show Munera in 30 seconds" (5 USDC x 3 winners, 30-day deadline) |
| create_bounty tx | [3KKBkvq7…](https://explorer.solana.com/tx/3KKBkvq79ujsTy2eJFTkdTNUiDsUe7dHxZpMashncVy8GvP6tTU13wsu4QQqb2Nmu1k4wL9EusLQ8UE45tN3YkK9?cluster=devnet) |
| submit_clip txs | [xZyjKhoy…](https://explorer.solana.com/tx/xZyjKhoy8vPUVe4DhsWkefPgYx6gGb9pW87bk76bwjP78VZ8N6JtbfaMg3qUSR26cQGvNzn4BS93wPHnMAH5UGN?cluster=devnet), [4M9oivVv…](https://explorer.solana.com/tx/4M9oivVvF7rhVmxW8r6PhdsHqmUN7uTkxUFFLSa3GLhBa8HXDRirGy7vWVjy7H6dazFbuHP3ZZnvocPrbArHSWYk?cluster=devnet) |
| approve_submission (payout of 5 USDC) tx | [2pQwkJS7…](https://explorer.solana.com/tx/2pQwkJS7C5zJKWC1XXuzU6SVvgh9ugGEaWnxRv5wMJ1w9FDocjHXC2aRrma4jNdEvhWuJ34pSZ7xotgDjiLzKRKU?cluster=devnet) |

Deployed with `anchor deploy --provider.cluster devnet`; mint via `yarn create-mint`; 10,000 test USDC minted to the CLI wallet.
Demo data was created by `app/scripts/seed-devnet.ts` (the throwaway creator keys live outside the repo in `~/.config/solana/`).
To give any wallet test USDC: `yarn mint-to <WALLET> 1000` (must be run with the mint-authority keypair).
