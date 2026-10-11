"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PageHeader, Notice, Spinner, ExtLink } from "@/components/ui";
import { WalletButton } from "@/components/WalletButton";
import { MobileWalletHelp } from "@/components/MobileWalletHelp";
import { useToast } from "@/components/Toast";
import { useProgram } from "@/hooks/useProgram";
import { USDC_MINT, USDC_MINT_RAW, TOKEN_SYMBOL, MAX_DESCRIPTION_LEN, MAX_TITLE_LEN, USDC_DECIMALS } from "@/lib/config";
import { bountyPda, vaultPda } from "@/lib/pda";
import { byteLen, formatUnits, parseUnits, validateDescription, validateMaxWinners, validateTitle } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { explorerAddress, explorerTx } from "@/lib/explorer";

const U64_MAX = new BN("18446744073709551615");

/** `YYYY-MM-DDTHH:mm` in local time for <input type="datetime-local"> */
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function CreatePage() {
  const router = useRouter();
  const toast = useToast();
  const { publicKey } = useWallet();
  const { program, connection } = useProgram();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [winners, setWinners] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [balance, setBalance] = useState<BN | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Default deadline: 7 days from now (set client-side to avoid SSR mismatch)
  useEffect(() => {
    setDeadline(toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
  }, []);

  const sponsorAta = useMemo(
    () => (publicKey && USDC_MINT ? getAssociatedTokenAddressSync(USDC_MINT, publicKey) : null),
    [publicKey]
  );

  const loadBalance = useMemo(
    () => async () => {
      if (!sponsorAta) {
        setBalance(null);
        return;
      }
      setBalanceLoading(true);
      try {
        const r = await connection.getTokenAccountBalance(sponsorAta, "confirmed");
        setBalance(new BN(r.value.amount));
      } catch {
        setBalance(new BN(0)); // ATA doesn't exist yet
      } finally {
        setBalanceLoading(false);
      }
    },
    [connection, sponsorAta]
  );
  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const rewardRaw = parseUnits(reward);
  const winnersN = /^\d+$/.test(winners) ? Number(winners) : 0;
  const total = rewardRaw && winnersN > 0 ? rewardRaw.muln(winnersN) : null;
  const deadlineSec = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;

  const errors = {
    title: validateTitle(title),
    description: validateDescription(description),
    reward: reward.trim() === "" ? "Enter a reward amount" : rewardRaw ? null : `Enter a positive amount (max ${USDC_DECIMALS} decimals)`,
    winners: validateMaxWinners(winners),
    deadline: !deadlineSec
      ? "Pick a deadline"
      : deadlineSec < Math.floor(Date.now() / 1000) + 120
      ? "Deadline must be at least a couple of minutes in the future"
      : null,
    total: total && total.gt(U64_MAX) ? "Total budget is too large" : null,
    funds: total && balance && total.gt(balance) ? "Insufficient USDC balance for this budget" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const noUsdc = publicKey && balance && balance.isZero();

  async function copyAddr() {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || !publicKey || !USDC_MINT || !rewardRaw || !sponsorAta) return;
    setBusy(true);
    try {
      const id = new BN(Date.now());
      const bounty = bountyPda(publicKey, id, program.programId);
      const vault = vaultPda(bounty, program.programId);
      const sig = await program.methods
        .createBounty(id, title.trim(), description.trim(), rewardRaw, winnersN, new BN(deadlineSec))
        .accountsPartial({ sponsor: publicKey, mint: USDC_MINT, bounty, vault, sponsorAta })
        .rpc();
      toast.success("Bounty created", {
        message: `${formatUnits(total!)} ${TOKEN_SYMBOL} locked in escrow.`,
        href: explorerTx(sig),
        linkLabel: "View transaction",
      });
      router.push(`/bounty/${bounty.toBase58()}`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create bounty", { message: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  const show = (msg: string | null) => (touched && msg ? <p className="mt-1.5 text-xs font-medium text-red-600">{msg}</p> : null);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Sponsor"
        title="Launch a bounty"
        subtitle="Lock the full prize pool upfront. Creators see the funds are real, and approved winners are paid instantly from the vault."
      />

      {!USDC_MINT && (
        <div className="mb-6">
          <Notice tone="warn" title="USDC mint not configured">
            {USDC_MINT_RAW ? "NEXT_PUBLIC_USDC_MINT is not a valid address." : "Set NEXT_PUBLIC_USDC_MINT in app/.env.local to the test mint address."}{" "}
            Create one with <code className="rounded bg-white/70 px-1.5 py-0.5">yarn create-mint</code> in the repo root, then restart the dev server.
          </Notice>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-6 p-5 sm:p-8" noValidate>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Best 30s clip of the new release" />
          <div className="flex justify-between">
            {show(errors.title) ?? <span />}
            <p className="hint">{byteLen(title)}/{MAX_TITLE_LEN}</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="desc">Description</label>
          <textarea id="desc" rows={4} className="input resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should creators make? Rules, platforms, judging criteria…" />
          <div className="flex justify-between">
            {show(errors.description) ?? <span />}
            <p className="hint">{byteLen(description)}/{MAX_DESCRIPTION_LEN}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reward">Reward per approved submission ({TOKEN_SYMBOL})</label>
            <input id="reward" inputMode="decimal" className="input" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="25" />
            {show(errors.reward)}
          </div>
          <div>
            <label className="label" htmlFor="winners">Max winners</label>
            <input id="winners" inputMode="numeric" className="input" value={winners} onChange={(e) => setWinners(e.target.value)} placeholder="3" />
            {show(errors.winners)}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="deadline">Deadline</label>
          <input id="deadline" type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <p className="hint">Submissions close at this time. After it, you can reclaim whatever is unspent.</p>
          {show(errors.deadline)}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-soft">Total budget to escrow</span>
            <span className="text-2xl font-bold text-brand-700">
              {total ? formatUnits(total) : "0.00"} <span className="text-sm">{TOKEN_SYMBOL}</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {rewardRaw ? formatUnits(rewardRaw) : "reward"} × {winnersN || "winners"}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-brand-100 pt-4 text-sm">
            <span className="font-semibold text-ink-soft">Your {TOKEN_SYMBOL} balance</span>
            <span className="font-bold">
              {!publicKey ? "Connect wallet" : !USDC_MINT ? "–" : balanceLoading && !balance ? "Loading…" : `${formatUnits(balance ?? 0)} ${TOKEN_SYMBOL}`}
            </span>
          </div>
          {(errors.total ?? errors.funds) && <p className="mt-2 text-xs font-medium text-red-600">{errors.total ?? errors.funds}</p>}
        </div>

        {noUsdc && USDC_MINT && (
          <Notice tone="warn" title={`This wallet has no ${TOKEN_SYMBOL} yet`}>
            <p>Mint some devnet test USDC to this wallet from the repo root, then refresh your balance:</p>
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white/80 p-3 text-xs text-ink">yarn mint-to {publicKey!.toBase58()} 1000</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copyAddr} className="btn-outline btn-sm">
                {copied ? "Copied ✓" : "Copy wallet address"}
              </button>
              <button type="button" onClick={() => void loadBalance()} className="btn-outline btn-sm">
                Refresh balance
              </button>
              <ExtLink href={explorerAddress(USDC_MINT.toBase58())} className="self-center text-xs">
                Mint on Explorer ↗
              </ExtLink>
            </div>
          </Notice>
        )}

        {!publicKey ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-200 p-6 text-center">
            <p className="text-sm text-ink-soft">Connect a wallet to fund and publish your bounty.</p>
            <WalletButton />
            <MobileWalletHelp className="w-full text-left" />
          </div>
        ) : (
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy || !USDC_MINT || (touched && hasErrors)}>
            {busy ? (
              <>
                <Spinner /> Confirm in your wallet…
              </>
            ) : (
              "Lock funds & create bounty"
            )}
          </button>
        )}
      </form>
    </div>
  );
}
