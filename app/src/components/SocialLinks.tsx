"use client";

import type { ReactNode } from "react";
import { SOCIAL_KEYS, SOCIAL_META, socialUrl, type Profile, type SocialKey } from "@/lib/profile";
import { CopyButton } from "./CopyButton";
import { DiscordIcon, GitHubIcon, GlobeIcon, InstagramIcon, TelegramIcon, TikTokIcon, XIcon, YouTubeIcon } from "./icons";

export const SOCIAL_ICON: Record<SocialKey, (p: { className?: string }) => ReactNode> = {
  x: XIcon,
  discord: DiscordIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  telegram: TelegramIcon,
  github: GitHubIcon,
  website: GlobeIcon,
};

const REL = "noopener noreferrer nofollow";

export function displayValue(key: SocialKey, v: string) {
  if (key === "website") return v.replace(/^https:\/\//, "").replace(/\/$/, "");
  return key === "youtube" || key === "tiktok" || key === "x" || key === "instagram" || key === "telegram" || key === "github" ? `@${v}` : v;
}

/** Compact, icon-only links (X first). Discord copies the handle. Used in rows/cards. */
export function SocialIcons({ profile, max = 8 }: { profile: Profile | null | undefined; max?: number }) {
  if (!profile) return null;
  const items = SOCIAL_KEYS.filter((k) => profile.socials[k]).slice(0, max);
  if (!items.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5" aria-label="Self-declared social links">
      {items.map((k) => {
        const Icon = SOCIAL_ICON[k];
        const v = profile.socials[k]!;
        if (k === "discord")
          return <CopyButton key={k} text={v} label={`Copy Discord handle ${v}`} className="!h-11 !w-11 sm:!h-8 sm:!w-8" icon={<Icon className="h-4 w-4" />} />;
        const url = socialUrl(k, v);
        if (!url) return null;
        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel={REL}
            aria-label={`${SOCIAL_META[k].label}: ${displayValue(k, v)} (self-declared)`}
            title={`${SOCIAL_META[k].label}: ${displayValue(k, v)} · self-declared`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-brand-700 sm:h-8 sm:w-8"
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </span>
  );
}

/** Full list with labels, for the creator profile page and the editor preview. */
export function SocialList({ profile }: { profile: Profile }) {
  const items = SOCIAL_KEYS.filter((k) => profile.socials[k]);
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((k) => {
        const Icon = SOCIAL_ICON[k];
        const v = profile.socials[k]!;
        const label = `${SOCIAL_META[k].label} ${displayValue(k, v)}`;
        const cls =
          "inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-ink transition hover:border-brand-300 hover:bg-brand-50";
        if (k === "discord")
          return (
            <li key={k} className={`${cls} !pr-1`}>
              <Icon className="h-4 w-4 shrink-0 text-brand-700" />
              <span className="min-w-0 truncate">Discord: {v}</span>
              <CopyButton text={v} label="Copy Discord handle" />
            </li>
          );
        const url = socialUrl(k, v);
        if (!url) return null;
        return (
          <li key={k} className="min-w-0 max-w-full">
            <a href={url} target="_blank" rel={REL} className={cls} title={`${label} · self-declared`}>
              <Icon className="h-4 w-4 shrink-0 text-brand-700" />
              <span className="min-w-0 truncate">{displayValue(k, v)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function SelfDeclaredBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Self-declared by the wallet owner and stored publicly onchain. Munera does not verify ownership of these accounts."
      className={`inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ${className}`}
    >
      Self-declared
    </span>
  );
}
