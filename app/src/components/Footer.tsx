import Link from "next/link";
import { Logo } from "./Logo";
import { GitHubIcon, XIcon } from "./icons";
import { PROGRAM_ID } from "@/lib/config";
import { explorerAddress } from "@/lib/explorer";
import { GITHUB_URL, TAGLINE, X_URL } from "@/lib/site";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Bounties" },
      { href: "/create", label: "Create a bounty" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/profile", label: "My profile" },
      { href: "/payments", label: "Payments" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/contract-reference", label: "Contract reference" },
      { href: "/docs/faq", label: "FAQ" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-white pb-safe">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <p className="font-display text-base font-bold tracking-[0.2em]">MUNERA</p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">{TAGLINE} Escrowed USDC bounties for creators, settled onchain on Solana.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{c.title}</p>
            <ul className="mt-3 space-y-1">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-[40px] items-center text-sm text-ink-soft hover:text-brand-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Community</p>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-ink-soft hover:text-brand-600">
                <XIcon className="h-3.5 w-3.5" /> X (@munera_xyz)
              </a>
            </li>
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-ink-soft hover:text-brand-600">
                <GitHubIcon className="h-3.5 w-3.5" /> GitHub
              </a>
            </li>
            <li>
              <a
                href={explorerAddress(PROGRAM_ID.toBase58())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center text-sm text-ink-soft hover:text-brand-600"
              >
                Program on Explorer ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-4 text-center text-xs text-ink-muted">
        Devnet test tokens only · Every denarius accounted for onchain · Escrow secured by a Solana program
      </div>
    </footer>
  );
}
