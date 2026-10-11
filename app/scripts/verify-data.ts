/**
 * Verifies the frontend's data-reading helpers against a cluster (default: local validator).
 *   RPC_URL=http://127.0.0.1:8899 pnpm tsx scripts/verify-data.ts
 */
import { Connection, PublicKey } from "@solana/web3.js";
import assert from "assert";
import { getProgram } from "../src/lib/program";
import {
  bountyState, fetchBounties, fetchBounty, fetchPayments, fetchSubmissions, fetchVaultBalance,
  findPayoutSignature, slotsLeft, submissionState,
  computeCreatorStats, computeLeaderboard, computePlatformStats, fetchAllSubmissions, fetchSubmissionsByCreator,
} from "../src/lib/data";
import { formatUnits, parseUnits } from "../src/lib/format";
import { friendlyError } from "../src/lib/errors";

async function main() {
  const connection = new Connection(process.env.RPC_URL ?? "http://127.0.0.1:8899", "confirmed");
  const program = getProgram(connection); // read-only provider
  const now = Math.floor(Date.now() / 1000);

  const bounties = await fetchBounties(program);
  console.log(`bounties: ${bounties.length}`);
  for (const b of bounties) {
    const vault = await fetchVaultBalance(connection, b.address, program.programId);
    console.log(
      `  ${b.title.padEnd(36)} ${bountyState(b, now).padEnd(8)} reward=${formatUnits(b.rewardPerWinner)} slots=${slotsLeft(b)}/${b.maxWinners} vault=${formatUnits(vault)}`
    );
    // invariant: vault = reward * (max - paid) unless closed
    if (bountyState(b, now) !== "closed") assert.equal(vault, BigInt(b.rewardPerWinner.muln(slotsLeft(b)).toString()));
    else assert.equal(vault, 0n);
    const one = await fetchBounty(program, b.address);
    assert.equal(one?.title, b.title);
    const subs = await fetchSubmissions(program, b.address);
    assert.equal(subs.length, b.submissionCount);
    for (const s of subs) console.log(`      ${submissionState(s).padEnd(9)} ${s.creator.toBase58().slice(0, 6)} ${s.link}`);
  }

  const pays = await fetchPayments(program);
  console.log(`payments: ${pays.length}`);
  for (const p of pays) {
    const sig = await findPayoutSignature(connection, p.submission.address);
    console.log(`  ${p.bounty?.title} -> ${formatUnits(p.submission.paidAmount)} sig=${sig?.slice(0, 12)}…`);
    assert(sig, "payout signature found");
    const tx = await connection.getTransaction(sig!, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    assert(tx?.meta?.logMessages?.some((l) => l.includes("ApproveSubmission")), "sig is the approve tx");
  }
  assert(pays.every((p) => p.bounty));

  // leaderboard / profile / platform stats
  const allSubs = await fetchAllSubmissions(program);
  const board = computeLeaderboard(allSubs);
  const stats = computePlatformStats(bounties, allSubs, now);
  console.log(`leaderboard: ${board.length} creators; paid=${formatUnits(stats.paid)} payouts=${stats.payouts} escrowed=${formatUnits(stats.escrowed)}`);
  for (let i = 1; i < board.length; i++) assert(board[i - 1].earned.cmp(board[i].earned) >= 0, "leaderboard sorted by earned desc");
  const sumEarned = board.reduce((a, c) => a + BigInt(c.earned.toString()), 0n);
  assert.equal(sumEarned, BigInt(stats.paid.toString()), "sum of leaderboard earnings == total paid (reward*paid_count)");
  assert.equal(board.reduce((a, c) => a + c.approved, 0), stats.payouts);
  assert.equal(computeCreatorStats(allSubs).length, stats.creators);
  for (const c of board) {
    const mine = await fetchSubmissionsByCreator(program, c.creator);
    assert(mine.every((x) => x.creator.equals(c.creator)), "memcmp creator filter");
    assert.equal(mine.length, c.approved + c.pending + c.rejected);
  }

  assert.equal(parseUnits("12.5")?.toString(), "12500000");
  assert.equal(parseUnits("0.0000001"), null);
  assert.equal(formatUnits(1234567890), "1,234.56789");
  console.log(friendlyError({ message: "failed: custom program error: 0x1776" }));
  console.log("OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
