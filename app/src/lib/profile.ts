/**
 * Creator profiles ("socials") stored onchain as an SPL Memo, signed by the creator wallet.
 *
 *   memo data = {"app":"munera","v":1,"t":"profile","name":"...","socials":{"x":"handle",...}}
 *
 * Reading: getSignaturesForAddress(wallet) returns each signature's `memo` text, so candidates are found
 * without downloading transactions; only the winning candidate is fetched to check that the memo instruction
 * lists the wallet as a signer account (a third party can include any address in a tx, or sign a memo of their own).
 * Latest valid memo wins. Everything read from chain is treated as hostile: strict allow-lists, length limits,
 * handle regexes, https-only URLs. Values are only ever rendered through React text/attributes (escaped).
 *
 * Framework-free except for optional sessionStorage use, so it also runs under node scripts.
 */
import { utils } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { RPC_URL } from "./config";

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export const SOCIAL_KEYS = ["x", "discord", "instagram", "tiktok", "youtube", "telegram", "github", "website"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type Socials = Partial<Record<SocialKey, string>>;

export const NAME_MAX = 32;
export const WEBSITE_MAX = 100;
export const MEMO_MAX_BYTES = 500;
const MEMO_READ_MAX_BYTES = 600;

export type Profile = {
  name?: string;
  socials: Socials;
  /** signature of the memo tx that holds this record */
  signature?: string;
  blockTime?: number | null;
};

export const isEmptyProfile = (p: Profile | null | undefined) => !p || (!p.name && Object.keys(p.socials).length === 0);

export const SOCIAL_META: Record<SocialKey, { label: string; placeholder: string; hint: string }> = {
  x: { label: "X", placeholder: "munera_xyz", hint: "Handle or x.com link" },
  discord: { label: "Discord", placeholder: "yourname", hint: "Username (no link exists)" },
  instagram: { label: "Instagram", placeholder: "yourname", hint: "Handle or instagram.com link" },
  tiktok: { label: "TikTok", placeholder: "yourname", hint: "Handle or tiktok.com/@ link" },
  youtube: { label: "YouTube", placeholder: "yourchannel", hint: "@handle or youtube.com/@ link" },
  telegram: { label: "Telegram", placeholder: "yourname", hint: "Username or t.me link" },
  github: { label: "GitHub", placeholder: "yourname", hint: "Username or github.com link" },
  website: { label: "Website", placeholder: "https://example.com", hint: "https:// only" },
};

// Strict per-platform handle rules (conservative superset of each platform's real rules)
const HANDLE_RE: Record<Exclude<SocialKey, "website">, RegExp> = {
  x: /^[A-Za-z0-9_]{1,15}$/,
  discord: /^[a-z0-9._]{2,32}$/,
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{1,24}$/,
  youtube: /^[A-Za-z0-9._-]{3,30}$/,
  telegram: /^[A-Za-z0-9_]{5,32}$/,
  github: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/,
};

const HANDLE_ERR: Record<Exclude<SocialKey, "website">, string> = {
  x: "X handles are 1–15 letters, numbers or underscores",
  discord: "Discord usernames are 2–32 lowercase letters, numbers, dots or underscores",
  instagram: "Instagram handles are up to 30 letters, numbers, dots or underscores",
  tiktok: "TikTok handles are up to 24 letters, numbers, dots or underscores",
  youtube: "YouTube handles are 3–30 letters, numbers, dots, dashes or underscores",
  telegram: "Telegram usernames are 5–32 letters, numbers or underscores",
  github: "GitHub usernames are up to 39 letters, numbers or single dashes",
};

const HOSTS: Partial<Record<SocialKey, string[]>> = {
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com"],
  telegram: ["t.me", "telegram.me"],
  github: ["github.com"],
};

export function sanitizeName(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  // drop control chars and angle brackets; collapse whitespace
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069<>]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  return [...s].slice(0, NAME_MAX).join("");
}

export function sanitizeWebsite(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > WEBSITE_MAX) return undefined;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return undefined;
    const href = u.href;
    return href.length <= WEBSITE_MAX ? href : undefined;
  } catch {
    return undefined;
  }
}

/** Validates an already-normalised value from chain (no URL parsing for handles). */
export function sanitizeSocial(key: SocialKey, v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (key === "website") return sanitizeWebsite(v);
  return HANDLE_RE[key].test(v) ? v : undefined;
}

/** Parses and sanitises a memo string. Returns null if it is not a valid Munera profile record. */
export function parseProfileMemo(text: string): Profile | null {
  if (text.length > MEMO_READ_MAX_BYTES) return null;
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    return null;
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  if (j.app !== "munera" || j.v !== 1 || j.t !== "profile") return null;
  const socials: Socials = {};
  const raw = j.socials && typeof j.socials === "object" && !Array.isArray(j.socials) ? j.socials : {};
  for (const k of SOCIAL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue; // only allowed keys are ever read
    const v = sanitizeSocial(k, raw[k]);
    if (v) socials[k] = v;
  }
  const name = sanitizeName(j.name);
  return name ? { name, socials } : { socials };
}

// ---------------------------------------------------------------------------
// Input normalisation (editor form)
// ---------------------------------------------------------------------------

export function normalizeSocialInput(key: SocialKey, input: string): { value?: string; error?: string } {
  let s = input.trim();
  if (!s) return {};
  if (key === "website") {
    if (/^http:\/\//i.test(s)) return { error: "Website must use https://" };
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
    const w = sanitizeWebsite(s);
    return w ? { value: w } : { error: `Enter a valid https:// URL (max ${WEBSITE_MAX} characters)` };
  }
  // full URL -> extract the handle
  if (/^(https?:\/\/)?[^/\s]+\.[a-z]{2,}\//i.test(s) || /^https?:\/\//i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
      const host = u.hostname.replace(/^(www|m|mobile)\./, "");
      const allowed = HOSTS[key] ?? [];
      if (!allowed.includes(host)) return { error: `That link isn't a ${SOCIAL_META[key].label} link` };
      const seg = u.pathname.split("/").filter(Boolean)[0] ?? "";
      s = decodeURIComponent(seg);
      if (!s) return { error: `Add your ${SOCIAL_META[key].label} username to the link` };
    } catch {
      return { error: "Enter a valid link or username" };
    }
  }
  s = s.replace(/^@+/, "");
  if (key === "discord") s = s.toLowerCase();
  if (!HANDLE_RE[key].test(s)) return { error: HANDLE_ERR[key] };
  return { value: s };
}

export type ProfileForm = { name: string } & Record<SocialKey, string>;
export const emptyForm = (): ProfileForm => ({ name: "", x: "", discord: "", instagram: "", tiktok: "", youtube: "", telegram: "", github: "", website: "" });

export function formFromProfile(p: Profile | null | undefined): ProfileForm {
  const f = emptyForm();
  if (!p) return f;
  f.name = p.name ?? "";
  for (const k of SOCIAL_KEYS) f[k] = p.socials[k] ?? "";
  return f;
}

export function buildProfileFromForm(f: ProfileForm): { profile: Profile; errors: Partial<Record<SocialKey | "name", string>> } {
  const errors: Partial<Record<SocialKey | "name", string>> = {};
  const socials: Socials = {};
  for (const k of SOCIAL_KEYS) {
    const r = normalizeSocialInput(k, f[k]);
    if (r.error) errors[k] = r.error;
    else if (r.value) socials[k] = r.value;
  }
  const name = sanitizeName(f.name);
  if (f.name.trim() && [...f.name.trim()].length > NAME_MAX) errors.name = `Display name is at most ${NAME_MAX} characters`;
  return { profile: name ? { name, socials } : { socials }, errors };
}

// ---------------------------------------------------------------------------
// Memo instruction
// ---------------------------------------------------------------------------

export function serializeProfile(p: Profile): string {
  const o: Record<string, unknown> = { app: "munera", v: 1, t: "profile" };
  if (p.name) o.name = p.name;
  const socials: Socials = {};
  for (const k of SOCIAL_KEYS) if (p.socials[k]) socials[k] = p.socials[k];
  o.socials = socials;
  return JSON.stringify(o);
}

export const memoBytes = (p: Profile) => new TextEncoder().encode(serializeProfile(p)).length;

/** The wallet is passed as a signer account so Solana's memo program validates the signature. */
export function buildProfileMemoIx(wallet: PublicKey, p: Profile): TransactionInstruction {
  const data = serializeProfile(p);
  if (new TextEncoder().encode(data).length > MEMO_MAX_BYTES) throw new Error("Profile is too large; shorten your name or website.");
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: wallet, isSigner: true, isWritable: false }],
    data: Buffer.from(data, "utf8"),
  });
}

export function buildProfileTx(wallet: PublicKey, p: Profile): Transaction {
  return new Transaction().add(buildProfileMemoIx(wallet, p));
}

// ---------------------------------------------------------------------------
// Reading + caching
// ---------------------------------------------------------------------------

const TTL_MS = 5 * 60_000;
const ERR_TTL_MS = 30_000;
const SS_PREFIX = "munera:profile:v1:";
const MAX_PAGES = 2;
const PAGE = 100;
const CONCURRENCY = 3;

type Entry = { at: number; profile: Profile | null; failed?: boolean };
const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<Profile | null>>();
const listeners = new Set<(wallet: string) => void>();

export const subscribeProfiles = (fn: (wallet: string) => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

function ssGet(k: string): Entry | undefined {
  try {
    if (typeof sessionStorage === "undefined") return undefined;
    const v = sessionStorage.getItem(SS_PREFIX + k);
    if (!v) return undefined;
    const e = JSON.parse(v) as Entry;
    return typeof e?.at === "number" ? e : undefined;
  } catch {
    return undefined;
  }
}
function ssSet(k: string, e: Entry) {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SS_PREFIX + k, JSON.stringify(e));
  } catch {
    /* quota / privacy mode: ignore */
  }
}

/** Cached value if fresh. `undefined` = unknown (not cached or stale). */
export function getCachedProfile(wallet: string): Profile | null | undefined {
  let e = mem.get(wallet);
  if (!e) {
    e = ssGet(wallet);
    if (e) mem.set(wallet, e);
  }
  if (!e) return undefined;
  if (Date.now() - e.at > (e.failed ? ERR_TTL_MS : TTL_MS)) return undefined;
  return e.profile;
}

export function setCachedProfile(wallet: string, profile: Profile | null) {
  const e = { at: Date.now(), profile };
  mem.set(wallet, e);
  ssSet(wallet, e);
  listeners.forEach((f) => f(wallet));
}

export function clearProfileCache() {
  mem.clear();
  inflight.clear();
  try {
    if (typeof sessionStorage !== "undefined") Object.keys(sessionStorage).filter((k) => k.startsWith(SS_PREFIX)).forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

let active = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function memoText(raw: string): string {
  // getSignaturesForAddress formats memo as "[<len>] <text>" (several memos are joined by "; ")
  return raw.replace(/^\[\d+\]\s/, "");
}

/**
 * True if the transaction contains a Memo-program instruction with exactly `text` whose account list includes
 * `wallet`, and `wallet` is a transaction signer. (The Memo program requires every account passed to it to have
 * signed, so this proves the wallet owner authored the memo. A tx that merely mentions the wallet, or a memo
 * instruction without the wallet as a signer account, is rejected.)
 */
function memoSignedByWallet(tx: any, wallet: string, text: string): boolean {
  const msg = tx?.transaction?.message;
  if (!msg) return false;
  const keys: PublicKey[] = msg.staticAccountKeys ?? msg.accountKeys ?? [];
  const nSigners: number = msg.header?.numRequiredSignatures ?? 0;
  const wi = keys.findIndex((k) => k.toBase58() === wallet);
  if (wi < 0 || wi >= nSigners) return false;
  const ixs: any[] = msg.compiledInstructions ?? msg.instructions ?? [];
  return ixs.some((ix) => {
    const prog = keys[ix.programIdIndex];
    if (!prog || !prog.equals(MEMO_PROGRAM_ID)) return false;
    const accts: number[] = ix.accountKeyIndexes ?? ix.accounts ?? [];
    if (!accts.includes(wi)) return false;
    const data: Uint8Array = typeof ix.data === "string" ? utils.bytes.bs58.decode(ix.data) : ix.data;
    return new TextDecoder().decode(data) === text;
  });
}

async function loadProfile(connection: Connection, wallet: string): Promise<Profile | null> {
  const pk = new PublicKey(wallet);
  let before: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const sigs = await connection.getSignaturesForAddress(pk, { limit: PAGE, before }, "confirmed");
    // newest first
    for (const s of sigs) {
      if (s.err || !s.memo) continue;
      const text = memoText(s.memo);
      if (!text.includes('"munera"')) continue;
      const parsed = parseProfileMemo(text);
      if (!parsed) continue;
      const tx = await connection.getTransaction(s.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (!tx || tx.meta?.err) continue;
      if (!memoSignedByWallet(tx, wallet, text)) continue; // spoofed / not attributable
      return { ...parsed, signature: s.signature, blockTime: s.blockTime ?? tx.blockTime ?? null };
    }
    if (sigs.length < PAGE) break;
    before = sigs[sigs.length - 1].signature;
  }
  return null;
}

/**
 * Latest valid profile for a wallet (or null). Cached ~5 min in memory + sessionStorage; concurrent calls are
 * de-duplicated and RPC concurrency is limited. Never throws: on RPC errors it resolves to null briefly cached.
 */
export function fetchProfile(wallet: string | PublicKey, connection?: Connection, opts: { force?: boolean } = {}): Promise<Profile | null> {
  const key = typeof wallet === "string" ? wallet : wallet.toBase58();
  if (!opts.force) {
    const c = getCachedProfile(key);
    if (c !== undefined) return Promise.resolve(c);
  }
  const running = inflight.get(key);
  if (running && !opts.force) return running;
  const conn = connection ?? new Connection(RPC_URL, "confirmed");
  const p = limited(() => loadProfile(conn, key))
    .then((profile) => {
      setCachedProfile(key, profile);
      return profile;
    })
    .catch(() => {
      const e: Entry = { at: Date.now(), profile: null, failed: true };
      mem.set(key, e);
      return null;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export async function fetchProfiles(wallets: (string | PublicKey)[], connection?: Connection): Promise<Map<string, Profile | null>> {
  const uniq = [...new Set(wallets.map((w) => (typeof w === "string" ? w : w.toBase58())))];
  const res = await Promise.all(uniq.map((w) => fetchProfile(w, connection)));
  return new Map(uniq.map((w, i) => [w, res[i]]));
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function socialUrl(key: SocialKey, value: string): string | null {
  switch (key) {
    case "x":
      return `https://x.com/${value}`;
    case "instagram":
      return `https://instagram.com/${value}`;
    case "tiktok":
      return `https://tiktok.com/@${value}`;
    case "youtube":
      return `https://youtube.com/@${value}`;
    case "telegram":
      return `https://t.me/${value}`;
    case "github":
      return `https://github.com/${value}`;
    case "website":
      return sanitizeWebsite(value) ?? null;
    default:
      return null; // discord: no stable URL
  }
}
