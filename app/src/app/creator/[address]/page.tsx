import type { Metadata } from "next";
import { CreatorProfile } from "@/components/CreatorProfile";

export function generateMetadata({ params }: { params: { address: string } }): Metadata {
  const a = params.address;
  const short = a.length > 9 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
  return {
    title: `Creator ${short}`,
    description: `Earnings and submissions of creator ${short} on Munera.`,
  };
}

export default function CreatorPage({ params }: { params: { address: string } }) {
  return <CreatorProfile address={params.address} />;
}
