/**
 * Documentation content as typed data (no MDX / extra deps).
 * Inline markup supported in strings: `code`, **bold**, [text](href).
 * Content mirrors programs/munera/src/lib.rs - keep both in sync.
 */

export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "code"; lang?: string; code: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "callout"; tone?: "info" | "warn"; text: string }
  | { t: "h3"; text: string };

export type DocSection = { id: string; title: string; blocks: Block[] };
export type DocPage = { slug: string; title: string; summary: string; sections: DocSection[] };

const PROGRAM = "48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W";
const MINT = "E6ibRcFx5Q3pPu2Fy27eGRkJpCNq6kWhXX1sbg3U9EZ2";
const EXAMPLE_BOUNTY = "BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU";
const EXAMPLE_TX = "2pQwkJS7C5zJKWC1XXuzU6SVvgh9ugGEaWnxRv5wMJ1w9FDocjHXC2aRrma4jNdEvhWuJ34pSZ7xotgDjiLzKRKU";
const EX = (path: string) => `https://explorer.solana.com/${path}?cluster=devnet`;

export const DOCS: DocPage[] = [
  {
    slug: "introduction",
    title: "Introduction",
    summary: "What Munera is, who it is for, and why it exists.",
    sections: [
      {
        id: "what-is-munera",
        title: "What is Munera?",
        blocks: [
          {
            t: "p",
            text: "Munera is a Solana escrow platform for **content bounties**. A sponsor posts a challenge and locks the full prize pool in a vault. Creators submit links to their work. The sponsor approves or rejects each entry, and approval pays the creator from the vault in the same transaction.",
          },
          { t: "p", text: "Every bounty, submission and payout is an account on Solana, so anyone can verify who was paid, how much, and when." },
          { t: "callout", tone: "info", text: "Munera currently runs on **Solana devnet** with a test USDC mint. Test tokens have no monetary value." },
        ],
      },
      {
        id: "the-problem",
        title: "The problem",
        blocks: [
          { t: "p", text: "Creator campaigns usually run on spreadsheets and DMs. Creators cannot be sure they will be paid, and projects cannot prove that they paid." },
        ],
      },
      {
        id: "the-solution",
        title: "The solution",
        blocks: [
          {
            t: "ul",
            items: [
              "**Escrow upfront:** the prize pool (reward × winners) is locked when the bounty is created.",
              "**Pay on approval:** approving a submission transfers the reward to the creator in the same transaction.",
              "**Reclaim unspent:** after the deadline the sponsor can withdraw whatever is left.",
              "**Public history:** every payout links to a Solana Explorer transaction.",
              "**No backend:** the site reads accounts directly from the chain.",
            ],
          },
        ],
      },
      {
        id: "where-next",
        title: "Where to next",
        blocks: [
          {
            t: "ul",
            items: [
              "New here? Follow the [Quickstart](/docs/quickstart).",
              "Want the mental model? Read [Concepts](/docs/concepts).",
              "Integrating or auditing? See the [Smart contract reference](/docs/contract-reference).",
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "quickstart",
    title: "Quickstart",
    summary: "Get a devnet wallet, SOL and test USDC, then run your first bounty as a sponsor or a creator.",
    sections: [
      {
        id: "wallet",
        title: "1. Get a wallet on devnet",
        blocks: [
          {
            t: "ol",
            items: [
              "Install [Phantom](https://phantom.app) or [Solflare](https://solflare.com) (browser extension on desktop, app on mobile).",
              "Switch the wallet to **devnet**. Phantom: Settings → Developer Settings → Testnet Mode → Solana Devnet. Solflare: Settings → Network → Devnet.",
              "Click **Select Wallet** in the Munera navbar and approve the connection.",
            ],
          },
          {
            t: "callout",
            tone: "info",
            text: "**On mobile?** Mobile Chrome and Safari have no wallet extensions. Open Munera inside the **Phantom** or **Solflare** in-app browser. The site shows deep-link buttons for this in the menu and on connect prompts.",
          },
        ],
      },
      {
        id: "sol",
        title: "2. Get devnet SOL",
        blocks: [
          { t: "p", text: "You need a little SOL for network fees and account rent (creating a bounty, submitting, and approving each create accounts)." },
          {
            t: "ul",
            items: [
              "Web faucet: [faucet.solana.com](https://faucet.solana.com) (choose Devnet).",
              "Or with the Solana CLI:",
            ],
          },
          { t: "code", lang: "bash", code: "solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet" },
        ],
      },
      {
        id: "usdc",
        title: "3. Get test USDC",
        blocks: [
          { t: "p", text: `Munera uses a test USDC mint with 6 decimals. Its mint address is:` },
          { t: "code", code: MINT },
          {
            t: "p",
            text: "Only the mint authority can mint this token. Ask for test USDC by posting your wallet address to [@munera_xyz on X](https://x.com/munera_xyz?s=11), or if you run the repo yourself, mint with the helper script from the repo root using the mint-authority keypair:",
          },
          { t: "code", lang: "bash", code: `source scripts/env.sh\nyarn mint-to <WALLET_ADDRESS> 1000 ${MINT}` },
          { t: "p", text: "Creators do **not** need USDC to submit. They receive USDC when they are approved, and their token account is created automatically." },
        ],
      },
      {
        id: "as-sponsor",
        title: "Run a bounty as a sponsor",
        blocks: [
          {
            t: "ol",
            items: [
              "Open [Create](/create) and fill in the title, description, reward per approved submission, max winners and deadline.",
              "Check the total budget (reward × winners) against your USDC balance.",
              "Click **Lock funds & create bounty** and approve the transaction.",
              "Share the bounty on X from its page.",
              "Review submissions on the bounty page and click **Approve & pay** or **Reject**.",
              "After the deadline, click **Reclaim unspent** to withdraw what is left.",
            ],
          },
        ],
      },
      {
        id: "as-creator",
        title: "Enter a bounty as a creator",
        blocks: [
          {
            t: "ol",
            items: [
              "Browse the [bounty board](/) and open a bounty that is **Open**.",
              "Paste a link to your work (an `https://` URL up to 200 bytes) and click **Submit entry**.",
              "Wait for the sponsor. When approved, the reward lands in your wallet and the payout appears on [Payments](/payments) and your creator profile.",
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "concepts",
    title: "Concepts",
    summary: "Bounties, vaults, submissions and the four statuses you see on the site.",
    sections: [
      {
        id: "bounty",
        title: "Bounty",
        blocks: [
          {
            t: "p",
            text: "A bounty is an onchain account created by a sponsor. It stores the title, description, reward per winner, maximum number of winners, deadline, the token mint, and counters for paid and submitted entries.",
          },
        ],
      },
      {
        id: "vault",
        title: "Vault",
        blocks: [
          {
            t: "p",
            text: "Each bounty has a vault: an SPL token account whose **authority is the Bounty PDA**. Nobody holds its private key. Funds can only leave through the program: to a creator on approval, or back to the sponsor on reclaim.",
          },
        ],
      },
      {
        id: "submission",
        title: "Submission",
        blocks: [
          {
            t: "p",
            text: "A submission is an account derived from the bounty and the creator's wallet, so each creator can enter a bounty **once**. It stores the link, a status (Pending, Approved or Rejected), the paid amount and the payment time.",
          },
        ],
      },
      {
        id: "statuses",
        title: "Bounty statuses",
        blocks: [
          {
            t: "p",
            text: "The program stores only `Open` or `Closed`. The site derives two more labels from the deadline and the slot count:",
          },
          {
            t: "table",
            head: ["Label", "Meaning"],
            rows: [
              ["Open", "Accepting submissions: not closed, deadline not reached, slots left."],
              ["Filled", "All winner slots are paid (`paid_count == max_winners`) but the bounty is not closed yet."],
              ["Expired", "The deadline has passed and the bounty is not closed. Pending submissions can still be approved until the sponsor reclaims."],
              ["Closed", "The sponsor reclaimed the unspent funds. No submissions or payouts are possible any more."],
            ],
          },
        ],
      },
      {
        id: "slots",
        title: "Slots and budget",
        blocks: [
          { t: "p", text: "Slots left = `max_winners − paid_count`. The escrowed budget is always `reward_per_winner × max_winners`, so every approval is fully funded." },
        ],
      },
    ],
  },

  {
    slug: "sponsor-guide",
    title: "Sponsor guide",
    summary: "Create a bounty, review submissions, pay creators and reclaim unspent funds.",
    sections: [
      {
        id: "create",
        title: "Creating a bounty",
        blocks: [
          {
            t: "table",
            head: ["Field", "Rule"],
            rows: [
              ["Title", "1–64 bytes"],
              ["Description", "0–280 bytes"],
              ["Reward per approved submission", "Greater than 0, up to 6 decimals"],
              ["Max winners", "1–65,535"],
              ["Deadline", "Must be in the future"],
            ],
          },
          { t: "p", text: "The form shows the **total budget** (reward × winners) and your USDC balance. Creating the bounty transfers the total from your token account to the vault." },
          { t: "callout", text: "Limits are measured in **bytes**, not characters. Emoji and non-Latin text take more than one byte each." },
        ],
      },
      {
        id: "review",
        title: "Reviewing submissions",
        blocks: [
          {
            t: "p",
            text: "Open your bounty (or your [Dashboard](/dashboard)) and look at the pending submissions. Only you, the sponsor wallet, see **Approve & pay** and **Reject**.",
          },
          {
            t: "ul",
            items: [
              "**Approve & pay:** transfers the reward from the vault to the creator and marks the submission Approved. If the creator has no USDC token account yet, one is created and you pay its small rent.",
              "**Reject:** marks the submission Rejected. No funds move. Rejected creators cannot resubmit to the same bounty.",
            ],
          },
        ],
      },
      {
        id: "reclaim",
        title: "Reclaiming unspent funds",
        blocks: [
          {
            t: "p",
            text: "After the deadline, **Reclaim unspent** returns the remaining vault balance to your wallet and closes the bounty. Do this **after** you finish reviewing: once closed, pending submissions can no longer be paid.",
          },
        ],
      },
      {
        id: "tips",
        title: "Tips",
        blocks: [
          {
            t: "ul",
            items: [
              "Set a deadline long enough for creators to participate and for you to review.",
              "Be explicit in the description about platforms, rules and judging.",
              "Share the bounty on X using the **Share on X** button to reach creators.",
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "creator-guide",
    title: "Creator guide",
    summary: "Find bounties, submit your work and get paid.",
    sections: [
      {
        id: "find",
        title: "Finding bounties",
        blocks: [
          { t: "p", text: "Use the board on the [home page](/) to search by title and filter by status. Sort by highest reward, ending soon or most slots left. Filters are saved in the URL so you can share a view." },
        ],
      },
      {
        id: "submit",
        title: "Submitting",
        blocks: [
          {
            t: "ul",
            items: [
              "Connect your wallet on the bounty page.",
              "Paste an `http(s)` link up to 200 bytes (an X post, a YouTube Short, a TikTok…).",
              "You get **one** entry per bounty and cannot edit it, so double-check the link.",
              "Submitting costs a small amount of SOL for the submission account rent.",
            ],
          },
        ],
      },
      {
        id: "paid",
        title: "Getting paid",
        blocks: [
          { t: "p", text: "When the sponsor approves, the reward is sent to your USDC associated token account in the same transaction. Check [Payments](/payments), the [Leaderboard](/leaderboard) and your creator profile for the payout and its Explorer link." },
        ],
      },
      {
        id: "profile",
        title: "Add your socials",
        blocks: [
          { t: "p", text: "Optionally link your X, Discord, Instagram, TikTok, YouTube, Telegram, GitHub or website to your wallet on the [Profile](/profile) page so sponsors can see who you are. See [Creator profiles](/docs/creator-profiles) for how it works." },
        ],
      },
      {
        id: "why-not-paid",
        title: "Why wasn't I paid?",
        blocks: [
          {
            t: "ul",
            items: [
              "Your submission is still **Pending**: the sponsor has not reviewed it yet.",
              "It was **Rejected** by the sponsor.",
              "The sponsor **reclaimed** the funds after the deadline before reviewing it.",
              "All slots were already paid (**Filled**).",
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "creator-profiles",
    title: "Creator profiles",
    summary: "Link your socials to your wallet with an onchain memo. Self-declared, public, no backend.",
    sections: [
      {
        id: "what",
        title: "What it is",
        blocks: [
          { t: "p", text: "A creator profile is a display name plus optional links to X, Discord, Instagram, TikTok, YouTube, Telegram, GitHub and a website. It is shown on your [creator page](/leaderboard), on the leaderboard and next to your submissions, so sponsors can see who they are reviewing." },
          { t: "p", text: "Profiles are optional and never block creating a bounty, submitting or getting paid. Edit yours on the [Profile](/profile) page." },
        ],
      },
      {
        id: "how",
        title: "How it works onchain",
        blocks: [
          { t: "p", text: "Munera has no database. When you save, your wallet signs one transaction containing a single **SPL Memo** instruction (Memo program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`, v2). Your wallet is passed to the memo instruction as a signer, so the Memo program itself verifies your signature and the record is attributable to you. The Munera program is not involved." },
          {
            t: "code",
            lang: "json",
            code: `{"app":"munera","v":1,"t":"profile","name":"Gladius","socials":{"x":"munera_xyz","discord":"gladius","website":"https://example.com"}}`,
          },
          { t: "p", text: "Memos are capped at 500 bytes by the editor. Allowed keys are `x`, `discord`, `instagram`, `tiktok`, `youtube`, `telegram`, `github` and `website`." },
        ],
      },
      {
        id: "reading",
        title: "How profiles are read",
        blocks: [
          {
            t: "ol",
            items: [
              "The site lists recent signatures of the wallet (`getSignaturesForAddress`), which include each transaction's memo text.",
              "It picks the **most recent successful** memo with `app = munera`, `t = profile`, `v = 1`.",
              "It downloads that transaction and checks that the memo instruction lists the wallet as a **signer account**, so nobody can attach a profile to your address by merely sending you a transaction or signing a memo of their own.",
              "Everything is validated strictly: only allowed keys, handle patterns, length limits and `https://` URLs. Anything else is dropped. Values are always rendered as escaped text, never as HTML.",
            ],
          },
          { t: "p", text: "Results are cached in your browser for a few minutes to be kind to public RPC endpoints, so changes can take a moment to appear elsewhere. Only the latest 200 signatures of a wallet are searched; a very busy wallet may lose an old profile from view, and republishing fixes that." },
        ],
      },
      {
        id: "caveat",
        title: "Self-declared, not verified",
        blocks: [
          { t: "callout", tone: "warn", text: "Links are self-declared and stored publicly onchain. **Munera doesn't verify that you own these accounts.** Treat them as a claim, not proof." },
          { t: "p", text: "**Verification tip:** also pin your wallet address in the bio of the accounts you link. Anyone can then check that both sides agree, with no extra tooling." },
        ],
      },
      {
        id: "privacy",
        title: "Privacy and permanence",
        blocks: [
          {
            t: "ul",
            items: [
              "Anything you publish is **public forever**. Do not include private information.",
              "Updating or removing links publishes a **new** memo; the latest one wins. Earlier memos remain in the blockchain's history and are visible on Explorer.",
              "**Remove all links** publishes an empty profile, which hides your links on Munera but cannot erase history.",
              "Your profile is tied to your wallet address, which is already public. Linking socials connects the two publicly.",
            ],
          },
        ],
      },
      {
        id: "fees",
        title: "Fees",
        blocks: [{ t: "p", text: "A memo transaction costs only the network fee, about 0.000005 SOL. No rent is paid and nothing is created." }] ,
      },
    ],
  },

  {
    slug: "payments",
    title: "Payments & verification",
    summary: "How payouts are recorded and how to verify one yourself on Solana Explorer.",
    sections: [
      {
        id: "history",
        title: "Payment history",
        blocks: [
          { t: "p", text: "The [Payments](/payments) page lists every Approved submission: bounty, creator, sponsor, amount, time and a link to the payout transaction. You can filter by bounty. The data comes from submission accounts, and the transaction is found with `getSignaturesForAddress` on the submission account." },
        ],
      },
      {
        id: "verify",
        title: "Verify a payout onchain",
        blocks: [
          {
            t: "ol",
            items: [
              "Open the payout's **Tx** link (Solana Explorer, devnet cluster).",
              "In the instruction list, find `Instruction: ApproveSubmission` from the Munera program, then the SPL token `TransferChecked` that follows it.",
              "Confirm the transfer goes from the **bounty vault** to the **creator's token account** for the expected amount (6 decimals: `5000000` = 5 USDC).",
              "Open the **submission account** and check `status = Approved`, `paid_amount` and `paid_at`.",
            ],
          },
          { t: "p", text: `Try it with the example payout: [${EXAMPLE_TX.slice(0, 12)}…](${EX("tx/" + EXAMPLE_TX)}).` },
        ],
      },
      {
        id: "logs",
        title: "Events",
        blocks: [
          { t: "p", text: "The program emits a `PayoutEvent` with the bounty, submission, creator, amount, running paid count and timestamp. Indexers can subscribe to these events instead of scanning accounts." },
        ],
      },
    ],
  },

  {
    slug: "contract-reference",
    title: "Smart contract reference",
    summary: "Program ID, PDA seeds, accounts, instructions, errors and events, straight from lib.rs.",
    sections: [
      {
        id: "program",
        title: "Program",
        blocks: [
          { t: "table", head: ["Item", "Value"], rows: [["Program ID", `\`${PROGRAM}\``], ["Framework", "Anchor 0.30.1"], ["Cluster", "Devnet"], ["Source", "[programs/munera/src/lib.rs](https://github.com/demir-sama/munera/blob/main/programs/munera/src/lib.rs)"]] },
        ],
      },
      {
        id: "pdas",
        title: "PDA seeds",
        blocks: [
          {
            t: "table",
            head: ["Account", "Seeds"],
            rows: [
              ["Bounty", '`[b"bounty", sponsor, bounty_id.to_le_bytes()]`'],
              ["Vault", '`[b"vault", bounty]` (SPL token account, authority = Bounty PDA)'],
              ["Submission", '`[b"submission", bounty, creator]` (one per creator per bounty)'],
            ],
          },
          {
            t: "code",
            lang: "ts",
            code: `const bounty = PublicKey.findProgramAddressSync(
  [Buffer.from("bounty"), sponsor.toBuffer(), bountyId.toArrayLike(Buffer, "le", 8)],
  programId
)[0];
const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), bounty.toBuffer()], programId)[0];
const submission = PublicKey.findProgramAddressSync(
  [Buffer.from("submission"), bounty.toBuffer(), creator.toBuffer()],
  programId
)[0];`,
          },
        ],
      },
      {
        id: "accounts",
        title: "Account data",
        blocks: [
          { t: "h3", text: "Bounty" },
          {
            t: "table",
            head: ["Field", "Type", "Notes"],
            rows: [
              ["sponsor", "Pubkey", "Creator of the bounty; the only wallet that can approve, reject and reclaim"],
              ["mint", "Pubkey", "Token mint of the prize"],
              ["reward_per_winner", "u64", "Base units (USDC has 6 decimals)"],
              ["max_winners", "u16", ""],
              ["paid_count", "u16", "Number of approved submissions"],
              ["submission_count", "u32", ""],
              ["deadline", "i64", "Unix seconds"],
              ["status", "enum", "`Open` or `Closed`"],
              ["title", "String", "≤ 64 bytes"],
              ["description", "String", "≤ 280 bytes"],
              ["bump / vault_bump", "u8", "PDA bumps"],
              ["bounty_id", "u64", "Part of the PDA seeds"],
            ],
          },
          { t: "h3", text: "Submission" },
          {
            t: "table",
            head: ["Field", "Type", "Notes"],
            rows: [
              ["bounty", "Pubkey", ""],
              ["creator", "Pubkey", ""],
              ["link", "String", "1–200 bytes"],
              ["status", "enum", "`Pending`, `Approved` or `Rejected`"],
              ["paid_amount", "u64", "0 until approved"],
              ["paid_at", "i64", "Unix seconds, 0 until approved"],
              ["bump", "u8", ""],
            ],
          },
        ],
      },
      {
        id: "create-bounty",
        title: "create_bounty",
        blocks: [
          { t: "code", lang: "rust", code: "create_bounty(bounty_id: u64, title: String, description: String,\n               reward_per_winner: u64, max_winners: u16, deadline: i64)" },
          { t: "p", text: "**Accounts:** `sponsor` (signer, mut), `mint`, `bounty` (init PDA), `vault` (init token account, authority = bounty), `sponsor_ata` (mut, mint = mint, authority = sponsor), `token_program`, `system_program`." },
          {
            t: "ul",
            items: [
              "`reward_per_winner > 0`, `max_winners > 0`.",
              "`title` is 1–64 bytes; `description` is at most 280 bytes.",
              "`deadline` is later than the current chain time.",
              "`total = reward_per_winner × max_winners` is checked for overflow, then transferred from `sponsor_ata` to `vault` with `transfer_checked`.",
              "Emits `BountyCreated`.",
            ],
          },
        ],
      },
      {
        id: "submit-clip",
        title: "submit_clip",
        blocks: [
          { t: "code", lang: "rust", code: "submit_clip(link: String)" },
          { t: "p", text: "**Accounts:** `creator` (signer, mut), `bounty` (mut), `submission` (init PDA), `system_program`." },
          {
            t: "ul",
            items: [
              "`link` is 1–200 bytes.",
              "Bounty status is `Open` and the current time is before `deadline`.",
              "Creating the submission PDA fails if the creator already entered, which enforces one entry per creator.",
              "Increments `submission_count`. Emits `SubmissionCreated`.",
            ],
          },
        ],
      },
      {
        id: "approve-submission",
        title: "approve_submission",
        blocks: [
          { t: "code", lang: "rust", code: "approve_submission()" },
          {
            t: "p",
            text: "**Accounts:** `sponsor` (signer, mut), `bounty` (mut, `has_one = sponsor`, `has_one = mint`), `submission` (mut, `has_one = bounty`, `has_one = creator`), `creator`, `mint`, `vault` (mut), `creator_ata` (init_if_needed associated token account, payer = sponsor), `token_program`, `associated_token_program`, `system_program`.",
          },
          {
            t: "ul",
            items: [
              "Bounty is `Open`, submission is `Pending`, and `paid_count < max_winners`.",
              "Transfers `reward_per_winner` from the vault to the creator's token account, signed by the Bounty PDA.",
              "Sets the submission to `Approved` with `paid_amount` and `paid_at`, then increments `paid_count`.",
              "Allowed after the deadline until the sponsor reclaims. Emits `PayoutEvent`.",
            ],
          },
        ],
      },
      {
        id: "reject-submission",
        title: "reject_submission",
        blocks: [
          { t: "code", lang: "rust", code: "reject_submission()" },
          { t: "p", text: "**Accounts:** `sponsor` (signer), `bounty` (`has_one = sponsor`), `submission` (mut, `has_one = bounty`). Requires the submission to be `Pending`; sets it to `Rejected`. Emits `RejectEvent`." },
        ],
      },
      {
        id: "reclaim-unspent",
        title: "reclaim_unspent",
        blocks: [
          { t: "code", lang: "rust", code: "reclaim_unspent()" },
          { t: "p", text: "**Accounts:** `sponsor` (signer), `bounty` (mut, `has_one = sponsor`, `has_one = mint`), `mint`, `vault` (mut), `sponsor_ata` (mut), `token_program`." },
          {
            t: "ul",
            items: [
              "Bounty is `Open` and the current time is at or after `deadline`.",
              "Sets the bounty to `Closed` **before** transferring the entire remaining vault balance to `sponsor_ata`. A second call fails with `BountyClosed`.",
              "Emits `ReclaimEvent` with the amount returned.",
            ],
          },
        ],
      },
      {
        id: "errors",
        title: "Errors",
        blocks: [
          {
            t: "table",
            head: ["Code", "Name", "Message"],
            rows: [
              ["6000", "InvalidReward", "Reward per winner must be greater than zero"],
              ["6001", "InvalidMaxWinners", "Max winners must be greater than zero"],
              ["6002", "DeadlineInPast", "Deadline must be in the future"],
              ["6003", "TitleTooLong", "Title must be 1-64 bytes"],
              ["6004", "DescriptionTooLong", "Description must be at most 280 bytes"],
              ["6005", "LinkTooLong", "Link must be 1-200 bytes"],
              ["6006", "MathOverflow", "Arithmetic overflow"],
              ["6007", "Unauthorized", "Only the bounty sponsor can do this"],
              ["6008", "BountyClosed", "Bounty is closed"],
              ["6009", "DeadlinePassed", "Submission deadline has passed"],
              ["6010", "DeadlineNotReached", "Deadline has not been reached yet"],
              ["6011", "SubmissionNotPending", "Submission is not pending"],
              ["6012", "MaxWinnersReached", "Maximum number of winners already paid"],
            ],
          },
        ],
      },
      {
        id: "events",
        title: "Events",
        blocks: [
          {
            t: "table",
            head: ["Event", "Fields"],
            rows: [
              ["BountyCreated", "bounty, sponsor, mint, bounty_id, reward_per_winner, max_winners, deadline, total_escrowed"],
              ["SubmissionCreated", "bounty, creator, submission"],
              ["PayoutEvent", "bounty, submission, creator, amount, paid_count, timestamp"],
              ["RejectEvent", "bounty, submission, creator"],
              ["ReclaimEvent", "bounty, sponsor, amount"],
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "security",
    title: "Security model",
    summary: "What the program guarantees, and the trust assumptions that remain.",
    sections: [
      {
        id: "guarantees",
        title: "Guarantees enforced by the program",
        blocks: [
          {
            t: "ul",
            items: [
              "**Sponsor-only actions:** approve, reject and reclaim require the signer to be `bounty.sponsor` (`has_one`, error `Unauthorized`).",
              "**No double payment:** a submission can only be approved while `Pending`, and approval flips it to `Approved` in the same instruction.",
              "**Max winners:** approvals fail once `paid_count == max_winners`.",
              "**Always funded:** the vault holds `reward × max_winners` from creation, using checked multiplication.",
              "**Vault custody:** the vault's authority is the Bounty PDA, so only the program can move funds, and only along the approve and reclaim paths.",
              "**Account validation:** PDA seeds and bumps are verified on every instruction; the submission must belong to the bounty and creator passed in.",
              "**Reclaim safety:** the bounty is marked `Closed` before funds move, so it cannot be reclaimed twice.",
              "**One entry per creator:** enforced by the submission PDA.",
            ],
          },
          { t: "p", text: "The program has 22 passing tests covering the happy path, authorization failures, limits and edge cases." },
        ],
      },
      {
        id: "assumptions",
        title: "Trust assumptions",
        blocks: [
          {
            t: "ul",
            items: [
              "**The sponsor is the judge.** Munera does not arbitrate: a sponsor can reject any submission, or reclaim after the deadline without reviewing. Escrow protects creators from an **empty** promise, not from an unfair judge. Sponsor history is public, and creator reputation is on the roadmap.",
              "**Links are not verified.** The program stores the submitted URL; it does not check that it resolves or who owns it.",
              "**Devnet only.** The program has not been audited and must not hold real funds until it has been.",
              "**Upgradeable program.** On devnet the upgrade authority is the deployer wallet. A mainnet deployment would use a multisig or an immutable program.",
            ],
          },
        ],
      },
      {
        id: "report",
        title: "Reporting issues",
        blocks: [{ t: "p", text: "Found a bug? Open an issue on [GitHub](https://github.com/demir-sama/munera/issues) or message [@munera_xyz](https://x.com/munera_xyz?s=11)." }],
      },
    ],
  },

  {
    slug: "architecture",
    title: "Architecture",
    summary: "No backend: how the site reads and writes Solana, the tech stack and the repo layout.",
    sections: [
      {
        id: "overview",
        title: "Overview",
        blocks: [
          {
            t: "p",
            text: "Munera has two parts: an Anchor program that holds the rules and the funds, and a Next.js website that talks to Solana directly from the browser. There is no server, database or indexer.",
          },
        ],
      },
      {
        id: "reads",
        title: "How reads work",
        blocks: [
          {
            t: "ul",
            items: [
              "The site builds an Anchor `Program` from the committed IDL and reads accounts with `program.account.bounty.all()` and `program.account.submission.all()` (with `memcmp` filters for per-bounty and per-creator queries).",
              "The leaderboard, creator profiles, dashboard and payment history are **computed in the browser** from those accounts.",
              "Payout transactions are found with `getSignaturesForAddress` on the submission account.",
              "Vault balances come from `getTokenAccountBalance`.",
              "Creator profiles are SPL Memo records signed by the creator wallet, read with `getSignaturesForAddress` and cached in the browser (see [Creator profiles](/docs/creator-profiles)).",
            ],
          },
        ],
      },
      {
        id: "writes",
        title: "How writes work",
        blocks: [
          { t: "p", text: "Your wallet signs transactions built by the Anchor client (`create_bounty`, `submit_clip`, `approve_submission`, `reject_submission`, `reclaim_unspent`). Errors are mapped from the IDL to friendly messages." },
        ],
      },
      {
        id: "stack",
        title: "Tech stack",
        blocks: [
          {
            t: "ul",
            items: [
              "Program: Rust, Anchor 0.30.1, SPL Token.",
              "Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS.",
              "Solana: `@solana/web3.js` 1.x, `@coral-xyz/anchor`, `@solana/spl-token`, Solana wallet adapter (Phantom, Solflare).",
              "Hosting: Vercel, auto-deployed from GitHub `main`.",
            ],
          },
        ],
      },
      {
        id: "layout",
        title: "Repository layout",
        blocks: [
          {
            t: "code",
            code: `programs/munera/   Anchor program (src/lib.rs)
tests/             Program tests (22)
scripts/           create-mint, mint-to
app/               Next.js frontend (deploy root on Vercel)
  src/lib/         program, pda, data, errors, docs content
  src/components/  UI components
  src/app/         routes
assets/            logo, X banner
docs/              demo script and pitch notes`,
          },
        ],
      },
    ],
  },

  {
    slug: "devnet-addresses",
    title: "Devnet addresses",
    summary: "Program, test mint and the example bounty with a real payout.",
    sections: [
      {
        id: "addresses",
        title: "Addresses",
        blocks: [
          {
            t: "table",
            head: ["Item", "Address"],
            rows: [
              ["Program ID", `[${PROGRAM}](${EX("address/" + PROGRAM)})`],
              ["Test USDC mint (6 decimals)", `[${MINT}](${EX("address/" + MINT)})`],
              ["Example bounty", `[${EXAMPLE_BOUNTY}](/bounty/${EXAMPLE_BOUNTY})`],
              ["Example payout tx", `[${EXAMPLE_TX.slice(0, 16)}…](${EX("tx/" + EXAMPLE_TX)})`],
            ],
          },
        ],
      },
      {
        id: "env",
        title: "Frontend configuration",
        blocks: [
          {
            t: "code",
            lang: "bash",
            code: `NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=${PROGRAM}
NEXT_PUBLIC_USDC_MINT=${MINT}
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_SITE_URL=https://munera-opal.vercel.app`,
          },
        ],
      },
    ],
  },

  {
    slug: "roadmap",
    title: "Roadmap",
    summary: "What we want to build next.",
    sections: [
      {
        id: "next",
        title: "Planned",
        blocks: [
          {
            t: "ul",
            items: [
              "**Mainnet with real USDC:** after an audit, using an immutable or multisig-controlled program.",
              "**Solana Actions / Blinks:** fund, share and enter bounties directly from X.",
              "**Creator reputation:** verifiable track record built from approved payouts, beyond the leaderboard.",
              "**Rejection reasons:** sponsors explain decisions onchain or in event data.",
              "**Budget top-up:** let sponsors add funds and winner slots to a live bounty.",
            ],
          },
          { t: "p", text: "Roadmap items are plans, not promises. Ideas are welcome on [GitHub](https://github.com/demir-sama/munera) and [X](https://x.com/munera_xyz?s=11)." },
        ],
      },
    ],
  },

  {
    slug: "faq",
    title: "FAQ",
    summary: "Short answers to common questions.",
    sections: [
      {
        id: "money",
        title: "Is it real money?",
        blocks: [{ t: "p", text: "No. Munera runs on Solana devnet with a test USDC mint. The tokens have no value." }],
      },
      {
        id: "paid",
        title: "How do creators get paid?",
        blocks: [{ t: "p", text: "On approval, the program transfers the reward from the vault to the creator's USDC token account in the same transaction." }],
      },
      {
        id: "nobody",
        title: "What if no one submits?",
        blocks: [{ t: "p", text: "After the deadline the sponsor reclaims the unspent funds and the bounty closes." }],
      },
      {
        id: "approve",
        title: "Who can approve?",
        blocks: [{ t: "p", text: "Only the sponsor wallet that created the bounty." }],
      },
      {
        id: "usdc",
        title: "How do I get test USDC?",
        blocks: [{ t: "p", text: `See the [Quickstart](/docs/quickstart#usdc). The mint is \`${MINT}\`; ask on [X](https://x.com/munera_xyz?s=11) or use \`yarn mint-to\`.` }],
      },
      {
        id: "resubmit",
        title: "Can I submit twice or edit my link?",
        blocks: [{ t: "p", text: "No. There is one submission per creator per bounty and it cannot be edited." }],
      },
      {
        id: "late",
        title: "Can the sponsor approve after the deadline?",
        blocks: [{ t: "p", text: "Yes, until they reclaim. Reclaiming closes the bounty, after which nothing can be paid." }],
      },
      {
        id: "profiles",
        title: "Can creators add their socials?",
        blocks: [{ t: "p", text: "Yes, on the [Profile](/profile) page. Links are self-declared and stored onchain via a memo; see [Creator profiles](/docs/creator-profiles)." }],
      },
      {
        id: "mobile",
        title: "Can I use Munera on my phone?",
        blocks: [{ t: "p", text: "Yes, inside the Phantom or Solflare in-app browser. Normal mobile browsers cannot connect wallets." }],
      },
    ],
  },

  {
    slug: "links",
    title: "Links",
    summary: "Where to find Munera.",
    sections: [
      {
        id: "links",
        title: "Links",
        blocks: [
          {
            t: "ul",
            items: [
              "Website: [munera-opal.vercel.app](https://munera-opal.vercel.app)",
              "X: [@munera_xyz](https://x.com/munera_xyz?s=11)",
              "GitHub: [demir-sama/munera](https://github.com/demir-sama/munera)",
              `Program on Explorer: [${PROGRAM}](${EX("address/" + PROGRAM)})`,
            ],
          },
        ],
      },
    ],
  },
];

export const DOC_SLUGS = DOCS.map((d) => d.slug);
export const getDoc = (slug: string) => DOCS.find((d) => d.slug === slug);
export function getNeighbors(slug: string) {
  const i = DOCS.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? DOCS[i - 1] : null, next: i >= 0 && i < DOCS.length - 1 ? DOCS[i + 1] : null };
}
