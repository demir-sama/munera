"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { CopyButton } from "./CopyButton";
import { SocialIcons } from "./SocialLinks";
import { shortAddr } from "@/lib/format";

/**
 * Creator name (display name or short wallet) + small social icons, loaded lazily from the onchain profile cache.
 * Falls back to the short wallet while loading or when there is no profile.
 */
export function CreatorIdentity({
  address,
  showAddress = true,
  className = "",
}: {
  address: string;
  /** also show the short wallet (with copy) under the display name */
  showAddress?: boolean;
  className?: string;
}) {
  const { profile, ref } = useProfile(address, true);
  const name = profile?.name;
  const short = shortAddr(address);
  return (
    <div ref={ref as any} className={`min-w-0 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0">
        <Link
          href={`/creator/${address}`}
          className={`min-w-0 max-w-full truncate font-semibold text-brand-600 hover:underline ${name ? "text-base" : "font-mono text-sm"}`}
        >
          {name ?? short}
        </Link>
        {!name && showAddress && <CopyButton text={address} label="Copy address" className="-my-2" />}
        <SocialIcons profile={profile} />
        {profile === undefined && <span className="h-3 w-12 animate-pulse rounded bg-neutral-100" aria-hidden />}
      </div>
      {name && showAddress && (
        <div className="flex items-center font-mono text-xs text-ink-muted">
          {short}
          <CopyButton text={address} label="Copy address" className="-my-2" />
        </div>
      )}
    </div>
  );
}
