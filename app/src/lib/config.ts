import { PublicKey } from "@solana/web3.js";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W"
);

function parseMint(v: string | undefined): PublicKey | null {
  if (!v) return null;
  try {
    return new PublicKey(v.trim());
  } catch {
    return null;
  }
}
/** Test USDC mint; null when unset / invalid. */
export const USDC_MINT: PublicKey | null = parseMint(process.env.NEXT_PUBLIC_USDC_MINT);
export const USDC_MINT_RAW = process.env.NEXT_PUBLIC_USDC_MINT || "";

export const USDC_DECIMALS = 6;
export const TOKEN_SYMBOL = "USDC";

export const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || "devnet";

// Program limits (mirror programs/munera/src/lib.rs)
export const MAX_TITLE_LEN = 64;
export const MAX_DESCRIPTION_LEN = 280;
export const MAX_LINK_LEN = 200;
export const MAX_WINNERS_LIMIT = 65535; // u16
