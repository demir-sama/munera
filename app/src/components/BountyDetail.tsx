"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BountyBadge, ExtLink, Notice, Spinner, Stat, SubmissionBadge, EmptyState } from "./ui";
import { WalletButton } from "./WalletButton";
import { useToast } from "./Toast";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { useNow } from "@/hooks/useNow";
import {
  bountyIsClosed,
  bountyState,
  fetchBounty,
  fetchSubmissions,
  fetchVaultBalance,
  findPayoutSignature,
  slotsLeft,
  submissionState,
  type Bounty,
  type Submission,
} from "@/lib/data";
import { MAX_LINK_LEN, TOKEN_SYMBOL } from "@/lib/config";
import { byteLen, countdown, formatDate, formatUnits, shortAddr, validateLink } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { explorerAddress, explorerTx } from "@/lib/explorer";
import { submissionPda, vaultPda } from "@/lib/pda";

function parseAddress(a: string): PublicKey | null {
  try {
    return new PublicKey(a);
  } catch {
    return null;
  }
}

export function BountyDetail({ address }: { address: string }) {
  const bountyKey = useMemo(() => parseAddress(address), [address]);
  if (!bountyKey) {
    return <EmptyState title="Invalid bounty address" body="That doesn't look like a valid Solana address." cta={{ href: "/", label: "Back to bounties" }} />;
  }
  return <Inner bountyKey={bountyKey} />;
}

type Loaded = { bounty: Bounty | null; subs: Submission[]; vault: bigint };

function Inner({ bountyKey }: { bountyKey: PublicKey }) {
  const { program, connection } = useProgram();
  const { publicKey } = useWallet();
  const toast = useToast();
  const now = useNow(10_000);
  const [pending, setPending] = useState<string | null>(null); // key of the action in flight

  const { data, error, loading, reload } = useAsync<Loaded>(async () => {
    const [bounty, subs, vault] = await Promise.all([
      fetchBounty(program, bountyKey),
      fetchSubmissions(program, bountyKey),
      fetchVaultBalance(connection, bountyKey, program.programId),
    ]);
    return { bounty, subs, vault };
  }, [program, connection, bountyKey]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="card h-56 animate-pulse" />
        <div className="card h-40 animate-pulse" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <Notice tone="error" title="Couldn't load this bounty">
        {error}
      </Notice>
    );
  }
  const bounty = data?.bounty;
  if (!bounty) {
    return (
      <EmptyState
        title="Bounty not found"
        body="This bounty doesn't exist on the configured cluster/program. Check NEXT_PUBLIC_RPC_URL and NEXT_PUBLIC_PROGRAM_ID."
        cta={{ href: "/", label: "Back to bounties" }}
      />
    );
  }
  const subs = data!.subs;
  const vault = data!.vault;

  const state = bountyState(bounty, now);
  const isSponsor = !!publicKey && publicKey.equals(bounty.sponsor);
  const deadline = bounty.deadline.toNumber();
  const left = slotsLeft(bounty);
  const closed = bountyIsClosed(bounty);
  const total = bounty.rewardPerWinner.muln(bounty.maxWinners);
  const mySub = publicKey ? subs.find((s) => s.creator.equals(publicKey)) : undefined;
  const canSubmit = !closed && now < deadline && !isSponsor && !mySub;
  const canReclaim = isSponsor && !closed && now >= deadline;

  async function run(key: string, okTitle: string, fn: () => Promise<string>, okMsg?: string) {
    setPending(key);
    try {
      const sig = await fn();
      toast.success(okTitle, { message: okMsg, href: explorerTx(sig), linkLabel: "View transaction" });
      await reload();
    } catch (e) {
      console.error(e);
      toast.error("Transaction failed", { message: friendlyError(e) });
      await reload().catch(() => {});
    } finally {
      setPending(null);
    }
  }

  const approve = (s: Submission) =>
    run(
      `approve:${s.address.toBase58()}`,
      "Submission approved & paid",
      () =>
        program.methods
          .approveSubmission()
          .accountsPartial({
            sponsor: publicKey!,
            bounty: bounty.address,
            submission: s.address,
            creator: s.creator,
            mint: bounty.mint,
            vault: vaultPda(bounty.address, program.programId),
            creatorAta: getAssociatedTokenAddressSync(bounty.mint, s.creator),
          })
          .rpc(),
      `${formatUnits(bounty.rewardPerWinner)} ${TOKEN_SYMBOL} sent to ${shortAddr(s.creator)}.`
    );

  const reject = (s: Submission) =>
    run(
      `reject:${s.address.toBase58()}`,
      "Submission rejected",
      () =>
        program.methods
          .rejectSubmission()
          .accountsPartial({ sponsor: publicKey!, bounty: bounty.address, submission: s.address })
          .rpc()
    );

  const reclaim = () =>
    run(
      "reclaim",
      "Unspent funds reclaimed",
      () =>
        program.methods
          .reclaimUnspent()
          .accountsPartial({
            sponsor: publicKey!,
            bounty: bounty.address,
            mint: bounty.mint,
            vault: vaultPda(bounty.address, program.programId),
            sponsorAta: getAssociatedTokenAddressSync(bounty.mint, publicKey!),
          })
          .rpc(),
      `${formatUnits(vault)} ${TOKEN_SYMBOL} returned to your wallet.`
    );

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-600">
        ← All bounties
      </Link>

      {/* Header card */}
      <section className="card overflow-hidden">
        <div className="border-b border-neutral-100 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <BountyBadge state={state} />
            {isSponsor && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">You are the sponsor</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-wide sm:text-4xl">{bounty.title}</h1>
          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-ink-soft">{bounty.description || "No description provided."}</p>
          <p className="mt-4 text-sm text-ink-muted">
            Sponsored by <ExtLink href={explorerAddress(bounty.sponsor.toBase58())}>{shortAddr(bounty.sponsor)}</ExtLink>
            {" · "}
            <ExtLink href={explorerAddress(bounty.address.toBase58())}>Bounty account ↗</ExtLink>
            {" · "}
            <Link href={`/payments?bounty=${bounty.address.toBase58()}`} className="font-semibold text-brand-600 hover:underline">
              Payments →
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 sm:p-8 lg:grid-cols-4">
          <Stat label="Reward per winner" value={`${formatUnits(bounty.rewardPerWinner)} ${TOKEN_SYMBOL}`} />
          <Stat label="Slots left" value={`${left} / ${bounty.maxWinners}`} sub={`${bounty.paidCount} paid`} />
          <Stat
            label="Funded budget"
            value={`${formatUnits(total)} ${TOKEN_SYMBOL}`}
            sub={`In vault now: ${formatUnits(vault)} ${TOKEN_SYMBOL}`}
          />
          <Stat
            label={now < deadline ? "Time left" : "Deadline"}
            value={now < deadline ? countdown(deadline, now) : "Ended"}
            sub={formatDate(deadline)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4 text-sm text-ink-muted sm:px-8">
          <span>
            Vault: <ExtLink href={explorerAddress(vaultPda(bounty.address, program.programId).toBase58())}>{shortAddr(vaultPda(bounty.address, program.programId))} ↗</ExtLink>
          </span>
          <span>
            {bounty.submissionCount} submission{bounty.submissionCount === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {/* Sponsor reclaim */}
      {isSponsor && !closed && (
        <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Reclaim unspent funds</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {canReclaim
                ? `The deadline has passed. Closing the bounty returns the ${formatUnits(vault)} ${TOKEN_SYMBOL} left in the vault to you — pending submissions can no longer be paid.`
                : `Available after the deadline (${formatDate(deadline)}).`}
            </p>
          </div>
          <button className="btn-dark shrink-0" disabled={!canReclaim || pending !== null} onClick={reclaim}>
            {pending === "reclaim" ? <Spinner /> : null} Reclaim unspent
          </button>
        </section>
      )}
      {closed && (
        <Notice tone="info" title="This bounty is closed">
          The sponsor reclaimed the unspent funds. No further submissions or payouts are possible.
        </Notice>
      )}

      {/* Submit */}
      {!closed && (
        <SubmitSection
          canSubmit={canSubmit}
          reason={
            isSponsor
              ? "Sponsors can't enter their own bounty."
              : mySub
              ? "You've already entered this bounty — see your submission below."
              : now >= deadline
              ? "Submissions are closed — the deadline has passed."
              : null
          }
          connected={!!publicKey}
          busy={pending === "submit"}
          onSubmit={(link) =>
            run("submit", "Entry submitted", () =>
              program.methods
                .submitClip(link)
                .accountsPartial({
                  creator: publicKey!,
                  bounty: bounty.address,
                  submission: submissionPda(bounty.address, publicKey!, program.programId),
                })
                .rpc()
            )
          }
        />
      )}

      {/* Submissions */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1.5">The contenders</p>
            <h2 className="font-display text-2xl font-bold tracking-wide">Submissions</h2>
          </div>
          <button onClick={() => void reload()} className="btn-outline btn-sm" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {subs.length === 0 ? (
          <EmptyState title="No submissions yet" body="Be the first to enter the arena — submit a link to your work above." />
        ) : (
          <div className="card divide-y divide-neutral-100">
            {subs.map((s) => (
              <SubmissionRow
                key={s.address.toBase58()}
                s={s}
                isSponsor={isSponsor}
                isMine={!!publicKey && s.creator.equals(publicKey)}
                canPay={left > 0 && !closed}
                pending={pending}
                onApprove={() => approve(s)}
                onReject={() => reject(s)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SubmitSection({
  canSubmit,
  reason,
  connected,
  busy,
  onSubmit,
}: {
  canSubmit: boolean;
  reason: string | null;
  connected: boolean;
  busy: boolean;
  onSubmit: (link: string) => Promise<void>;
}) {
  const [link, setLink] = useState("");
  const [touched, setTouched] = useState(false);
  const err = validateLink(link);
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-wide">Enter the arena</h2>
      <p className="mt-1 text-sm text-ink-soft">Submit a link to your work (post, video, clip). One entry per creator.</p>
      {reason ? (
        <div className="mt-4">
          <Notice tone="info">{reason}</Notice>
        </div>
      ) : !connected ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <WalletButton />
          <span className="text-sm text-ink-muted">Connect a wallet to submit.</span>
        </div>
      ) : (
        <form
          className="mt-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTouched(true);
            if (err) return;
            await onSubmit(link.trim());
            setLink("");
            setTouched(false);
          }}
        >
          <label className="label" htmlFor="link">Link</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="link"
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://x.com/you/status/123…"
              disabled={!canSubmit || busy}
            />
            <button className="btn-primary shrink-0" disabled={!canSubmit || busy}>
              {busy ? <Spinner /> : null} Submit entry
            </button>
          </div>
          <div className="flex justify-between">
            {touched && err ? <p className="mt-1.5 text-xs font-medium text-red-600">{err}</p> : <span />}
            <p className="hint">
              {byteLen(link.trim())}/{MAX_LINK_LEN}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}

function PayoutLink({ s }: { s: Submission }) {
  const { connection } = useProgram();
  const { data, loading } = useAsync(() => findPayoutSignature(connection, s.address), [connection, s.address]);
  if (loading) return <span className="text-xs text-ink-muted">locating tx…</span>;
  return data ? (
    <ExtLink href={explorerTx(data)} className="text-xs">
      View payout tx ↗
    </ExtLink>
  ) : (
    <ExtLink href={explorerAddress(s.address.toBase58())} className="text-xs">
      View on Explorer ↗
    </ExtLink>
  );
}

function SubmissionRow({
  s,
  isSponsor,
  isMine,
  canPay,
  pending,
  onApprove,
  onReject,
}: {
  s: Submission;
  isSponsor: boolean;
  isMine: boolean;
  canPay: boolean;
  pending: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const st = submissionState(s);
  const k = s.address.toBase58();
  const busy = pending === `approve:${k}` || pending === `reject:${k}`;
  const safeHref = /^https?:\/\//i.test(s.link) ? s.link : undefined;
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SubmissionBadge state={st} />
          <ExtLink href={explorerAddress(s.creator.toBase58())} className="font-mono text-sm">
            {shortAddr(s.creator)}
          </ExtLink>
          {isMine && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>}
        </div>
        {safeHref ? (
          <a href={safeHref} target="_blank" rel="noopener noreferrer nofollow" className="block max-w-full truncate text-sm font-medium text-ink underline decoration-brand-300 underline-offset-2 hover:text-brand-700">
            {s.link}
          </a>
        ) : (
          <span className="block truncate text-sm text-ink-soft">{s.link}</span>
        )}
        {st === "approved" && (
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
            <span className="font-semibold text-brand-700">
              Paid {formatUnits(s.paidAmount)} {TOKEN_SYMBOL}
            </span>
            <span className="text-xs text-ink-muted">{formatDate(s.paidAt)}</span>
            <PayoutLink s={s} />
          </p>
        )}
      </div>
      {isSponsor && st === "pending" && (
        <div className="flex shrink-0 gap-2">
          <button className="btn-primary btn-sm" disabled={pending !== null || !canPay} onClick={onApprove} title={!canPay ? "No winner slots left" : undefined}>
            {pending === `approve:${k}` && <Spinner />} Approve & pay
          </button>
          <button className="btn-danger btn-sm" disabled={pending !== null || busy} onClick={onReject}>
            {pending === `reject:${k}` && <Spinner />} Reject
          </button>
        </div>
      )}
    </div>
  );
}
