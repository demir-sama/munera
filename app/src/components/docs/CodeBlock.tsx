"use client";

import { useState } from "react";
import { copyText } from "../CopyButton";
import { CheckIcon, CopyIcon } from "../icons";

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-neutral-800 bg-ink text-neutral-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{lang ?? "text"}</span>
        <button
          type="button"
          aria-label="Copy code"
          onClick={async () => {
            if (await copyText(code)) {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
            }
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 sm:min-h-[40px] text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          {done ? <CheckIcon className="h-3.5 w-3.5 text-brand-300" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
