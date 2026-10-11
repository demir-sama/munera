import type { Metadata } from "next";
import { DashboardView } from "@/components/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Munera bounties as a sponsor and your submissions as a creator.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
