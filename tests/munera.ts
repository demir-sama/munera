import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  createMint,
  createAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { Munera } from "../target/types/munera";

const DECIMALS = 6;
const USDC = (n: number) => new BN(n).mul(new BN(10).pow(new BN(DECIMALS)));

describe("munera", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Munera as Program<Munera>;
  const connection = provider.connection;
  const sponsor = (provider.wallet as anchor.Wallet).payer;

  const creator1 = Keypair.generate();
  const creator2 = Keypair.generate();
  const creator3 = Keypair.generate();
  const attacker = Keypair.generate();

  let mint: PublicKey;
  let sponsorAta: PublicKey;
  let idCounter = Math.floor(Date.now() / 1000) * 1000;
  const nextId = () => new BN(++idCounter);

  // ---------- helpers ----------
  const bountyPda = (sponsorKey: PublicKey, id: BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("bounty"), sponsorKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
  const vaultPda = (bounty: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("vault"), bounty.toBuffer()], program.programId)[0];
  const submissionPda = (bounty: PublicKey, creator: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("submission"), bounty.toBuffer(), creator.toBuffer()],
      program.programId
    )[0];

  const chainNow = async (): Promise<number> => {
    const slot = await connection.getSlot("confirmed");
    const t = await connection.getBlockTime(slot);
    return t ?? Math.floor(Date.now() / 1000);
  };
  const waitUntilChainTime = async (ts: number) => {
    while ((await chainNow()) <= ts) {
      await new Promise((r) => setTimeout(r, 500));
    }
    // make sure a block with a later timestamp has been produced
    await new Promise((r) => setTimeout(r, 1000));
  };
  const balance = async (ata: PublicKey) => new BN((await getAccount(connection, ata)).amount.toString());

  async function airdrop(pk: PublicKey, sol = 2) {
    const sig = await connection.requestAirdrop(pk, sol * LAMPORTS_PER_SOL);
    const bh = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  }

  /** Asserts the promise rejects with an Anchor error code from `codes` (name or number). */
  async function expectFail(p: Promise<unknown>, ...codes: (string | number)[]) {
    try {
      await p;
    } catch (e: any) {
      const code = e?.error?.errorCode?.code ?? e?.error?.errorCode?.number;
      const num = e?.error?.errorCode?.number;
      const msg = String(e?.message ?? e) + String(e?.logs ?? "");
      const ok = codes.some((c) => c === code || c === num || msg.includes(String(c)));
      expect(ok, `expected one of [${codes}] but got ${code}/${num}: ${msg}`).to.equal(true);
      return;
    }
    expect.fail(`expected failure with one of [${codes}] but tx succeeded`);
  }

  interface Params {
    id?: BN;
    title?: string;
    description?: string;
    reward?: BN;
    maxWinners?: number;
    deadline?: number;
  }
  async function createBounty(p: Params = {}) {
    const id = p.id ?? nextId();
    const bounty = bountyPda(sponsor.publicKey, id);
    const vault = vaultPda(bounty);
    const deadline = p.deadline ?? (await chainNow()) + 3600;
    const sig = await program.methods
      .createBounty(
        id,
        p.title ?? "Make a clip",
        p.description ?? "Best clip wins",
        p.reward ?? USDC(10),
        p.maxWinners ?? 2,
        new BN(deadline)
      )
      .accountsPartial({
        sponsor: sponsor.publicKey,
        mint,
        bounty,
        vault,
        sponsorAta,
      })
      .rpc();
    return { id, bounty, vault, deadline, sig };
  }

  const submit = (bounty: PublicKey, creator: Keypair, link = "https://x.com/creator/status/1") =>
    program.methods
      .submitClip(link)
      .accountsPartial({
        creator: creator.publicKey,
        bounty,
        submission: submissionPda(bounty, creator.publicKey),
      })
      .signers([creator])
      .rpc();

  const approve = (bounty: PublicKey, creator: PublicKey, signer: Keypair = sponsor, bountySponsor = sponsor.publicKey) =>
    program.methods
      .approveSubmission()
      .accountsPartial({
        sponsor: signer.publicKey,
        bounty,
        submission: submissionPda(bounty, creator),
        creator,
        mint,
        vault: vaultPda(bounty),
        creatorAta: getAssociatedTokenAddressSync(mint, creator),
      })
      .signers(signer.publicKey.equals(sponsor.publicKey) ? [] : [signer])
      .rpc();

  const reject = (bounty: PublicKey, creator: PublicKey, signer: Keypair = sponsor) =>
    program.methods
      .rejectSubmission()
      .accountsPartial({
        sponsor: signer.publicKey,
        bounty,
        submission: submissionPda(bounty, creator),
      })
      .signers(signer.publicKey.equals(sponsor.publicKey) ? [] : [signer])
      .rpc();

  const reclaim = (bounty: PublicKey, signer: Keypair = sponsor, ata: PublicKey = sponsorAta) =>
    program.methods
      .reclaimUnspent()
      .accountsPartial({
        sponsor: signer.publicKey,
        bounty,
        mint,
        vault: vaultPda(bounty),
        sponsorAta: ata,
      })
      .signers(signer.publicKey.equals(sponsor.publicKey) ? [] : [signer])
      .rpc();

  before(async () => {
    for (const kp of [creator1, creator2, creator3, attacker]) await airdrop(kp.publicKey, 2);
    mint = await createMint(connection, sponsor, sponsor.publicKey, null, DECIMALS);
    sponsorAta = await createAssociatedTokenAccount(connection, sponsor, mint, sponsor.publicKey);
    await mintTo(connection, sponsor, mint, sponsorAta, sponsor, 10_000n * 1_000_000n);
    // the attacker has their own funded ATA for the mint (used in reclaim-theft attempt)
  });

  // ---------- happy path ----------
  describe("happy path", () => {
    let b: Awaited<ReturnType<typeof createBounty>>;
    const reward = USDC(10);

    it("creates a bounty and escrows reward * max_winners in the vault", async () => {
      const before = await balance(sponsorAta);
      b = await createBounty({ reward, maxWinners: 2 });
      const bounty = await program.account.bounty.fetch(b.bounty);
      expect(bounty.sponsor.toBase58()).to.equal(sponsor.publicKey.toBase58());
      expect(bounty.mint.toBase58()).to.equal(mint.toBase58());
      expect(bounty.rewardPerWinner.toString()).to.equal(reward.toString());
      expect(bounty.maxWinners).to.equal(2);
      expect(bounty.paidCount).to.equal(0);
      expect(bounty.submissionCount).to.equal(0);
      expect(bounty.status).to.have.property("open");
      expect(bounty.title).to.equal("Make a clip");
      expect(bounty.bountyId.toString()).to.equal(b.id.toString());
      expect((await balance(b.vault)).toString()).to.equal(reward.muln(2).toString());
      expect((await balance(sponsorAta)).toString()).to.equal(before.sub(reward.muln(2)).toString());
      const vaultAcc = await getAccount(connection, b.vault);
      expect(vaultAcc.owner.toBase58()).to.equal(b.bounty.toBase58());
    });

    it("lets creators submit a link", async () => {
      await submit(b.bounty, creator1, "https://x.com/c1/status/1");
      await submit(b.bounty, creator2, "https://x.com/c2/status/2");
      const s = await program.account.submission.fetch(submissionPda(b.bounty, creator1.publicKey));
      expect(s.link).to.equal("https://x.com/c1/status/1");
      expect(s.status).to.have.property("pending");
      expect(s.creator.toBase58()).to.equal(creator1.publicKey.toBase58());
      const bounty = await program.account.bounty.fetch(b.bounty);
      expect(bounty.submissionCount).to.equal(2);
    });

    it("rejects a second submission from the same creator", async () => {
      await expectFail(submit(b.bounty, creator1, "https://x.com/dup"), "already in use");
    });

    it("approve pays the creator from the vault and emits PayoutEvent", async () => {
      const vaultBefore = await balance(b.vault);
      const sig = await approve(b.bounty, creator1.publicKey);
      const vaultAfter = await balance(b.vault);
      const creatorBal = await balance(getAssociatedTokenAddressSync(mint, creator1.publicKey));
      expect(creatorBal.toString()).to.equal(reward.toString());
      expect(vaultBefore.sub(vaultAfter).toString()).to.equal(reward.toString());

      const s = await program.account.submission.fetch(submissionPda(b.bounty, creator1.publicKey));
      expect(s.status).to.have.property("approved");
      expect(s.paidAmount.toString()).to.equal(reward.toString());
      expect(s.paidAt.toNumber()).to.be.greaterThan(0);
      const bounty = await program.account.bounty.fetch(b.bounty);
      expect(bounty.paidCount).to.equal(1);

      const tx = await connection.getTransaction(sig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      const parser = new anchor.EventParser(program.programId, program.coder);
      const events = Array.from(parser.parseLogs(tx!.meta!.logMessages!));
      const payout = events.find((e) => e.name.toLowerCase() === "payoutevent");
      expect(payout, "PayoutEvent emitted").to.not.equal(undefined);
      expect((payout!.data as any).amount.toString()).to.equal(reward.toString());
      expect((payout!.data as any).creator.toBase58()).to.equal(creator1.publicKey.toBase58());
    });

    it("reject marks the submission Rejected without paying", async () => {
      const vaultBefore = await balance(b.vault);
      await reject(b.bounty, creator2.publicKey);
      const s = await program.account.submission.fetch(submissionPda(b.bounty, creator2.publicKey));
      expect(s.status).to.have.property("rejected");
      expect((await balance(b.vault)).toString()).to.equal(vaultBefore.toString());
      const bounty = await program.account.bounty.fetch(b.bounty);
      expect(bounty.paidCount).to.equal(1);
    });

    it("cannot approve or reject a non-pending submission", async () => {
      await expectFail(approve(b.bounty, creator1.publicKey), "SubmissionNotPending"); // double approve
      await expectFail(approve(b.bounty, creator2.publicKey), "SubmissionNotPending"); // approve after reject
      await expectFail(reject(b.bounty, creator1.publicKey), "SubmissionNotPending"); // reject after approve
      await expectFail(reject(b.bounty, creator2.publicKey), "SubmissionNotPending"); // double reject
    });
  });

  // ---------- authorization ----------
  describe("authorization", () => {
    let b: Awaited<ReturnType<typeof createBounty>>;
    before(async () => {
      b = await createBounty({ maxWinners: 2 });
      await submit(b.bounty, creator1);
    });

    it("non-sponsor cannot approve", async () => {
      // attacker signs as `sponsor`; PDA seeds / has_one reject it
      await expectFail(approve(b.bounty, creator1.publicKey, attacker), "ConstraintSeeds", "Unauthorized", 2006, 6007);
    });
    it("non-sponsor cannot reject", async () => {
      await expectFail(reject(b.bounty, creator1.publicKey, attacker), "ConstraintSeeds", "Unauthorized", 2006, 6007);
    });
    it("non-sponsor cannot reclaim", async () => {
      const attackerAta = await createAssociatedTokenAccount(connection, sponsor, mint, attacker.publicKey);
      await expectFail(reclaim(b.bounty, attacker, attackerAta), "ConstraintSeeds", "Unauthorized", 2006, 6007);
    });
    it("creator cannot approve their own submission", async () => {
      await expectFail(approve(b.bounty, creator1.publicKey, creator1), "ConstraintSeeds", "Unauthorized", 2006, 6007);
    });
    it("funds untouched after failed attacks", async () => {
      expect((await balance(b.vault)).toString()).to.equal(USDC(10).muln(2).toString());
    });
  });

  // ---------- limits ----------
  describe("max winners", () => {
    it("cannot approve beyond max_winners", async () => {
      const b = await createBounty({ maxWinners: 1, reward: USDC(5) });
      await submit(b.bounty, creator1);
      await submit(b.bounty, creator2);
      await approve(b.bounty, creator1.publicKey);
      await expectFail(approve(b.bounty, creator2.publicKey), "MaxWinnersReached");
      expect((await balance(b.vault)).toString()).to.equal("0");
      const s = await program.account.submission.fetch(submissionPda(b.bounty, creator2.publicKey));
      expect(s.status).to.have.property("pending");
    });
  });

  // ---------- validation ----------
  describe("validation", () => {
    it("rejects zero reward", async () => {
      await expectFail(createBounty({ reward: new BN(0) }), "InvalidReward");
    });
    it("rejects zero max_winners", async () => {
      await expectFail(createBounty({ maxWinners: 0 }), "InvalidMaxWinners");
    });
    it("rejects a deadline in the past", async () => {
      await expectFail(createBounty({ deadline: (await chainNow()) - 100 }), "DeadlineInPast");
    });
    it("rejects an overlong title / description", async () => {
      await expectFail(createBounty({ title: "x".repeat(65) }), "TitleTooLong");
      await expectFail(createBounty({ description: "x".repeat(281) }), "DescriptionTooLong");
    });
    it("accepts max-length title & description", async () => {
      await createBounty({ title: "t".repeat(64), description: "d".repeat(280) });
    });
    it("rejects reward * max_winners overflow", async () => {
      await expectFail(
        createBounty({ reward: new BN("18446744073709551615"), maxWinners: 2 }),
        "MathOverflow"
      );
    });
    it("rejects insufficient sponsor funds", async () => {
      await expectFail(createBounty({ reward: USDC(1_000_000), maxWinners: 1 }), "insufficient funds", 1);
    });
    it("rejects an overlong or empty link", async () => {
      const b = await createBounty();
      await expectFail(submit(b.bounty, creator3, "x".repeat(201)), "LinkTooLong");
      await expectFail(submit(b.bounty, creator3, ""), "LinkTooLong");
      await submit(b.bounty, creator3, "y".repeat(200));
    });
  });

  // ---------- deadline behaviour ----------
  describe("deadline", function () {
    this.timeout(120_000);
    it("blocks reclaim before / submit after the deadline, and reclaim returns the remainder after", async () => {
      const reward = USDC(10);
      const deadline = (await chainNow()) + 8;
      const sponsorStart = await balance(sponsorAta);
      const b = await createBounty({ reward, maxWinners: 3, deadline });
      await submit(b.bounty, creator1);
      await approve(b.bounty, creator1.publicKey); // pays 10 of 30

      // reclaim before deadline fails
      await expectFail(reclaim(b.bounty), "DeadlineNotReached");

      await waitUntilChainTime(deadline);

      // submit after deadline fails
      await expectFail(submit(b.bounty, creator2), "DeadlinePassed");

      // reclaim after deadline returns remaining 20
      const before = await balance(sponsorAta);
      await reclaim(b.bounty);
      const after = await balance(sponsorAta);
      expect(after.sub(before).toString()).to.equal(reward.muln(2).toString());
      expect((await balance(b.vault)).toString()).to.equal("0");
      const bounty = await program.account.bounty.fetch(b.bounty);
      expect(bounty.status).to.have.property("closed");
      // sponsor net spend = exactly one payout
      expect(sponsorStart.sub(after).toString()).to.equal(reward.toString());

      // double reclaim fails, and a closed bounty accepts nothing
      await expectFail(reclaim(b.bounty), "BountyClosed");
      await expectFail(submit(b.bounty, creator3), "BountyClosed", "DeadlinePassed");
    });

    it("cannot approve after reclaim (bounty closed)", async function () {
      const deadline = (await chainNow()) + 6;
      const b = await createBounty({ maxWinners: 1, deadline });
      await submit(b.bounty, creator1);
      await waitUntilChainTime(deadline);
      await reclaim(b.bounty);
      await expectFail(approve(b.bounty, creator1.publicKey), "BountyClosed");
    });
  });
});
