/**
 * Seeds a LOCAL validator (solana-test-validator with the munera program) with a test mint and sample data.
 *   RPC_URL=http://127.0.0.1:8899 pnpm tsx scripts/seed-local.ts
 * Sponsor = ~/.config/solana/id.json. Writes /tmp/munera-seed.json (mint + keypairs for browser tests).
 */
import { BN } from "@coral-xyz/anchor";
import { createAssociatedTokenAccount, createMint, getAssociatedTokenAddressSync, mintTo } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getProgram } from "../src/lib/program";
import { bountyPda, vaultPda, submissionPda } from "../src/lib/pda";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8899";
const U = (n: number) => new BN(Math.round(n * 1e6));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const sponsor = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8")))
  );
  const wallet = {
    publicKey: sponsor.publicKey,
    signTransaction: async (t: any) => (t.partialSign(sponsor), t),
    signAllTransactions: async (ts: any[]) => ts.map((t) => (t.partialSign(sponsor), t)),
  };
  const mkProg = (kp: Keypair) =>
    getProgram(connection, {
      publicKey: kp.publicKey,
      signTransaction: async (t: any) => (t.partialSign(kp), t),
      signAllTransactions: async (ts: any[]) => ts.map((t) => (t.partialSign(kp), t)),
    });
  const program = getProgram(connection, wallet as any);

  const bal = await connection.getBalance(sponsor.publicKey);
  if (bal < 5 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(sponsor.publicKey, 20 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  const mint = await createMint(connection, sponsor, sponsor.publicKey, null, 6);
  const sponsorAta = await createAssociatedTokenAccount(connection, sponsor, mint, sponsor.publicKey);
  await mintTo(connection, sponsor, mint, sponsorAta, sponsor, 10_000n * 1_000_000n);
  console.log("mint", mint.toBase58());

  const creators = [Keypair.generate(), Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const fund = new Transaction();
  for (const c of creators) fund.add(SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: c.publicKey, lamports: 2 * LAMPORTS_PER_SOL }));
  await sendAndConfirmTransaction(connection, fund, [sponsor]);

  let idc = Date.now();
  const create = async (title: string, desc: string, reward: number, winners: number, deadlineSec: number) => {
    const id = new BN(++idc);
    const bounty = bountyPda(sponsor.publicKey, id);
    await program.methods
      .createBounty(id, title, desc, U(reward), winners, new BN(deadlineSec))
      .accountsPartial({ sponsor: sponsor.publicKey, mint, bounty, vault: vaultPda(bounty), sponsorAta })
      .rpc();
    return bounty;
  };
  const submit = (bounty: PublicKey, c: Keypair, link: string) =>
    mkProg(c)
      .methods.submitClip(link)
      .accountsPartial({ creator: c.publicKey, bounty, submission: submissionPda(bounty, c.publicKey) })
      .rpc();
  const approve = (bounty: PublicKey, c: Keypair) =>
    program.methods
      .approveSubmission()
      .accountsPartial({
        sponsor: sponsor.publicKey,
        bounty,
        submission: submissionPda(bounty, c.publicKey),
        creator: c.publicKey,
        mint,
        vault: vaultPda(bounty),
        creatorAta: getAssociatedTokenAddressSync(mint, c.publicKey),
      })
      .rpc();
  const reject = (bounty: PublicKey, c: Keypair) =>
    program.methods
      .rejectSubmission()
      .accountsPartial({ sponsor: sponsor.publicKey, bounty, submission: submissionPda(bounty, c.publicKey) })
      .rpc();

  const now = Math.floor(Date.now() / 1000);
  const b1 = await create(
    "Best 30-second product clip",
    "Cut a punchy 30s vertical clip showing Munera in action. Original footage only. Post publicly on X or TikTok and drop the link.",
    25, 3, now + 7 * 86400 + 3 * 3600);
  const b2 = await create("Meme the launch", "Funniest meme about onchain escrow wins.", 10, 5, now + 2 * 86400);
  const b3 = await create("Thread: why escrow beats trust", "A tight X thread (6+ posts) explaining onchain escrow for creators.", 50, 2, now + 25);
  const b4 = await create("Short-form review (nobody came)", "Honest 60s review of the Munera flow.", 5, 4, now + 25);

  await submit(b1, creators[0], "https://x.com/arena_ace/status/1845000000000000001");
  await submit(b1, creators[1], "https://www.tiktok.com/@gladius/video/7300000000000000002");
  await submit(b1, creators[2], "https://youtube.com/shorts/abcdEFGhij1");
  await approve(b1, creators[0]);
  await reject(b1, creators[2]);
  await submit(b2, creators[3], "https://x.com/memelord/status/1845000000000000009");
  await submit(b3, creators[0], "https://x.com/arena_ace/status/1845000000000000100");
  await submit(b3, creators[1], "https://x.com/gladius/status/1845000000000000101");
  await approve(b3, creators[0]);

  console.log("waiting for short deadlines…");
  await sleep(30_000);
  await program.methods
    .reclaimUnspent()
    .accountsPartial({ sponsor: sponsor.publicKey, bounty: b4, mint, vault: vaultPda(b4), sponsorAta })
    .rpc();

  fs.writeFileSync(
    "/tmp/munera-seed.json",
    JSON.stringify(
      {
        mint: mint.toBase58(),
        bounties: { b1: b1.toBase58(), b2: b2.toBase58(), b3: b3.toBase58(), b4: b4.toBase58() },
        creators: creators.map((c) => Array.from(c.secretKey)),
      },
      null,
      1
    )
  );
  console.log("seeded", { mint: mint.toBase58(), b1: b1.toBase58(), b3: b3.toBase58() });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
