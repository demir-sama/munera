"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BN } from "@coral-xyz/anchor";
import { BountyCard } from "./BountyCard";
import { EmptyState, Notice, SkeletonCards, Stat } from "./ui";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { useNow } from "@/hooks/useNow";
import { bountyState, fetchBounties, slotsLeft, type Bounty, type BountyState } from "@/lib/data";
import { formatUnits } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/config";

type StatusFilter = "all" | BountyState;
type Sort = "newest" | "reward" | "ending" | "slots";

const STATUSES: { v: StatusFilter; label: string }[] = [
  { v: "all", label: "All" },
  { v: "open", label: "Open" },
  { v: "filled", label: "Filled" },
  { v: "expired", label: "Expired" },
  { v: "closed", label: "Closed" },
];
const SORTS: { v: Sort; label: string }[] = [
  { v: "newest", label: "Newest" },
  { v: "reward", label: "Highest reward" },
  { v: "ending", label: "Ending soon" },
  { v: "slots", label: "Most slots left" },
];

function sortBounties(list: Bounty[], sort: Sort, now: number): Bounty[] {
  const out = [...list];
  switch (sort) {
    case "reward":
      return out.sort((a, b) => b.rewardPerWinner.cmp(a.rewardPerWinner) || b.bountyId.cmp(a.bountyId));
    case "slots":
      return out.sort((a, b) => slotsLeft(b) - slotsLeft(a) || b.bountyId.cmp(a.bountyId));
    case "ending": {
      // live bounties by nearest deadline first; ended ones last (most recently ended first)
      const live = (b: Bounty) => b.deadline.toNumber() > now && bountyState(b, now) !== "closed";
      return out.sort((a, b) => {
        const la = live(a), lb = live(b);
        if (la !== lb) return la ? -1 : 1;
        return la ? a.deadline.cmp(b.deadline) : b.deadline.cmp(a.deadline);
      });
    }
    default:
      return out.sort((a, b) => b.bountyId.cmp(a.bountyId));
  }
}

export function BountyBoard() {
  const { program } = useProgram();
  const now = useNow();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data, error, loading, reload } = useAsync(() => fetchBounties(program), [program]);

  const q = params.get("q") ?? "";
  const status = (STATUSES.some((s) => s.v === params.get("status")) ? params.get("status") : "all") as StatusFilter;
  const sort = (SORTS.some((s) => s.v === params.get("sort")) ? params.get("sort") : "newest") as Sort;

  const setParam = useCallback(
    (key: string, value: string, def: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === def) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}#arena` : `${pathname}#arena`, { scroll: false });
    },
    [params, pathname, router]
  );

  // local input state so typing never lags; pushed to the URL after a short pause
  const [qInput, setQInput] = useState(q);
  const pushed = useRef(q);
  useEffect(() => {
    if (q !== pushed.current) {
      pushed.current = q; // URL changed externally (back button / clear filters)
      setQInput(q);
    }
  }, [q]);
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(() => {
      pushed.current = qInput;
      setParam("q", qInput, "");
    }, 250);
    return () => clearTimeout(t);
  }, [qInput, q, setParam]);

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
    let list = data ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((b) => b.title.toLowerCase().includes(needle) || b.description.toLowerCase().includes(needle));
    if (status !== "all") list = list.filter((b) => bountyState(b, now) === status);
    return sortBounties(list, sort, now);
  }, [data, q, status, sort, now]);

  const filtering = q.trim() !== "" || status !== "all";

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Stat label="Bounties" value={data ? stats.count : "–"} sub={data ? `${stats.open} open now` : undefined} />
        <Stat label="Held in escrow" value={data ? `${formatUnits(stats.locked)}` : "–"} sub={TOKEN_SYMBOL} />
        <Stat label="Paid to creators" value={data ? `${formatUnits(stats.paid)}` : "–"} sub={TOKEN_SYMBOL} />
        <Stat label="Network" value="Solana" sub="devnet · test USDC" />
      </section>

      <section id="arena" className="scroll-mt-24">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">The Arena</p>
              <h2 className="font-display text-3xl font-bold tracking-wide">Bounty board</h2>
            </div>
            <button onClick={() => void reload()} className="btn-outline btn-sm" disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                inputMode="search"
                aria-label="Search bounties by title"
                className="input pl-10"
                placeholder="Search bounties…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <span className="shrink-0">Sort</span>
              <select className="input md:w-48" value={sort} onChange={(e) => setParam("sort", e.target.value, "newest")}>
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Status filter">
            <div className="inline-flex gap-1.5 rounded-xl border border-neutral-200 bg-white p-1 text-sm font-semibold">
              {STATUSES.map((s) => (
                <button
                  key={s.v}
                  role="tab"
                  aria-selected={status === s.v}
                  onClick={() => setParam("status", s.v, "all")}
                  className={`min-h-[44px] whitespace-nowrap rounded-lg px-4 sm:min-h-[40px] transition ${
                    status === s.v ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-brand-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
          filtering ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <h3 className="font-display text-lg font-bold">No bounties match</h3>
              <p className="mt-1.5 max-w-md text-sm text-ink-soft">Try a different search or status filter.</p>
              <button
                className="btn-outline mt-5"
                onClick={() => router.replace(`${pathname}#arena`, { scroll: false })}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <EmptyState
              title="The arena is empty"
              body="No bounties have been posted yet. Be the first sponsor to lock a prize and call the creators in."
              cta={{ href: "/create", label: "Create a bounty" }}
            />
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((b) => (
              <BountyCard key={b.address.toBase58()} bounty={b} now={now} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
