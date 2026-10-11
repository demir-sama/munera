"use client";

import dynamic from "next/dynamic";

// The adapter button renders wallet-dependent markup, so it must be client-only to avoid hydration mismatches.
export const WalletButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => <span className="inline-block h-10 w-36 animate-pulse rounded-xl bg-brand-100" />,
  }
);
