import type { Metadata } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { BountyDetail } from "@/components/BountyDetail";
import { RPC_URL, TOKEN_SYMBOL } from "@/lib/config";
import { getProgram } from "@/lib/program";
import { fetchBounty, slotsLeft } from "@/lib/data";
import { formatUnits } from "@/lib/format";
import { SITE_DESCRIPTION, SITE_URL, TAGLINE, X_HANDLE, bountyUrl, shareText } from "@/lib/site";

// Per-bounty metadata is read from chain on the server; any failure falls back to the static site metadata.
export async function generateMetadata({ params }: { params: { address: string } }): Promise<Metadata> {
  try {
    const key = new PublicKey(params.address);
    const program = getProgram(new Connection(RPC_URL, "confirmed"));
    const b = await Promise.race([
      fetchBounty(program, key),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (!b) throw new Error("not found");
    const reward = formatUnits(b.rewardPerWinner);
    const title = `${b.title} — ${reward} ${TOKEN_SYMBOL} per winner`;
    const description = `${reward} ${TOKEN_SYMBOL} per approved clip · ${slotsLeft(b)} of ${b.maxWinners} slots left. ${TAGLINE}`;
    const url = bountyUrl(params.address);
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: "website", url, title, description, siteName: "Munera", images: [{ url: "/og.png", width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", site: X_HANDLE, title, description: shareText(b.title, reward), images: ["/og.png"] },
    };
  } catch {
    return {
      title: "Bounty",
      description: SITE_DESCRIPTION,
      openGraph: { url: SITE_URL, images: [{ url: "/og.png", width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", images: ["/og.png"] },
    };
  }
}

export default function BountyPage({ params }: { params: { address: string } }) {
  return <BountyDetail address={params.address} />;
}
