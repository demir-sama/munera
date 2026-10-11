"use client";

import Link from "next/link";
import { bountyState, slotsLeft, type Bounty } from "@/lib/data";
import { TOKEN_SYMBOL } from "@/lib/config";
import { countdown, formatDate, formatUnits, shortAddr } from "@/lib/format";
import { BountyBadge } from "./ui";
import { ShareButtons } from "./ShareButtons";

export function BountyCard({ bounty, now }: { bounty: Bounty; now: number }) {
  const state = bountyState(bounty, now);
  const left = slotsLeft(bounty);
  const deadline = bounty.deadline.toNumber();
  const dim = state === "closed";
  const addr = bounty.address.toBase58();
  const live = state === "open" || state === "filled";
  return (
    <div
      className={`card group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift sm:p-6 ${dim ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-ink group-hover:text-brand-700">
          {/* stretched link: the whole card is clickable while the share buttons stay separate */}
          <Link href={`/bounty/${addr}`} className="line-clamp-2 after:absolute after:inset-0 after:content-['']">
            {bounty.title}
          </Link>
        </h3>
        <BountyBadge state={state} />
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] break-words text-sm text-ink-soft">{bounty.description || "No description provided."}</p>

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
          <dt className="text-xs text-ink-muted">{live ? "Time left" : "Deadline"}</dt>
          <dd className="font-semibold">{live ? countdown(deadline, now) : formatDate(deadline)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-ink-muted">
        <span className="min-w-0 truncate">
          By {shortAddr(bounty.sponsor)} · {bounty.submissionCount} entr{bounty.submissionCount === 1 ? "y" : "ies"}
        </span>
        <ShareButtons compact address={addr} title={bounty.title} reward={formatUnits(bounty.rewardPerWinner)} />
      </div>
    </div>
  );
}
