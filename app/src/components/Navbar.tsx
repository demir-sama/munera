"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { XIcon } from "./icons";
import { MobileWalletHelp } from "./MobileWalletHelp";
import { X_URL } from "@/lib/site";

const links = [
  { href: "/", label: "Bounties" },
  { href: "/create", label: "Create" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/payments", label: "Payments" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/bounty") : path.startsWith(href));

  // close the drawer on navigation, lock body scroll while open
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-[44px] items-center gap-2.5" aria-label="Munera home">
          <Logo size={40} />
          <span className="font-display text-xl font-bold tracking-[0.18em] text-ink">MUNERA</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active(l.href) ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-neutral-100 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Munera on X"
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink hover:text-white sm:inline-flex"
          >
            <XIcon />
          </a>
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-drawer"
          className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto overscroll-contain bg-white px-4 pb-safe pt-4 lg:hidden"
          style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-[48px] items-center rounded-xl px-4 text-base font-semibold ${
                  active(l.href) ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-neutral-50 active:bg-neutral-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 space-y-4 border-t border-neutral-100 pt-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Wallet</p>
              <WalletButton />
            </div>
            <MobileWalletHelp always />
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-neutral-200 px-4 text-base font-semibold"
            >
              <XIcon className="h-4 w-4" /> Follow @munera_xyz on X
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
