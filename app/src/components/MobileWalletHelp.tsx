"use client";

import { useEffect, useState } from "react";
import { phantomBrowseUrl, solflareBrowseUrl } from "@/lib/site";

/**
 * Mobile browsers (Chrome/Safari) have no wallet extensions. This note links to the in-app browsers of
 * Phantom and Solflare, which inject the wallet. Hidden on desktop and when a wallet is already injected.
 */
export function MobileWalletHelp({ className = "", always = false }: { className?: string; always?: boolean }) {
  const [links, setLinks] = useState<{ p: string; s: string } | null>(null);

  useEffect(() => {
    const w = window as any;
    const injected = !!(w.phantom?.solana?.isPhantom || w.solflare?.isSolflare || w.solana);
    if (injected) return;
    const url = window.location.href;
    setLinks({ p: phantomBrowseUrl(url, window.location.origin), s: solflareBrowseUrl(url, window.location.origin) });
  }, []);

  if (!links) return null;
  return (
    <div className={`${always ? "" : "md:hidden"} rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-ink-soft ${className}`}>
      <p className="font-semibold text-ink">On mobile? Open Munera inside your wallet app</p>
      <p className="mt-1 text-xs leading-relaxed">
        Mobile browsers can&apos;t connect wallets directly. Open this page in the in-app browser of:
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <a href={links.p} className="btn-outline btn-sm" rel="noopener noreferrer">
          Open in Phantom
        </a>
        <a href={links.s} className="btn-outline btn-sm" rel="noopener noreferrer">
          Open in Solflare
        </a>
      </div>
    </div>
  );
}
