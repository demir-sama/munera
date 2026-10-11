import Link from "next/link";
import { Logo } from "./Logo";
import { XIcon } from "./icons";
import { MobileWalletHelp } from "./MobileWalletHelp";
import { X_URL } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-card">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="relative grid items-center gap-10 px-5 py-10 sm:px-12 md:grid-cols-[1.35fr_1fr] md:py-16">
        <div>
          <Logo size={72} className="mb-5 md:hidden" />
          <p className="eyebrow mb-4 sm:mb-5">Content bounties · Onchain escrow</p>
          <h1 className="font-display text-[2.4rem] font-bold leading-[1.1] tracking-wide sm:text-5xl lg:text-6xl">
            Enter the arena.
            <span className="mt-1 block text-brand-600">Earn your reward.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-soft sm:mt-6 sm:text-lg">
            Sponsors lock USDC in a vault. Creators submit their best work. One approval pays the victor straight from the vault —
            every payout public, every coin traceable on Solana.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-2.5">
            <Link href="#arena" className="btn-primary px-5 py-3">
              Browse bounties
            </Link>
            <Link href="/create" className="btn-dark px-5 py-3">
              Launch a bounty
            </Link>
            <Link href="/payments" className="btn-outline px-5 py-3">
              See payouts
            </Link>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-3">
              <XIcon className="h-4 w-4" /> Follow on X
            </a>
          </div>
          <ul className="mt-7 flex flex-col gap-2 text-sm text-ink-soft sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {["Funds escrowed upfront", "Pay on approval, same transaction", "Unspent funds reclaimable after deadline"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <MobileWalletHelp className="mt-6" />
        </div>
        <div className="relative mx-auto hidden aspect-square w-full max-w-xs items-center justify-center md:flex">
          <div className="absolute inset-0 rounded-[2.5rem] border border-brand-100 bg-gradient-to-br from-brand-50 to-white" />
          <div className="absolute inset-6 rounded-[2rem] border border-dashed border-brand-200" />
          <Logo size={220} className="relative" />
        </div>
      </div>
    </section>
  );
}
