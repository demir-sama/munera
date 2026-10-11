"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Hero } from "@/components/Hero";
import { BountyCard } from "@/components/BountyCard";
import { EmptyState, Notice, SkeletonCards, Stat } from "@/components/ui";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { useNow } from "@/hooks/useNow";
import { bountyState, fetchBounties, slotsLeft } from "@/lib/data";
import { formatUnits } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";
import { BN } from "@coral-xyz/anchor";

type Filter = "all" | "open" | "ended";

export default function HomePage() {
  const { program } = useProgram();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, loading, reload } = useAsync(() => fetchBounties(program), [program]);

  const stats = useMemo(() => {
    const list = data ?? [];
    let locked = new BN(0);
    let paid = new BN(0);
    for (const b of list) {
      paid = paid.add(b.rewardPerWinner.muln(b.paidCount));
      if (bountyState(b, now) !== "closed") locked = locked.add(b.rewardPerWinner.muln(slotsLeft(b)));
    }
    return { count: list.length, locked, paid, open: list.filter((b) => bountyState(b, now) === "open").length };
  }, [data, now]);

  const shown = useMemo(() => {
    const list = data ?? [];
    if (filter === "open") return list.filter((b) => bountyState(b, now) === "open");
    if (filter === "ended") return list.filter((b) => bountyState(b, now) !== "open");
    return list;
  }, [data, filter, now]);

  return (
    <div className="space-y-12">
      <Hero />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Bounties" value={data ? stats.count : "–"} sub={data ? `${stats.open} open now` : undefined} />
        <Stat label="Held in escrow" value={data ? `${formatUnits(stats.locked)}` : "–"} sub={TOKEN_SYMBOL} />
        <Stat label="Paid to creators" value={data ? `${formatUnits(stats.paid)}` : "–"} sub={TOKEN_SYMBOL} />
        <Stat label="Network" value="Solana" sub="devnet · test USDC" />
      </section>

      <section id="arena" className="scroll-mt-24">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">The Arena</p>
            <h2 className="font-display text-3xl font-bold tracking-wide">Bounty board</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 text-sm font-semibold">
              {(["all", "open", "ended"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3.5 py-1.5 capitalize transition ${
                    filter === f ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-brand-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => void reload()} className="btn-outline btn-sm h-9" disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5">
            <Notice tone="error" title="Couldn't load bounties">
              {error}. The RPC may be rate-limited or unreachable; try Refresh.
            </Notice>
          </div>
        )}

        {loading && !data ? (
          <SkeletonCards />
        ) : shown.length === 0 && !error ? (
          <EmptyState
            title={data && data.length > 0 ? "No bounties in this view" : "The arena is empty"}
            body={
              data && data.length > 0
                ? "Try another filter to see more bounties."
                : "No bounties have been posted yet. Be the first sponsor to lock a prize and call the creators in."
            }
            cta={{ href: "/create", label: "Create a bounty" }}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((b) => (
              <BountyCard key={b.address.toBase58()} bounty={b} now={now} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200/80 bg-ink px-6 py-10 text-white sm:px-12">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-brand-300">How it works</p>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {[
            ["I", "Post the prize", "Sponsors lock reward × winners in a vault PDA. No funds, no bounty."],
            ["II", "Creators compete", "Anyone submits a link before the deadline. One entry per creator."],
            ["III", "Victory is paid", "Approval transfers the reward from the vault to the creator in the same transaction."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <p className="font-display text-3xl font-bold text-brand-300">{n}</p>
              <h3 className="mt-2 text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-neutral-300">{d}</p>
            </div>
          ))}
        </div>
        <Link href="/create" className="btn mt-8 bg-white text-ink hover:bg-brand-50">
          Launch a bounty →
        </Link>
      </section>
    </div>
  );
}
