/**
 * Devnet smoke test + demo data: create a bounty, submit from two throwaway creators, approve one.
 *   MINT=<mint> pnpm tsx scripts/seed-devnet.ts
 * Sponsor = ~/.config/solana/id.json. Creator keys are written to ~/.config/solana/munera-demo-creators.json (never committed).
 */
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getProgram } from "../src/lib/program";
import { bountyPda, submissionPda, vaultPda } from "../src/lib/pda";
import { explorerAddress, explorerTx } from "../src/lib/explorer";

const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const mint = new PublicKey(process.env.MINT!);
const load = (f: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(f, "utf8"))));
const mk = (connection: Connection, kp: Keypair) =>
  getProgram(connection, {
    publicKey: kp.publicKey,
    signTransaction: async (t: any) => (t.partialSign(kp), t),
    signAllTransactions: async (ts: any[]) => ts.map((t) => (t.partialSign(kp), t)),
  });

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const sponsor = load(path.join(os.homedir(), ".config/solana/id.json"));
  const credFile = path.join(os.homedir(), ".config/solana/munera-demo-creators.json");
  const creators = fs.existsSync(credFile)
    ? (JSON.parse(fs.readFileSync(credFile, "utf8")) as number[][]).map((s) => Keypair.fromSecretKey(Uint8Array.from(s)))
    : [Keypair.generate(), Keypair.generate()];
  fs.writeFileSync(credFile, JSON.stringify(creators.map((c) => Array.from(c.secretKey))), { mode: 0o600 });

  const fund = new Transaction();
  for (const c of creators) fund.add(SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: c.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }));
  const fsig = await sendAndConfirmTransaction(connection, fund, [sponsor]);
  console.log("fund creators", explorerTx(fsig));

  const sp = mk(connection, sponsor);
  const sponsorAta = getAssociatedTokenAddressSync(mint, sponsor.publicKey);
  const id = new BN(Date.now());
  const bounty = bountyPda(sponsor.publicKey, id);
  const vault = vaultPda(bounty);
  const deadline = Math.floor(Date.now() / 1000) + 30 * 86400;
  const createSig = await sp.methods
    .createBounty(
      id,
      "Show Munera in 30 seconds",
      "Make a short clip (X, TikTok or YouTube Shorts) showing how Munera locks a prize in escrow and pays creators onchain. Original work only. One entry per creator.",
      new BN(5_000_000),
      3,
      new BN(deadline)
    )
    .accountsPartial({ sponsor: sponsor.publicKey, mint, bounty, vault, sponsorAta })
    .rpc();
  console.log("BOUNTY", bounty.toBase58());
  console.log("create_bounty", explorerTx(createSig));

  const links = ["https://x.com/munera_demo/status/1", "https://www.youtube.com/shorts/munerademo2"];
  const subSigs: string[] = [];
  for (let i = 0; i < creators.length; i++) {
    const c = creators[i];
    subSigs.push(
      await mk(connection, c)
        .methods.submitClip(links[i])
        .accountsPartial({ creator: c.publicKey, bounty, submission: submissionPda(bounty, c.publicKey) })
        .rpc()
    );
    console.log(`submit_clip #${i + 1} (${c.publicKey.toBase58()})`, explorerTx(subSigs[i]));
  }

  const before = (await getAccount(connection, vault)).amount;
  const approveSig = await sp.methods
    .approveSubmission()
    .accountsPartial({
      sponsor: sponsor.publicKey,
      bounty,
      submission: submissionPda(bounty, creators[0].publicKey),
      creator: creators[0].publicKey,
      mint,
      vault,
      creatorAta: getAssociatedTokenAddressSync(mint, creators[0].publicKey),
    })
    .rpc();
  console.log("approve_submission", explorerTx(approveSig));
  const after = (await getAccount(connection, vault)).amount;
  const creatorBal = (await getAccount(connection, getAssociatedTokenAddressSync(mint, creators[0].publicKey))).amount;
  console.log({ vaultBefore: before.toString(), vaultAfter: after.toString(), creatorBalance: creatorBal.toString() });
  if (before - after !== 5_000_000n || creatorBal !== 5_000_000n) throw new Error("payout check failed");
  console.log("bounty page:", explorerAddress(bounty.toBase58()));
  console.log("PAYOUT_OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
