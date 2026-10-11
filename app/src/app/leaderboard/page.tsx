import type { Metadata } from "next";
import { LeaderboardView } from "@/components/LeaderboardView";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top creators on Munera ranked by USDC earned from approved bounty submissions.",
};

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
