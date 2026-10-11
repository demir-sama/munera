"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older Android WebViews
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

/** Icon-only copy button (44px touch target) */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted sm:h-9 sm:w-9 transition hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100 ${className}`}
    >
      {done ? <CheckIcon className="h-4 w-4 text-brand-600" /> : <CopyIcon />}
    </button>
  );
}

/** Short wallet address with a copy button. */
export function AddressChip({ address, short, href }: { address: string; short: string; href?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-sm">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
          {short}
        </a>
      ) : (
        <span className="font-semibold">{short}</span>
      )}
      <CopyButton text={address} label="Copy address" className="-my-2" />
    </span>
  );
}
