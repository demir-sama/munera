"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BN } from "@coral-xyz/anchor";
import { EmptyState, ExtLink, Notice, PageHeader, Stat } from "./ui";
import { useProgram } from "@/hooks/useProgram";
import { useAsync } from "@/hooks/useAsync";
import { fetchPayments, findPayoutSignature, type Payment } from "@/lib/data";
import { TOKEN_SYMBOL } from "@/lib/config";
import { formatDate, formatUnits, shortAddr } from "@/lib/format";
import { explorerAddress, explorerTx } from "@/lib/explorer";

function PayoutTx({ submission }: { submission: Payment["submission"] }) {
  const { connection } = useProgram();
  const { data, loading } = useAsync(() => findPayoutSignature(connection, submission.address), [connection, submission.address]);
  if (loading) return <span className="text-xs text-ink-muted">locating…</span>;
  return data ? (
    <ExtLink href={explorerTx(data)} className="text-sm">
      Tx {shortAddr(data, 5)} ↗
    </ExtLink>
  ) : (
    <ExtLink href={explorerAddress(submission.address.toBase58())} className="text-sm">
      Account ↗
    </ExtLink>
  );
}

export function PaymentsView() {
  const { program } = useProgram();
  const router = useRouter();
  const params = useSearchParams();
  const filter = params.get("bounty") ?? "";
  const { data, loading, error, reload } = useAsync(() => fetchPayments(program), [program]);

  const bountyOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data ?? []) if (p.bounty) m.set(p.bounty.address.toBase58(), p.bounty.title);
    return [...m.entries()];
  }, [data]);

  const rows = useMemo(
    () => (data ?? []).filter((p) => !filter || p.submission.bounty.toBase58() === filter),
    [data, filter]
  );
  const total = rows.reduce((acc, p) => acc.add(p.submission.paidAmount), new BN(0));

  return (
    <div>
      <PageHeader
        eyebrow="The ledger"
        title="Payment history"
        subtitle="Every approved submission is a payout from a bounty vault to a creator. Each one links to its transaction on Solana Explorer."
        action={
          <button onClick={() => void reload()} className="btn-outline btn-sm" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error && (
        <div className="mb-5">
          <Notice tone="error" title="Couldn't load payments">
            {error}
          </Notice>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Payouts" value={data ? rows.length : "–"} />
        <Stat label="Total paid" value={data ? `${formatUnits(total)} ${TOKEN_SYMBOL}` : "–"} />
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
          <label htmlFor="bf" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Filter by bounty
          </label>
          <select
            id="bf"
            className="input mt-1 py-1.5"
            value={filter}
            onChange={(e) => router.replace(e.target.value ? `/payments?bounty=${e.target.value}` : "/payments")}
          >
            <option value="">All bounties</option>
            {bountyOptions.map(([addr, title]) => (
              <option key={addr} value={addr}>
                {title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <div className="card h-64 animate-pulse" />
      ) : rows.length === 0 && !error ? (
        <EmptyState
          title="No payouts yet"
          body="When a sponsor approves a submission, the payout shows up here with its transaction link."
          cta={{ href: "/", label: "Browse bounties" }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-neutral-100 bg-brand-50/60 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted md:grid">
            <span>Bounty</span>
            <span>Creator</span>
            <span>Sponsor</span>
            <span className="text-right">Amount</span>
            <span>Paid</span>
            <span>Transaction</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <div
                key={p.submission.address.toBase58()}
                className="grid gap-2 px-6 py-4 text-sm md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  {p.bounty ? (
                    <Link href={`/bounty/${p.bounty.address.toBase58()}`} className="block truncate font-semibold hover:text-brand-700">
                      {p.bounty.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-muted">Unknown bounty</span>
                  )}
                </div>
                <div className="font-mono">
                  <span className="mr-2 text-xs text-ink-muted md:hidden">Creator</span>
                  <ExtLink href={explorerAddress(p.submission.creator.toBase58())}>{shortAddr(p.submission.creator)}</ExtLink>
                </div>
                <div className="font-mono">
                  <span className="mr-2 text-xs text-ink-muted md:hidden">Sponsor</span>
                  {p.bounty ? (
                    <ExtLink href={explorerAddress(p.bounty.sponsor.toBase58())}>{shortAddr(p.bounty.sponsor)}</ExtLink>
                  ) : (
                    "–"
                  )}
                </div>
                <div className="font-bold text-brand-700 md:text-right">
                  {formatUnits(p.submission.paidAmount)} {TOKEN_SYMBOL}
                </div>
                <div className="text-ink-soft">{formatDate(p.submission.paidAt)}</div>
                <div>
                  <PayoutTx submission={p.submission} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
