import { AnchorError, ProgramError } from "@coral-xyz/anchor";
import { IDL } from "./program";

const byCode = new Map<number, { name: string; msg: string }>(
  ((IDL.errors ?? []) as { code: number; name: string; msg?: string }[]).map((e) => [e.code, { name: e.name, msg: e.msg ?? e.name }])
);

const FRIENDLY: Record<string, string> = {
  InvalidReward: "Reward per winner must be greater than zero.",
  InvalidMaxWinners: "Max winners must be at least 1.",
  DeadlineInPast: "The deadline must be in the future.",
  TitleTooLong: "Title must be 1–64 bytes.",
  DescriptionTooLong: "Description must be at most 280 bytes.",
  LinkTooLong: "Link must be 1–200 bytes.",
  MathOverflow: "That amount is too large.",
  Unauthorized: "Only the bounty sponsor can do this.",
  BountyClosed: "This bounty is closed.",
  DeadlinePassed: "The submission deadline has passed.",
  DeadlineNotReached: "The deadline hasn't been reached yet.",
  SubmissionNotPending: "This submission has already been decided.",
  MaxWinnersReached: "All winner slots have already been paid.",
};

function fromCode(code: number | undefined | null): string | null {
  if (code === undefined || code === null) return null;
  const e = byCode.get(code);
  if (!e) return null;
  return FRIENDLY[e.name] ?? e.msg;
}

/** Turns any wallet/RPC/Anchor error into a short human sentence. */
export function friendlyError(err: unknown): string {
  const e = err as any;
  const raw = String(e?.message ?? e ?? "Unknown error");
  const logs: string[] | undefined = e?.logs ?? e?.transactionLogs;

  // 1. Anchor error (client-side parsed)
  if (e instanceof AnchorError) {
    return fromCode(e.error.errorCode.number) ?? e.error.errorMessage;
  }
  if (e instanceof ProgramError) {
    return fromCode(e.code) ?? e.msg;
  }
  const n = e?.error?.errorCode?.number;
  if (typeof n === "number") return fromCode(n) ?? e.error.errorMessage ?? raw;

  // 2. Try parsing logs
  if (logs?.length) {
    try {
      const parsed = AnchorError.parse(logs);
      if (parsed) return fromCode(parsed.error.errorCode.number) ?? parsed.error.errorMessage;
    } catch {
      /* ignore */
    }
  }

  // 3. "custom program error: 0x1770"
  const hex = /custom program error: 0x([0-9a-fA-F]+)/.exec(raw);
  if (hex) {
    const m = fromCode(parseInt(hex[1], 16));
    if (m) return m;
  }
  const inst = /"Custom":(\d+)/.exec(raw);
  if (inst) {
    const m = fromCode(Number(inst[1]));
    if (m) return m;
  }

  // 4. Wallet / network level
  if (/user rejected|rejected the request|declined|cancel/i.test(raw)) return "Transaction cancelled in your wallet.";
  if (/wallet not connected|connect a wallet/i.test(raw)) return "Connect your wallet first.";
  if (/already in use/i.test(raw)) return "This account already exists (you may have already submitted).";
  if (/insufficient funds|insufficient lamports|0x1\b/i.test(raw)) {
    if (/lamports|SOL|debit an account/i.test(raw) || logs?.some((l) => /insufficient lamports/i.test(l)))
      return "Not enough SOL to pay network fees and rent. Get devnet SOL from a faucet.";
    return "Insufficient token balance for this transaction.";
  }
  if (/attempt to debit an account but found no record of a prior credit/i.test(raw))
    return "This wallet has no SOL. Get devnet SOL from a faucet first.";
  if (/blockhash not found|block height exceeded/i.test(raw)) return "Transaction expired. Please try again.";
  if (/429|too many requests|rate limit/i.test(raw)) return "The RPC is rate-limiting requests. Wait a moment and try again.";
  if (/failed to fetch|network/i.test(raw)) return "Network error talking to the RPC endpoint.";
  if (/AccountNotInitialized|3012/.test(raw)) return "A required account doesn't exist yet (do you have a USDC token account?).";
  return raw.length > 180 ? raw.slice(0, 177) + "…" : raw;
}
