/**
 * Publishes a creator profile memo (one-off helper, used for the devnet demo data).
 *   RPC_URL=https://api.devnet.solana.com CREATOR_KEYPAIR=<json file> [CREATOR_INDEX=0] [FEE_PAYER_KEYPAIR=<json>] \
 *   PROFILE='{"name":"Demo","socials":{"x":"munera_xyz"}}' pnpm tsx scripts/save-profile.ts
 */
import { Connection, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import { buildProfileTx, fetchProfile, parseProfileMemo, serializeProfile } from "../src/lib/profile";

const load = (f: string, idx?: number) => {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  const arr = Array.isArray(j) && Array.isArray(j[0]) ? j[idx ?? 0] : Array.isArray(j) ? j : (Object.values(j).find((v) => Array.isArray(v)) as number[]);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
};

(async () => {
  const conn = new Connection(process.env.RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
  const creator = load(process.env.CREATOR_KEYPAIR!, Number(process.env.CREATOR_INDEX ?? 0));
  const payer = process.env.FEE_PAYER_KEYPAIR ? load(process.env.FEE_PAYER_KEYPAIR) : creator;
  const raw = JSON.parse(process.env.PROFILE!);
  const profile = parseProfileMemo(JSON.stringify({ app: "munera", v: 1, t: "profile", ...raw }));
  if (!profile) throw new Error("invalid profile");
  console.log("creator", creator.publicKey.toBase58(), "payer", payer.publicKey.toBase58());
  console.log("memo", serializeProfile(profile));
  const tx = buildProfileTx(creator.publicKey, profile);
  tx.feePayer = payer.publicKey;
  const sig = await sendAndConfirmTransaction(conn, tx, payer.publicKey.equals(creator.publicKey) ? [creator] : [payer, creator], { commitment: "confirmed" });
  console.log("signature", sig);
  const back = await fetchProfile(creator.publicKey, conn, { force: true });
  console.log("read back", JSON.stringify(back));
})();
