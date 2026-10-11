"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EmptyState, Notice, PageHeader, Stat } from "./ui";
import { CreatorIdentity } from "./CreatorIdentity";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { useNow } from "@/hooks/useNow";
import { computeLeaderboard, computePlatformStats, fetchLeaderboardData } from "@/lib/data";
import { formatUnits } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";

const rankStyle = [
  "bg-brand-600 text-white ring-brand-600", // 1
  "bg-brand-100 text-brand-800 ring-brand-300", // 2
  "bg-brand-50 text-brand-700 ring-brand-200", // 3
];

export function RankBadge({ rank }: { rank: number }) {
  const style = rank <= 3 ? rankStyle[rank - 1] : "bg-neutral-100 text-ink-soft ring-neutral-200";
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset ${style}`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardView() {
  const { program } = useProgram();
  const now = useNow(60_000);
  const { data, loading, error, reload } = useAsync(() => fetchLeaderboardData(program), [program]);

  const board = useMemo(() => (data ? computeLeaderboard(data.subs) : []), [data]);
  const stats = useMemo(() => (data ? computePlatformStats(data.bounties, data.subs, now) : null), [data, now]);

  return (
    <div>
      <PageHeader
        eyebrow="Hall of champions"
        title="Leaderboard"
        subtitle="Creators ranked by total USDC earned from approved submissions. Computed live from onchain accounts."
        action={
          <button onClick={() => void reload()} className="btn-outline btn-sm self-start" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Bounties" value={stats ? stats.bounties : "–"} sub={stats ? `${stats.open} open` : undefined} />
        <Stat label="USDC escrowed" value={stats ? formatUnits(stats.escrowed) : "–"} sub="in live vaults" />
        <Stat label="USDC paid out" value={stats ? formatUnits(stats.paid) : "–"} sub={TOKEN_SYMBOL} />
        <Stat label="Payouts" value={stats ? stats.payouts : "–"} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="Creators" value={stats ? stats.creators : "–"} sub="have entered" />
        </div>
      </div>

      {error && (
        <div className="mb-5">
          <Notice tone="error" title="Couldn't load the leaderboard">
            {error}
          </Notice>
        </div>
      )}

      {loading && !data ? (
        <div className="card h-64 animate-pulse" />
      ) : board.length === 0 && !error ? (
        <EmptyState
          title="No champions yet"
          body="Creators appear here once a sponsor approves their first submission."
          cta={{ href: "/", label: "Browse bounties" }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[56px_1.4fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-neutral-100 bg-brand-50/60 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted md:grid">
            <span>Rank</span>
            <span>Creator</span>
            <span className="text-right">Earned</span>
            <span className="text-right">Approved clips</span>
            <span className="text-right">Bounties won</span>
            <span className="w-24" />
          </div>
          <ol className="divide-y divide-neutral-100">
            {board.map((c, i) => {
              const addr = c.creator.toBase58();
              const rank = i + 1;
              return (
                <li
                  key={addr}
                  className={`grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[56px_1.4fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 ${rank === 1 ? "bg-brand-50/40" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-3 md:contents">
                    <RankBadge rank={rank} />
                    <CreatorIdentity address={addr} className="flex-1" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-ink-soft md:contents">
                    <p className="text-lg font-bold text-brand-700 md:text-right">
                      {formatUnits(c.earned)} <span className="text-xs font-semibold">{TOKEN_SYMBOL}</span>
                    </p>
                    <p className="md:text-right">
                      <span className="font-semibold text-ink">{c.approved}</span> <span className="md:hidden">approved clip{c.approved === 1 ? "" : "s"}</span>
                    </p>
                    <p className="md:text-right">
                      <span className="font-semibold text-ink">{c.bountiesWon}</span> <span className="md:hidden">bount{c.bountiesWon === 1 ? "y" : "ies"} won</span>
                    </p>
                  </div>
                  <Link href={`/creator/${addr}`} className="btn-outline btn-sm md:w-24">
                    Profile
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
