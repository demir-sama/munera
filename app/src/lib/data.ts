/**
 * Onchain data access. Framework-free (no React) so it can be reused from node scripts.
 */
import type { IdlAccounts } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Munera } from "../idl/munera";
import type { MuneraProgram } from "./program";
import { vaultPda } from "./pda";

type RawBounty = IdlAccounts<Munera>["bounty"];
type RawSubmission = IdlAccounts<Munera>["submission"];

export type Bounty = RawBounty & { address: PublicKey };
export type Submission = RawSubmission & { address: PublicKey };

export type BountyState = "open" | "expired" | "closed" | "filled";
export type SubmissionState = "pending" | "approved" | "rejected";

export const bountyIsClosed = (b: RawBounty) => "closed" in b.status;
export const slotsLeft = (b: RawBounty) => Math.max(0, b.maxWinners - b.paidCount);

export function bountyState(b: RawBounty, nowSec: number): BountyState {
  if (bountyIsClosed(b)) return "closed";
  if (nowSec >= b.deadline.toNumber()) return "expired";
  if (slotsLeft(b) === 0) return "filled";
  return "open";
}

export function submissionState(s: RawSubmission): SubmissionState {
  if ("approved" in s.status) return "approved";
  if ("rejected" in s.status) return "rejected";
  return "pending";
}

const withAddr = <T extends object>(r: { publicKey: PublicKey; account: T }) =>
  ({ ...r.account, address: r.publicKey } as T & { address: PublicKey });

/** All bounties, newest deadline first. */
export async function fetchBounties(program: MuneraProgram): Promise<Bounty[]> {
  const all = await program.account.bounty.all();
  return all.map(withAddr).sort((a, b) => b.bountyId.cmp(a.bountyId));
}

export async function fetchBounty(program: MuneraProgram, address: PublicKey): Promise<Bounty | null> {
  const acc = await program.account.bounty.fetchNullable(address);
  return acc ? { ...acc, address } : null;
}

/** Submissions of one bounty (memcmp on the `bounty` field, which follows the 8-byte discriminator). */
export async function fetchSubmissions(program: MuneraProgram, bounty: PublicKey): Promise<Submission[]> {
  const all = await program.account.submission.all([{ memcmp: { offset: 8, bytes: bounty.toBase58() } }]);
  return all.map(withAddr).sort((a, b) => stateRank(a) - stateRank(b));
}

const stateRank = (s: RawSubmission) => ({ pending: 0, approved: 1, rejected: 2 }[submissionState(s)]);

export async function fetchAllSubmissions(program: MuneraProgram): Promise<Submission[]> {
  const all = await program.account.submission.all();
  return all.map(withAddr);
}

/** Token balance (raw base units, as bigint) of the bounty vault. 0n when the account doesn't exist. */
export async function fetchVaultBalance(connection: Connection, bounty: PublicKey, programId: PublicKey): Promise<bigint> {
  try {
    const r = await connection.getTokenAccountBalance(vaultPda(bounty, programId));
    return BigInt(r.value.amount);
  } catch {
    return 0n;
  }
}

export type Payment = {
  submission: Submission;
  bounty: Bounty | null;
};

/** Approved submissions (= payouts) joined with their bounty, newest first. */
export async function fetchPayments(program: MuneraProgram): Promise<Payment[]> {
  const [subs, bounties] = await Promise.all([fetchAllSubmissions(program), fetchBounties(program)]);
  const byKey = new Map(bounties.map((b) => [b.address.toBase58(), b]));
  return subs
    .filter((s) => submissionState(s) === "approved")
    .map((s) => ({ submission: s, bounty: byKey.get(s.bounty.toBase58()) ?? null }))
    .sort((a, b) => b.submission.paidAt.cmp(a.submission.paidAt));
}

const sigCache = new Map<string, string | null>();

/**
 * Signature of the approve tx for a submission: the most recent successful tx touching the
 * Submission PDA (an approved submission can't change again). Null if none is found.
 */
export async function findPayoutSignature(connection: Connection, submission: PublicKey): Promise<string | null> {
  const key = submission.toBase58();
  if (sigCache.has(key)) return sigCache.get(key) ?? null;
  const sigs = await connection.getSignaturesForAddress(submission, { limit: 25 }, "confirmed");
  const ok = sigs.find((s) => !s.err); // newest first
  const sig = ok?.signature ?? null;
  if (sig) sigCache.set(key, sig);
  return sig;
}
