import { BN } from "@coral-xyz/anchor";
import { MAX_DESCRIPTION_LEN, MAX_LINK_LEN, MAX_TITLE_LEN, MAX_WINNERS_LIMIT, USDC_DECIMALS } from "./config";

export const shortAddr = (a: { toBase58(): string } | string, n = 4) => {
  const s = typeof a === "string" ? a : a.toBase58();
  return s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;
};

export const byteLen = (s: string) => new TextEncoder().encode(s).length;

/** Raw base units -> display string with up to `decimals` fraction digits (trailing zeros trimmed, min 2). */
export function formatUnits(raw: BN | bigint | number | string, decimals = USDC_DECIMALS): string {
  const neg = raw.toString().startsWith("-");
  const digits = raw.toString().replace("-", "").padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  let frac = digits.slice(digits.length - decimals).replace(/0+$/, "");
  while (frac.length < 2) frac += "0";
  const wholeFmt = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${wholeFmt}.${frac}`;
}

/** "12.5" -> BN(12_500_000). Returns null for invalid input / too many decimals / zero-or-less. */
export function parseUnits(input: string, decimals = USDC_DECIMALS): BN | null {
  const s = input.trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null;
  const [w, f = ""] = s.split(".");
  if (f.length > decimals) return null;
  const raw = new BN((w || "0") + f.padEnd(decimals, "0"), 10);
  return raw.gtn(0) ? raw : null;
}

export function formatDate(ts: number | BN): string {
  const n = typeof ts === "number" ? ts : ts.toNumber();
  return new Date(n * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countdown(deadline: number, nowSec: number): string {
  const diff = deadline - nowSec;
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return `${diff}s left`;
}

export function validateTitle(v: string): string | null {
  if (!v.trim()) return "Title is required";
  if (byteLen(v) > MAX_TITLE_LEN) return `Title must be at most ${MAX_TITLE_LEN} bytes`;
  return null;
}
export function validateDescription(v: string): string | null {
  if (byteLen(v) > MAX_DESCRIPTION_LEN) return `Description must be at most ${MAX_DESCRIPTION_LEN} bytes`;
  return null;
}
export function validateMaxWinners(v: string): string | null {
  if (!/^\d+$/.test(v.trim())) return "Enter a whole number of winners";
  const n = Number(v);
  if (n < 1) return "At least 1 winner";
  if (n > MAX_WINNERS_LIMIT) return `At most ${MAX_WINNERS_LIMIT} winners`;
  return null;
}
export function validateLink(v: string): string | null {
  const link = v.trim();
  if (!link) return "Link is required";
  if (byteLen(link) > MAX_LINK_LEN) return `Link must be at most ${MAX_LINK_LEN} bytes (currently ${byteLen(link)})`;
  try {
    const u = new URL(link);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "Link must start with https://";
  } catch {
    return "Enter a valid URL, e.g. https://x.com/you/status/123";
  }
  return null;
}
