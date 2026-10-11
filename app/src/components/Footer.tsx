import Link from "next/link";
import { Logo } from "./Logo";
import { PROGRAM_ID } from "@/lib/config";
import { explorerAddress } from "@/lib/explorer";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="font-display text-sm font-bold tracking-[0.2em]">MUNERA</p>
            <p className="text-xs text-ink-muted">Enter the arena. Earn your reward.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-brand-600">Bounties</Link>
          <Link href="/create" className="hover:text-brand-600">Create</Link>
          <Link href="/payments" className="hover:text-brand-600">Payments</Link>
          <a href={explorerAddress(PROGRAM_ID.toBase58())} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
            Program ↗
          </a>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4 text-center text-xs text-ink-muted">
        Devnet test tokens only · Every denarius accounted for onchain · Escrow secured by a Solana program
      </div>
    </footer>
  );
}
