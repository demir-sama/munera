"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CopyButton } from "./CopyButton";
import { SelfDeclaredBadge, SocialList } from "./SocialLinks";
import { useProfile } from "@/hooks/useProfile";
import { isEmptyProfile } from "@/lib/profile";
import { EmptyState, ExtLink, Notice, Stat, SubmissionBadge } from "./ui";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { fetchBounty, fetchSubmissionsByCreator, findPayoutSignature, submissionState, type Bounty, type Submission } from "@/lib/data";
import { formatDate, formatUnits, shortAddr } from "@/lib/format";
import { explorerAddress, explorerTx } from "@/lib/explorer";
import { TOKEN_SYMBOL } from "@/lib/config";

function parse(a: string): PublicKey | null {
  try {
    return new PublicKey(a);
  } catch {
    return null;
  }
}

export function CreatorProfile({ address }: { address: string }) {
  const key = useMemo(() => parse(address), [address]);
  if (!key) return <EmptyState title="Invalid creator address" body="That doesn't look like a valid Solana address." cta={{ href: "/leaderboard", label: "Back to leaderboard" }} />;
  return <Inner creator={key} />;
}

function PayoutLink({ s }: { s: Submission }) {
  const { connection } = useProgram();
  const { data, loading } = useAsync(() => findPayoutSignature(connection, s.address), [connection, s.address]);
  if (loading) return <span className="text-xs text-ink-muted">locating tx…</span>;
  return data ? (
    <ExtLink href={explorerTx(data)} className="text-sm">
      Payout tx ↗
    </ExtLink>
  ) : (
    <ExtLink href={explorerAddress(s.address.toBase58())} className="text-sm">
      Account ↗
    </ExtLink>
  );
}

function Inner({ creator }: { creator: PublicKey }) {
  const { program } = useProgram();
  const { data, loading, error } = useAsync(async () => {
    const subs = await fetchSubmissionsByCreator(program, creator);
    const uniq = [...new Set(subs.map((s) => s.bounty.toBase58()))];
    const bounties = await Promise.all(uniq.map((b) => fetchBounty(program, new PublicKey(b))));
    const map = new Map<string, Bounty>();
    bounties.forEach((b) => b && map.set(b.address.toBase58(), b));
    return { subs, map };
  }, [program, creator]);

  const stats = useMemo(() => {
    let earned = new BN(0);
    let a = 0, p = 0, r = 0;
    for (const s of data?.subs ?? []) {
      const st = submissionState(s);
      if (st === "approved") {
        a++;
        earned = earned.add(s.paidAmount);
      } else if (st === "pending") p++;
      else r++;
    }
    return { earned, a, p, r };
  }, [data]);

  const addr = creator.toBase58();
  const { profile } = useProfile(addr);
  return (
    <div className="space-y-8">
      <Link href="/leaderboard" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-600">
        ← Leaderboard
      </Link>

      <section className="card overflow-hidden">
        <div className="border-b border-neutral-100 bg-gradient-to-br from-brand-50 to-white p-5 sm:p-8">
          <p className="eyebrow mb-2">Creator profile</p>
          <h1 className="break-words font-display text-2xl font-bold tracking-wide sm:text-3xl">
            {profile?.name ?? shortAddr(creator, 6)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="min-w-0 break-all font-mono text-xs">{addr}</span>
            <CopyButton text={addr} label="Copy address" />
            <ExtLink href={explorerAddress(addr)} className="text-sm">
              Explorer ↗
            </ExtLink>
          </div>
          {profile === undefined ? (
            <div className="mt-4 flex gap-2" aria-hidden>
              <span className="h-11 w-28 animate-pulse rounded-xl bg-neutral-100" />
              <span className="h-11 w-28 animate-pulse rounded-xl bg-neutral-100" />
            </div>
          ) : !isEmptyProfile(profile) && profile ? (
            <div className="mt-4 space-y-2.5">
              <SocialList profile={profile} />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                <SelfDeclaredBadge />
                <span>Stored publicly onchain; Munera doesn&apos;t verify these accounts.</span>
                {profile.signature && (
                  <ExtLink href={explorerTx(profile.signature)} className="py-2 text-xs">
                    View onchain record ↗
                  </ExtLink>
                )}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No social links published by this wallet.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-8 lg:grid-cols-4">
          <Stat label="Total earned" value={`${formatUnits(stats.earned)} ${TOKEN_SYMBOL}`} />
          <Stat label="Approved" value={stats.a} />
          <Stat label="Pending" value={stats.p} />
          <Stat label="Rejected" value={stats.r} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold tracking-wide">Submissions</h2>
        {error && <Notice tone="error" title="Couldn't load submissions">{error}</Notice>}
        {loading && !data ? (
          <div className="card h-40 animate-pulse" />
        ) : (data?.subs.length ?? 0) === 0 && !error ? (
          <EmptyState title="No submissions yet" body="This wallet hasn't entered any bounty." cta={{ href: "/", label: "Browse bounties" }} />
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
                      {b ? (
                        <Link href={`/bounty/${s.bounty.toBase58()}`} className="min-w-0 break-words font-semibold hover:text-brand-700">
                          {b.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink-muted">Unknown bounty</span>
                      )}
                    </div>
                    {/^https?:\/\//i.test(s.link) ? (
                      <a href={s.link} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm text-ink underline decoration-brand-300 underline-offset-2 hover:text-brand-700">
                        {s.link}
                      </a>
                    ) : (
                      <span className="block truncate text-sm text-ink-soft">{s.link}</span>
                    )}
                  </div>
                  {st === "approved" && (
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end">
                      <span className="font-bold text-brand-700">
                        {formatUnits(s.paidAmount)} {TOKEN_SYMBOL}
                      </span>
                      <span className="text-xs text-ink-muted">{formatDate(s.paidAt)}</span>
                      <PayoutLink s={s} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
