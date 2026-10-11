"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProfile } from "@/hooks/useProfile";
import { isEmptyProfile } from "@/lib/profile";

/** Gentle, non-blocking nudge for connected creators without an onchain profile. */
export function ProfileNudge() {
  const { publicKey } = useWallet();
  const { profile } = useProfile(publicKey?.toBase58());
  if (!publicKey || profile === undefined || !isEmptyProfile(profile)) return null;
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-ink-soft">
        <span className="font-semibold text-ink">Add your socials so sponsors can see who you are.</span> Optional, takes one tiny transaction.
      </p>
      <Link href="/profile" className="btn-outline btn-sm shrink-0 self-start sm:self-auto">
        Set up profile
      </Link>
    </div>
  );
}
