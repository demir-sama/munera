import type { Metadata } from "next";
import { ProfileEditor } from "@/components/ProfileEditor";

export const metadata: Metadata = {
  title: "My profile",
  description: "Link your socials to your wallet with a tiny onchain memo so sponsors can see who you are.",
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
