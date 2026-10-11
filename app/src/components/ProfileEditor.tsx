"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Notice, PageHeader, Spinner, ExtLink } from "./ui";
import { WalletButton } from "./WalletButton";
import { MobileWalletHelp } from "./MobileWalletHelp";
import { SelfDeclaredBadge, SOCIAL_ICON, SocialList } from "./SocialLinks";
import { UserIcon } from "./icons";
import { useToast } from "./Toast";
import { useProgram } from "@/hooks/useProgram";
import { useProfile } from "@/hooks/useProfile";
import { friendlyError } from "@/lib/errors";
import { explorerTx } from "@/lib/explorer";
import { shortAddr } from "@/lib/format";
import {
  MEMO_MAX_BYTES,
  NAME_MAX,
  SOCIAL_KEYS,
  SOCIAL_META,
  buildProfileFromForm,
  buildProfileTx,
  emptyForm,
  formFromProfile,
  isEmptyProfile,
  memoBytes,
  setCachedProfile,
  type Profile,
  type ProfileForm,
} from "@/lib/profile";

export function ProfileEditor() {
  const { publicKey } = useWallet();
  return (
    <div>
      <PageHeader
        eyebrow="Creator identity"
        title="My profile"
        subtitle="Link your socials to your wallet so sponsors and fans can see who you are. Stored onchain, no account needed."
      />
      {!publicKey ? (
        <div className="card flex flex-col items-center gap-4 px-5 py-12 text-center sm:px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <UserIcon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold">Connect your wallet</h2>
          <p className="max-w-md text-sm text-ink-soft">Your profile is attached to the wallet you sign with.</p>
          <WalletButton />
          <MobileWalletHelp className="w-full max-w-md text-left" />
        </div>
      ) : (
        <Editor wallet={publicKey.toBase58()} />
      )}
    </div>
  );
}

function Editor({ wallet }: { wallet: string }) {
  const { program, wallet: anchorWallet } = useProgram();
  const toast = useToast();
  const { profile: current } = useProfile(wallet);
  const [form, setForm] = useState<ProfileForm>(emptyForm());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const initialised = useRef<string | null>(null);

  // fill the form once the existing record has loaded (don't clobber edits)
  useEffect(() => {
    if (current === undefined || initialised.current === wallet) return;
    initialised.current = wallet;
    setForm(formFromProfile(current));
  }, [current, wallet]);

  const { profile: draft, errors } = useMemo(() => buildProfileFromForm(form), [form]);
  const bytes = useMemo(() => memoBytes(draft), [draft]);
  const tooBig = bytes > MEMO_MAX_BYTES;
  const hasErrors = Object.keys(errors).length > 0 || tooBig;
  const hasExisting = !isEmptyProfile(current);
  const same = JSON.stringify({ n: draft.name ?? "", s: draft.socials }) === JSON.stringify({ n: current?.name ?? "", s: current?.socials ?? {} });

  const set = (k: keyof ProfileForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  async function publish(p: Profile, kind: "save" | "remove") {
    if (!anchorWallet) return;
    setBusy(kind);
    try {
      const tx = buildProfileTx(anchorWallet.publicKey, p);
      const sig = await program.provider.sendAndConfirm!(tx, [], { commitment: "confirmed" });
      setCachedProfile(wallet, { ...p, signature: sig, blockTime: Math.floor(Date.now() / 1000) });
      if (kind === "remove") {
        setForm(emptyForm());
        setTouched({});
        setConfirmRemove(false);
      }
      toast.success(kind === "remove" ? "Links removed" : "Profile saved onchain", {
        message: kind === "remove" ? "An empty profile was published; it is now the latest record." : "Sponsors will see your socials on your creator page.",
        href: explorerTx(sig),
        linkLabel: "View transaction",
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save profile", { message: friendlyError(e) });
    } finally {
      setBusy(null);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(["name", ...SOCIAL_KEYS].map((k) => [k, true])));
    if (tooBig) return void toast.error("Profile is too large", { message: `Shorten your name or website (${bytes}/${MEMO_MAX_BYTES} bytes).` });
    if (hasErrors) return;
    void publish(draft, "save");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <form onSubmit={submit} className="card space-y-5 p-5 sm:p-8" noValidate>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          Wallet <span className="font-mono font-semibold text-ink">{shortAddr(wallet, 6)}</span>
          {current === undefined && <span className="inline-flex items-center gap-1.5 text-xs"><Spinner className="h-3 w-3" /> loading your current profile…</span>}
          {current && !isEmptyProfile(current) && current.signature && (
            <ExtLink href={explorerTx(current.signature)} className="py-2 text-xs">
              Current record ↗
            </ExtLink>
          )}
        </div>

        <div>
          <label className="label" htmlFor="p-name">
            Display name <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="p-name"
              className="input pl-10"
              value={form.name}
              maxLength={NAME_MAX * 2}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => blur("name")}
              placeholder="e.g. Gladius"
              autoComplete="nickname"
            />
          </div>
          {touched.name && errors.name ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.name}</p> : <p className="hint mt-1">Up to {NAME_MAX} characters.</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_KEYS.map((k) => {
            const Icon = SOCIAL_ICON[k];
            const meta = SOCIAL_META[k];
            return (
              <div key={k} className={k === "website" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={`p-${k}`}>
                  {meta.label}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <input
                    id={`p-${k}`}
                    className={`input pl-10 ${touched[k] && errors[k] ? "!border-red-400" : ""}`}
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                    onBlur={() => blur(k)}
                    placeholder={meta.placeholder}
                    inputMode={k === "website" ? "url" : "text"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={!!(touched[k] && errors[k])}
                  />
                </div>
                {touched[k] && errors[k] ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors[k]}</p> : <p className="hint mt-1">{meta.hint}</p>}
              </div>
            );
          })}
        </div>

        <Notice tone="info" title="Self-declared, public, and permanent history">
          Links are self-declared and stored publicly onchain. Munera doesn&apos;t verify that you own these accounts. Saving writes a small memo
          transaction from your wallet (network fee about 0.000005 SOL). Older versions stay visible in your wallet&apos;s history; the latest one wins.
        </Notice>

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {!confirmRemove ? (
              <button type="button" className="btn-outline btn-sm" disabled={!hasExisting || busy !== null} onClick={() => setConfirmRemove(true)}>
                Remove all links
              </button>
            ) : (
              <>
                <button type="button" className="btn-danger btn-sm" disabled={busy !== null} onClick={() => void publish({ socials: {} }, "remove")}>
                  {busy === "remove" && <Spinner />} Confirm remove
                </button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </button>
              </>
            )}
            <span className={`text-xs ${tooBig ? "font-semibold text-red-600" : "text-ink-muted"}`}>
              {bytes}/{MEMO_MAX_BYTES} bytes
            </span>
          </div>
          <button className="btn-primary w-full sm:w-auto" disabled={busy !== null || (same && hasExisting) || (!draft.name && !Object.keys(draft.socials).length)}>
            {busy === "save" ? <><Spinner /> Confirm in your wallet…</> : "Save onchain"}
          </button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Preview</p>
            <SelfDeclaredBadge />
          </div>
          <p className="break-words font-display text-xl font-bold tracking-wide">{draft.name ?? shortAddr(wallet, 6)}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-muted">{shortAddr(wallet, 6)}</p>
          <div className="mt-3">
            {Object.keys(draft.socials).length ? <SocialList profile={draft} /> : <p className="text-sm text-ink-muted">Your links will appear here.</p>}
          </div>
          <Link href={`/creator/${wallet}`} className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-600 hover:underline">
            View my public page →
          </Link>
        </div>
        <div className="card p-5 text-sm text-ink-soft">
          <p className="font-semibold text-ink">Verification tip</p>
          <p className="mt-1.5">
            Since links are self-declared, also pin your wallet address in the bio of the accounts you link. Anyone can then confirm the two belong
            together, with no extra tooling.
          </p>
        </div>
      </aside>
    </div>
  );
}
