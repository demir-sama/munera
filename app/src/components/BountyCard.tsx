"use client";

import Link from "next/link";
import { bountyState, slotsLeft, type Bounty } from "@/lib/data";
import { TOKEN_SYMBOL } from "@/lib/config";
import { countdown, formatDate, formatUnits, shortAddr } from "@/lib/format";
import { BountyBadge } from "./ui";

export function BountyCard({ bounty, now }: { bounty: Bounty; now: number }) {
  const state = bountyState(bounty, now);
  const left = slotsLeft(bounty);
  const deadline = bounty.deadline.toNumber();
  const dim = state === "closed";
  return (
    <Link
      href={`/bounty/${bounty.address.toBase58()}`}
      className={`card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift ${dim ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-ink group-hover:text-brand-700">{bounty.title}</h3>
        <BountyBadge state={state} />
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-ink-soft">{bounty.description || "No description provided."}</p>

      <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Reward per winner</p>
        <p className="mt-0.5 text-2xl font-bold text-brand-700">
          {formatUnits(bounty.rewardPerWinner)} <span className="text-sm font-semibold">{TOKEN_SYMBOL}</span>
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">Slots left</dt>
          <dd className="font-semibold">
            {left} <span className="font-normal text-ink-muted">/ {bounty.maxWinners}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{state === "open" || state === "filled" ? "Time left" : "Deadline"}</dt>
          <dd className="font-semibold">{state === "open" || state === "filled" ? countdown(deadline, now) : formatDate(deadline)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-ink-muted">
        <span>By {shortAddr(bounty.sponsor)}</span>
        <span>{bounty.submissionCount} submission{bounty.submissionCount === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}
