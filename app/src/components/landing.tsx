import Link from "next/link";
import { XIcon, GitHubIcon } from "./icons";
import { GITHUB_URL, X_URL } from "@/lib/site";
import { PROGRAM_ID } from "@/lib/config";
import { explorerAddress } from "@/lib/explorer";

export function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-ink-soft">{sub}</p>}
    </div>
  );
}

export function AboutSection() {
  return (
    <section aria-labelledby="about" className="grid gap-6 md:grid-cols-2">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow mb-2">About Munera</p>
        <h2 id="about" className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
          Pay creators the way the internet should
        </h2>
        <p className="mt-4 text-ink-soft">
          Munera (Latin for &ldquo;gifts&rdquo;, and what the Romans called the games of the arena) is a Solana escrow platform for content bounties. A project
          posts a challenge, locks the prize money in a vault, and creators compete with their best clips, threads and videos. When the
          sponsor approves an entry, the reward is paid to the creator in that same transaction.
        </p>
        <p className="mt-3 text-ink-soft">
          There is no backend and no database. Every bounty, submission and payout is an account on Solana, readable by anyone.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="card border-l-4 border-l-ink p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">The problem</p>
          <p className="mt-2 text-ink-soft">
            Creator campaigns run on spreadsheets and DMs. Creators can&apos;t be sure they will be paid, and projects can&apos;t prove that
            they paid.
          </p>
        </div>
        <div className="card border-l-4 border-l-brand-600 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">The solution</p>
          <p className="mt-2 text-ink-soft">
            Funds are escrowed upfront in a program-owned vault. Payouts are automatic on approval, unspent funds return to the sponsor
            after the deadline, and the full history is public with Explorer links.
          </p>
        </div>
      </div>
    </section>
  );
}

const features = [
  ["🔒", "Escrow upfront", "The whole prize pool (reward × winners) is locked in a vault PDA when the bounty is created."],
  ["⚡", "Pay on approval, same tx", "Approving a submission transfers the reward from the vault to the creator in one transaction."],
  ["↩", "Reclaim unspent", "After the deadline the sponsor can pull whatever is left in the vault back to their wallet."],
  ["🧾", "Onchain payment history", "Every payout is listed with its Solana Explorer transaction link. Nothing to trust, everything to verify."],
  ["∅", "No backend", "No servers, no database. The site reads Solana accounts directly through the program's IDL."],
  ["🏆", "Creator leaderboard", "Creators are ranked by USDC earned, with public profiles of every submission and payout."],
  ["🪪", "Creator profiles & socials", "Creators link X, Discord, YouTube and more to their wallet with a tiny onchain memo, so sponsors see who entered. Self-declared and public."],
  ["👛", "Phantom & Solflare", "Connect with the wallets you already use, on desktop or inside their mobile in-app browsers."],
  ["🛡", "Checked & tested", "Sponsor-only actions, no double payment, max-winner caps and checked math, covered by 22 program tests."],
] as const;

export function FeaturesGrid() {
  return (
    <section aria-labelledby="features">
      <SectionHeading eyebrow="Features" title="Built for trust on both sides" sub="Everything a bounty needs, enforced by the program instead of promises." />
      <h2 id="features" className="sr-only">
        Features
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([icon, t, d]) => (
          <div key={t} className="card p-5 transition hover:border-brand-300 hover:shadow-lift">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg text-brand-700" aria-hidden>
              {icon}
            </div>
            <h3 className="font-bold">{t}</h3>
            <p className="mt-1.5 text-sm text-ink-soft">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ["I", "Post the prize", "Sponsors lock reward × winners in a vault PDA. No funds, no bounty."],
    ["II", "Creators compete", "Anyone submits a link before the deadline. One entry per creator."],
    ["III", "Victory is paid", "Approval transfers the reward from the vault to the creator in the same transaction."],
  ];
  return (
    <section className="rounded-3xl bg-ink px-5 py-10 text-white sm:px-12" aria-labelledby="how">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-300">How it works</p>
      <h2 id="how" className="mt-2 font-display text-2xl font-bold tracking-wide sm:text-3xl">
        Three steps from prize to payout
      </h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {steps.map(([n, t, d]) => (
          <div key={n}>
            <p className="font-display text-3xl font-bold text-brand-300">{n}</p>
            <h3 className="mt-2 text-lg font-bold">{t}</h3>
            <p className="mt-1 text-sm text-neutral-300">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/create" className="btn bg-white text-ink hover:bg-brand-50">
          Launch a bounty →
        </Link>
        <Link href="/docs/quickstart" className="btn border border-white/25 text-white hover:bg-white/10">
          Read the quickstart
        </Link>
      </div>
    </section>
  );
}

const faqs: [string, React.ReactNode][] = [
  [
    "Is it real money?",
    "No. Munera currently runs on Solana devnet with a test USDC mint that anyone can create tokens for. Test tokens have no value; it is a live demo of the full escrow flow.",
  ],
  [
    "How do creators get paid?",
    "When the sponsor approves your submission, the program transfers the reward from the bounty vault straight to your USDC token account (created for you if needed) in the same transaction. You can verify it on Solana Explorer.",
  ],
  [
    "What if no one submits?",
    "Nothing is lost. After the deadline the sponsor can reclaim the unspent funds from the vault with one click, which also closes the bounty.",
  ],
  [
    "Who can approve?",
    "Only the sponsor wallet that created the bounty. The program rejects approvals, rejections and reclaims from any other wallet.",
  ],
  [
    "Can creators add their socials?",
    <>
      Yes. Creators can link X, Discord, YouTube and more on the <Link href="/profile" className="font-semibold text-brand-600 hover:underline">Profile</Link> page. It&apos;s a tiny onchain memo signed by your wallet. Links are self-declared, not verified.
    </>,
  ],
  [
    "How do I get test USDC?",
    <>
      Connect a devnet wallet, then ask for test USDC on{" "}
      <a href={X_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
        X
      </a>{" "}
      or follow the <Link href="/docs/quickstart" className="font-semibold text-brand-600 hover:underline">Quickstart</Link>. You also need a little devnet SOL for fees.
    </>,
  ],
];

export function Faq() {
  return (
    <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl">
      <SectionHeading eyebrow="FAQ" title="Quick answers" />
      <h2 id="faq" className="sr-only">
        FAQ
      </h2>
      <div className="card divide-y divide-neutral-100 overflow-hidden">
        {faqs.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{q}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{a}</div>
          </details>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-ink-muted">
        More in the <Link href="/docs/faq" className="font-semibold text-brand-600 hover:underline">docs FAQ</Link>.
      </p>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-600 px-5 py-12 text-center text-white sm:px-12">
      <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <h2 className="relative font-display text-3xl font-bold tracking-wide sm:text-4xl">Enter the arena. Earn your reward.</h2>
      <p className="relative mx-auto mt-3 max-w-xl text-brand-100">
        Post a bounty in a minute, or find one to win. Everything settles onchain.
      </p>
      <div className="relative mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href="/create" className="btn bg-white px-6 py-3 text-brand-700 hover:bg-brand-50">
          Launch a bounty
        </Link>
        <Link href="#arena" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
          Browse bounties
        </Link>
        <Link href="/docs" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
          Read the docs
        </Link>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
          <XIcon className="h-4 w-4" /> Follow on X
        </a>
      </div>
      <p className="relative mt-6 text-xs text-brand-200">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
          <GitHubIcon className="h-3.5 w-3.5" /> GitHub
        </a>
        {" · "}
        <a href={explorerAddress(PROGRAM_ID.toBase58())} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Program on Explorer ↗
        </a>
      </p>
    </section>
  );
}
