export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://munera-opal.vercel.app").replace(/\/$/, "");
export const X_URL = "https://x.com/munera_xyz?s=11";
export const X_HANDLE = "@munera_xyz";
export const GITHUB_URL = "https://github.com/demir-sama/munera";
export const TAGLINE = "Enter the arena. Earn your reward.";
export const SITE_DESCRIPTION =
  "Munera is a Solana escrow platform for content bounties. Sponsors lock USDC in a vault, creators submit links, and approval pays the creator in the same transaction.";

export const bountyUrl = (address: string) => `${SITE_URL}/bounty/${address}`;

export function shareText(title: string, reward: string) {
  return `New bounty on ${X_HANDLE}: ${title} — ${reward} USDC per approved clip. ${TAGLINE}`;
}

export function xIntentUrl(title: string, reward: string, address: string) {
  const p = new URLSearchParams({ text: shareText(title, reward), url: bountyUrl(address) });
  return `https://twitter.com/intent/tweet?${p.toString()}`;
}

/** Deep links that open a page inside the wallet's in-app browser (mobile Chrome has no extensions). */
export function phantomBrowseUrl(url: string, origin: string) {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`;
}
export function solflareBrowseUrl(url: string, origin: string) {
  return `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`;
}
