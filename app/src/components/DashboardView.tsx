"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BountyBadge, EmptyState, Notice, PageHeader, Stat, SubmissionBadge } from "./ui";
import { WalletButton } from "./WalletButton";
import { MobileWalletHelp } from "./MobileWalletHelp";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { useNow } from "@/hooks/useNow";
import {
  bountyIsClosed,
  bountyState,
  fetchAllSubmissions,
  fetchBounties,
  fetchBounty,
  fetchSubmissionsByCreator,
  fetchVaultBalance,
  slotsLeft,
  submissionState,
  type Bounty,
  type Submission,
} from "@/lib/data";
import { formatDate, formatUnits } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";

type Tab = "bounties" | "submissions";

export function DashboardView() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>("bounties");

  return (
    <div>
      <PageHeader
        eyebrow="Your arena"
        title="Dashboard"
        subtitle="Manage the bounties you sponsor and track the submissions you've entered."
        action={
          <Link href="/profile" className="btn-outline btn-sm self-start">
            Edit profile &amp; socials
          </Link>
        }
      />
      {!publicKey ? (
        <div className="card flex flex-col items-center gap-4 px-5 py-12 text-center sm:px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600">👛</div>
          <h2 className="font-display text-xl font-bold">Connect your wallet</h2>
          <p className="max-w-md text-sm text-ink-soft">
            Connect the wallet you use on Munera to see your sponsored bounties, pending reviews and earnings.
          </p>
          <WalletButton />
          <MobileWalletHelp className="w-full max-w-md text-left" />
        </div>
      ) : (
        <>
          <div className="mb-6 inline-flex w-full rounded-xl border border-neutral-200 bg-white p-1 text-sm font-semibold sm:w-auto" role="tablist">
            {(
              [
                ["bounties", "My bounties"],
                ["submissions", "My submissions"],
              ] as [Tab, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={tab === v}
                onClick={() => setTab(v)}
                className={`min-h-[44px] flex-1 rounded-lg px-5 transition sm:flex-none ${tab === v ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-brand-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "bounties" ? <MyBounties wallet={publicKey} /> : <MySubmissions wallet={publicKey} />}
        </>
      )}
    </div>
  );
}

type Row = { bounty: Bounty; vault: bigint; pending: number };

function MyBounties({ wallet }: { wallet: PublicKey }) {
  const { program, connection } = useProgram();
  const now = useNow(30_000);
  const { data, loading, error, reload } = useAsync<Row[]>(async () => {
    const [all, subs] = await Promise.all([fetchBounties(program), fetchAllSubmissions(program)]);
    const mine = all.filter((b) => b.sponsor.equals(wallet));
    const pendingBy = new Map<string, number>();
    for (const s of subs) if (submissionState(s) === "pending") pendingBy.set(s.bounty.toBase58(), (pendingBy.get(s.bounty.toBase58()) ?? 0) + 1);
    const vaults = await Promise.all(mine.map((b) => fetchVaultBalance(connection, b.address, program.programId)));
    return mine.map((b, i) => ({ bounty: b, vault: vaults[i], pending: pendingBy.get(b.address.toBase58()) ?? 0 }));
  }, [program, connection, wallet]);

  const totals = useMemo(() => {
    let vault = new BN(0);
    let pending = 0;
    let paid = new BN(0);
    for (const r of data ?? []) {
      vault = vault.add(new BN(r.vault.toString()));
      pending += r.pending;
      paid = paid.add(r.bounty.rewardPerWinner.muln(r.bounty.paidCount));
    }
    return { vault, pending, paid };
  }, [data]);

  if (loading && !data) return <div className="card h-48 animate-pulse" />;
  return (
    <div className="space-y-5">
      {error && <Notice tone="error" title="Couldn't load your bounties">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Bounties" value={data?.length ?? 0} />
        <Stat label="In vaults" value={formatUnits(totals.vault)} sub={TOKEN_SYMBOL} />
        <Stat label="Paid out" value={formatUnits(totals.paid)} sub={TOKEN_SYMBOL} />
        <Stat label="Pending reviews" value={totals.pending} />
      </div>
      {(data?.length ?? 0) === 0 && !error ? (
        <EmptyState title="You haven't sponsored a bounty yet" body="Lock a prize pool and let creators compete for it." cta={{ href: "/create", label: "Create a bounty" }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.map(({ bounty: b, vault, pending }) => {
            const state = bountyState(b, now);
            const canReclaim = !bountyIsClosed(b) && now >= b.deadline.toNumber();
            const addr = b.address.toBase58();
            return (
              <div key={addr} className="card flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/bounty/${addr}`} className="min-w-0 break-words text-lg font-bold leading-snug hover:text-brand-700">
                    {b.title}
                  </Link>
                  <BountyBadge state={state} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-ink-muted">Vault</dt>
                    <dd className="font-semibold">{formatUnits(vault)} {TOKEN_SYMBOL}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Slots left</dt>
                    <dd className="font-semibold">{slotsLeft(b)} / {b.maxWinners}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Pending</dt>
                    <dd className="font-semibold">{pending}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Deadline</dt>
                    <dd className="font-semibold">{formatDate(b.deadline)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2">
                  {pending > 0 && (
                    <Link href={`/bounty/${addr}#submissions`} className="btn-primary btn-sm">
                      Review {pending} pending →
                    </Link>
                  )}
                  {canReclaim && (
                    <Link href={`/bounty/${addr}`} className="btn-dark btn-sm">
                      Ready to reclaim {formatUnits(vault)} {TOKEN_SYMBOL}
                    </Link>
                  )}
                  <Link href={`/bounty/${addr}`} className="btn-outline btn-sm">
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => void reload()} className="btn-outline btn-sm" disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

function MySubmissions({ wallet }: { wallet: PublicKey }) {
  const { program } = useProgram();
  const { data, loading, error, reload } = useAsync<{ subs: Submission[]; map: Map<string, Bounty> }>(async () => {
    const subs = await fetchSubmissionsByCreator(program, wallet);
    const uniq = [...new Set(subs.map((s) => s.bounty.toBase58()))];
    const bs = await Promise.all(uniq.map((b) => fetchBounty(program, new PublicKey(b))));
    const map = new Map<string, Bounty>();
    bs.forEach((b) => b && map.set(b.address.toBase58(), b));
    return { subs, map };
  }, [program, wallet]);

  const earned = useMemo(() => (data?.subs ?? []).reduce((a, s) => (submissionState(s) === "approved" ? a.add(s.paidAmount) : a), new BN(0)), [data]);

  if (loading && !data) return <div className="card h-48 animate-pulse" />;
  const counts = { approved: 0, pending: 0, rejected: 0 };
  data?.subs.forEach((s) => counts[submissionState(s)]++);
  return (
    <div className="space-y-5">
      {error && <Notice tone="error" title="Couldn't load your submissions">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Earned" value={formatUnits(earned)} sub={TOKEN_SYMBOL} />
        <Stat label="Approved" value={counts.approved} />
        <Stat label="Pending" value={counts.pending} />
        <Stat label="Rejected" value={counts.rejected} />
      </div>
      {(data?.subs.length ?? 0) === 0 && !error ? (
        <EmptyState title="No submissions yet" body="Find a bounty and submit your best work." cta={{ href: "/", label: "Browse bounties" }} />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {data?.subs.map((s) => {
            const b = data.map.get(s.bounty.toBase58());
            const st = submissionState(s);
            return (
              <div key={s.address.toBase58()} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SubmissionBadge state={st} />
                    <Link href={`/bounty/${s.bounty.toBase58()}`} className="min-w-0 break-words font-semibold hover:text-brand-700">
                      {b?.title ?? "Unknown bounty"}
                    </Link>
                  </div>
                  <span className="block truncate text-sm text-ink-soft">{s.link}</span>
                </div>
                <div className="shrink-0 text-sm font-bold text-brand-700">
                  {st === "approved" ? `+${formatUnits(s.paidAmount)} ${TOKEN_SYMBOL}` : st === "pending" ? <span className="font-medium text-ink-muted">Awaiting review</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => void reload()} className="btn-outline btn-sm" disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
