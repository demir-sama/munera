"use client";

import { useState } from "react";
import { xIntentUrl, bountyUrl } from "@/lib/site";
import { copyText } from "./CopyButton";
import { CheckIcon, CopyIcon, XIcon } from "./icons";

/** "Share on X" (pre-filled intent) + "Copy link". `compact` renders icon-only buttons for cards. */
export function ShareButtons({
  address,
  title,
  reward,
  compact = false,
}: {
  address: string;
  title: string;
  reward: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);
  const href = xIntentUrl(title, reward, address);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (await copyText(bountyUrl(address))) {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    }
  };
  if (compact) {
    return (
      <div className="relative z-10 flex items-center gap-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          title="Share on X"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-ink hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy link"
          title="Copy link"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
        >
          {done ? <CheckIcon className="h-4 w-4 text-brand-600" /> : <CopyIcon />}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn-dark btn-sm">
        <XIcon className="h-3.5 w-3.5" /> Share on X
      </a>
      <button type="button" onClick={copy} className="btn-outline btn-sm">
        {done ? <CheckIcon className="h-3.5 w-3.5 text-brand-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
        {done ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
